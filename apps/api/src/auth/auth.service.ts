import {
  Inject,
  Injectable,
  UnauthorizedException,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  and,
  authSessions,
  eq,
  gt,
  isNull,
  staffUsers,
  adminAuditLogs,
} from '@gulf/database';
import { DatabaseService } from '../infrastructure/database.service';
import { RedisService } from '../infrastructure/redis.service';
import { ENVIRONMENT, type Environment } from '../config/environment';
import { hashPassword, verifyPassword } from './password';
import type { StaffProfile, StaffSession } from './auth.types';

export function tokenHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
export function profile(user: typeof staffUsers.$inferSelect): StaffProfile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}
@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword(randomBytes(32).toString('hex'));
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  async limit(ip: string, identity: string) {
    const allowed = await this.redis.consumeLoginAttempt(
      tokenHash(ip),
      tokenHash(identity),
    );
    if (!allowed)
      throw new HttpException(
        'Too many attempts. Please try again later.',
        429,
      );
  }
  async login(
    username: string,
    password: string,
    ip: string,
    oldToken?: string,
  ) {
    await this.limit(ip, username);
    const [user] = await this.database.db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.username, username))
      .limit(1);
    const valid = await verifyPassword(
      user?.passwordHash ?? (await this.dummyHash),
      password,
    );
    if (
      !user ||
      !valid ||
      !user.isActive ||
      !['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)
    ) {
      await this.database.db
        .insert(adminAuditLogs)
        .values({ action: 'auth.login_failed' });
      throw new UnauthorizedException('Invalid username or password');
    }
    return this.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.id, user.id))
        .for('update');
      if (!current?.isActive || current.passwordHash !== user.passwordHash)
        throw new UnauthorizedException('Invalid username or password');
      if (oldToken)
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(eq(authSessions.tokenHash, tokenHash(oldToken)));
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(
        Date.now() + (this.env.SESSION_HOURS ?? 8) * 3600000,
      );
      await tx
        .insert(authSessions)
        .values({ userId: user.id, tokenHash: tokenHash(token), expiresAt });
      await tx
        .insert(adminAuditLogs)
        .values({ actorId: user.id, action: 'auth.login', targetId: user.id });
      return { token, expiresAt, user: profile(current) };
    });
  }
  async validate(token?: string): Promise<StaffSession> {
    if (!token) throw new UnauthorizedException('Authentication required');
    const [row] = await this.database.db
      .select({ session: authSessions, user: staffUsers })
      .from(authSessions)
      .innerJoin(staffUsers, eq(authSessions.userId, staffUsers.id))
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash(token)),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
          eq(staffUsers.isActive, true),
        ),
      )
      .limit(1);
    if (!row || !['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(row.user.role))
      throw new UnauthorizedException('Session expired or revoked');
    return {
      user: profile(row.user),
      sessionId: row.session.id,
      expiresAt: row.session.expiresAt,
    };
  }
  async logout(session: StaffSession) {
    await this.database.db.transaction(async (tx) => {
      await tx
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(eq(authSessions.id, session.sessionId));
      await tx.insert(adminAuditLogs).values({
        actorId: session.user.id,
        action: 'auth.logout',
        targetId: session.sessionId,
      });
    });
  }
  async changePassword(
    session: StaffSession,
    currentPassword: string,
    newPassword: string,
    ip: string,
  ) {
    await this.limit(ip, 'password:' + session.user.id);
    if (currentPassword === newPassword)
      throw new BadRequestException('Choose a different password');
    const [user] = await this.database.db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, session.user.id));
    if (!user || !(await verifyPassword(user.passwordHash, currentPassword)))
      throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await hashPassword(newPassword);
    return this.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.id, user.id))
        .for('update');
      if (!current?.isActive || current.passwordHash !== user.passwordHash)
        throw new UnauthorizedException('Session expired or revoked');
      const [active] = await tx
        .select()
        .from(authSessions)
        .where(
          and(
            eq(authSessions.id, session.sessionId),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, new Date()),
          ),
        );
      if (!active)
        throw new UnauthorizedException('Session expired or revoked');
      await tx
        .update(staffUsers)
        .set({ passwordHash })
        .where(eq(staffUsers.id, user.id));
      await tx
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(eq(authSessions.userId, user.id));
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(
        Date.now() + (this.env.SESSION_HOURS ?? 8) * 3600000,
      );
      await tx
        .insert(authSessions)
        .values({ userId: user.id, tokenHash: tokenHash(token), expiresAt });
      await tx.insert(adminAuditLogs).values({
        actorId: user.id,
        action: 'auth.password_changed',
        targetId: user.id,
      });
      return { token, expiresAt };
    });
  }
}
