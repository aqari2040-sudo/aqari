import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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

function toNumber(val: Prisma.Decimal | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  return (val as Prisma.Decimal).toNumber();
}

function currentMonthRange(): { gte: Date; lte: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { gte: start, lte: end };
}

function currentMonthLabel(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
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
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Occupancy ─────────────────────────────────────────────────────────────

  async getOccupancy(propertyId?: string) {
    const baseWhere: Prisma.UnitWhereInput = {
      deleted_at: null,
      ...(propertyId ? { property_id: propertyId } : {}),
    };

    // Group by status to get counts
    const statusGroups = await this.prisma.unit.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { id: true },
    });

    let occupied = 0;
    let vacant = 0;
    let underMaintenance = 0;

    for (const g of statusGroups) {
      const count = g._count.id;
      const status = (g.status as string).toLowerCase();
      if (status === 'occupied') occupied = count;
      else if (status === 'vacant') vacant = count;
      else if (status === 'under_maintenance' || status === 'maintenance') underMaintenance = count;
    }

    const totalUnits = occupied + vacant + underMaintenance;
    const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 1000) / 10 : 0;

    // Per-property breakdown
    const properties = await this.prisma.property.findMany({
      where: {
        deleted_at: null,
        ...(propertyId ? { id: propertyId } : {}),
      },
      select: {
        id: true,
        name: true,
        units: {
          where: { deleted_at: null },
          select: { status: true },
        },
      },
    });

    const byProperty = properties.map((prop) => {
      let pOccupied = 0;
      let pVacant = 0;
      let pMaintenance = 0;
      for (const unit of prop.units) {
        const s = (unit.status as string).toLowerCase();
        if (s === 'occupied') pOccupied++;
        else if (s === 'vacant') pVacant++;
        else if (s === 'under_maintenance' || s === 'maintenance') pMaintenance++;
      }
      return {
        property_id: prop.id,
        property_name: prop.name,
        total: prop.units.length,
        occupied: pOccupied,
        vacant: pVacant,
        under_maintenance: pMaintenance,
      };
    });

    return {
      total_units: totalUnits,
      occupied,
      vacant,
      under_maintenance: underMaintenance,
      occupancy_rate: occupancyRate,
      by_property: byProperty,
    };
  }

  // ─── Payments Summary ───────────────────────────────────────────────────────

  async getPaymentsSummary(propertyId?: string) {
    const monthRange = currentMonthRange();

    // Build property filter: PaymentSchedule -> Contract -> Unit -> Property
    const propertyFilter: Prisma.PaymentScheduleWhereInput = propertyId
      ? {
          contract: {
            unit: { property_id: propertyId, deleted_at: null },
          },
        }
      : {};

    const baseWhere: Prisma.PaymentScheduleWhereInput = {
      due_date: monthRange,
      ...propertyFilter,
    };

    // Sum amount_due and amount_paid for current month
    const totals = await this.prisma.paymentSchedule.aggregate({
      where: baseWhere,
      _sum: {
        amount_due: true,
        amount_paid: true,
      },
    });

    const totalDue = toNumber(totals._sum.amount_due);
    const totalCollected = toNumber(totals._sum.amount_paid);

    // Overdue: status = 'overdue' (no date filter — overdue spans all time)
    const overdueWhere: Prisma.PaymentScheduleWhereInput = {
      status: 'overdue',
      ...propertyFilter,
    };

    const overdueSchedules = await this.prisma.paymentSchedule.findMany({
      where: overdueWhere,
      select: {
        id: true,
        amount_due: true,
        amount_paid: true,
        due_date: true,
        contract: {
          select: {
            unit: { select: { unit_number: true } },
            tenant: { select: { id: true, full_name: true } },
          },
        },
      },
    });

    const now = new Date();

    const overdueTotal = overdueSchedules.reduce(
      (sum, s) => sum + Math.max(0, toNumber(s.amount_due) - toNumber(s.amount_paid)),
      0,
    );

    const collectionRate =
      totalDue > 0 ? Math.round((totalCollected / totalDue) * 1000) / 10 : 0;

    const overdueTenants = overdueSchedules.map((s) => {
      const amountOverdue = Math.max(0, toNumber(s.amount_due) - toNumber(s.amount_paid));
      const daysOverdue =
        s.due_date
          ? Math.max(0, Math.floor((now.getTime() - new Date(s.due_date).getTime()) / 86_400_000))
          : 0;
      return {
        tenant_id: s.contract?.tenant?.id ?? null,
        tenant_name: s.contract?.tenant?.full_name ?? null,
        unit_number: s.contract?.unit?.unit_number ?? null,
        amount_overdue: amountOverdue,
        days_overdue: daysOverdue,
      };
    });

    return {
      month: currentMonthLabel(),
      total_due: totalDue,
      total_collected: totalCollected,
      total_overdue: overdueTotal,
      collection_rate: collectionRate,
      overdue_tenants: overdueTenants,
    };
  }

  // ─── Maintenance Summary ────────────────────────────────────────────────────

  async getMaintenanceSummary(propertyId?: string) {
    const monthRange = currentMonthRange();

    // MaintenanceCost -> MaintenanceRequest -> Unit -> Property
    const propertyFilter: Prisma.MaintenanceCostWhereInput = propertyId
      ? { maintenance_request: { unit: { property_id: propertyId, deleted_at: null } } }
      : {};

    // Pending approvals count
    const pendingApprovals = await this.prisma.maintenanceCost.count({
      where: {
        status: 'pending',
        ...propertyFilter,
      },
    });

    // Total approved cost this month
    const monthlyApproved = await this.prisma.maintenanceCost.aggregate({
      where: {
        status: 'approved',
        created_at: monthRange,
        ...propertyFilter,
      },
      _sum: { amount: true },
    });

    const totalCostThisMonth = toNumber(monthlyApproved._sum.amount);

    // Single fetch for both category + property breakdowns
    const costsThisMonth = await this.prisma.maintenanceCost.findMany({
      where: {
        status: 'approved',
        created_at: monthRange,
        ...propertyFilter,
      },
      select: {
        amount: true,
        maintenance_request: {
          select: {
            category: { select: { id: true, name: true } },
            unit: {
              select: {
                property: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const categoryTotals = new Map<
      string,
      { category_name: string; total_cost: number; request_count: number }
    >();
    const propertyTotals = new Map<
      string,
      { property_id: string; property_name: string; total_cost: number; request_count: number }
    >();

    for (const cost of costsThisMonth) {
      const amt = toNumber(cost.amount);
      const cat = cost.maintenance_request?.category;
      const prop = cost.maintenance_request?.unit?.property;

      if (cat) {
        const existing = categoryTotals.get(cat.id);
        if (existing) {
          existing.total_cost += amt;
          existing.request_count += 1;
        } else {
          categoryTotals.set(cat.id, {
            category_name: cat.name,
            total_cost: amt,
            request_count: 1,
          });
        }
      }

      if (prop) {
        const existing = propertyTotals.get(prop.id);
        if (existing) {
          existing.total_cost += amt;
          existing.request_count += 1;
        } else {
          propertyTotals.set(prop.id, {
            property_id: prop.id,
            property_name: prop.name,
            total_cost: amt,
            request_count: 1,
          });
        }
      }
    }

    const byCategory = Array.from(categoryTotals.values());
    const byProperty = Array.from(propertyTotals.values());

    // Recurring alerts: units with >= threshold requests in last windowDays days
    const [threshold, windowDays] = await Promise.all([
      readSettingNumber(this.prisma, 'recurring_maintenance_threshold', 3),
      readSettingNumber(this.prisma, 'recurring_maintenance_window_days', 90),
    ]);

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    const recurringGroups = await this.prisma.maintenanceRequest.groupBy({
      by: ['unit_id'],
      where: {
        created_at: { gt: windowStart },
        deleted_at: null,
        ...(propertyId ? { unit: { property_id: propertyId } } : {}),
      },
      _count: { id: true },
      having: {
        id: { _count: { gte: threshold } },
      },
    });

    const recurringUnitIds = recurringGroups.map((g) => g.unit_id);

    const recurringUnits =
      recurringUnitIds.length > 0
        ? await this.prisma.unit.findMany({
            where: { id: { in: recurringUnitIds } },
            select: { id: true, unit_number: true },
          })
        : [];

    const recurringUnitMap = new Map(recurringUnits.map((u) => [u.id, u]));

    const recurringAlerts = recurringGroups.map((g) => ({
      unit_id: g.unit_id,
      unit_number: recurringUnitMap.get(g.unit_id)?.unit_number ?? null,
      request_count: g._count.id,
      period_days: windowDays,
    }));

    return {
      pending_approvals: pendingApprovals,
      total_cost_this_month: totalCostThisMonth,
      by_category: byCategory,
      by_property: byProperty,
      recurring_alerts: recurringAlerts,
    };
  }

  // ─── Alerts ─────────────────────────────────────────────────────────────────

  async getAlerts(propertyId?: string) {
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // ── Expiring contracts ─────────────────────────────────────────────────
    const expiringContracts = await this.prisma.contract.findMany({
      where: {
        status: 'active',
        deleted_at: null,
        end_date: {
          gte: now,
          lte: sixtyDaysFromNow,
        },
        ...(propertyId
          ? { unit: { property_id: propertyId, deleted_at: null } }
          : {}),
      },
      select: {
        id: true,
        end_date: true,
        tenant: { select: { full_name: true } },
        unit: { select: { unit_number: true } },
      },
      orderBy: { end_date: 'asc' },
    });

    const expiringContractsMapped = expiringContracts.map((c) => ({
      contract_id: c.id,
      tenant_name: c.tenant?.full_name ?? null,
      unit_number: c.unit?.unit_number ?? null,
      end_date: c.end_date,
      days_remaining: c.end_date
        ? Math.ceil(
            (new Date(c.end_date).getTime() - now.getTime()) / 86_400_000,
          )
        : null,
    }));

    // ── Suspicious costs ───────────────────────────────────────────────────
    const multiplier = await readSettingNumber(
      this.prisma,
      'suspicious_cost_multiplier',
      2.0,
    );

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const pendingCosts = await this.prisma.maintenanceCost.findMany({
      where: {
        status: 'pending',
        ...(propertyId
          ? { maintenance_request: { unit: { property_id: propertyId, deleted_at: null } } }
          : {}),
      },
      select: {
        id: true,
        amount: true,
        maintenance_request: {
          select: {
            unit_id: true,
            unit: { select: { unit_number: true } },
          },
        },
      },
    });

    const suspiciousCosts: {
      cost_id: string;
      unit_number: string | null;
      amount: number;
      unit_average: number;
    }[] = [];

    // Batch: fetch unit averages for all relevant units in one query
    const candidateUnitIds = Array.from(
      new Set(
        pendingCosts
          .map((c) => c.maintenance_request?.unit_id)
          .filter((id): id is string => !!id),
      ),
    );

    const unitAverages = candidateUnitIds.length
      ? await this.prisma.maintenanceCost.findMany({
          where: {
            status: 'approved',
            created_at: { gte: twelveMonthsAgo },
            maintenance_request: { unit_id: { in: candidateUnitIds } },
          },
          select: {
            amount: true,
            maintenance_request: { select: { unit_id: true } },
          },
        })
      : [];

    const unitAvgMap = new Map<string, { sum: number; count: number }>();
    for (const row of unitAverages) {
      const uid = row.maintenance_request?.unit_id;
      if (!uid) continue;
      const e = unitAvgMap.get(uid);
      if (e) {
        e.sum += toNumber(row.amount);
        e.count += 1;
      } else {
        unitAvgMap.set(uid, { sum: toNumber(row.amount), count: 1 });
      }
    }

    for (const cost of pendingCosts) {
      const unitId = cost.maintenance_request?.unit_id;
      if (!unitId) continue;
      const stats = unitAvgMap.get(unitId);
      if (!stats || stats.count === 0) continue;
      const unitAverage = stats.sum / stats.count;
      const amount = toNumber(cost.amount);
      if (unitAverage > 0 && amount > multiplier * unitAverage) {
        suspiciousCosts.push({
          cost_id: cost.id,
          unit_number: cost.maintenance_request?.unit?.unit_number ?? null,
          amount,
          unit_average: Math.round(unitAverage * 100) / 100,
        });
      }
    }

    // ── Recurring maintenance ──────────────────────────────────────────────
    const [threshold, windowDays] = await Promise.all([
      readSettingNumber(this.prisma, 'recurring_maintenance_threshold', 3),
      readSettingNumber(this.prisma, 'recurring_maintenance_window_days', 90),
    ]);

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    const recurringGroups = await this.prisma.maintenanceRequest.groupBy({
      by: ['unit_id'],
      where: {
        created_at: { gt: windowStart },
        deleted_at: null,
        ...(propertyId ? { unit: { property_id: propertyId } } : {}),
      },
      _count: { id: true },
      having: {
        id: { _count: { gte: threshold } },
      },
    });

    const recurringUnitIds = recurringGroups.map((g) => g.unit_id);

    const recurringUnits =
      recurringUnitIds.length > 0
        ? await this.prisma.unit.findMany({
            where: { id: { in: recurringUnitIds } },
            select: { id: true, unit_number: true },
          })
        : [];

    const recurringUnitMap = new Map(recurringUnits.map((u) => [u.id, u]));

    const recurringMaintenance = recurringGroups.map((g) => ({
      unit_id: g.unit_id,
      unit_number: recurringUnitMap.get(g.unit_id)?.unit_number ?? null,
      request_count: g._count.id,
    }));

    // ── Budget warnings ────────────────────────────────────────────────────
    const budgetThresholdPct = await readSettingNumber(
      this.prisma,
      'budget_warning_percentage',
      80,
    );

    // All units have a maintenance_budget (non-nullable in schema), filter
    // those where we can meaningfully check by looking at all non-deleted units
    const unitsWithBudget = await this.prisma.unit.findMany({
      where: {
        deleted_at: null,
        ...(propertyId ? { property_id: propertyId } : {}),
      },
      select: {
        id: true,
        unit_number: true,
        maintenance_budget: true,
        maintenance_budget_period: true,
      },
    });

    const budgetWarnings: {
      unit_id: string;
      unit_number: string;
      budget: number;
      spent: number;
      percentage: number;
    }[] = [];

    // Group units by their budget period so we issue one query per period
    const unitsByPeriod = new Map<string, typeof unitsWithBudget>();
    for (const unit of unitsWithBudget) {
      if (toNumber(unit.maintenance_budget) <= 0) continue;
      const period = (unit.maintenance_budget_period as string) || 'monthly';
      const bucket = unitsByPeriod.get(period) ?? [];
      bucket.push(unit);
      unitsByPeriod.set(period, bucket);
    }

    const spentByUnit = new Map<string, number>();
    for (const [period, units] of unitsByPeriod) {
      const periodStart = getPeriodStart(period);
      const unitIds = units.map((u) => u.id);
      const rows = await this.prisma.maintenanceCost.findMany({
        where: {
          status: 'approved',
          created_at: { gte: periodStart },
          maintenance_request: { unit_id: { in: unitIds } },
        },
        select: {
          amount: true,
          maintenance_request: { select: { unit_id: true } },
        },
      });
      for (const r of rows) {
        const uid = r.maintenance_request?.unit_id;
        if (!uid) continue;
        spentByUnit.set(uid, (spentByUnit.get(uid) ?? 0) + toNumber(r.amount));
      }
    }

    for (const unit of unitsWithBudget) {
      const budget = toNumber(unit.maintenance_budget);
      if (budget <= 0) continue;
      const spent = spentByUnit.get(unit.id) ?? 0;
      const percentage = Math.round((spent / budget) * 1000) / 10;
      if (percentage >= budgetThresholdPct) {
        budgetWarnings.push({
          unit_id: unit.id,
          unit_number: unit.unit_number,
          budget,
          spent,
          percentage,
        });
      }
    }

    return {
      expiring_contracts: expiringContractsMapped,
      suspicious_costs: suspiciousCosts,
      recurring_maintenance: recurringMaintenance,
      budget_warnings: budgetWarnings,
    };
  }
}
