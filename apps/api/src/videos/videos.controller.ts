import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Req,
  Res,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { StaffRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/auth.guards';
import { VideosService } from './videos.service';
@Controller('admin')
@UseGuards(SessionGuard)
export class VideosController {
  constructor(private readonly videos: VideosService) {}
  @Get('academy/branches') branches(@Req() r: StaffRequest) {
    return this.videos.listBranches(r.staff);
  }
  @Post('academy/staff') staff(@Req() r: StaffRequest, @Body() b: unknown) {
    return this.videos.createStaff(r.staff, b);
  }
  @Get('videos/categories') categories(@Req() r: StaffRequest) {
    return this.videos.categoryList(r.staff);
  }
  @Post('videos/categories') category(
    @Req() r: StaffRequest,
    @Body() b: unknown,
  ) {
    return this.videos.saveCategory(r.staff, b);
  }
  @Put('videos/categories/:id') categoryUpdate(
    @Req() r: StaffRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.videos.saveCategory(r.staff, b, id);
  }
  @Get('videos/analytics') analytics(@Req() r: StaffRequest) {
    return this.videos.analytics(r.staff);
  }
  @Get('videos') list(
    @Req() r: StaffRequest,
    @Query() q: Record<string, unknown>,
  ) {
    return this.videos.list(r.staff, q);
  }
  @Post('videos') create(@Req() r: StaffRequest, @Body() b: unknown) {
    return this.videos.create(r.staff, b);
  }
  @Get('videos/:id') detail(@Req() r: StaffRequest, @Param('id') id: string) {
    return this.videos.detail(r.staff, id);
  }
  @Patch('videos/:id') update(
    @Req() r: StaffRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.videos.update(r.staff, id, b);
  }
  @Put('videos/:id/upload') upload(
    @Req() r: StaffRequest,
    @Param('id') id: string,
  ) {
    return this.videos.upload(r.staff, id, r);
  }
  @Post('videos/:id/retry') retry(
    @Req() r: StaffRequest,
    @Param('id') id: string,
  ) {
    return this.videos.retry(r.staff, id);
  }
  @Put('videos/:id/captions') captions(
    @Req() r: StaffRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.videos.captions(r.staff, id, b);
  }
  @Post('videos/:id/reviewers') assign(
    @Req() r: StaffRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.videos.assign(r.staff, id, b);
  }
  @Post('videos/:id/submit') submit(
    @Req() r: StaffRequest,
    @Param('id') id: string,
  ) {
    return this.videos.submit(r.staff, id);
  }
  @Post('videos/:id/medical-review') medical(
    @Req() r: StaffRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.videos.decide(r.staff, id, b, 'MEDICAL');
  }
  @Post('videos/:id/compliance-review') compliance(
    @Req() r: StaffRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.videos.decide(r.staff, id, b, 'COMPLIANCE');
  }
  @Post('videos/:id/publish') publish(
    @Req() r: StaffRequest,
    @Param('id') id: string,
  ) {
    return this.videos.publish(r.staff, id);
  }
  @Post('videos/:id/archive') archive(
    @Req() r: StaffRequest,
    @Param('id') id: string,
  ) {
    return this.videos.archive(r.staff, id);
  }
  @Get('videos/:id/assets/:type') asset(
    @Req() r: StaffRequest,
    @Res() s: Response,
    @Param('id') id: string,
    @Param('type') type: string,
  ) {
    return this.videos.deliver(r, s, id, type, r.staff);
  }
}
@Controller('health-academy')
export class AcademyController {
  constructor(private readonly videos: VideosService) {}
  @Get('categories') categories() {
    return this.videos.categoryList();
  }
  @Get('videos') list(@Query() q: Record<string, unknown>) {
    return this.videos.publicList(q);
  }
  @Get('videos/:slug') detail(@Param('slug') slug: string) {
    return this.videos.publicDetail(slug);
  }
  @Get('videos/:slug/assets/:type') asset(
    @Req() r: Request,
    @Res() s: Response,
    @Param('slug') slug: string,
    @Param('type') type: string,
  ) {
    return this.videos.deliver(r, s, slug, type);
  }
  @Post('videos/:slug/events') event(
    @Req() r: Request,
    @Param('slug') slug: string,
    @Body() b: unknown,
  ) {
    return this.videos.event(slug, b, r);
  }
}
