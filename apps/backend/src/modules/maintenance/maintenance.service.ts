import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { buildPaginationMeta } from '../../common/dto/pagination.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto';
import { OverrideDuplicateDto } from './dto/override-duplicate.dto';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function readSettingNumber(
  prisma: PrismaService,
  key: string,
  defaultValue: number,
): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) return defaultValue;
  const val = setting.value as unknown;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  if (typeof val === 'object' && val !== null && 'value' in val) {
    const inner = (val as { value: unknown }).value;
    if (typeof inner === 'number') return inner;
    if (typeof inner === 'string') {
      const parsed = parseFloat(inner);
      return isNaN(parsed) ? defaultValue : parsed;
    }
  }
  return defaultValue;
}

// ─── service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List Requests ──────────────────────────────────────────────────────────

  async findAll(query: QueryMaintenanceDto, currentUser: AuthUser) {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
      unit_id,
      status,
      category_id,
      priority,
      from,
      to,
    } = query;

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deleted_at: null };

    // Tenant sees only requests they reported
    if (currentUser.role === 'tenant') {
      where.reported_by = currentUser.id;
    }

    if (unit_id) where.unit_id = unit_id;
    if (status) where.status = status;
    if (category_id) where.category_id = category_id;
    if (priority) where.priority = priority;

    if (from || to) {
      where.created_at = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const orderBy: Record<string, string> = { [sort_by]: sort_order };

    const [data, total] = await Promise.all([
      this.prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          unit: {
            select: {
              id: true,
              unit_number: true,
              property: { select: { id: true, name: true } },
            },
          },
          category: {
            select: { id: true, name: true, name_ar: true },
          },
        },
      }),
      this.prisma.maintenanceRequest.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ─── Get One ────────────────────────────────────────────────────────────────

  async findOne(id: string, currentUser: AuthUser) {
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id, deleted_at: null },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            property: { select: { id: true, name: true } },
          },
        },
        category: { select: { id: true, name: true, name_ar: true } },
        maintenance_costs: {
          orderBy: { created_at: 'desc' },
        },
        duplicate_of: {
          select: { id: true, description: true, status: true, created_at: true },
        },
        duplicates: {
          select: { id: true, description: true, status: true, created_at: true },
          where: { deleted_at: null },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Maintenance request with id ${id} not found`);
    }

    // Tenant can only see requests they reported
    if (currentUser.role === 'tenant' && request.reported_by !== currentUser.id) {
      throw new ForbiddenException('You can only view maintenance requests you reported');
    }

    return request;
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateMaintenanceDto, currentUser: AuthUser) {
    // 1. Verify unit exists
    const unit = await this.prisma.unit.findFirst({ where: { id: dto.unit_id } });
    if (!unit) {
      throw new NotFoundException(`Unit with id ${dto.unit_id} not found`);
    }

    // 2. Verify category exists and is active
    const category = await this.prisma.maintenanceCategory.findFirst({
      where: { id: dto.category_id, is_active: true },
    });
    if (!category) {
      throw new NotFoundException(
        `Maintenance category with id ${dto.category_id} not found or inactive`,
      );
    }

    // 3. Read duplicate window from settings
    const windowDays = await readSettingNumber(
      this.prisma,
      'duplicate_maintenance_window_days',
      30,
    );

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    // 4. Duplicate detection query
    const existingRequests = await this.prisma.maintenanceRequest.findMany({
      where: {
        unit_id: dto.unit_id,
        category_id: dto.category_id,
        created_at: { gt: windowStart },
        deleted_at: null,
        status: { not: 'blocked_duplicate' },
      },
      include: {
        unit: { select: { id: true, unit_number: true } },
        category: { select: { id: true, name: true, name_ar: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const now = new Date();

    if (existingRequests.length > 0) {
      // Create the request as blocked_duplicate
      const newRequest = await this.prisma.maintenanceRequest.create({
        data: {
          unit_id: dto.unit_id,
          reported_by: currentUser.id,
          category_id: dto.category_id,
          description: dto.description,
          photos: dto.photos ?? [],
          priority: dto.priority ?? 'medium',
          status: 'blocked_duplicate',
          duplicate_of_id: existingRequests[0].id,
          created_at: now,
          updated_at: now,
        },
      });

      // Return 409 — caller (controller) throws ConflictException with this payload
      throw new ConflictException({
        duplicate_detected: true,
        request_id: newRequest.id,
        existing_requests: existingRequests.map((r) => ({
          id: r.id,
          category: r.category,
          unit: r.unit,
          created_at: r.created_at,
          status: r.status,
          description: r.description,
        })),
        requires_override: true,
        message: `Similar request found within ${windowDays} days. Owner override required.`,
      });
    }

    // 5. No duplicate — create normally
    const created = await this.prisma.maintenanceRequest.create({
      data: {
        unit_id: dto.unit_id,
        reported_by: currentUser.id,
        category_id: dto.category_id,
        description: dto.description,
        photos: dto.photos ?? [],
        priority: dto.priority ?? 'medium',
        status: 'submitted',
        created_at: now,
        updated_at: now,
      },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            property: { select: { id: true, name: true } },
          },
        },
        category: { select: { id: true, name: true, name_ar: true } },
      },
    });

    return created;
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateMaintenanceDto, currentUser: AuthUser) {
    const existing = await this.prisma.maintenanceRequest.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(`Maintenance request with id ${id} not found`);
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.photos !== undefined && { photos: dto.photos }),
        updated_at: new Date(),
      },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            property: { select: { id: true, name: true } },
          },
        },
        category: { select: { id: true, name: true, name_ar: true } },
      },
    });

    return updated;
  }

  // ─── Soft Delete ─────────────────────────────────────────────────────────────

  async remove(id: string) {
    const existing = await this.prisma.maintenanceRequest.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(`Maintenance request with id ${id} not found`);
    }

    await this.prisma.maintenanceRequest.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return { message: 'Maintenance request deleted successfully' };
  }

  // ─── Override Duplicate ──────────────────────────────────────────────────────

  async overrideDuplicate(id: string, dto: OverrideDuplicateDto, currentUser: AuthUser) {
    const existing = await this.prisma.maintenanceRequest.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(`Maintenance request with id ${id} not found`);
    }

    if (existing.status !== 'blocked_duplicate') {
      throw new BadRequestException(
        `Only requests with status 'blocked_duplicate' can be overridden. Current status: '${existing.status}'`,
      );
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'submitted',
        is_duplicate_override: true,
        duplicate_override_justification: dto.justification,
        duplicate_override_by: currentUser.id,
        updated_at: new Date(),
      },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            property: { select: { id: true, name: true } },
          },
        },
        category: { select: { id: true, name: true, name_ar: true } },
      },
    });

    return updated;
  }

  // ─── List Active Categories ──────────────────────────────────────────────────

  async findCategories() {
    return this.prisma.maintenanceCategory.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Recurring Alerts ────────────────────────────────────────────────────────

  async findRecurringAlerts() {
    const [threshold, windowDays] = await Promise.all([
      readSettingNumber(this.prisma, 'recurring_maintenance_threshold', 3),
      readSettingNumber(this.prisma, 'recurring_maintenance_window_days', 90),
    ]);

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    // Group by unit_id using Prisma groupBy
    const groups = await this.prisma.maintenanceRequest.groupBy({
      by: ['unit_id'],
      where: {
        created_at: { gt: windowStart },
        deleted_at: null,
      },
      _count: { id: true },
      having: {
        id: { _count: { gte: threshold } },
      },
    });

    if (groups.length === 0) return [];

    const unitIds = groups.map((g) => g.unit_id);

    const units = await this.prisma.unit.findMany({
      where: { id: { in: unitIds } },
      select: {
        id: true,
        unit_number: true,
        property: { select: { id: true, name: true } },
      },
    });

    const unitMap = new Map(units.map((u) => [u.id, u]));

    return groups
      .filter((g) => g._count.id >= threshold)
      .map((g) => {
        const unit = unitMap.get(g.unit_id);
        return {
          unit_id: g.unit_id,
          unit_number: unit?.unit_number ?? null,
          property_name: unit?.property?.name ?? null,
          request_count: g._count.id,
          period_days: windowDays,
        };
      })
      .sort((a, b) => b.request_count - a.request_count);
  }
}
