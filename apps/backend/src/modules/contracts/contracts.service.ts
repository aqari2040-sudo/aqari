import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, PaymentFrequency, PaymentScheduleStatus, UnitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { QueryContractDto } from './dto/query-contract.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List ────────────────────────────────────────────────────────────────────

  async findAll(query: QueryContractDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Parameters<typeof this.prisma.contract.findMany>[0]['where'] = {
      deleted_at: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.tenant_id) {
      where.tenant_id = query.tenant_id;
    }

    if (query.unit_id) {
      where.unit_id = query.unit_id;
    }

    if (query.expiring_within_days !== undefined) {
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + query.expiring_within_days);

      where.end_date = {
        gte: now,
        lte: future,
      };
    }

    const orderBy: Parameters<typeof this.prisma.contract.findMany>[0]['orderBy'] =
      query.sort_by
        ? { [query.sort_by]: query.sort_order ?? 'desc' }
        : { created_at: query.sort_order ?? 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          tenant: {
            select: { id: true, full_name: true, full_name_ar: true },
          },
          unit: {
            select: { id: true, unit_number: true, property_id: true },
          },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ─── Get One ─────────────────────────────────────────────────────────────────

  async findOne(id: string, currentUser: AuthUser) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, deleted_at: null },
      include: {
        tenant: true,
        unit: {
          include: {
            property: true,
          },
        },
        payment_schedules: {
          orderBy: { due_date: 'asc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with id '${id}' not found`);
    }

    // Tenant can only view their own contract
    if (currentUser.role === 'tenant') {
      const tenant = await this.prisma.tenant.findFirst({
        where: { user_id: currentUser.id, deleted_at: null },
        select: { id: true },
      });

      if (!tenant || tenant.id !== contract.tenant_id) {
        throw new ForbiddenException('You do not have access to this contract');
      }
    }

    return contract;
  }

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateContractDto) {
    // 1. Validate tenant exists
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: dto.tenant_id, deleted_at: null },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id '${dto.tenant_id}' not found`);
    }

    // 2. Validate unit exists
    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unit_id, deleted_at: null },
      select: { id: true },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with id '${dto.unit_id}' not found`);
    }

    // 3. Check for overlapping active contract on this unit
    const existingContract = await this.prisma.contract.findFirst({
      where: {
        unit_id: dto.unit_id,
        status: ContractStatus.active,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (existingContract) {
      throw new BadRequestException('Unit already has an active contract');
    }

    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    if (endDate <= startDate) {
      throw new BadRequestException('end_date must be after start_date');
    }

    // 4. Generate payment schedule dates
    const scheduleDates = this.generateScheduleDates(startDate, endDate, dto.payment_frequency);

    // 5. Create contract + set unit to occupied + create payment schedules atomically
    const contract = await this.prisma.$transaction(async (tx) => {
      // Set unit to occupied
      await tx.unit.update({
        where: { id: dto.unit_id },
        data: { status: UnitStatus.occupied },
      });

      // Create the contract
      const created = await tx.contract.create({
        data: {
          tenant_id: dto.tenant_id,
          unit_id: dto.unit_id,
          start_date: startDate,
          end_date: endDate,
          rent_amount: dto.rent_amount,
          payment_frequency: dto.payment_frequency,
          grace_period_days: dto.grace_period_days ?? 7,
          document_url: dto.document_url ?? null,
          status: ContractStatus.active,
          notes: dto.notes ?? null,
          payment_schedules: {
            create: scheduleDates.map((dueDate) => ({
              due_date: dueDate,
              amount_due: dto.rent_amount,
              amount_paid: 0,
              status: PaymentScheduleStatus.pending,
            })),
          },
        },
        include: {
          payment_schedules: {
            orderBy: { due_date: 'asc' },
          },
        },
      });

      return created;
    });

    return contract;
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateContractDto) {
    await this.assertExists(id);

    const data: Parameters<typeof this.prisma.contract.update>[0]['data'] = {};

    if (dto.start_date !== undefined) data.start_date = new Date(dto.start_date);
    if (dto.end_date !== undefined) data.end_date = new Date(dto.end_date);
    if (dto.rent_amount !== undefined) data.rent_amount = dto.rent_amount;
    if (dto.payment_frequency !== undefined) data.payment_frequency = dto.payment_frequency;
    if (dto.grace_period_days !== undefined) data.grace_period_days = dto.grace_period_days;
    if (dto.document_url !== undefined) data.document_url = dto.document_url;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.contract.update({
      where: { id },
      data,
      include: {
        tenant: {
          select: { id: true, full_name: true, full_name_ar: true },
        },
        unit: {
          select: { id: true, unit_number: true },
        },
      },
    });
  }

  // ─── Terminate (soft delete) ─────────────────────────────────────────────────

  async terminate(id: string) {
    const contract = await this.assertExists(id);

    await this.prisma.$transaction(async (tx) => {
      // 1. Terminate the contract
      await tx.contract.update({
        where: { id },
        data: {
          status: ContractStatus.terminated,
          deleted_at: new Date(),
        },
      });

      // 2. Set unit back to vacant
      await tx.unit.update({
        where: { id: contract.unit_id },
        data: { status: UnitStatus.vacant },
      });

      // 3. Cancel all pending payment schedules
      await tx.paymentSchedule.updateMany({
        where: {
          contract_id: id,
          status: PaymentScheduleStatus.pending,
        },
        data: { status: PaymentScheduleStatus.cancelled },
      });
    });

    return { message: 'Contract terminated successfully' };
  }

  // ─── Upload document ─────────────────────────────────────────────────────────

  async uploadDocument(id: string, documentUrl: string) {
    await this.assertExists(id);

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { document_url: documentUrl },
      select: { id: true, document_url: true },
    });

    return updated;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Generate a list of due dates starting from `start`, stepping by the
   * frequency interval, stopping when the next date would exceed `end`.
   */
  generateScheduleDates(
    start: Date,
    end: Date,
    frequency: PaymentFrequency,
  ): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);

    const months =
      frequency === PaymentFrequency.monthly
        ? 1
        : frequency === PaymentFrequency.quarterly
          ? 3
          : 12;

    while (current <= end) {
      dates.push(new Date(current));
      current.setMonth(current.getMonth() + months);
    }

    return dates;
  }

  private async assertExists(id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, unit_id: true },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with id '${id}' not found`);
    }

    return contract;
  }
}
