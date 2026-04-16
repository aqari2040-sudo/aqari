import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta } from '../../common/dto/pagination.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreateNotificationParams {
  user_id: string;
  type: string;
  title: string;
  title_ar: string;
  body: string;
  body_ar: string;
  metadata?: any;
}

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ──────────────────────────────────────────────────

  async create(params: CreateNotificationParams) {
    return this.prisma.notification.create({
      data: {
        user_id: params.user_id,
        type: params.type,
        title: params.title,
        title_ar: params.title_ar,
        body: params.body,
        body_ar: params.body_ar,
        is_read: false,
        metadata: params.metadata ?? Prisma.JsonNull,
        created_at: new Date(),
      },
    });
  }

  // ─── Create Many ─────────────────────────────────────────────

  async createMany(notifications: CreateNotificationParams[]): Promise<void> {
    if (notifications.length === 0) return;

    await this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        user_id: n.user_id,
        type: n.type,
        title: n.title,
        title_ar: n.title_ar,
        body: n.body,
        body_ar: n.body_ar,
        is_read: false,
        metadata: n.metadata ?? Prisma.JsonNull,
        created_at: new Date(),
      })),
    });
  }

  // ─── Find All (paginated) ────────────────────────────────────

  async findAll(userId: string, query: QueryNotificationDto) {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
      is_read,
      type,
    } = query;

    const where: Prisma.NotificationWhereInput = {
      user_id: userId,
      ...(is_read !== undefined && { is_read }),
      ...(type && { type }),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ─── Mark Single As Read ─────────────────────────────────────

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (notification.user_id !== userId) {
      throw new ForbiddenException('You do not own this notification');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });
  }

  // ─── Mark All As Read ────────────────────────────────────────

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });

    return { count: result.count };
  }

  // ─── Unread Count ────────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CRON JOBS
  // ─────────────────────────────────────────────────────────────

  // ─── 1. Overdue Payment Check — daily 08:00 UTC ──────────────

  @Cron('0 8 * * *')
  async checkOverduePayments(): Promise<void> {
    this.logger.log('[CRON] checkOverduePayments — starting');

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    try {
      // Find payment schedules that are pending/partial and past their grace period
      const overdueSchedules = await this.prisma.paymentSchedule.findMany({
        where: {
          status: { in: ['pending', 'partial'] },
        },
        include: {
          contract: {
            include: {
              tenant: true,
            },
          },
        },
      });

      const toMarkOverdue = overdueSchedules.filter((schedule) => {
        const gracePeriodDays = schedule.contract?.grace_period_days ?? 0;
        const dueDate = new Date(schedule.due_date);
        dueDate.setUTCHours(0, 0, 0, 0);
        const graceCutoff = new Date(dueDate);
        graceCutoff.setDate(graceCutoff.getDate() + gracePeriodDays);
        return graceCutoff < today;
      });

      if (toMarkOverdue.length === 0) {
        this.logger.log('[CRON] checkOverduePayments — no overdue payments found');
        return;
      }

      this.logger.log(
        `[CRON] checkOverduePayments — found ${toMarkOverdue.length} overdue schedule(s)`,
      );

      for (const schedule of toMarkOverdue) {
        // Update status to overdue
        await this.prisma.paymentSchedule.update({
          where: { id: schedule.id },
          data: {
            status: 'overdue',
            overdue_since: schedule.overdue_since ?? today,
          },
        });

        const tenantUserId = schedule.contract?.tenant?.user_id;
        const tenantName =
          schedule.contract?.tenant?.full_name ?? 'Tenant';
        const dueDateStr = new Date(schedule.due_date).toLocaleDateString('en-US');
        const amount = schedule.amount_due?.toString() ?? '0';

        const notifications: CreateNotificationParams[] = [];

        // Notify tenant
        if (tenantUserId) {
          notifications.push({
            user_id: tenantUserId,
            type: 'overdue_rent',
            title: 'Overdue Payment',
            title_ar: 'دفعة متأخرة',
            body: `Your rent payment of ${amount} SAR due on ${dueDateStr} is overdue. Please pay immediately to avoid penalties.`,
            body_ar: `دفعة الإيجار بقيمة ${amount} ريال المستحقة بتاريخ ${dueDateStr} متأخرة. يرجى الدفع فوراً لتجنب الغرامات.`,
            metadata: {
              payment_schedule_id: schedule.id,
              contract_id: schedule.contract_id,
              amount,
              due_date: schedule.due_date,
            },
          });
        }

        // Notify owner — user_id resolution deferred to Supabase auth integration
        // For MVP, log the action so owner notifications can be wired in later
        this.logger.log(
          `[CRON] checkOverduePayments — overdue schedule ${schedule.id} for tenant ${tenantName} (user: ${tenantUserId ?? 'unknown'}). ` +
            `Owner notification pending Supabase auth metadata integration.`,
        );

        if (notifications.length > 0) {
          await this.createMany(notifications);
        }
      }

      this.logger.log(
        `[CRON] checkOverduePayments — processed ${toMarkOverdue.length} overdue payment(s)`,
      );
    } catch (err) {
      this.logger.error('[CRON] checkOverduePayments — error', err);
    }
  }

  // ─── 2. Contract Expiry Check — daily 08:00 UTC ──────────────

  @Cron('0 8 * * *')
  async checkContractExpiry(): Promise<void> {
    this.logger.log('[CRON] checkContractExpiry — starting');

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const WARNING_DAYS = [60, 30, 7];

    try {
      for (const daysAhead of WARNING_DAYS) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysAhead);
        const targetDateEnd = new Date(targetDate);
        targetDateEnd.setUTCHours(23, 59, 59, 999);

        // Find active contracts expiring exactly on targetDate
        const expiringContracts = await this.prisma.contract.findMany({
          where: {
            status: 'active',
            end_date: {
              gte: targetDate,
              lte: targetDateEnd,
            },
          },
          include: {
            tenant: {
              include: { user: true },
            },
            unit: {
              include: { property: true },
            },
          },
        });

        for (const contract of expiringContracts) {
          const todayStart = new Date(today);
          const todayEnd = new Date(today);
          todayEnd.setUTCHours(23, 59, 59, 999);

          // Deduplicate: skip if a contract_expiry notification for this contract was already sent today
          const existing = await this.prisma.notification.findFirst({
            where: {
              type: 'contract_expiry',
              created_at: { gte: todayStart, lte: todayEnd },
              metadata: {
                path: ['contract_id'],
                equals: contract.id,
              },
            },
          });

          if (existing) {
            this.logger.log(
              `[CRON] checkContractExpiry — notification already sent today for contract ${contract.id}`,
            );
            continue;
          }

          const endDateStr = new Date(contract.end_date).toLocaleDateString('en-US');
          const unitRef =
            contract.unit?.unit_number ??
            contract.unit_id;
          const propertyName =
            contract.unit?.property?.name ?? '';

          const notifications: CreateNotificationParams[] = [];

          // Notify tenant
          const tenantUserId = contract.tenant?.user_id;
          if (tenantUserId) {
            notifications.push({
              user_id: tenantUserId,
              type: 'contract_expiry',
              title: `Lease Expiring in ${daysAhead} Days`,
              title_ar: `انتهاء العقد خلال ${daysAhead} يوماً`,
              body: `Your lease for unit ${unitRef}${propertyName ? ` at ${propertyName}` : ''} expires on ${endDateStr}. Please contact the property manager to renew.`,
              body_ar: `عقد إيجارك للوحدة ${unitRef}${propertyName ? ` في ${propertyName}` : ''} ينتهي بتاريخ ${endDateStr}. يرجى التواصل مع مدير العقار للتجديد.`,
              metadata: {
                contract_id: contract.id,
                unit_id: contract.unit_id,
                days_until_expiry: daysAhead,
                end_date: contract.end_date,
              },
            });
          }

          // Owner notification deferred to Supabase auth metadata integration
          this.logger.log(
            `[CRON] checkContractExpiry — contract ${contract.id} expires in ${daysAhead} days (${endDateStr}). ` +
              `Owner notification pending Supabase auth metadata integration.`,
          );

          if (notifications.length > 0) {
            await this.createMany(notifications);
            this.logger.log(
              `[CRON] checkContractExpiry — created ${notifications.length} notification(s) for contract ${contract.id}`,
            );
          }
        }
      }

      this.logger.log('[CRON] checkContractExpiry — complete');
    } catch (err) {
      this.logger.error('[CRON] checkContractExpiry — error', err);
    }
  }

  // ─── 3. Recurring Maintenance Alert — daily 09:00 UTC ────────

  @Cron('0 9 * * *')
  async checkRecurringMaintenance(): Promise<void> {
    this.logger.log('[CRON] checkRecurringMaintenance — starting');

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    try {
      // Read settings
      const [thresholdSetting, windowSetting] = await Promise.all([
        this.prisma.setting.findUnique({
          where: { key: 'recurring_maintenance_threshold' },
        }),
        this.prisma.setting.findUnique({
          where: { key: 'recurring_maintenance_window_days' },
        }),
      ]);

      const threshold: number =
        typeof thresholdSetting?.value === 'number'
          ? thresholdSetting.value
          : Number(thresholdSetting?.value) || 3;

      const windowDays: number =
        typeof windowSetting?.value === 'number'
          ? windowSetting.value
          : Number(windowSetting?.value) || 90;

      const windowStart = new Date(today);
      windowStart.setDate(windowStart.getDate() - windowDays);

      // Group maintenance requests by unit_id within the window
      const grouped = await this.prisma.maintenanceRequest.groupBy({
        by: ['unit_id'],
        where: {
          created_at: { gte: windowStart },
        },
        _count: { id: true },
        having: {
          id: { _count: { gte: threshold } },
        },
      });

      if (grouped.length === 0) {
        this.logger.log(
          '[CRON] checkRecurringMaintenance — no units exceed the recurring threshold',
        );
        return;
      }

      this.logger.log(
        `[CRON] checkRecurringMaintenance — ${grouped.length} unit(s) exceed threshold (${threshold} requests in ${windowDays} days)`,
      );

      const todayEnd = new Date(today);
      todayEnd.setUTCHours(23, 59, 59, 999);

      for (const group of grouped) {
        const unitId = group.unit_id;
        const count = group._count.id;

        // Deduplicate: skip if owner already notified today for this unit
        const existing = await this.prisma.notification.findFirst({
          where: {
            type: 'recurring_maintenance',
            created_at: { gte: today, lte: todayEnd },
            metadata: {
              path: ['unit_id'],
              equals: unitId,
            },
          },
        });

        if (existing) {
          this.logger.log(
            `[CRON] checkRecurringMaintenance — already notified today for unit ${unitId}`,
          );
          continue;
        }

        // Fetch unit info for context
        const unit = await this.prisma.unit.findUnique({
          where: { id: unitId },
          include: { property: true },
        });

        const unitRef = unit?.unit_number ?? unitId;
        const propertyName = unit?.property?.name ?? '';

        // Owner notification deferred to Supabase auth metadata integration
        this.logger.log(
          `[CRON] checkRecurringMaintenance — unit ${unitRef}${propertyName ? ` (${propertyName})` : ''} ` +
            `has ${count} maintenance requests in the last ${windowDays} days. ` +
            `Owner notification pending Supabase auth metadata integration.`,
        );

        // Placeholder: create notification with a system sentinel user_id so it is queryable.
        // Once Supabase auth metadata query is integrated, replace 'OWNER_PLACEHOLDER' with actual user_id.
        // For now we log and do NOT write a broken notification row.
        //
        // await this.create({
        //   user_id: ownerUserId,
        //   type: 'recurring_maintenance',
        //   title: `Recurring Maintenance Alert — Unit ${unitRef}`,
        //   title_ar: `تنبيه صيانة متكررة — الوحدة ${unitRef}`,
        //   body: `Unit ${unitRef}${propertyName ? ` at ${propertyName}` : ''} has had ${count} maintenance requests in the last ${windowDays} days.`,
        //   body_ar: `الوحدة ${unitRef}${propertyName ? ` في ${propertyName}` : ''} لديها ${count} طلبات صيانة خلال الـ${windowDays} يوماً الماضية.`,
        //   metadata: { unit_id: unitId, count, window_days: windowDays, threshold },
        // });
      }

      this.logger.log('[CRON] checkRecurringMaintenance — complete');
    } catch (err) {
      this.logger.error('[CRON] checkRecurringMaintenance — error', err);
    }
  }
}
