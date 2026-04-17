import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: string;
  content: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are "Aqari AI", an expert real estate property management analyst.
You have access to real business data for a UAE property management company.
Provide concise, specific, actionable advice. Always reference actual numbers.
Keep responses under 200 words unless a detailed analysis is requested.
Tone: professional, direct, helpful.
Currency: AED (UAE Dirham).`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AiChatService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Build plain-text business context from live DB data ─────────────────────

  async getBusinessContext(): Promise<string> {
    const now = new Date();

    // Properties & units
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

    const totalProperties = propertiesWithUnits.length;
    let occupied = 0;
    let vacant = 0;
    let underMaintenance = 0;

    const propertyLines = propertiesWithUnits.map((prop) => {
      const total = prop.units.length;
      const occ = prop.units.filter((u) => (u.status as string).toLowerCase() === 'occupied').length;
      const vac = prop.units.filter((u) => (u.status as string).toLowerCase() === 'vacant').length;
      const maint = prop.units.filter(
        (u) => ['under_maintenance', 'maintenance'].includes((u.status as string).toLowerCase()),
      ).length;
      occupied += occ;
      vacant += vac;
      underMaintenance += maint;
      return `${prop.name}: ${total} units`;
    });

    const totalUnits = occupied + vacant + underMaintenance;
    const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 1000) / 10 : 0;

    // Contracts
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

    // Payments — current month
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

    // Top 3 overdue tenants
    const overdueSchedules = await this.prisma.paymentSchedule.findMany({
      where: { status: 'overdue' },
      select: {
        amount_due: true,
        amount_paid: true,
        contract: {
          select: {
            tenant: { select: { full_name: true } },
            unit: { select: { unit_number: true } },
          },
        },
      },
      orderBy: { amount_due: 'desc' },
      take: 3,
    });

    const topOverdueLines = overdueSchedules
      .map((s) => {
        const name = s.contract?.tenant?.full_name ?? 'Unknown';
        const unit = s.contract?.unit?.unit_number ?? '?';
        const owed = Math.max(0, toNumber(s.amount_due) - toNumber(s.amount_paid));
        return `${name} (${unit}) AED ${owed.toFixed(0)}`;
      })
      .join(', ');

    // Maintenance
    const maintenanceStatusGroups = await this.prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: { deleted_at: null },
      _count: { id: true },
    });

    const maintenanceByStatus: Record<string, number> = Object.fromEntries(
      maintenanceStatusGroups.map((g) => [g.status as string, g._count.id]),
    );
    const totalMaintenance = Object.values(maintenanceByStatus).reduce((s, v) => s + v, 0);
    const completed = maintenanceByStatus['completed'] ?? 0;
    const inProgress = maintenanceByStatus['in_progress'] ?? 0;
    const openReqs = maintenanceByStatus['pending'] ?? 0;

    const approvedCosts = await this.prisma.maintenanceCost.aggregate({
      where: { status: 'approved' },
      _sum: { amount: true },
    });
    const maintenanceCostTotal = toNumber(approvedCosts._sum.amount);

    const pendingCostAgg = await this.prisma.maintenanceCost.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true },
    });
    const pendingCostTotal = toNumber(pendingCostAgg._sum.amount);

    // Budget over-runs
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

    // ── Compose context text ─────────────────────────────────────────────────

    const lines: string[] = [
      `PROPERTIES: ${totalProperties} properties (${propertyLines.join(', ')})`,
      `OCCUPANCY: ${occupied}/${totalUnits} occupied (${occupancyRate}%), ${vacant} vacant, ${underMaintenance} under maintenance`,
      `CONTRACTS: ${activeContracts} active, ${expiring30} expiring in 30 days`,
      `PAYMENTS: Monthly revenue AED ${totalRevMonthly.toFixed(0)}. Collection rate ${collectionRate}%. ${overdueCount} overdue totaling AED ${totalOverdue.toFixed(0)}`,
      `MAINTENANCE: ${totalMaintenance} requests (${completed} completed, ${inProgress} in progress, ${openReqs} open). Total approved costs: AED ${maintenanceCostTotal.toFixed(0)}. Pending: AED ${pendingCostTotal.toFixed(0)}`,
    ];

    if (topOverdueLines) {
      lines.push(`TOP OVERDUE: ${topOverdueLines}`);
    }

    if (overBudgetCount > 0) {
      lines.push(`BUDGET: ${overBudgetCount} units over maintenance budget this quarter`);
    }

    return lines.join('\n');
  }

  // ── Chat with Groq (Llama 3.3 70B) ─────────────────────────────────────────

  async chat(
    messages: ChatMessage[],
    lang?: string,
  ): Promise<{ role: string; content: string }> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        role: 'assistant',
        content:
          'AI chat requires a Groq API key. Get one free at console.groq.com',
      };
    }

    const contextText = await this.getBusinessContext();
    const langInstruction =
      lang === 'ar'
        ? 'Respond in Arabic (العربية). Use formal Arabic suitable for business.'
        : 'Respond in English.';

    // Dynamic import to avoid issues if package not installed yet
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey });

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\n${langInstruction}\n\nBusiness data:\n${contextText}`,
        },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
    });

    return {
      role: 'assistant',
      content: response.choices[0]?.message?.content ?? '',
    };
  }

  // ── Auto-analyze: single-shot insight generation ─────────────────────────────

  async autoAnalyze(lang?: string): Promise<{ role: string; content: string }> {
    const prompt =
      lang === 'ar'
        ? 'بناءً على بيانات الأعمال، قدّم تحليلاً موجزاً لأبرز 3-4 نقاط تستحق الانتباه الفوري، مع توصيات عملية محددة.'
        : 'Based on the business data, provide a concise analysis of the top 3-4 points that need immediate attention, with specific actionable recommendations.';

    return this.chat([{ role: 'user', content: prompt }], lang);
  }
}
