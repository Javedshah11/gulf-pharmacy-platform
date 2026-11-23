import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import {
  staffUsers,
  authSessions,
  branches,
  branchMemberships,
  adminAuditLogs,
  eq,
  and,
  isNull,
  gt,
} from '@gulf/database';
import type { DatabaseService } from '../infrastructure/database.service';
import type { StaffSession } from '../auth/auth.types';
export type Tx = Parameters<
  Parameters<DatabaseService['db']['transaction']>[0]
>[0];
export type Actor = typeof staffUsers.$inferSelect;
@Injectable()
export class EngagementAccess {
  async actor(tx: Tx, s: StaffSession, roles?: string[]) {
    const [u] = await tx
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, s.user.id))
      .for('update');
    const [session] = await tx
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.id, s.sessionId),
          eq(authSessions.userId, s.user.id),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      );
    if (!u?.isActive || !session)
      throw new UnauthorizedException('Session expired or revoked');
    if (roles && !roles.includes(u.role))
      throw new ForbiddenException('Role is not authorized');
    return u;
  }
  async branch(tx: Tx, u: Actor, branchId: string) {
    const [b] = await tx
      .select()
      .from(branches)
      .where(eq(branches.id, branchId));
    if (!b) throw new NotFoundException('Branch not found');
    if (u.role !== 'SUPER_ADMIN') {
      const [m] = await tx
        .select()
        .from(branchMemberships)
        .where(
          and(
            eq(branchMemberships.userId, u.id),
            eq(branchMemberships.branchId, branchId),
          ),
        );
      if (!m) throw new ForbiddenException('Branch access denied');
    }
    return b;
  }
  audit(
    tx: Tx,
    u: Actor | null,
    action: string,
    targetId: string,
    details: Record<string, unknown> = {},
  ) {
    return tx
      .insert(adminAuditLogs)
      .values({
        actorId: u?.id,
        action: 'engagement.' + action,
        targetId,
        details,
      });
  }
}
