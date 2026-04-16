import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta } from '../../common/dto/pagination.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditLogDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.user_id) {
      where.user_id = query.user_id;
    }

    if (query.table_name) {
      where.table_name = query.table_name;
    }

    if (query.action) {
      where.action = query.action as Prisma.EnumAuditActionFilter;
    }

    if (query.record_id) {
      where.record_id = query.record_id;
    }

    // Date range filter on created_at
    if (query.from || query.to) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.from) {
        dateFilter.gte = new Date(query.from);
      }
      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.created_at = dateFilter;
    }

    // Search: match against table_name or record_id as a text field
    if (query.search) {
      where.OR = [
        {
          table_name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          user_agent: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          user_id: true,
          table_name: true,
          record_id: true,
          action: true,
          old_values: true,
          new_values: true,
          ip_address: true,
          user_agent: true,
          created_at: true,
        },
      }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}
