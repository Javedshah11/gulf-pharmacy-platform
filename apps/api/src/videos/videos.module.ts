import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VideosService } from './videos.service';
import { VideosController, AcademyController } from './videos.controller';
@Module({
  imports: [AuthModule],
  providers: [VideosService],
  exports: [VideosService],
  controllers: [VideosController, AcademyController],
})
export class VideosModule {}
