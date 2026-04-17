import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KeepaliveService {
  private readonly logger = new Logger(KeepaliveService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Ping DB every 4 minutes to keep connection warm
  @Cron(CronExpression.EVERY_5_MINUTES)
  async keepAlive() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.debug('Keep-alive ping OK');
    } catch (error) {
      this.logger.warn('Keep-alive ping failed');
    }
  }
}
