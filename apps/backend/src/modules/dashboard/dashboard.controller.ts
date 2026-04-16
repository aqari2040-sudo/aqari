import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ─── Occupancy ────────────────────────────────────────────────────────────

  @Get('occupancy')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Occupancy summary across all units' })
  @ApiQuery({ name: 'property_id', required: false, description: 'Filter by property UUID' })
  @ApiOkResponse({ description: 'Occupancy counts and breakdown by property' })
  getOccupancy(@Query('property_id') propertyId?: string) {
    return this.dashboardService.getOccupancy(propertyId);
  }

  // ─── Payments Summary ─────────────────────────────────────────────────────

  @Get('payments-summary')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Payments summary for the current month' })
  @ApiQuery({ name: 'property_id', required: false, description: 'Filter by property UUID' })
  @ApiOkResponse({ description: 'Payment totals and overdue tenant list' })
  getPaymentsSummary(@Query('property_id') propertyId?: string) {
    return this.dashboardService.getPaymentsSummary(propertyId);
  }

  // ─── Maintenance Summary ──────────────────────────────────────────────────

  @Get('maintenance-summary')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Maintenance overview for the current month' })
  @ApiQuery({ name: 'property_id', required: false, description: 'Filter by property UUID' })
  @ApiOkResponse({ description: 'Pending approvals, costs and recurring alerts' })
  getMaintenanceSummary(@Query('property_id') propertyId?: string) {
    return this.dashboardService.getMaintenanceSummary(propertyId);
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────

  @Get('alerts')
  @Roles('owner')
  @ApiOperation({ summary: 'Owner alerts: expiring contracts, suspicious costs, recurring maintenance, budget warnings' })
  @ApiQuery({ name: 'property_id', required: false, description: 'Filter by property UUID' })
  @ApiOkResponse({ description: 'Aggregated alert data for the owner dashboard' })
  getAlerts(@Query('property_id') propertyId?: string) {
    return this.dashboardService.getAlerts(propertyId);
  }
}
