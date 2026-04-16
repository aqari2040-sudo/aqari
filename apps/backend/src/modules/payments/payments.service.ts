import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrService } from './ocr.service';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { buildPaginationMeta } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ocrService: OcrService,
  ) {}

  // ─── List Payments ───────────────────────────────────────────

  async findAll(query: QueryPaymentDto) {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
      status,
      tenant_id,
      unit_id,
      from,
      to,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      deleted_at: null,
    };

    if (status) where.status = status;
    if (tenant_id) where.tenant_id = tenant_id;
    if (unit_id) where.unit_id = unit_id;

    if (from || to) {
      where.payment_date = {};
      if (from) where.payment_date.gte = new Date(from);
      if (to) where.payment_date.lte = new Date(to);
    }

    const orderBy: any = { [sort_by]: sort_order };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          tenant: {
            select: {
              id: true,
              full_name: true,
              full_name_ar: true,
            },
          },
          unit: {
            select: {
              id: true,
              unit_number: true,
              property: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ─── Get Payment Detail ──────────────────────────────────────

  async findOne(id: string, currentUser: AuthUser) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, deleted_at: null },
      include: {
        tenant: {
          select: {
            id: true,
            full_name: true,
            full_name_ar: true,
            phone: true,
            email: true,
          },
        },
        unit: {
          select: {
            id: true,
            unit_number: true,
            property: { select: { id: true, name: true } },
          },
        },
        payment_schedule: {
          select: {
            id: true,
            due_date: true,
            amount_due: true,
            amount_paid: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    if (currentUser.role === 'tenant') {
      if (payment.tenant_id !== currentUser.tenant_id) {
        throw new ForbiddenException('You can only view your own payments');
      }
    }

    return payment;
  }

  // ─── Upload Receipt ──────────────────────────────────────────

  async uploadReceipt(dto: UploadReceiptDto, currentUser: AuthUser) {
    // 1. Validate payment_schedule exists and is not cancelled
    const schedule = await this.prisma.paymentSchedule.findFirst({
      where: { id: dto.payment_schedule_id },
      include: {
        contract: {
          select: {
            id: true,
            tenant_id: true,
            unit_id: true,
            tenant: {
              select: { id: true, user_id: true },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(
        `Payment schedule with id ${dto.payment_schedule_id} not found`,
      );
    }

    if (schedule.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot submit a payment for a cancelled payment schedule',
      );
    }

    const { tenant_id, unit_id } = schedule.contract;

    // 2. Tenant role: verify ownership via contract → tenant → user_id
    if (currentUser.role === 'tenant') {
      const tenantUserId = schedule.contract.tenant?.user_id;
      if (tenantUserId !== currentUser.id) {
        throw new ForbiddenException(
          'You can only submit receipts for your own payment schedules',
        );
      }
    }

    // 3. Run OCR on the receipt
    const ocrResult = await this.ocrService.extractFromReceipt(dto.receipt_file_url);

    // 4. Create the payment record
    const payment = await this.prisma.payment.create({
      data: {
        payment_schedule_id: dto.payment_schedule_id,
        tenant_id,
        unit_id,
        amount: dto.amount,
        payment_date: new Date(dto.payment_date),
        receipt_file_url: dto.receipt_file_url,
        ocr_extracted_amount: ocrResult.extracted_amount ?? null,
        ocr_extracted_date: ocrResult.extracted_date
          ? new Date(ocrResult.extracted_date)
          : null,
        ocr_confidence: ocrResult.confidence,
        ocr_flagged: ocrResult.flagged,
        status: 'pending_review',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return {
      ...payment,
      ocr_result: ocrResult,
    };
  }

  // ─── Confirm Payment ─────────────────────────────────────────

  async confirm(id: string, dto: ConfirmPaymentDto, currentUser: AuthUser) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, deleted_at: null },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    if (payment.status !== 'pending_review') {
      throw new BadRequestException(
        `Payment cannot be confirmed because its status is '${payment.status}'. Only 'pending_review' payments can be confirmed.`,
      );
    }

    const confirmedAmount = new Prisma.Decimal(dto.confirmed_amount);

    // Fetch the schedule to recalculate
    const schedule = await this.prisma.paymentSchedule.findUnique({
      where: { id: payment.payment_schedule_id },
    });

    if (!schedule) {
      throw new NotFoundException('Associated payment schedule not found');
    }

    const newAmountPaid = new Prisma.Decimal(schedule.amount_paid).plus(confirmedAmount);
    const amountDue = new Prisma.Decimal(schedule.amount_due);

    let newScheduleStatus: 'paid' | 'partial' | 'pending' | 'overdue' | 'cancelled';
    if (newAmountPaid.gte(amountDue)) {
      newScheduleStatus = 'paid';
    } else if (newAmountPaid.gt(0)) {
      newScheduleStatus = 'partial';
    } else {
      newScheduleStatus = schedule.status as typeof newScheduleStatus;
    }

    // Update payment and schedule in a transaction
    const [updatedPayment] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id },
        data: {
          status: 'confirmed',
          confirmed_by: currentUser.id,
          confirmed_at: new Date(),
          amount: confirmedAmount,
          updated_at: new Date(),
        },
      }),
      this.prisma.paymentSchedule.update({
        where: { id: payment.payment_schedule_id },
        data: {
          amount_paid: newAmountPaid,
          status: newScheduleStatus,
          updated_at: new Date(),
        },
      }),
    ]);

    return updatedPayment;
  }

  // ─── Reject Payment ──────────────────────────────────────────

  async reject(id: string, dto: RejectPaymentDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, deleted_at: null },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    if (payment.status !== 'pending_review') {
      throw new BadRequestException(
        `Payment cannot be rejected because its status is '${payment.status}'. Only 'pending_review' payments can be rejected.`,
      );
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: 'rejected',
        rejection_reason: dto.rejection_reason,
        updated_at: new Date(),
      },
    });

    return updated;
  }

  // ─── Overdue Schedules ───────────────────────────────────────

  async findOverdueSchedules() {
    const schedules = await this.prisma.paymentSchedule.findMany({
      where: {
        status: 'overdue',
      },
      orderBy: { due_date: 'asc' },
      include: {
        contract: {
          select: {
            id: true,
            tenant: {
              select: {
                id: true,
                full_name: true,
                full_name_ar: true,
                phone: true,
              },
            },
            unit: {
              select: {
                id: true,
                unit_number: true,
                property: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return schedules;
  }

  // ─── List Payment Schedules ──────────────────────────────────

  async findAllSchedules(query: {
    contract_id?: string;
    status?: string;
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
  }) {
    const { contract_id, status, month, year, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (contract_id) where.contract_id = contract_id;
    if (status) where.status = status;

    if (year !== undefined) {
      const startOfYear = new Date(year, month !== undefined ? month - 1 : 0, 1);
      const endOfYear =
        month !== undefined
          ? new Date(year, month, 0) // last day of that month
          : new Date(year + 1, 0, 0);

      where.due_date = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.paymentSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { due_date: 'asc' },
        include: {
          contract: {
            select: {
              id: true,
              tenant: {
                select: {
                  id: true,
                  full_name: true,
                  full_name_ar: true,
                },
              },
              unit: {
                select: {
                  id: true,
                  unit_number: true,
                  property: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.paymentSchedule.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ─── Schedule Detail ─────────────────────────────────────────

  async findScheduleById(id: string, currentUser: AuthUser) {
    const schedule = await this.prisma.paymentSchedule.findUnique({
      where: { id },
      include: {
        contract: {
          select: {
            id: true,
            tenant_id: true,
            tenant: {
              select: {
                id: true,
                full_name: true,
                full_name_ar: true,
                phone: true,
              },
            },
            unit: {
              select: {
                id: true,
                unit_number: true,
                property: { select: { id: true, name: true } },
              },
            },
          },
        },
        payments: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Payment schedule with id ${id} not found`);
    }

    // Tenant can only view schedules for their own contracts
    if (currentUser.role === 'tenant') {
      if (schedule.contract.tenant_id !== currentUser.tenant_id) {
        throw new ForbiddenException(
          'You can only view payment schedules for your own contracts',
        );
      }
    }

    return schedule;
  }
}
