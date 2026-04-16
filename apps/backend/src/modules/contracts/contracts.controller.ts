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
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { QueryContractDto } from './dto/query-contract.dto';

class UploadDocumentDto {
  document_url: string;
}

@ApiTags('contracts')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles('owner', 'employee')
  @ApiOperation({
    summary: 'List contracts with optional filters and pagination',
  })
  @ApiOkResponse({ description: 'Paginated list of contracts' })
  findAll(@Query() query: QueryContractDto, @CurrentUser() _user: AuthUser) {
    return this.contractsService.findAll(query);
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  @Get(':id')
  @Roles('owner', 'employee', 'tenant')
  @ApiOperation({
    summary: 'Get contract detail. Tenants can only access their own contract.',
  })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiOkResponse({ description: 'Contract detail with tenant, unit, property, and payment schedules' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.contractsService.findOne(id, currentUser);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Roles('owner')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a contract and auto-generate payment schedules',
  })
  @ApiOkResponse({ description: 'Created contract with payment schedules' })
  create(@Body() dto: CreateContractDto, @CurrentUser() _user: AuthUser) {
    return this.contractsService.create(dto);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles('owner')
  @ApiOperation({ summary: 'Partially update a contract' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiOkResponse({ description: 'Updated contract' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.contractsService.update(id, dto);
  }

  // ─── Terminate (soft delete) ───────────────────────────────────────────────

  @Delete(':id')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Terminate a contract: soft-delete, set unit to vacant, cancel pending payment schedules',
  })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiNoContentResponse({ description: 'Contract terminated' })
  terminate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.contractsService.terminate(id);
  }

  // ─── Upload document ──────────────────────────────────────────────────────

  @Post(':id/upload-document')
  @Roles('owner', 'employee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Attach a document URL to the contract (Supabase Storage URL from frontend)',
  })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['document_url'],
      properties: {
        document_url: { type: 'string', example: 'https://storage.example.com/contracts/abc.pdf' },
      },
    },
  })
  @ApiOkResponse({ description: 'Updated contract document URL' })
  uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UploadDocumentDto,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.contractsService.uploadDocument(id, body.document_url);
  }
}
