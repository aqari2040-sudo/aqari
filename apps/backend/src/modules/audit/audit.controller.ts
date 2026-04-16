import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ─── List audit logs ──────────────────────────────────────────────────────

  @Get()
  @Roles('owner')
  @ApiOperation({
    summary: 'Paginated audit log with filters',
    description:
      'Returns a paginated list of audit log entries. Supports filtering by user, table, action, date range, record ID, and full-text search.',
  })
  @ApiOkResponse({ description: 'Paginated audit log entries with meta' })
  findAll(@Query() query: QueryAuditLogDto) {
    return this.auditService.findAll(query);
  }
}
