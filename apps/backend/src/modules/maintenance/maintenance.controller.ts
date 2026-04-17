import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { OverrideDuplicateDto } from './dto/override-duplicate.dto';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // ─── List Active Categories ────────────────────────────────────────────────
  // NOTE: Must be defined before /:id routes to prevent 'categories' being
  // parsed as a UUID param.

  @Get('categories')
  @ApiOperation({ summary: 'List all active maintenance categories' })
  @ApiOkResponse({ description: 'Array of active maintenance categories' })
  findCategories() {
    return this.maintenanceService.findCategories();
  }

  // ─── Recurring Alerts ──────────────────────────────────────────────────────

  @Get('recurring-alerts')
  @Roles('owner', 'employee')
  @ApiOperation({
    summary: 'List units with recurring maintenance requests above threshold',
  })
  @ApiOkResponse({
    description:
      'Units with request_count >= threshold within the configured window',
  })
  findRecurringAlerts() {
    return this.maintenanceService.findRecurringAlerts();
  }

  // ─── List Requests ─────────────────────────────────────────────────────────

  @Get()
  @Roles('owner', 'employee', 'tenant')
  @ApiOperation({
    summary:
      'List maintenance requests with filters (unit_id, status, category_id, priority, date range)',
  })
  @ApiOkResponse({ description: 'Paginated list of maintenance requests' })
  findAll(
    @Query() query: QueryMaintenanceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.maintenanceService.findAll(query, currentUser);
  }

  // ─── Get One ───────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a maintenance request by ID. Tenants can only see requests they reported.',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiOkResponse({ description: 'Maintenance request detail with costs and photos' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.maintenanceService.findOne(id, currentUser);
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a maintenance request. Returns 409 if a duplicate is detected within the configured window.',
  })
  @ApiOkResponse({ description: 'Created maintenance request or 409 duplicate conflict' })
  create(
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.maintenanceService.create(dto, currentUser);
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Update status, priority, or description of a maintenance request' })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiOkResponse({ description: 'Updated maintenance request' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.maintenanceService.update(id, dto, currentUser);
  }

  // ─── Soft Delete ───────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a maintenance request' })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiNoContentResponse({ description: 'Maintenance request deleted' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenanceService.remove(id);
  }

  // ─── Override Duplicate ────────────────────────────────────────────────────

  @Post(':id/override-duplicate')
  @Roles('owner')
  @ApiOperation({
    summary:
      'Override a duplicate-blocked maintenance request. Requires justification.',
  })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID with status blocked_duplicate' })
  @ApiOkResponse({ description: 'Request promoted to submitted status' })
  overrideDuplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OverrideDuplicateDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.maintenanceService.overrideDuplicate(id, dto, currentUser);
  }
}
