import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoleGuard, SessionGuard, SuperAdmin } from '../auth/auth.guards';
import type { StaffRequest } from '../auth/auth.types';
import { AdminService } from './admin.service';
import {
  CreateStaffDto,
  IdParams,
  MembershipDto,
  UpdateBranchDto,
  UpdateStaffDto,
} from './admin.dto';
@Controller('admin')
@UseGuards(SessionGuard, RoleGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('branches') branches(@Req() req: StaffRequest) {
    return this.admin.listBranches(req.staff);
  }
  @Get('branches/:id') branch(
    @Req() req: StaffRequest,
    @Param() params: IdParams,
  ) {
    return this.admin.getBranch(req.staff, params.id);
  }
  @Patch('branches/:id') updateBranch(
    @Req() req: StaffRequest,
    @Param() params: IdParams,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.admin.updateBranch(req.staff, params.id, dto);
  }
  @Get('users') @SuperAdmin() users(@Req() req: StaffRequest) {
    return this.admin.listUsers(req.staff);
  }
  @Post('users') @SuperAdmin() createUser(
    @Req() req: StaffRequest,
    @Body() dto: CreateStaffDto,
  ) {
    return this.admin.createUser(req.staff, dto);
  }
  @Patch('users/:id') @SuperAdmin() updateUser(
    @Req() req: StaffRequest,
    @Param() params: IdParams,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.admin.updateUser(req.staff, params.id, dto);
  }
  @Get('users/:id/memberships') @SuperAdmin() memberships(
    @Req() req: StaffRequest,
    @Param() params: IdParams,
  ) {
    return this.admin.memberships(req.staff, params.id);
  }
  @Put('users/:id/memberships') @SuperAdmin() assign(
    @Req() req: StaffRequest,
    @Param() params: IdParams,
    @Body() dto: MembershipDto,
  ) {
    return this.admin.assignBranches(req.staff, params.id, dto.branchIds);
  }
}
