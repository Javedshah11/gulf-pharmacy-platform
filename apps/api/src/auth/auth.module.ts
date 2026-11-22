import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard, RoleGuard } from './auth.guards';
@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, RoleGuard],
  exports: [AuthService, SessionGuard, RoleGuard],
})
export class AuthModule {}
