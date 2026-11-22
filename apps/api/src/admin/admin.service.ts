import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  and,
  asc,
  authSessions,
  branchMemberships,
  branches,
  eq,
  gt,
  inArray,
  isNull,
  staffUsers,
  adminAuditLogs,
} from '@gulf/database';
import { DatabaseService } from '../infrastructure/database.service';
import { hashPassword } from '../auth/password';
import type { StaffSession } from '../auth/auth.types';
import { CreateStaffDto, UpdateStaffDto, UpdateBranchDto } from './admin.dto';
type Transaction = Parameters<
  Parameters<DatabaseService['db']['transaction']>[0]
>[0];
const safeUser = {
  id: staffUsers.id,
  username: staffUsers.username,
  displayName: staffUsers.displayName,
  role: staffUsers.role,
  isActive: staffUsers.isActive,
  createdAt: staffUsers.createdAt,
};
function definedChanges<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
@Injectable()
export class AdminService {
  constructor(private readonly database: DatabaseService) {}
  private async actor(
    tx: Transaction,
    session: StaffSession,
    superOnly = false,
  ) {
    const [user] = await tx
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, session.user.id))
      .for('update');
    const [active] = await tx
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.id, session.sessionId),
          eq(authSessions.userId, session.user.id),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      );
    if (!user?.isActive || !active)
      throw new UnauthorizedException('Session expired or revoked');
    if (
      !['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role) ||
      (superOnly && user.role !== 'SUPER_ADMIN')
    )
      throw new ForbiddenException('Access denied');
    return user;
  }
  private async branchAccess(
    tx: Transaction,
    user: typeof staffUsers.$inferSelect,
    id: string,
  ) {
    if (user.role !== 'SUPER_ADMIN') {
      const [membership] = await tx
        .select()
        .from(branchMemberships)
        .where(
          and(
            eq(branchMemberships.userId, user.id),
            eq(branchMemberships.branchId, id),
          ),
        );
      if (!membership) throw new ForbiddenException('Branch access denied');
    }
  }
  listBranches(session: StaffSession) {
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session);
      if (user.role === 'SUPER_ADMIN')
        return tx.select().from(branches).orderBy(asc(branches.nameEn));
      return tx
        .select({ branch: branches })
        .from(branches)
        .innerJoin(
          branchMemberships,
          eq(branchMemberships.branchId, branches.id),
        )
        .where(eq(branchMemberships.userId, user.id))
        .orderBy(asc(branches.nameEn))
        .then((rows) => rows.map((row) => row.branch));
    });
  }
  getBranch(session: StaffSession, id: string) {
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session);
      await this.branchAccess(tx, user, id);
      const [branch] = await tx
        .select()
        .from(branches)
        .where(eq(branches.id, id));
      if (!branch) throw new NotFoundException('Branch not found');
      return branch;
    });
  }
  updateBranch(session: StaffSession, id: string, dto: UpdateBranchDto) {
    return this.database.db.transaction(async (tx) => {
      dto = definedChanges(dto);
      const user = await this.actor(tx, session);
      await this.branchAccess(tx, user, id);
      if (!Object.keys(dto).length)
        throw new BadRequestException('No changes supplied');
      if ((dto.isPublished !== undefined || dto.openingHours !== undefined || dto.services !== undefined) && user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Publication, verified hours, and approved services require a Super Admin');
      if (dto.openingHours && (new Set(dto.openingHours.map(period => period.day)).size !== dto.openingHours.length || dto.openingHours.some(period => period.opens === period.closes))) throw new BadRequestException('Use one distinct opening period per day, with different opening and closing times');
      if (dto.services && new Set(dto.services.map(service => service.nameEn.toLowerCase())).size !== dto.services.length) throw new BadRequestException('Service names must be unique');
      const optionalText = new Set(['descriptionEn', 'descriptionAr', 'contactNameEn', 'contactNameAr', 'postalCode']);
      const contentText = Object.entries(dto).filter(([key]) => !['isPublished', 'openingHours', 'services'].includes(key));
      for (const [key, value] of contentText) {
        if (
          typeof value !== 'string' ||
          (!optionalText.has(key) && !value.trim()) ||
          [...value].some(
            (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
          )
        )
          throw new BadRequestException(
            'Business profile fields must contain valid text',
          );
      }
      const [branch] = await tx
        .update(branches)
        .set({ ...dto, publicUpdatedAt: new Date() })
        .where(eq(branches.id, id))
        .returning();
      if (!branch) throw new NotFoundException('Branch not found');
      await tx.insert(adminAuditLogs).values({
        actorId: user.id,
        action: 'branch.updated',
        targetId: id,
        details: { fields: Object.keys(dto) },
      });
      return branch;
    });
  }
  listUsers(session: StaffSession) {
    return this.database.db.transaction(async (tx) => {
      await this.actor(tx, session, true);
      const users = await tx
        .select(safeUser)
        .from(staffUsers)
        .orderBy(asc(staffUsers.createdAt));
      const memberships = await tx.select().from(branchMemberships);
      return users.map((user) => ({
        ...user,
        branchIds: memberships
          .filter((m) => m.userId === user.id)
          .map((m) => m.branchId),
      }));
    });
  }
  async createUser(session: StaffSession, dto: CreateStaffDto) {
    const passwordHash = await hashPassword(dto.password);
    return this.database.db.transaction(async (tx) => {
      await this.actor(tx, session, true);
      await this.checkBranches(tx, dto.branchIds);
      const [user] = await tx
        .insert(staffUsers)
        .values({
          username: dto.username,
          displayName: dto.displayName,
          passwordHash,
          role: 'BRANCH_ADMIN',
        })
        .onConflictDoNothing({ target: staffUsers.username })
        .returning(safeUser);
      if (!user) throw new ConflictException('Username unavailable');
      await tx
        .insert(branchMemberships)
        .values(
          dto.branchIds.map((branchId) => ({ userId: user.id, branchId })),
        );
      await tx.insert(adminAuditLogs).values({
        actorId: session.user.id,
        action: 'staff.created',
        targetId: user.id,
        details: { branchIds: dto.branchIds },
      });
      return { ...user, branchIds: dto.branchIds };
    });
  }
  private async targetUser(tx: Transaction, id: string) {
    const [user] = await tx
      .select(safeUser)
      .from(staffUsers)
      .where(eq(staffUsers.id, id))
      .for('update');
    if (!user) throw new NotFoundException('Staff member not found');
    if (user.role !== 'BRANCH_ADMIN')
      throw new ForbiddenException('This account cannot be modified here');
    return user;
  }
  updateUser(session: StaffSession, id: string, dto: UpdateStaffDto) {
    return this.database.db.transaction(async (tx) => {
      dto = definedChanges(dto);
      await this.actor(tx, session, true);
      await this.targetUser(tx, id);
      if (!Object.keys(dto).length)
        throw new BadRequestException('No changes supplied');
      const [user] = await tx
        .update(staffUsers)
        .set(dto)
        .where(eq(staffUsers.id, id))
        .returning(safeUser);
      await tx
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(eq(authSessions.userId, id));
      await tx.insert(adminAuditLogs).values({
        actorId: session.user.id,
        action: 'staff.updated',
        targetId: id,
        details: { fields: Object.keys(dto) },
      });
      return user;
    });
  }
  private async checkBranches(tx: Transaction, ids: string[]) {
    if (ids.length) {
      const rows = await tx
        .select({ id: branches.id })
        .from(branches)
        .where(inArray(branches.id, ids));
      if (rows.length !== ids.length)
        throw new BadRequestException('One or more branches do not exist');
    }
  }
  memberships(session: StaffSession, id: string) {
    return this.database.db.transaction(async (tx) => {
      await this.actor(tx, session, true);
      await this.targetUser(tx, id);
      const rows = await tx
        .select()
        .from(branchMemberships)
        .where(eq(branchMemberships.userId, id));
      return { branchIds: rows.map((row) => row.branchId) };
    });
  }
  assignBranches(session: StaffSession, id: string, branchIds: string[]) {
    return this.database.db.transaction(async (tx) => {
      await this.actor(tx, session, true);
      await this.targetUser(tx, id);
      await this.checkBranches(tx, branchIds);
      await tx
        .delete(branchMemberships)
        .where(eq(branchMemberships.userId, id));
      if (branchIds.length)
        await tx
          .insert(branchMemberships)
          .values(branchIds.map((branchId) => ({ userId: id, branchId })));
      await tx
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(eq(authSessions.userId, id));
      await tx.insert(adminAuditLogs).values({
        actorId: session.user.id,
        action: 'staff.branches_assigned',
        targetId: id,
        details: { branchIds },
      });
      return { branchIds };
    });
  }
}
