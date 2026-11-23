import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { StaffRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/auth.guards';
import { EngagementService } from './engagement.service';
import { AssistantService } from './assistant.service';
import { SubscriptionsService } from './subscriptions.service';
import { MessagingService } from './messaging.service';
import { parse } from './contracts';
import { z } from 'zod';
@Controller('engagement')
export class PublicEngagementController {
  constructor(
    private readonly e: EngagementService,
    private readonly assistant: AssistantService,
    private readonly subscriptions: SubscriptionsService,
  ) {}
  @Post('assistant') ask(@Body() b: unknown, @Req() r: Request) {
    return this.assistant.ask(b, r);
  }
  @Post('assistant/feedback') feedback(@Body() b: unknown, @Req() r: Request) {
    return this.assistant.feedback(b, r);
  }
  @Get('knowledge') async knowledge(@Query('branch') branch?: string) {
    const b = branch ? await this.e.publishedBranch(branch) : null;
    return this.e.publicFaqs(b?.id);
  }
  @Get('qr/:code') qr(@Param('code') code: string) {
    return this.e.publicQr(code);
  }
  @Get('campaigns/:slug') campaign(@Param('slug') slug: string) {
    return this.e.publicCampaign(slug);
  }
  @Get('context') context(@Query() q: Record<string, unknown>) {
    return this.e.context(q);
  }
  @Post('events') event(@Body() b: unknown, @Req() r: Request) {
    return this.e.record(b, r);
  }
  @Post('subscriptions') subscribe(@Body() b: unknown, @Req() r: Request) {
    return this.subscriptions.request(b, r);
  }
  @Post('subscriptions/state') state(@Body() b: unknown) {
    return this.subscriptions.state(b);
  }
  @Post('subscriptions/withdraw') withdraw(@Body() b: unknown) {
    return this.subscriptions.withdraw(b);
  }
}
@Controller('admin/engagement')
@UseGuards(SessionGuard)
export class AdminEngagementController {
  constructor(
    private readonly e: EngagementService,
    private readonly subscriptions: SubscriptionsService,
    private readonly messaging: MessagingService,
  ) {}
  @Get('qr') qr(@Req() r: StaffRequest) {
    return this.e.qrList(r.staff);
  }
  @Post('qr') createQr(@Req() r: StaffRequest, @Body() b: unknown) {
    return this.e.createQr(r.staff, b);
  }
  @Patch('qr/:id') qrStatus(
    @Req() r: StaffRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.e.qrStatus(r.staff, id, b);
  }
  @Get('qr/:id/image') async qrImage(
    @Req() r: StaffRequest,
    @Res() s: Response,
    @Param('id') id: string,
    @Query('format') format = 'png',
    @Query('locale') locale = 'en',
  ) {
    const output = await this.e.qrImage(r.staff, id, format, locale);
    s.set({
      'Content-Type': format === 'svg' ? 'image/svg+xml' : 'image/png',
      'Content-Disposition': `attachment; filename="gulf-qr-${id}.${format}"`,
      'Cache-Control': 'no-store',
    }).send(output.data);
  }
  @Get('subscriptions') subscriptionsList(@Req() r: StaffRequest) {
    return this.subscriptions.list(r.staff);
  }
  @Post('subscriptions/:id/confirm') confirm(
    @Req() r: StaffRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.subscriptions.confirm(r.staff, id, b);
  }
  @Post('subscriptions/:id/suppress') suppress(
    @Req() r: StaffRequest,
    @Param('id') id: string,
  ) {
    return this.subscriptions.suppress(r.staff, id);
  }
  @Post('retention') retention(@Req() r: StaffRequest) {
    return this.subscriptions.retention(r.staff);
  }
  @Get('analytics') analytics(
    @Req() r: StaffRequest,
    @Query() q: Record<string, unknown>,
  ) {
    return this.e.analytics(r.staff, q);
  }
  @Get('analytics.csv') async csv(
    @Req() r: StaffRequest,
    @Res() s: Response,
    @Query() q: Record<string, unknown>,
  ) {
    s.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="gulf-aggregate-analytics.csv"',
      'Cache-Control': 'no-store',
    }).send(await this.e.csv(r.staff, q));
  }
  @Get('provider') async provider(@Req() r: StaffRequest) {
    await this.e.database.db.transaction((tx) =>
      this.e.access.actor(tx, r.staff, ['SUPER_ADMIN']),
    );
    return this.messaging.health();
  }
  @Post('outbound/preview') preview(
    @Req() r: StaffRequest,
    @Body() b: unknown,
  ) {
    return this.messaging.preview(r.staff, b);
  }
  @Get(':kind') list(@Req() r: StaffRequest, @Param('kind') kind: string) {
    return this.e.list(r.staff, parse(z.enum(['campaigns', 'faqs']), kind));
  }
  @Post(':kind') create(
    @Req() r: StaffRequest,
    @Param('kind') kind: string,
    @Body() b: unknown,
  ) {
    return parse(z.enum(['campaigns', 'faqs']), kind) === 'campaigns'
      ? this.e.saveCampaign(r.staff, b)
      : this.e.saveFaq(r.staff, b);
  }
  @Get(':kind/:id') detail(
    @Req() r: StaffRequest,
    @Param('kind') kind: string,
    @Param('id') id: string,
  ) {
    return this.e.detail(
      r.staff,
      parse(z.enum(['campaigns', 'faqs']), kind),
      id,
    );
  }
  @Put(':kind/:id') update(
    @Req() r: StaffRequest,
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return parse(z.enum(['campaigns', 'faqs']), kind) === 'campaigns'
      ? this.e.saveCampaign(r.staff, b, id)
      : this.e.saveFaq(r.staff, b, id);
  }
  @Post(':kind/:id/assign') assign(
    @Req() r: StaffRequest,
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.e.assign(
      r.staff,
      parse(z.enum(['campaigns', 'faqs']), kind),
      id,
      b,
    );
  }
  @Post(':kind/:id/submit') submit(
    @Req() r: StaffRequest,
    @Param('kind') kind: string,
    @Param('id') id: string,
  ) {
    return this.e.submit(
      r.staff,
      parse(z.enum(['campaigns', 'faqs']), kind),
      id,
    );
  }
  @Post(':kind/:id/review') review(
    @Req() r: StaffRequest,
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.e.review(
      r.staff,
      parse(z.enum(['campaigns', 'faqs']), kind),
      id,
      b,
    );
  }
  @Post(':kind/:id/publish') publish(
    @Req() r: StaffRequest,
    @Param('kind') kind: string,
    @Param('id') id: string,
  ) {
    return this.e.publish(
      r.staff,
      parse(z.enum(['campaigns', 'faqs']), kind),
      id,
    );
  }
  @Post(':kind/:id/pause') pause(
    @Req() r: StaffRequest,
    @Param('kind') kind: string,
    @Param('id') id: string,
  ) {
    return this.e.pause(
      r.staff,
      parse(z.enum(['campaigns', 'faqs']), kind),
      id,
    );
  }
}
@Controller('messaging/webhook')
export class MessagingWebhookController {
  constructor(private readonly messaging: MessagingService) {}
  @Get() challenge(@Query() q: Record<string, unknown>, @Res() s: Response) {
    s.type('text/plain').send(this.messaging.challenge(q));
  }
  @Post() webhook(@Req() r: Request & { rawBody?: Buffer }) {
    return this.messaging.webhook(r.rawBody, r.headers['x-hub-signature-256']);
  }
}
