import { EngagementModule } from './engagement/engagement.module';
import { VideosModule } from './videos/videos.module';
import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { HealthModule } from './health/health.module';
import { BranchesModule } from './branches/branches.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
@Module({
  imports: [
    InfrastructureModule,
    HealthModule,
    BranchesModule,
    AuthModule,
    AdminModule,
    VideosModule,
    EngagementModule,
  ],
})
export class AppModule {}
