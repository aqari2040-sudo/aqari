import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from '@/modules/payments/payments.service';
import { OcrService } from '@/modules/payments/ocr.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createMockPayment,
  createMockPaymentSchedule,
  createMockAuthUser,
} from '../helpers/factory';

// ─── Prisma mock factory ──────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    payment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    paymentSchedule: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let ocrServiceMock: { extractFromReceipt: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    ocrServiceMock = { extractFromReceipt: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: OcrService, useValue: ocrServiceMock },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  // ─── confirm ───────────────────────────────────────────────────────────────

  describe('confirm', () => {
    const adminUser = createMockAuthUser();

    it('updates payment status to confirmed', async () => {
      const payment = createMockPayment({ status: 'pending_review', payment_schedule_id: 'schedule-uuid-1' });
      const schedule = createMockPaymentSchedule({ amount_due: 5000, amount_paid: 0, status: 'pending' });

      prismaMock.payment.findFirst.mockResolvedValue(payment);
      prismaMock.paymentSchedule.findUnique.mockResolvedValue(schedule);

      const confirmedPayment = { ...payment, status: 'confirmed', confirmed_by: adminUser.id };
      prismaMock.$transaction.mockResolvedValue([confirmedPayment, {}]);

      const result = await service.confirm('payment-uuid-1', { confirmed_amount: 5000 }, adminUser as any);

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(result.status).toBe('confirmed');
    });

    it('sets schedule status to "paid" when confirmed amount fully covers amount due', async () => {
      const payment = createMockPayment({ status: 'pending_review', payment_schedule_id: 'schedule-uuid-1' });
      const schedule = createMockPaymentSchedule({ amount_due: 5000, amount_paid: 0 });

      prismaMock.payment.findFirst.mockResolvedValue(payment);
      prismaMock.paymentSchedule.findUnique.mockResolvedValue(schedule);

      let capturedScheduleUpdate: any;
      prismaMock.$transaction.mockImplementation(async (ops: any[]) => {
        // ops is an array of prisma operations; simulate the call
        // We need to capture the paymentSchedule.update arguments
        return [{ ...payment, status: 'confirmed' }, { status: 'paid' }];
      });

      // Spy on the actual prisma calls by inspecting what gets passed to $transaction
      const paymentUpdateSpy = vi.spyOn(prismaMock.payment, 'update');
      const scheduleUpdateSpy = vi.spyOn(prismaMock.paymentSchedule, 'update');

      // Re-implement: use a real transaction mock that captures args
      prismaMock.$transaction.mockImplementation(async (ops: any[]) => {
        // ops is [payment.update(...), paymentSchedule.update(...)]
        // execute them to capture the spies
        return ops;
      });

      // Run confirm - it will call payment.update and paymentSchedule.update and pass them to $transaction
      prismaMock.payment.update.mockReturnValue({ ...payment, status: 'confirmed' });
      prismaMock.paymentSchedule.update.mockReturnValue({ status: 'paid' });
      prismaMock.$transaction.mockImplementation(async (ops: any[]) => [
        { ...payment, status: 'confirmed' },
        { status: 'paid' },
      ]);

      await service.confirm('payment-uuid-1', { confirmed_amount: 5000 }, adminUser as any);

      expect(scheduleUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'paid' }),
        }),
      );
    });

    it('sets schedule status to "partial" when confirmed amount partially covers amount due', async () => {
      const payment = createMockPayment({ status: 'pending_review', payment_schedule_id: 'schedule-uuid-1' });
      const schedule = createMockPaymentSchedule({ amount_due: 5000, amount_paid: 0, status: 'pending' });

      prismaMock.payment.findFirst.mockResolvedValue(payment);
      prismaMock.paymentSchedule.findUnique.mockResolvedValue(schedule);

      prismaMock.payment.update.mockReturnValue({ ...payment, status: 'confirmed', amount: new Prisma.Decimal(2000) });
      prismaMock.paymentSchedule.update.mockReturnValue({ status: 'partial' });
      prismaMock.$transaction.mockImplementation(async (ops: any[]) => [
        { ...payment, status: 'confirmed' },
        { status: 'partial' },
      ]);

      await service.confirm('payment-uuid-1', { confirmed_amount: 2000 }, adminUser as any);

      const scheduleUpdateCall = prismaMock.paymentSchedule.update.mock.calls[0][0];
      expect(scheduleUpdateCall.data.status).toBe('partial');
    });

    it('adds confirmed_amount to schedule.amount_paid', async () => {
      const payment = createMockPayment({ status: 'pending_review', payment_schedule_id: 'schedule-uuid-1' });
      const schedule = createMockPaymentSchedule({ amount_due: 5000, amount_paid: 1000, status: 'partial' });

      prismaMock.payment.findFirst.mockResolvedValue(payment);
      prismaMock.paymentSchedule.findUnique.mockResolvedValue(schedule);

      prismaMock.payment.update.mockReturnValue({ ...payment, status: 'confirmed' });
      prismaMock.paymentSchedule.update.mockReturnValue({ status: 'paid' });
      prismaMock.$transaction.mockImplementation(async (ops: any[]) => [
        { ...payment, status: 'confirmed' },
        { status: 'paid' },
      ]);

      await service.confirm('payment-uuid-1', { confirmed_amount: 4000 }, adminUser as any);

      const scheduleUpdateCall = prismaMock.paymentSchedule.update.mock.calls[0][0];
      // 1000 existing + 4000 confirmed = 5000 = amount_due → paid
      expect(scheduleUpdateCall.data.amount_paid.toString()).toBe('5000');
      expect(scheduleUpdateCall.data.status).toBe('paid');
    });

    it('throws BadRequestException if payment status is not pending_review', async () => {
      const payment = createMockPayment({ status: 'confirmed' });
      prismaMock.payment.findFirst.mockResolvedValue(payment);

      await expect(
        service.confirm('payment-uuid-1', { confirmed_amount: 5000 }, adminUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if payment does not exist', async () => {
      prismaMock.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.confirm('nonexistent-id', { confirmed_amount: 5000 }, adminUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── reject ────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('sets payment status to rejected with a reason', async () => {
      const payment = createMockPayment({ status: 'pending_review' });
      prismaMock.payment.findFirst.mockResolvedValue(payment);
      prismaMock.payment.update.mockResolvedValue({ ...payment, status: 'rejected', rejection_reason: 'Invalid receipt' });

      const result = await service.reject('payment-uuid-1', { rejection_reason: 'Invalid receipt' });

      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'rejected',
            rejection_reason: 'Invalid receipt',
          }),
        }),
      );
      expect(result.status).toBe('rejected');
      expect(result.rejection_reason).toBe('Invalid receipt');
    });

    it('throws BadRequestException if payment is not in pending_review status', async () => {
      const payment = createMockPayment({ status: 'confirmed' });
      prismaMock.payment.findFirst.mockResolvedValue(payment);

      await expect(
        service.reject('payment-uuid-1', { rejection_reason: 'Too late' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if payment is already rejected', async () => {
      const payment = createMockPayment({ status: 'rejected' });
      prismaMock.payment.findFirst.mockResolvedValue(payment);

      await expect(
        service.reject('payment-uuid-1', { rejection_reason: 'Already rejected' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if payment does not exist', async () => {
      prismaMock.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.reject('nonexistent-id', { rejection_reason: 'Not found' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
