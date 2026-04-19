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
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import {
  DocumentsService,
  CreateDocumentDto,
  UpdateDocumentDto,
  QueryDocumentDto,
} from './documents.service';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'List documents with optional filters and pagination' })
  @ApiOkResponse({ description: 'Paginated list of documents' })
  findAll(@Query() query: QueryDocumentDto, @CurrentUser() _user: AuthUser) {
    return this.documentsService.findAll(query);
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  @Get(':id')
  @Roles('owner', 'employee')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiOkResponse({ description: 'Document detail' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.documentsService.findOne(id);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Roles('owner')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a document record (file already uploaded to Supabase Storage)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'file_url'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        file_url: { type: 'string' },
        file_type: { type: 'string' },
        file_size: { type: 'number' },
        property_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOkResponse({ description: 'Created document' })
  create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.documentsService.create(dto, currentUser.id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles('owner')
  @ApiOperation({ summary: 'Update document name or description' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiOkResponse({ description: 'Updated document' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.documentsService.update(id, dto);
  }

  // ─── Delete (soft) ────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiOkResponse({ description: 'Document deleted' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: AuthUser,
  ) {
    return this.documentsService.remove(id);
  }
}
