import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';

@Module({
  controllers: [AnalyticsController, AiChatController],
  providers: [AnalyticsService, AiChatService],
  exports: [AnalyticsService, AiChatService],
})
export class AnalyticsModule {}
