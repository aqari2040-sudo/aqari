import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Return-type interfaces ──────────────────────────────────

export interface OccupancyReportData {
  generated_at: string;
  properties: Array<{
    name: string;
    name_ar: string;
    total_units: number;
    occupied: number;
    vacant: number;
    under_maintenance: number;
    occupancy_rate: number;
    units: Array<{
      unit_number: string;
      status: string;
      base_rent: number;
      tenant_name?: string;
      tenant_name_ar?: string;
    }>;
  }>;
  totals: {
    total_units: number;
    occupied: number;
    vacant: number;
    under_maintenance: number;
    occupancy_rate: number;
  };
}

export interface PaymentsReportData {
  generated_at: string;
  period: { from: string; to: string };
  summary: {
    total_due: number;
    total_collected: number;
    total_overdue: number;
    collection_rate: number;
  };
  payments: Array<{
    tenant_name: string;
    tenant_name_ar: string;
    unit_number: string;
    property_name: string;
    due_date: string;
    amount_due: number;
    amount_paid: number;
    status: string;
  }>;
}

export interface MaintenanceReportData {
  generated_at: string;
  period: { from: string; to: string };
  summary: {
    total_requests: number;
    total_cost: number;
    avg_cost: number;
  };
  by_category: Array<{
    category: string;
    category_ar: string;
    count: number;
    total_cost: number;
  }>;
  requests: Array<{
    unit_number: string;
    property_name: string;
    category: string;
    category_ar: string;
    description: string;
    priority: string;
    status: string;
    total_cost: number;
    created_at: string;
  }>;
}

// ─── Service ─────────────────────────────────────────────────

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Occupancy Report ─────────────────────────────────────

  async getOccupancyReportData(filters: {
    property_id?: string;
    from?: string;
    to?: string;
  }): Promise<OccupancyReportData> {
    const propertyWhere: any = { deleted_at: null };
    if (filters.property_id) propertyWhere.id = filters.property_id;

    const properties = await this.prisma.property.findMany({
      where: propertyWhere,
      include: {
        units: {
          where: { deleted_at: null },
          include: {
            contracts: {
              where: {
                status: 'active',
                deleted_at: null,
              },
              include: {
                tenant: {
                  select: { full_name: true, full_name_ar: true },
                },
              },
              take: 1,
            },
          },
          orderBy: { unit_number: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    let totalUnits = 0;
    let totalOccupied = 0;
    let totalVacant = 0;
    let totalUnderMaintenance = 0;

    const mappedProperties = properties.map((property) => {
      const occupied = property.units.filter((u) => u.status === 'occupied').length;
      const vacant = property.units.filter((u) => u.status === 'vacant').length;
      const underMaintenance = property.units.filter(
        (u) => u.status === 'under_maintenance',
      ).length;
      const total = property.units.length;
      const occupancyRate = total > 0 ? Math.round((occupied / total) * 100 * 100) / 100 : 0;

      totalUnits += total;
      totalOccupied += occupied;
      totalVacant += vacant;
      totalUnderMaintenance += underMaintenance;

      const units = property.units.map((unit) => {
        const activeContract = unit.contracts[0] ?? null;
        return {
          unit_number: unit.unit_number,
          status: unit.status,
          base_rent: Number(unit.base_rent),
          tenant_name: activeContract?.tenant?.full_name,
          tenant_name_ar: activeContract?.tenant?.full_name_ar,
        };
      });

      return {
        name: property.name,
        name_ar: property.name_ar,
        total_units: total,
        occupied,
        vacant,
        under_maintenance: underMaintenance,
        occupancy_rate: occupancyRate,
        units,
      };
    });

    const totalOccupancyRate =
      totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100 * 100) / 100 : 0;

    return {
      generated_at: new Date().toISOString(),
      properties: mappedProperties,
      totals: {
        total_units: totalUnits,
        occupied: totalOccupied,
        vacant: totalVacant,
        under_maintenance: totalUnderMaintenance,
        occupancy_rate: totalOccupancyRate,
      },
    };
  }

  // ─── Payments Report ──────────────────────────────────────

  async getPaymentsReportData(filters: {
    property_id?: string;
    tenant_id?: string;
    from?: string;
    to?: string;
  }): Promise<PaymentsReportData> {
    const fromDate = filters.from ? new Date(filters.from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = filters.to ? new Date(filters.to) : new Date();

    const scheduleWhere: any = {
      due_date: {
        gte: fromDate,
        lte: toDate,
      },
      contract: {
        deleted_at: null,
      },
    };

    if (filters.tenant_id) {
      scheduleWhere.contract = {
        ...scheduleWhere.contract,
        tenant_id: filters.tenant_id,
      };
    }

    if (filters.property_id) {
      scheduleWhere.contract = {
        ...scheduleWhere.contract,
        unit: {
          property_id: filters.property_id,
          deleted_at: null,
        },
      };
    } else {
      scheduleWhere.contract = {
        ...scheduleWhere.contract,
        unit: { deleted_at: null },
      };
    }

    const schedules = await this.prisma.paymentSchedule.findMany({
      where: scheduleWhere,
      include: {
        contract: {
          include: {
            tenant: {
              select: { full_name: true, full_name_ar: true },
            },
            unit: {
              select: {
                unit_number: true,
                property: { select: { name: true, name_ar: true } },
              },
            },
          },
        },
      },
      orderBy: { due_date: 'desc' },
    });

    let totalDue = 0;
    let totalCollected = 0;
    let totalOverdue = 0;

    const payments = schedules.map((schedule) => {
      const amountDue = Number(schedule.amount_due);
      const amountPaid = Number(schedule.amount_paid);
      totalDue += amountDue;
      totalCollected += amountPaid;
      if (schedule.status === 'overdue') totalOverdue += amountDue - amountPaid;

      return {
        tenant_name: schedule.contract.tenant.full_name,
        tenant_name_ar: schedule.contract.tenant.full_name_ar,
        unit_number: schedule.contract.unit.unit_number,
        property_name: schedule.contract.unit.property.name,
        due_date: schedule.due_date.toISOString().split('T')[0],
        amount_due: amountDue,
        amount_paid: amountPaid,
        status: schedule.status,
      };
    });

    const collectionRate =
      totalDue > 0 ? Math.round((totalCollected / totalDue) * 100 * 100) / 100 : 0;

    return {
      generated_at: new Date().toISOString(),
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      },
      summary: {
        total_due: Math.round(totalDue * 100) / 100,
        total_collected: Math.round(totalCollected * 100) / 100,
        total_overdue: Math.round(totalOverdue * 100) / 100,
        collection_rate: collectionRate,
      },
      payments,
    };
  }

  // ─── Maintenance Report ───────────────────────────────────

  async getMaintenanceReportData(filters: {
    property_id?: string;
    unit_id?: string;
    category_id?: string;
    from?: string;
    to?: string;
  }): Promise<MaintenanceReportData> {
    const fromDate = filters.from ? new Date(filters.from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = filters.to ? new Date(filters.to) : new Date();

    const requestWhere: any = {
      deleted_at: null,
      created_at: { gte: fromDate, lte: toDate },
    };

    if (filters.unit_id) requestWhere.unit_id = filters.unit_id;
    if (filters.category_id) requestWhere.category_id = filters.category_id;
    if (filters.property_id) {
      requestWhere.unit = { property_id: filters.property_id, deleted_at: null };
    } else {
      requestWhere.unit = { deleted_at: null };
    }

    const maintenanceRequests = await this.prisma.maintenanceRequest.findMany({
      where: requestWhere,
      include: {
        unit: {
          select: {
            unit_number: true,
            property: { select: { name: true } },
          },
        },
        category: {
          select: { name: true, name_ar: true },
        },
        maintenance_costs: {
          where: { status: 'approved' },
          select: { amount: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Aggregate by category
    const categoryMap = new Map<
      string,
      { category: string; category_ar: string; count: number; total_cost: number }
    >();

    let grandTotalCost = 0;

    const requests = maintenanceRequests.map((req) => {
      const totalCost = req.maintenance_costs.reduce(
        (sum, cost) => sum + Number(cost.amount),
        0,
      );
      grandTotalCost += totalCost;

      const catKey = req.category_id;
      if (categoryMap.has(catKey)) {
        const entry = categoryMap.get(catKey)!;
        entry.count += 1;
        entry.total_cost += totalCost;
      } else {
        categoryMap.set(catKey, {
          category: req.category.name,
          category_ar: req.category.name_ar,
          count: 1,
          total_cost: totalCost,
        });
      }

      return {
        unit_number: req.unit.unit_number,
        property_name: req.unit.property.name,
        category: req.category.name,
        category_ar: req.category.name_ar,
        description: req.description,
        priority: req.priority,
        status: req.status,
        total_cost: Math.round(totalCost * 100) / 100,
        created_at: req.created_at.toISOString().split('T')[0],
      };
    });

    const byCategory = Array.from(categoryMap.values()).map((entry) => ({
      ...entry,
      total_cost: Math.round(entry.total_cost * 100) / 100,
    }));

    const totalRequests = maintenanceRequests.length;
    const avgCost = totalRequests > 0 ? Math.round((grandTotalCost / totalRequests) * 100) / 100 : 0;

    return {
      generated_at: new Date().toISOString(),
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      },
      summary: {
        total_requests: totalRequests,
        total_cost: Math.round(grandTotalCost * 100) / 100,
        avg_cost: avgCost,
      },
      by_category: byCategory,
      requests,
    };
  }
}
