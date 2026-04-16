import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { QueryTenantDto } from './dto/query-tenant.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'List all tenants with search and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of tenants' })
  findAll(@Query() query: QueryTenantDto) {
    return this.tenantsService.findAll(query);
  }

  @Get(':id')
  @Roles('owner', 'employee', 'tenant')
  @ApiOperation({ summary: 'Get a tenant by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tenant details with contracts' })
  @ApiResponse({ status: 403, description: 'Forbidden – tenant accessing another record' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.tenantsService.findOne(id, currentUser);
  }

  @Post()
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Create a new tenant and Supabase Auth user' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 409, description: 'Phone number already in use' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Update tenant details' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('owner')
  @ApiOperation({ summary: 'Soft-delete a tenant (blocked if active contract exists)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete tenant with active contract' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.remove(id);
  }

  @Get(':id/payments')
  @Roles('owner', 'employee', 'tenant')
  @ApiOperation({ summary: 'Get payment history for a tenant' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Payment history' })
  @ApiResponse({ status: 403, description: 'Forbidden – tenant accessing another record' })
  getPayments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.tenantsService.getPayments(id, currentUser);
  }

  @Get(':id/contracts')
  @Roles('owner', 'employee', 'tenant')
  @ApiOperation({ summary: 'Get contracts list for a tenant' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Contracts list' })
  @ApiResponse({ status: 403, description: 'Forbidden – tenant accessing another record' })
  getContracts(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.tenantsService.getContracts(id, currentUser);
  }
}
