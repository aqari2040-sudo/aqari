import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { QueryUnitDto } from './dto/query-unit.dto';
import { buildPaginationMeta } from '../../common/dto/pagination.dto';
import { UnitStatus } from '@prisma/client';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUnitDto) {
    const { page = 1, limit = 20, sort_by = 'created_at', sort_order = 'desc', property_id, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      deleted_at: null,
    };

    if (property_id) {
      where.property_id = property_id;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.unit_number = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [units, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: {
          property: {
            select: { id: true, name: true, name_ar: true },
          },
        },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return {
      data: units,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, deleted_at: null },
      include: {
        property: {
          select: { id: true, name: true, name_ar: true, address: true, address_ar: true },
        },
        contracts: {
          where: { status: 'active', deleted_at: null },
          take: 1,
          include: {
            tenant: {
              select: { id: true, full_name: true, full_name_ar: true, phone: true, email: true },
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with id "${id}" not found`);
    }

    const activeContract = unit.contracts[0] ?? null;

    return {
      ...unit,
      contracts: undefined,
      current_contract: activeContract,
      current_tenant: activeContract?.tenant ?? null,
    };
  }

  async create(dto: CreateUnitDto) {
    // Validate property exists and is not deleted
    const property = await this.prisma.property.findFirst({
      where: { id: dto.property_id, deleted_at: null },
    });

    if (!property) {
      throw new NotFoundException(`Property with id "${dto.property_id}" not found`);
    }

    // Check unit_number uniqueness within property
    const existing = await this.prisma.unit.findFirst({
      where: {
        property_id: dto.property_id,
        unit_number: dto.unit_number,
        deleted_at: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Unit number "${dto.unit_number}" already exists in this property`,
      );
    }

    const unit = await this.prisma.unit.create({
      data: {
        property_id: dto.property_id,
        unit_number: dto.unit_number,
        status: dto.status,
        base_rent: dto.base_rent,
        size_sqft: dto.size_sqft,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        maintenance_budget: dto.maintenance_budget,
        maintenance_budget_period: dto.maintenance_budget_period,
        notes: dto.notes,
      },
      include: {
        property: {
          select: { id: true, name: true, name_ar: true },
        },
      },
    });

    return unit;
  }

  async update(id: string, dto: UpdateUnitDto) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, deleted_at: null },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with id "${id}" not found`);
    }

    // If changing status to 'occupied', verify there is an active contract
    if (dto.status === UnitStatus.occupied && unit.status !== UnitStatus.occupied) {
      const activeContract = await this.prisma.contract.findFirst({
        where: { unit_id: id, status: 'active', deleted_at: null },
      });

      if (!activeContract) {
        throw new BadRequestException(
          'Cannot set status to "occupied" without an active contract on this unit',
        );
      }
    }

    // If unit_number is changing, check uniqueness within property
    const targetPropertyId = dto.property_id ?? unit.property_id;
    const targetUnitNumber = dto.unit_number ?? unit.unit_number;

    if (dto.unit_number && (dto.unit_number !== unit.unit_number || (dto.property_id && dto.property_id !== unit.property_id))) {
      const duplicate = await this.prisma.unit.findFirst({
        where: {
          property_id: targetPropertyId,
          unit_number: targetUnitNumber,
          deleted_at: null,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Unit number "${targetUnitNumber}" already exists in this property`,
        );
      }
    }

    // If property_id is changing, validate new property exists
    if (dto.property_id && dto.property_id !== unit.property_id) {
      const property = await this.prisma.property.findFirst({
        where: { id: dto.property_id, deleted_at: null },
      });

      if (!property) {
        throw new NotFoundException(`Property with id "${dto.property_id}" not found`);
      }
    }

    const updated = await this.prisma.unit.update({
      where: { id },
      data: {
        ...(dto.property_id !== undefined && { property_id: dto.property_id }),
        ...(dto.unit_number !== undefined && { unit_number: dto.unit_number }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.base_rent !== undefined && { base_rent: dto.base_rent }),
        ...(dto.size_sqft !== undefined && { size_sqft: dto.size_sqft }),
        ...(dto.bedrooms !== undefined && { bedrooms: dto.bedrooms }),
        ...(dto.bathrooms !== undefined && { bathrooms: dto.bathrooms }),
        ...(dto.maintenance_budget !== undefined && { maintenance_budget: dto.maintenance_budget }),
        ...(dto.maintenance_budget_period !== undefined && { maintenance_budget_period: dto.maintenance_budget_period }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        property: {
          select: { id: true, name: true, name_ar: true },
        },
      },
    });

    return updated;
  }

  async remove(id: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, deleted_at: null },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with id "${id}" not found`);
    }

    // Block soft-delete if unit has an active contract
    const activeContract = await this.prisma.contract.findFirst({
      where: { unit_id: id, status: 'active', deleted_at: null },
    });

    if (activeContract) {
      throw new BadRequestException(
        'Cannot delete a unit that has an active contract. Terminate or expire the contract first.',
      );
    }

    await this.prisma.unit.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { message: 'Unit deleted successfully' };
  }

  async getHistory(id: string, type?: 'payments' | 'maintenance' | 'contracts') {
    const unit = await this.prisma.unit.findFirst({
      where: { id, deleted_at: null },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with id "${id}" not found`);
    }

    if (!type || type === 'payments') {
      const payments = await this.prisma.payment.findMany({
        where: { unit_id: id, deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 20,
        include: {
          payment_schedule: {
            select: { id: true },
          },
        },
      });

      if (type === 'payments') {
        return { type: 'payments', data: payments };
      }

      if (!type) {
        const [maintenance, contracts] = await Promise.all([
          this.prisma.maintenanceRequest.findMany({
            where: { unit_id: id, deleted_at: null },
            orderBy: { created_at: 'desc' },
            take: 20,
            include: {
              category: { select: { id: true, name: true } },
            },
          }),
          this.prisma.contract.findMany({
            where: { unit_id: id, deleted_at: null },
            orderBy: { created_at: 'desc' },
            take: 20,
            include: {
              tenant: { select: { id: true, full_name: true, full_name_ar: true } },
            },
          }),
        ]);

        return {
          payments,
          maintenance,
          contracts,
        };
      }
    }

    if (type === 'maintenance') {
      const maintenance = await this.prisma.maintenanceRequest.findMany({
        where: { unit_id: id, deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 20,
        include: {
          category: { select: { id: true, name: true } },
        },
      });
      return { type: 'maintenance', data: maintenance };
    }

    if (type === 'contracts') {
      const contracts = await this.prisma.contract.findMany({
        where: { unit_id: id, deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 20,
        include: {
          tenant: { select: { id: true, full_name: true, full_name_ar: true } },
        },
      });
      return { type: 'contracts', data: contracts };
    }
  }
}
