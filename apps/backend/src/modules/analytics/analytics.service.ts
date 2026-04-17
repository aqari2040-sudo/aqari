import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type InsightType = 'financial' | 'operational' | 'risk' | 'recommendation';
type InsightSeverity = 'info' | 'warning' | 'critical';
type InsightTrend = 'up' | 'down' | 'stable';

interface Insight {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  metric?: number;
  trend?: InsightTrend;
}

interface AnalyticsSummary {
  total_properties: number;
  total_units: number;
  occupied: number;
  vacant: number;
  occupancy_rate: number;
  total_revenue_monthly: number;
  collection_rate: number;
  total_overdue: number;
  active_contracts: number;
  expiring_30_days: number;
  maintenance_requests_open: number;
  maintenance_cost_total: number;
  pending_approvals: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(val: Prisma.Decimal | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  return (val as Prisma.Decimal).toNumber();
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInsights(): Promise<{
    generated_at: string;
    summary: AnalyticsSummary;
    insights: Insight[];
  }> {
    const now = new Date();

    // ── 1. Properties & Units ────────────────────────────────────────────────

    const totalProperties = await this.prisma.property.count({
      where: { deleted_at: null },
    });

    const unitStatusGroups = await this.prisma.unit.groupBy({
      by: ['status'],
      where: { deleted_at: null },
      _count: { id: true },
    });

    let occupied = 0;
    let vacant = 0;
    let underMaintenance = 0;

    for (const g of unitStatusGroups) {
      const s = (g.status as string).toLowerCase();
      if (s === 'occupied') occupied = g._count.id;
      else if (s === 'vacant') vacant = g._count.id;
      else if (s === 'under_maintenance' || s === 'maintenance') underMaintenance = g._count.id;
    }

    const totalUnits = occupied + vacant + underMaintenance;
    const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 1000) / 10 : 0;
    const vacancyRate = totalUnits > 0 ? Math.round((vacant / totalUnits) * 1000) / 10 : 0;

    // ── 2. Contracts ─────────────────────────────────────────────────────────

    const activeContracts = await this.prisma.contract.count({
      where: { status: 'active', deleted_at: null },
    });

    const expiring30 = await this.prisma.contract.count({
      where: {
        status: 'active',
        deleted_at: null,
        end_date: { gte: now, lte: daysFromNow(30) },
      },
    });

    const expiring60 = await this.prisma.contract.count({
      where: {
        status: 'active',
        deleted_at: null,
        end_date: { gte: now, lte: daysFromNow(60) },
      },
    });

    // ── 3. Payment Schedules ─────────────────────────────────────────────────

    // Monthly revenue: sum of amount_due for the current month (all schedules)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyPayments = await this.prisma.paymentSchedule.aggregate({
      where: { due_date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount_due: true, amount_paid: true },
    });

    const totalRevMonthly = toNumber(monthlyPayments._sum.amount_due);
    const totalCollected = toNumber(monthlyPayments._sum.amount_paid);
    const collectionRate =
      totalRevMonthly > 0 ? Math.round((totalCollected / totalRevMonthly) * 1000) / 10 : 0;

    // Overdue
    const overdueAgg = await this.prisma.paymentSchedule.aggregate({
      where: { status: 'overdue' },
      _sum: { amount_due: true, amount_paid: true },
      _count: { id: true },
    });
    const totalOverdue = Math.max(
      0,
      toNumber(overdueAgg._sum.amount_due) - toNumber(overdueAgg._sum.amount_paid),
    );
    const overdueCount = overdueAgg._count.id;

    // Top 5 overdue tenants (by amount overdue)
    const overdueSchedules = await this.prisma.paymentSchedule.findMany({
      where: { status: 'overdue' },
      select: {
        amount_due: true,
        amount_paid: true,
        contract: {
          select: {
            tenant: { select: { full_name: true } },
          },
        },
      },
      orderBy: { amount_due: 'desc' },
      take: 5,
    });

    // ── 4. Maintenance ───────────────────────────────────────────────────────

    // Open requests (pending + in_progress)
    const openMaintenanceRequests = await this.prisma.maintenanceRequest.count({
      where: {
        deleted_at: null,
        status: { in: ['submitted', 'in_progress'] as any },
      },
    });

    // Status breakdown
    const maintenanceStatusGroups = await this.prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: { deleted_at: null },
      _count: { id: true },
    });

    const maintenanceByStatus = Object.fromEntries(
      maintenanceStatusGroups.map((g) => [g.status as string, g._count.id]),
    );

    // Total costs (approved)
    const approvedCosts = await this.prisma.maintenanceCost.aggregate({
      where: { status: 'approved' },
      _sum: { amount: true },
    });
    const maintenanceCostTotal = toNumber(approvedCosts._sum.amount);

    // Pending approvals
    const pendingApprovals = await this.prisma.maintenanceCost.count({
      where: { status: 'pending' },
    });

    // Pending cost total
    const pendingCostAgg = await this.prisma.maintenanceCost.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
    });
    const pendingCostTotal = toNumber(pendingCostAgg._sum.amount);

    // Top 5 units by maintenance cost (approved)
    const costsByUnit = await this.prisma.maintenanceCost.groupBy({
      by: ['maintenance_request_id'],
      where: { status: 'approved' },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    // Recurring issues: units with 3+ requests in last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recurringGroups = await this.prisma.maintenanceRequest.groupBy({
      by: ['unit_id'],
      where: {
        deleted_at: null,
        created_at: { gte: ninetyDaysAgo },
      },
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
    });
    const recurringCount = recurringGroups.length;

    // Average days to resolve (completed requests with both created_at & updated_at)
    const completedRequests = await this.prisma.maintenanceRequest.findMany({
      where: {
        deleted_at: null,
        status: 'completed',
      },
      select: { created_at: true, updated_at: true },
      take: 200,
    });

    const avgResolveDays =
      completedRequests.length > 0
        ? Math.round(
            completedRequests.reduce((sum, r) => {
              const diffMs = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime();
              return sum + diffMs / 86_400_000;
            }, 0) / completedRequests.length,
          )
        : 0;

    // ── 5. Per-property occupancy for top property ───────────────────────────

    const propertiesWithUnits = await this.prisma.property.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        name: true,
        units: {
          where: { deleted_at: null },
          select: { status: true },
        },
      },
    });

    let topPropertyName = '';
    let topPropertyScore = -1;

    for (const prop of propertiesWithUnits) {
      const total = prop.units.length;
      if (total === 0) continue;
      const occ = prop.units.filter(
        (u) => (u.status as string).toLowerCase() === 'occupied',
      ).length;
      const score = occ / total;
      if (score > topPropertyScore) {
        topPropertyScore = score;
        topPropertyName = prop.name;
      }
    }

    // ── 6. Budget over-runs (units where spent > budget for current period) ──

    const unitsWithBudget = await this.prisma.unit.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        maintenance_budget: true,
        maintenance_budget_period: true,
      },
    });

    let overBudgetCount = 0;

    await Promise.all(
      unitsWithBudget.map(async (unit) => {
        const budget = toNumber(unit.maintenance_budget);
        if (budget <= 0) return;

        const period = (unit.maintenance_budget_period as string) ?? 'monthly';
        let periodStart: Date;
        const n = new Date();
        if (period === 'quarterly') {
          const qm = Math.floor(n.getMonth() / 3) * 3;
          periodStart = new Date(n.getFullYear(), qm, 1);
        } else if (period === 'yearly') {
          periodStart = new Date(n.getFullYear(), 0, 1);
        } else {
          periodStart = new Date(n.getFullYear(), n.getMonth(), 1);
        }

        const spentAgg = await this.prisma.maintenanceCost.aggregate({
          where: {
            status: 'approved',
            created_at: { gte: periodStart },
            maintenance_request: { unit_id: unit.id },
          },
          _sum: { amount: true },
        });

        const spent = toNumber(spentAgg._sum.amount);
        if (spent > budget) overBudgetCount++;
      }),
    );

    // ── 7. Average monthly revenue per occupied unit ──────────────────────────

    const avgRevenue = occupied > 0 ? totalRevMonthly / occupied : 0;

    // ─── Build Summary ────────────────────────────────────────────────────────

    const summary: AnalyticsSummary = {
      total_properties: totalProperties,
      total_units: totalUnits,
      occupied,
      vacant,
      occupancy_rate: occupancyRate,
      total_revenue_monthly: Math.round(totalRevMonthly * 100) / 100,
      collection_rate: collectionRate,
      total_overdue: Math.round(totalOverdue * 100) / 100,
      active_contracts: activeContracts,
      expiring_30_days: expiring30,
      maintenance_requests_open: openMaintenanceRequests,
      maintenance_cost_total: Math.round(maintenanceCostTotal * 100) / 100,
      pending_approvals: pendingApprovals,
    };

    // ─── Rule-Based AI Insights ───────────────────────────────────────────────

    const insights: Insight[] = [];

    // ── Financial: Collection Rate ────────────────────────────────────────────
    if (collectionRate < 80) {
      insights.push({
        type: 'financial',
        severity: 'warning',
        title: 'Low Collection Rate',
        title_ar: 'نسبة تحصيل منخفضة',
        description: `Collection rate is ${collectionRate}%. Consider following up with ${overdueCount} overdue tenants.`,
        description_ar: `نسبة التحصيل ${collectionRate}%. يُنصح بمتابعة ${overdueCount} مستأجرين متأخرين.`,
        metric: collectionRate,
        trend: 'down',
      });
    } else if (collectionRate >= 95) {
      insights.push({
        type: 'financial',
        severity: 'info',
        title: 'Excellent Collection Rate',
        title_ar: 'نسبة تحصيل ممتازة',
        description: `Collection rate is ${collectionRate}% — outstanding financial performance.`,
        description_ar: `نسبة التحصيل ${collectionRate}% — أداء مالي متميز.`,
        metric: collectionRate,
        trend: 'up',
      });
    } else {
      insights.push({
        type: 'financial',
        severity: 'info',
        title: 'Collection Rate',
        title_ar: 'نسبة التحصيل',
        description: `Collection rate is ${collectionRate}%. Performance is on track.`,
        description_ar: `نسبة التحصيل ${collectionRate}%. الأداء في المستوى المطلوب.`,
        metric: collectionRate,
        trend: 'stable',
      });
    }

    // ── Operational: Occupancy ────────────────────────────────────────────────
    if (occupancyRate >= 90) {
      insights.push({
        type: 'operational',
        severity: 'info',
        title: 'High Occupancy',
        title_ar: 'نسبة إشغال عالية',
        description: `Occupancy is at ${occupancyRate}%. Consider raising rents on renewals.`,
        description_ar: `نسبة الإشغال ${occupancyRate}%. يُنصح بزيادة الإيجارات عند التجديد.`,
        metric: occupancyRate,
        trend: 'up',
      });
    }

    // ── Risk: High Vacancy ────────────────────────────────────────────────────
    if (vacancyRate > 20) {
      insights.push({
        type: 'risk',
        severity: 'warning',
        title: 'High Vacancy Rate',
        title_ar: 'نسبة شواغر عالية',
        description: `${vacant} units are vacant (${vacancyRate}%). Marketing effort recommended.`,
        description_ar: `${vacant} وحدة شاغرة (${vacancyRate}%). يُنصح بتكثيف جهود التسويق.`,
        metric: vacancyRate,
        trend: 'down',
      });
    }

    // ── Risk: Expiring Contracts (30 days) ────────────────────────────────────
    if (expiring30 > 0) {
      insights.push({
        type: 'risk',
        severity: 'critical',
        title: 'Contracts Expiring Soon',
        title_ar: 'عقود تنتهي قريباً',
        description: `${expiring30} contracts expire within 30 days. Act now to avoid vacancies.`,
        description_ar: `${expiring30} عقود تنتهي خلال 30 يوم. تصرف الآن لتجنب الشواغر.`,
        metric: expiring30,
        trend: 'down',
      });
    } else if (expiring60 > 0) {
      insights.push({
        type: 'risk',
        severity: 'warning',
        title: 'Contracts Expiring in 60 Days',
        title_ar: 'عقود تنتهي خلال 60 يوماً',
        description: `${expiring60} contracts expire within the next 60 days. Plan renewals early.`,
        description_ar: `${expiring60} عقود تنتهي خلال الـ 60 يوماً القادمة. خطط للتجديد مبكراً.`,
        metric: expiring60,
        trend: 'stable',
      });
    }

    // ── Financial: Maintenance Budget Pressure ────────────────────────────────
    if (overBudgetCount > 0) {
      insights.push({
        type: 'financial',
        severity: 'warning',
        title: 'Maintenance Budget Pressure',
        title_ar: 'ضغط على ميزانية الصيانة',
        description: `${overBudgetCount} units have exceeded their maintenance budget this quarter.`,
        description_ar: `${overBudgetCount} وحدات تجاوزت ميزانية الصيانة المخصصة لها هذا الربع.`,
        metric: overBudgetCount,
        trend: 'down',
      });
    }

    // ── Operational: Recurring Maintenance Issues ─────────────────────────────
    if (recurringCount > 0) {
      insights.push({
        type: 'operational',
        severity: 'warning',
        title: 'Recurring Issues Detected',
        title_ar: 'مشاكل متكررة',
        description: `${recurringCount} units have 3+ maintenance requests in 90 days.`,
        description_ar: `${recurringCount} وحدات لديها 3 طلبات صيانة أو أكثر خلال 90 يوماً.`,
        metric: recurringCount,
        trend: 'stable',
      });
    }

    // ── Operational: Pending Maintenance Approvals ────────────────────────────
    if (pendingApprovals > 5) {
      insights.push({
        type: 'operational',
        severity: 'warning',
        title: 'High Pending Maintenance Approvals',
        title_ar: 'موافقات صيانة معلقة',
        description: `${pendingApprovals} maintenance cost entries are awaiting approval (AED ${pendingCostTotal.toFixed(0)} pending).`,
        description_ar: `${pendingApprovals} تكلفة صيانة بانتظار الموافقة (${pendingCostTotal.toFixed(0)} درهم معلق).`,
        metric: pendingApprovals,
        trend: 'stable',
      });
    }

    // ── Operational: Slow Maintenance Resolution ──────────────────────────────
    if (avgResolveDays > 7) {
      insights.push({
        type: 'operational',
        severity: avgResolveDays > 14 ? 'warning' : 'info',
        title: 'Maintenance Resolution Time',
        title_ar: 'وقت إغلاق طلبات الصيانة',
        description: `Average days to resolve maintenance requests: ${avgResolveDays} days. Target is under 7 days.`,
        description_ar: `متوسط أيام إغلاق طلبات الصيانة: ${avgResolveDays} يوم. الهدف أقل من 7 أيام.`,
        metric: avgResolveDays,
        trend: 'down',
      });
    }

    // ── Financial: Revenue Per Unit ───────────────────────────────────────────
    if (occupied > 0 && avgRevenue > 0) {
      insights.push({
        type: 'financial',
        severity: 'info',
        title: 'Revenue Per Unit',
        title_ar: 'العائد لكل وحدة',
        description: `Average monthly revenue per occupied unit is AED ${avgRevenue.toFixed(0)}.`,
        description_ar: `متوسط الإيراد الشهري لكل وحدة مشغولة هو ${avgRevenue.toFixed(0)} درهم.`,
        metric: Math.round(avgRevenue),
        trend: 'stable',
      });
    }

    // ── Recommendation: Top Property ──────────────────────────────────────────
    if (topPropertyName && topPropertyScore > 0) {
      const topOccPct = Math.round(topPropertyScore * 1000) / 10;
      insights.push({
        type: 'recommendation',
        severity: 'info',
        title: 'Top Property',
        title_ar: 'أفضل عقار',
        description: `${topPropertyName} has the highest occupancy and collection rate (${topOccPct}% occupancy). Use it as a benchmark.`,
        description_ar: `${topPropertyName} يحقق أعلى نسبة إشغال وتحصيل (${topOccPct}% إشغال). استخدمه كمعيار مرجعي.`,
        metric: topOccPct,
        trend: 'up',
      });
    }

    // ── Recommendation: Maintenance Backlog Alert ─────────────────────────────
    if (openMaintenanceRequests > 10) {
      insights.push({
        type: 'recommendation',
        severity: openMaintenanceRequests > 30 ? 'critical' : 'warning',
        title: 'Maintenance Backlog',
        title_ar: 'تراكم طلبات الصيانة',
        description: `${openMaintenanceRequests} open maintenance requests require attention. Prioritise critical repairs to maintain tenant satisfaction.`,
        description_ar: `${openMaintenanceRequests} طلب صيانة مفتوح يستلزم المتابعة. أعطِ الأولوية للإصلاحات الحرجة للحفاظ على رضا المستأجرين.`,
        metric: openMaintenanceRequests,
        trend: 'down',
      });
    }

    // ── Risk: Overdue Payments ────────────────────────────────────────────────
    if (totalOverdue > 0 && overdueCount > 0) {
      const topOverdueName =
        overdueSchedules[0]?.contract?.tenant?.full_name ?? 'Unknown';
      insights.push({
        type: 'risk',
        severity: overdueCount > 10 ? 'critical' : 'warning',
        title: 'Overdue Payments',
        title_ar: 'مدفوعات متأخرة',
        description: `AED ${totalOverdue.toFixed(0)} overdue across ${overdueCount} payment schedules. Top overdue tenant: ${topOverdueName}.`,
        description_ar: `${totalOverdue.toFixed(0)} درهم متأخر عبر ${overdueCount} جدول دفع. أعلى مستأجر متأخر: ${topOverdueName}.`,
        metric: Math.round(totalOverdue),
        trend: 'down',
      });
    }

    // Limit insights to 10 and return
    const finalInsights = insights.slice(0, 10);

    return {
      generated_at: now.toISOString(),
      summary,
      insights: finalInsights,
    };
  }
}
