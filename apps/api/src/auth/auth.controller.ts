import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto } from './auth.dto';
import { SessionGuard } from './auth.guards';
import type { StaffRequest } from './auth.types';
import { ENVIRONMENT, type Environment } from '../config/environment';
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from './session-cookie';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(
      dto.username,
      dto.password,
      req.ip ?? 'unknown',
      readSessionCookie(req, this.env),
    );
    setSessionCookie(res, this.env, result.token, result.expiresAt);
    return { user: result.user, expiresAt: result.expiresAt };
  }
  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() req: StaffRequest) {
    return { user: req.staff.user, expiresAt: req.staff.expiresAt };
  }
  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async logout(
    @Req() req: StaffRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(req.staff);
    clearSessionCookie(res, this.env);
  }
  @Post('change-password')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: StaffRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.changePassword(
      req.staff,
      dto.currentPassword,
      dto.newPassword,
      req.ip ?? 'unknown',
    );
    setSessionCookie(res, this.env, result.token, result.expiresAt);
    return {
      message: 'Password changed. Other sessions have been revoked.',
      expiresAt: result.expiresAt,
    };
  }
}
