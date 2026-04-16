import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentFrequency } from '@prisma/client';
import { ContractsService } from '@/modules/contracts/contracts.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createMockContract, createMockUnit, createMockTenant } from '../helpers/factory';

// ─── Prisma mock factory ──────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    contract: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findFirst: vi.fn(),
    },
    unit: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    paymentSchedule: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

describe('ContractsService', () => {
  let service: ContractsService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
  });

  // ─── generateScheduleDates helper ─────────────────────────────────────────

  describe('generateScheduleDates', () => {
    it('generates correct monthly dates for a 12-month contract', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const dates = service.generateScheduleDates(start, end, PaymentFrequency.monthly);

      expect(dates).toHaveLength(12);
      expect(dates[0]).toEqual(new Date('2024-01-01'));
      expect(dates[11]).toEqual(new Date('2024-12-01'));
    });

    it('generates correct quarterly dates for a 12-month contract', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const dates = service.generateScheduleDates(start, end, PaymentFrequency.quarterly);

      expect(dates).toHaveLength(4);
      expect(dates[0]).toEqual(new Date('2024-01-01'));
      expect(dates[1]).toEqual(new Date('2024-04-01'));
      expect(dates[2]).toEqual(new Date('2024-07-01'));
      expect(dates[3]).toEqual(new Date('2024-10-01'));
    });

    it('generates correct yearly dates for a 12-month contract', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const dates = service.generateScheduleDates(start, end, PaymentFrequency.yearly);

      expect(dates).toHaveLength(1);
      expect(dates[0]).toEqual(new Date('2024-01-01'));
    });

    it('does not include a date that exceeds end date', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-06-30');
      const dates = service.generateScheduleDates(start, end, PaymentFrequency.monthly);

      // Jan, Feb, Mar, Apr, May, Jun — Jul 1 would exceed end
      expect(dates).toHaveLength(6);
      expect(dates[5]).toEqual(new Date('2024-06-01'));
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      tenant_id: 'tenant-uuid-1',
      unit_id: 'unit-uuid-1',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      rent_amount: 5000,
      payment_frequency: PaymentFrequency.monthly,
      grace_period_days: 7,
    };

    it('creates a contract with 12 monthly schedules', async () => {
      prismaMock.tenant.findFirst.mockResolvedValue(createMockTenant());
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.contract.findFirst.mockResolvedValue(null); // no existing active contract

      const expectedContract = {
        ...createMockContract(),
        payment_schedules: Array.from({ length: 12 }, (_, i) => ({
          id: `sched-${i}`,
          due_date: new Date(2024, i, 1),
          amount_due: 5000,
          amount_paid: 0,
          status: 'pending',
        })),
      };

      prismaMock.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const txMock = {
          unit: { update: vi.fn() },
          contract: {
            create: vi.fn().mockResolvedValue(expectedContract),
          },
        };
        return fn(txMock);
      });

      const result = await service.create(baseDto as any);

      expect(result.payment_schedules).toHaveLength(12);
    });

    it('creates a contract with 4 quarterly schedules', async () => {
      prismaMock.tenant.findFirst.mockResolvedValue(createMockTenant());
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.contract.findFirst.mockResolvedValue(null);

      const quarterlyContract = {
        ...createMockContract({ payment_frequency: 'quarterly' }),
        payment_schedules: Array.from({ length: 4 }, (_, i) => ({
          id: `sched-${i}`,
          due_date: new Date(2024, i * 3, 1),
          amount_due: 5000,
          amount_paid: 0,
          status: 'pending',
        })),
      };

      prismaMock.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const txMock = {
          unit: { update: vi.fn() },
          contract: { create: vi.fn().mockResolvedValue(quarterlyContract) },
        };
        return fn(txMock);
      });

      const result = await service.create({
        ...baseDto,
        payment_frequency: PaymentFrequency.quarterly,
      } as any);

      expect(result.payment_schedules).toHaveLength(4);
    });

    it('creates a contract with 1 yearly schedule', async () => {
      prismaMock.tenant.findFirst.mockResolvedValue(createMockTenant());
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.contract.findFirst.mockResolvedValue(null);

      const yearlyContract = {
        ...createMockContract({ payment_frequency: 'yearly' }),
        payment_schedules: [
          { id: 'sched-0', due_date: new Date('2024-01-01'), amount_due: 5000, amount_paid: 0, status: 'pending' },
        ],
      };

      prismaMock.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const txMock = {
          unit: { update: vi.fn() },
          contract: { create: vi.fn().mockResolvedValue(yearlyContract) },
        };
        return fn(txMock);
      });

      const result = await service.create({
        ...baseDto,
        payment_frequency: PaymentFrequency.yearly,
      } as any);

      expect(result.payment_schedules).toHaveLength(1);
    });

    it('throws BadRequestException if unit already has an active contract', async () => {
      prismaMock.tenant.findFirst.mockResolvedValue(createMockTenant());
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.contract.findFirst.mockResolvedValue({ id: 'existing-contract-id' });

      await expect(service.create(baseDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(baseDto as any)).rejects.toThrow(
        'Unit already has an active contract',
      );
    });

    it('throws BadRequestException if end_date is not after start_date', async () => {
      prismaMock.tenant.findFirst.mockResolvedValue(createMockTenant());
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ ...baseDto, end_date: '2023-12-31' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if tenant does not exist', async () => {
      prismaMock.tenant.findFirst.mockResolvedValue(null);

      await expect(service.create(baseDto as any)).rejects.toThrow(NotFoundException);
    });

    it('sets unit status to occupied inside the transaction', async () => {
      prismaMock.tenant.findFirst.mockResolvedValue(createMockTenant());
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.contract.findFirst.mockResolvedValue(null);

      const txUnitUpdate = vi.fn();
      const txContractCreate = vi.fn().mockResolvedValue({
        ...createMockContract(),
        payment_schedules: [],
      });

      prismaMock.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        return fn({
          unit: { update: txUnitUpdate },
          contract: { create: txContractCreate },
        });
      });

      await service.create(baseDto as any);

      expect(txUnitUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'unit-uuid-1' },
          data: { status: 'occupied' },
        }),
      );
    });
  });

  // ─── terminate ─────────────────────────────────────────────────────────────

  describe('terminate', () => {
    it('terminates contract, sets unit to vacant, and cancels pending schedules', async () => {
      prismaMock.contract.findFirst.mockResolvedValue({ id: 'contract-uuid-1', unit_id: 'unit-uuid-1' });

      const txContractUpdate = vi.fn();
      const txUnitUpdate = vi.fn();
      const txScheduleUpdateMany = vi.fn();

      prismaMock.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        return fn({
          contract: { update: txContractUpdate },
          unit: { update: txUnitUpdate },
          paymentSchedule: { updateMany: txScheduleUpdateMany },
        });
      });

      const result = await service.terminate('contract-uuid-1');

      expect(txContractUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'terminated' }),
        }),
      );
      expect(txUnitUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'vacant' },
        }),
      );
      expect(txScheduleUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contract_id: 'contract-uuid-1',
            status: 'pending',
          }),
          data: { status: 'cancelled' },
        }),
      );
      expect(result.message).toBe('Contract terminated successfully');
    });

    it('throws NotFoundException when contract does not exist', async () => {
      prismaMock.contract.findFirst.mockResolvedValue(null);

      await expect(service.terminate('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
