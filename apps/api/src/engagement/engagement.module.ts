import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VideosModule } from '../videos/videos.module';
import { EngagementAccess } from './access';
import { EngagementSecurity } from './security';
import { EngagementService } from './engagement.service';
import { AssistantService } from './assistant.service';
import { SubscriptionsService } from './subscriptions.service';
import { MessagingService } from './messaging.service';
import {
  PublicEngagementController,
  AdminEngagementController,
  MessagingWebhookController,
} from './engagement.controller';
@Module({
  imports: [AuthModule, VideosModule],
  providers: [
    EngagementAccess,
    EngagementSecurity,
    EngagementService,
    AssistantService,
    SubscriptionsService,
    MessagingService,
  ],
  controllers: [
    PublicEngagementController,
    AdminEngagementController,
    MessagingWebhookController,
  ],
})
export class EngagementModule {}
