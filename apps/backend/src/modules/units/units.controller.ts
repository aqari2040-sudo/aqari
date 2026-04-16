import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { QueryUnitDto } from './dto/query-unit.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('units')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'List units with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of units including property name' })
  findAll(@Query() query: QueryUnitDto, @CurrentUser() user: AuthUser) {
    return this.unitsService.findAll(query);
  }

  @Get(':id')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Get unit by ID with current tenant and property info' })
  @ApiParam({ name: 'id', description: 'Unit UUID' })
  @ApiResponse({ status: 200, description: 'Returns unit details with current tenant from active contract' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.unitsService.findOne(id);
  }

  @Post()
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Create a new unit' })
  @ApiResponse({ status: 201, description: 'Unit created successfully' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiResponse({ status: 409, description: 'Unit number already exists in this property' })
  create(@Body() dto: CreateUnitDto, @CurrentUser() user: AuthUser) {
    return this.unitsService.create(dto);
  }

  @Patch(':id')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Update a unit' })
  @ApiParam({ name: 'id', description: 'Unit UUID' })
  @ApiResponse({ status: 200, description: 'Unit updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot set status to occupied without an active contract' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @ApiResponse({ status: 409, description: 'Unit number already exists in this property' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.unitsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a unit (owner only)' })
  @ApiParam({ name: 'id', description: 'Unit UUID' })
  @ApiResponse({ status: 200, description: 'Unit deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete unit with an active contract' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.unitsService.remove(id);
  }

  @Get(':id/history')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Get combined timeline history for a unit' })
  @ApiParam({ name: 'id', description: 'Unit UUID' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['payments', 'maintenance', 'contracts'],
    description: 'Filter history by type. Omit for all types.',
  })
  @ApiResponse({ status: 200, description: 'Returns last 20 records sorted by created_at desc' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type?: 'payments' | 'maintenance' | 'contracts',
    @CurrentUser() user?: AuthUser,
  ) {
    return this.unitsService.getHistory(id, type);
  }
}
