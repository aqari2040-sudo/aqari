import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta } from '../../common/dto/pagination.dto';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPropertyDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Parameters<typeof this.prisma.property.findMany>[0]['where'] = {
      deleted_at: null,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { name_ar: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.type) {
      where.type = query.type;
    }

    const orderBy: Parameters<typeof this.prisma.property.findMany>[0]['orderBy'] =
      query.sort_by
        ? { [query.sort_by]: query.sort_order ?? 'desc' }
        : { created_at: query.sort_order ?? 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { units: { where: { deleted_at: null } } },
          },
        },
      }),
      this.prisma.property.count({ where }),
    ]);

    const items = data.map((p) => ({
      ...p,
      unit_count: p._count.units,
      _count: undefined,
    }));

    return {
      data: items,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, deleted_at: null },
    });

    if (!property) {
      throw new NotFoundException(`Property with id '${id}' not found`);
    }

    // Get unit counts grouped by status
    const unitCounts = await this.prisma.unit.groupBy({
      by: ['status'],
      where: { property_id: id, deleted_at: null },
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {
      occupied: 0,
      vacant: 0,
      under_maintenance: 0,
    };

    for (const row of unitCounts) {
      statusMap[row.status] = row._count.id;
    }

    const total_units = Object.values(statusMap).reduce((a, b) => a + b, 0);

    return {
      ...property,
      units_summary: {
        total: total_units,
        occupied: statusMap['occupied'],
        vacant: statusMap['vacant'],
        under_maintenance: statusMap['under_maintenance'],
      },
    };
  }

  async create(dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: {
        name: dto.name,
        name_ar: dto.name_ar,
        type: dto.type,
        address: dto.address,
        address_ar: dto.address_ar,
      },
    });
  }

  async update(id: string, dto: UpdatePropertyDto) {
    await this.assertExists(id);

    return this.prisma.property.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.name_ar !== undefined && { name_ar: dto.name_ar }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.address_ar !== undefined && { address_ar: dto.address_ar }),
      },
    });
  }

  async remove(id: string) {
    await this.assertExists(id);

    const occupiedCount = await this.prisma.unit.count({
      where: {
        property_id: id,
        status: UnitStatus.occupied,
        deleted_at: null,
      },
    });

    if (occupiedCount > 0) {
      throw new BadRequestException(
        `Cannot delete property: it has ${occupiedCount} occupied unit(s). ` +
          `All units must be vacated before the property can be deleted.`,
      );
    }

    await this.prisma.property.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { message: 'Property deleted successfully' };
  }

  async findUnits(id: string, status?: UnitStatus) {
    await this.assertExists(id);

    const where: Parameters<typeof this.prisma.unit.findMany>[0]['where'] = {
      property_id: id,
      deleted_at: null,
    };

    if (status) {
      where.status = status;
    }

    const units = await this.prisma.unit.findMany({
      where,
      orderBy: { unit_number: 'asc' },
    });

    return { data: units };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.property.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Property with id '${id}' not found`);
    }
  }
}
