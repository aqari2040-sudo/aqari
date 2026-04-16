import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { MaintenanceCostsService } from './maintenance-costs.service';
import { CreateMaintenanceCostDto } from './dto/create-maintenance-cost.dto';
import { RejectMaintenanceCostDto } from './dto/reject-maintenance-cost.dto';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceCostsController {
  constructor(private readonly maintenanceCostsService: MaintenanceCostsService) {}

  // ─── Submit Cost ────────────────────────────────────────────────────────────

  @Post(':id/costs')
  @Roles('owner', 'employee')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Submit a cost entry for a maintenance request. Includes budget and suspicious-cost checks.',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiOkResponse({
    description:
      'Created cost entry with optional budget_exceeded and suspicious_cost flags',
  })
  submitCost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMaintenanceCostDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.maintenanceCostsService.submitCost(id, dto, currentUser);
  }

  // ─── List Costs ─────────────────────────────────────────────────────────────

  @Get(':id/costs')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'List all cost entries for a maintenance request' })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiOkResponse({ description: 'Cost entries with approved total summary' })
  findCosts(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceCostsService.findCostsByRequest(id);
  }

  // ─── Approve Cost ───────────────────────────────────────────────────────────

  @Patch('costs/:costId/approve')
  @Roles('owner')
  @ApiOperation({ summary: 'Approve a pending maintenance cost entry' })
  @ApiParam({ name: 'costId', description: 'Maintenance cost UUID' })
  @ApiOkResponse({ description: 'Updated cost entry with approved status' })
  approveCost(
    @Param('costId', ParseUUIDPipe) costId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.maintenanceCostsService.approveCost(costId, currentUser);
  }

  // ─── Reject Cost ────────────────────────────────────────────────────────────

  @Patch('costs/:costId/reject')
  @Roles('owner')
  @ApiOperation({ summary: 'Reject a pending maintenance cost entry with a reason' })
  @ApiParam({ name: 'costId', description: 'Maintenance cost UUID' })
  @ApiOkResponse({ description: 'Updated cost entry with rejected status' })
  rejectCost(
    @Param('costId', ParseUUIDPipe) costId: string,
    @Body() dto: RejectMaintenanceCostDto,
  ) {
    return this.maintenanceCostsService.rejectCost(costId, dto);
  }
}
