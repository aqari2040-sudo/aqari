import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ─── GET /analytics/insights ─────────────────────────────────────────────────

  @Get('insights')
  @Roles('owner')
  @ApiOperation({ summary: 'Generate AI-powered insights from all property data' })
  @ApiResponse({ status: 200, description: 'AI insights generated successfully' })
  getInsights() {
    return this.analyticsService.getInsights();
  }
}
