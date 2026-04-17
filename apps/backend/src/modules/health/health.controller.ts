import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      version: '1.1.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db')
  async checkDb() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      database: 'connected',
    };
  }
}
