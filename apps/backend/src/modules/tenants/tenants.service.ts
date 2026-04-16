import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { QueryTenantDto } from './dto/query-tenant.dto';
import { buildPaginationMeta } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

function generatePassword(length = 12): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll(query: QueryTenantDto) {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
      search,
      property_id,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { full_name_ar: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (property_id) {
      where.contracts = {
        some: {
          unit: { property_id },
          deleted_at: null,
        },
      };
    }

    const orderBy: any = { [sort_by]: sort_order };

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          contracts: {
            where: {
              status: 'active',
              deleted_at: null,
            },
            select: {
              id: true,
              status: true,
              unit: {
                select: {
                  id: true,
                  unit_number: true,
                },
              },
            },
            take: 1,
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string, currentUser: AuthUser) {
    if (currentUser.role === 'tenant') {
      if (currentUser.tenant_id !== id) {
        throw new ForbiddenException('You can only view your own profile');
      }
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deleted_at: null },
      include: {
        contracts: {
          where: { deleted_at: null },
          include: {
            unit: {
              select: {
                id: true,
                unit_number: true,
                property: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }

    return tenant;
  }

  async create(dto: CreateTenantDto) {
    // 1. Check phone uniqueness (non-soft-deleted)
    const existing = await this.prisma.tenant.findFirst({
      where: { phone: dto.phone, deleted_at: null },
    });

    if (existing) {
      throw new ConflictException(
        `A tenant with phone ${dto.phone} already exists`,
      );
    }

    // 2. Generate a random 12-char password
    const password = generatePassword(12);

    // 3. Create Supabase Auth user — throws BadRequestException if it fails
    const supabaseUser = await this.authService.createUserWithRole(
      dto.email,
      dto.phone,
      password,
      'tenant',
      { full_name: dto.full_name },
    );

    if (!supabaseUser) {
      throw new BadRequestException(
        'Failed to create authentication user for tenant',
      );
    }

    // 4. Create tenant record using supabase user.id
    const tenant = await this.prisma.tenant.create({
      data: {
        user_id: supabaseUser.id,
        full_name: dto.full_name,
        full_name_ar: dto.full_name_ar,
        id_type: dto.id_type,
        id_number: dto.id_number,
        phone: dto.phone,
        email: dto.email ?? null,
        emergency_contact_name: dto.emergency_contact_name ?? null,
        emergency_contact_phone: dto.emergency_contact_phone ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deleted_at: null },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }

    // If phone is being changed, verify uniqueness
    if (dto.phone && dto.phone !== tenant.phone) {
      const phoneConflict = await this.prisma.tenant.findFirst({
        where: { phone: dto.phone, deleted_at: null, id: { not: id } },
      });
      if (phoneConflict) {
        throw new ConflictException(
          `A tenant with phone ${dto.phone} already exists`,
        );
      }
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...dto,
        updated_at: new Date(),
      },
    });

    return updated;
  }

  async remove(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deleted_at: null },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }

    // Block deletion if tenant has an active contract
    const activeContract = await this.prisma.contract.findFirst({
      where: {
        tenant_id: id,
        status: 'active',
        deleted_at: null,
      },
    });

    if (activeContract) {
      throw new BadRequestException(
        'Cannot delete tenant with an active contract. Terminate the contract first.',
      );
    }

    await this.prisma.tenant.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { message: 'Tenant deleted successfully' };
  }

  async getPayments(id: string, currentUser: AuthUser) {
    if (currentUser.role === 'tenant') {
      if (currentUser.tenant_id !== id) {
        throw new ForbiddenException('You can only view your own payments');
      }
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deleted_at: null },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }

    const payments = await this.prisma.payment.findMany({
      where: { tenant_id: id },
      orderBy: { created_at: 'desc' },
      include: {
        schedule: {
          select: {
            id: true,
            due_date: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    return payments;
  }

  async getContracts(id: string, currentUser: AuthUser) {
    if (currentUser.role === 'tenant') {
      if (currentUser.tenant_id !== id) {
        throw new ForbiddenException('You can only view your own contracts');
      }
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deleted_at: null },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }

    const contracts = await this.prisma.contract.findMany({
      where: { tenant_id: id, deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            property: { select: { id: true, name: true } },
          },
        },
      },
    });

    return contracts;
  }
}
