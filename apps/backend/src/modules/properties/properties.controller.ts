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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UnitStatus } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'List properties with search, type filter, and pagination' })
  @ApiOkResponse({ description: 'Paginated list of properties with unit counts' })
  findAll(@Query() query: QueryPropertyDto, @CurrentUser() _user: AuthUser) {
    return this.propertiesService.findAll(query);
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  @Get(':id')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Get a property by ID with unit status summary' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiOkResponse({ description: 'Property detail with units summary' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.propertiesService.findOne(id);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Roles('owner')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new property' })
  @ApiOkResponse({ description: 'Created property' })
  create(@Body() dto: CreatePropertyDto, @CurrentUser() _user: AuthUser) {
    return this.propertiesService.create(dto);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Partially update a property' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiOkResponse({ description: 'Updated property' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.propertiesService.update(id, dto);
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a property. Blocked if property has occupied units.',
  })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiNoContentResponse({ description: 'Property deleted' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.propertiesService.remove(id);
  }

  // ─── List Units ───────────────────────────────────────────────────────────

  @Get(':id/units')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Get units under this property, optionally filtered by status' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UnitStatus,
    description: 'Filter units by status',
  })
  @ApiOkResponse({ description: 'List of units belonging to the property' })
  findUnits(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: UnitStatus | undefined,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.propertiesService.findUnits(id, status);
  }
}
