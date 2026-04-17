import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiChatService } from './ai-chat.service';

@ApiTags('ai')
@Controller('ai')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Get('context')
  @Roles('owner')
  async getContext() {
    return this.aiChatService.getBusinessContext();
  }

  @Post('chat')
  @Roles('owner')
  async chat(@Body() body: { messages: { role: string; content: string }[]; lang?: string }) {
    return this.aiChatService.chat(body.messages, body.lang);
  }

  @Post('analyze')
  @Roles('owner')
  async analyze(@Body() body: { lang?: string }) {
    return this.aiChatService.autoAnalyze(body.lang);
  }
}
