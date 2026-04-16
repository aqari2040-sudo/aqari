import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateMaintenanceCostDto } from './dto/create-maintenance-cost.dto';
import { RejectMaintenanceCostDto } from './dto/reject-maintenance-cost.dto';

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

function getPeriodStart(period: string): Date {
  const now = new Date();
  if (period === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === 'quarterly') {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), quarterMonth, 1);
  }
  // yearly
  return new Date(now.getFullYear(), 0, 1);
}

// ─── service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MaintenanceCostsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Submit Cost ─────────────────────────────────────────────────────────────

  async submitCost(
    maintenanceRequestId: string,
    dto: CreateMaintenanceCostDto,
    currentUser: AuthUser,
  ) {
    // 1. Verify the maintenance request exists
    const maintenanceRequest = await this.prisma.maintenanceRequest.findFirst({
      where: { id: maintenanceRequestId, deleted_at: null },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            maintenance_budget: true,
            maintenance_budget_period: true,
          },
        },
      },
    });

    if (!maintenanceRequest) {
      throw new NotFoundException(
        `Maintenance request with id ${maintenanceRequestId} not found`,
      );
    }

    const unit = maintenanceRequest.unit;
    const newAmount = new Prisma.Decimal(dto.amount);
    const now = new Date();

    // ── Budget check ─────────────────────────────────────────────────────────
    let budgetExceeded = false;

    const maintenanceBudget = unit.maintenance_budget
      ? new Prisma.Decimal(unit.maintenance_budget)
      : null;

    if (maintenanceBudget && unit.maintenance_budget_period) {
      const periodStart = getPeriodStart(unit.maintenance_budget_period as string);

      const approvedCosts = await this.prisma.maintenanceCost.aggregate({
        where: {
          status: 'approved',
          created_at: { gte: periodStart },
          maintenance_request: {
            unit_id: unit.id,
          },
        },
        _sum: { amount: true },
      });

      const currentTotal = new Prisma.Decimal(
        approvedCosts._sum.amount ?? 0,
      );

      if (currentTotal.plus(newAmount).gt(maintenanceBudget)) {
        budgetExceeded = true;
      }
    }

    // ── Suspicious cost check ─────────────────────────────────────────────────
    let suspiciousCost = false;

    const multiplier = await readSettingNumber(
      this.prisma,
      'suspicious_cost_multiplier',
      2.0,
    );

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const avgResult = await this.prisma.maintenanceCost.aggregate({
      where: {
        created_at: { gte: twelveMonthsAgo },
        maintenance_request: { unit_id: unit.id },
      },
      _avg: { amount: true },
    });

    const avgAmount = avgResult._avg.amount
      ? new Prisma.Decimal(avgResult._avg.amount)
      : null;

    if (avgAmount && avgAmount.gt(0)) {
      if (newAmount.gt(avgAmount.mul(multiplier))) {
        suspiciousCost = true;
      }
    }

    // ── Create the cost ───────────────────────────────────────────────────────
    const cost = await this.prisma.maintenanceCost.create({
      data: {
        maintenance_request_id: maintenanceRequestId,
        submitted_by: currentUser.id,
        amount: newAmount,
        description: dto.description,
        receipt_url: dto.receipt_url ?? null,
        status: 'pending',
        created_at: now,
        updated_at: now,
      },
    });

    return {
      ...cost,
      ...(budgetExceeded && { budget_exceeded: true }),
      ...(suspiciousCost && { suspicious_cost: true }),
    };
  }

  // ─── Approve Cost ─────────────────────────────────────────────────────────────

  async approveCost(costId: string, currentUser: AuthUser) {
    const cost = await this.prisma.maintenanceCost.findUnique({
      where: { id: costId },
    });

    if (!cost) {
      throw new NotFoundException(`Maintenance cost with id ${costId} not found`);
    }

    if (cost.status !== 'pending') {
      throw new BadRequestException(
        `Cost cannot be approved because its status is '${cost.status}'. Only 'pending' costs can be approved.`,
      );
    }

    const updated = await this.prisma.maintenanceCost.update({
      where: { id: costId },
      data: {
        status: 'approved',
        approved_by: currentUser.id,
        approved_at: new Date(),
        updated_at: new Date(),
      },
    });

    return updated;
  }

  // ─── Reject Cost ──────────────────────────────────────────────────────────────

  async rejectCost(costId: string, dto: RejectMaintenanceCostDto) {
    const cost = await this.prisma.maintenanceCost.findUnique({
      where: { id: costId },
    });

    if (!cost) {
      throw new NotFoundException(`Maintenance cost with id ${costId} not found`);
    }

    if (cost.status !== 'pending') {
      throw new BadRequestException(
        `Cost cannot be rejected because its status is '${cost.status}'. Only 'pending' costs can be rejected.`,
      );
    }

    const updated = await this.prisma.maintenanceCost.update({
      where: { id: costId },
      data: {
        status: 'rejected',
        rejection_reason: dto.rejection_reason,
        updated_at: new Date(),
      },
    });

    return updated;
  }

  // ─── List Costs for Request ───────────────────────────────────────────────────

  async findCostsByRequest(maintenanceRequestId: string) {
    const maintenanceRequest = await this.prisma.maintenanceRequest.findFirst({
      where: { id: maintenanceRequestId, deleted_at: null },
    });

    if (!maintenanceRequest) {
      throw new NotFoundException(
        `Maintenance request with id ${maintenanceRequestId} not found`,
      );
    }

    const costs = await this.prisma.maintenanceCost.findMany({
      where: { maintenance_request_id: maintenanceRequestId },
      orderBy: { created_at: 'desc' },
    });

    const totalApproved = costs
      .filter((c) => c.status === 'approved')
      .reduce((sum, c) => sum.plus(c.amount), new Prisma.Decimal(0));

    return {
      data: costs,
      summary: {
        total_approved: totalApproved,
        total_costs: costs.length,
      },
    };
  }
}
