import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { ENVIRONMENT, type Environment } from '../config/environment';
import { readSessionCookie } from './session-cookie';
import type { StaffRequest } from './auth.types';
export const SuperAdmin = () => SetMetadata('superAdmin', true);
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<StaffRequest>();
    req.staff = await this.auth.validate(readSessionCookie(req, this.env));
    return true;
  }
}
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<boolean>('superAdmin', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (
      required &&
      context.switchToHttp().getRequest<StaffRequest>().staff.user.role !==
        'SUPER_ADMIN'
    )
      throw new ForbiddenException('Access denied');
    return true;
  }
}
