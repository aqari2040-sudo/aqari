import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MaintenanceService } from '@/modules/maintenance/maintenance.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createMockUnit,
  createMockMaintenanceCategory,
  createMockMaintenanceRequest,
  createMockAuthUser,
} from '../helpers/factory';

// ─── Prisma mock factory ──────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    unit: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    maintenanceCategory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    maintenanceRequest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    setting: {
      findUnique: vi.fn(),
    },
  };
}

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;

  const adminUser = createMockAuthUser();
  const tenantUser = createMockAuthUser({ role: 'tenant', tenant_id: 'tenant-uuid-1' });

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    // Default: no settings overrides (use defaults)
    prismaMock.setting.findUnique.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
  });

  // ─── create – duplicate detection ──────────────────────────────────────────

  describe('create – duplicate detection', () => {
    const validDto = {
      unit_id: 'unit-uuid-1',
      category_id: 'cat-uuid-1',
      description: 'AC not working again',
      priority: 'medium' as any,
    };

    it('detects a duplicate when same unit + category exists within the window', async () => {
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.maintenanceCategory.findFirst.mockResolvedValue(createMockMaintenanceCategory());

      const existingRequest = createMockMaintenanceRequest({
        unit: { id: 'unit-uuid-1', unit_number: '101' },
        category: { id: 'cat-uuid-1', name: 'HVAC', name_ar: 'تكييف' },
      });
      prismaMock.maintenanceRequest.findMany.mockResolvedValue([existingRequest]);

      const newBlockedRequest = createMockMaintenanceRequest({
        id: 'new-maint-uuid',
        status: 'blocked_duplicate',
        duplicate_of_id: 'maint-uuid-1',
      });
      prismaMock.maintenanceRequest.create.mockResolvedValue(newBlockedRequest);

      await expect(service.create(validDto, adminUser as any)).rejects.toThrow(ConflictException);
    });

    it('returns 409 ConflictException with duplicate_detected payload', async () => {
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.maintenanceCategory.findFirst.mockResolvedValue(createMockMaintenanceCategory());

      const existingRequest = createMockMaintenanceRequest({
        unit: { id: 'unit-uuid-1', unit_number: '101' },
        category: { id: 'cat-uuid-1', name: 'HVAC', name_ar: 'تكييف' },
      });
      prismaMock.maintenanceRequest.findMany.mockResolvedValue([existingRequest]);
      prismaMock.maintenanceRequest.create.mockResolvedValue(
        createMockMaintenanceRequest({ status: 'blocked_duplicate' }),
      );

      let caughtError: ConflictException | null = null;
      try {
        await service.create(validDto, adminUser as any);
      } catch (err) {
        caughtError = err as ConflictException;
      }

      expect(caughtError).toBeInstanceOf(ConflictException);
      const response = caughtError!.getResponse() as any;
      expect(response.duplicate_detected).toBe(true);
      expect(response.requires_override).toBe(true);
      expect(response.existing_requests).toHaveLength(1);
    });

    it('succeeds (status=submitted) when no duplicate found', async () => {
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.maintenanceCategory.findFirst.mockResolvedValue(createMockMaintenanceCategory());
      prismaMock.maintenanceRequest.findMany.mockResolvedValue([]); // no duplicates

      const created = createMockMaintenanceRequest({
        unit: { id: 'unit-uuid-1', unit_number: '101', property: { id: 'prop-uuid-1', name: 'Tower A' } },
        category: { id: 'cat-uuid-1', name: 'HVAC', name_ar: 'تكييف' },
      });
      prismaMock.maintenanceRequest.create.mockResolvedValue(created);

      const result = await service.create(validDto, adminUser as any);

      expect(result.status).toBe('submitted');
    });

    it('succeeds when same unit but different category (no duplicate)', async () => {
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.maintenanceCategory.findFirst.mockResolvedValue(
        createMockMaintenanceCategory({ id: 'cat-uuid-2', name: 'Plumbing' }),
      );
      // findMany returns empty because category differs (mock simulates DB filtering)
      prismaMock.maintenanceRequest.findMany.mockResolvedValue([]);

      const created = createMockMaintenanceRequest({ category_id: 'cat-uuid-2' });
      prismaMock.maintenanceRequest.create.mockResolvedValue(created);

      await expect(
        service.create({ ...validDto, category_id: 'cat-uuid-2' }, adminUser as any),
      ).resolves.toBeDefined();
    });

    it('succeeds when same unit + category but outside time window (no duplicates returned)', async () => {
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.maintenanceCategory.findFirst.mockResolvedValue(createMockMaintenanceCategory());
      // DB applies the window filter — no results
      prismaMock.maintenanceRequest.findMany.mockResolvedValue([]);

      const created = createMockMaintenanceRequest();
      prismaMock.maintenanceRequest.create.mockResolvedValue(created);

      await expect(service.create(validDto, adminUser as any)).resolves.toBeDefined();
    });

    it('throws NotFoundException when unit does not exist', async () => {
      prismaMock.unit.findFirst.mockResolvedValue(null);

      await expect(service.create(validDto, adminUser as any)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when category does not exist or is inactive', async () => {
      prismaMock.unit.findFirst.mockResolvedValue(createMockUnit());
      prismaMock.maintenanceCategory.findFirst.mockResolvedValue(null);

      await expect(service.create(validDto, adminUser as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── overrideDuplicate ─────────────────────────────────────────────────────

  describe('overrideDuplicate', () => {
    it('sets is_duplicate_override=true and status to submitted', async () => {
      prismaMock.maintenanceRequest.findFirst.mockResolvedValue(
        createMockMaintenanceRequest({ status: 'blocked_duplicate' }),
      );

      const updated = createMockMaintenanceRequest({
        status: 'submitted',
        is_duplicate_override: true,
        duplicate_override_justification: 'Previous was closed without resolution.',
        duplicate_override_by: adminUser.id,
      });
      prismaMock.maintenanceRequest.update.mockResolvedValue(updated);

      const result = await service.overrideDuplicate(
        'maint-uuid-1',
        { justification: 'Previous was closed without resolution.' },
        adminUser as any,
      );

      expect(prismaMock.maintenanceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'submitted',
            is_duplicate_override: true,
            duplicate_override_justification: 'Previous was closed without resolution.',
          }),
        }),
      );
      expect(result.status).toBe('submitted');
      expect(result.is_duplicate_override).toBe(true);
    });

    it('throws BadRequestException if request is not in blocked_duplicate status', async () => {
      prismaMock.maintenanceRequest.findFirst.mockResolvedValue(
        createMockMaintenanceRequest({ status: 'submitted' }),
      );

      await expect(
        service.overrideDuplicate(
          'maint-uuid-1',
          { justification: 'Some justification here.' },
          adminUser as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if maintenance request does not exist', async () => {
      prismaMock.maintenanceRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.overrideDuplicate(
          'nonexistent-id',
          { justification: 'Some justification here.' },
          adminUser as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findRecurringAlerts ───────────────────────────────────────────────────

  describe('findRecurringAlerts', () => {
    it('returns units exceeding the recurring maintenance threshold', async () => {
      prismaMock.maintenanceRequest.groupBy.mockResolvedValue([
        { unit_id: 'unit-uuid-1', _count: { id: 4 } },
        { unit_id: 'unit-uuid-2', _count: { id: 5 } },
      ]);

      prismaMock.unit.findMany.mockResolvedValue([
        {
          id: 'unit-uuid-1',
          unit_number: '101',
          property: { id: 'prop-uuid-1', name: 'Al Noor Tower' },
        },
        {
          id: 'unit-uuid-2',
          unit_number: '202',
          property: { id: 'prop-uuid-1', name: 'Al Noor Tower' },
        },
      ]);

      const result = await service.findRecurringAlerts();

      expect(result).toHaveLength(2);
      // Should be sorted by request_count descending
      expect(result[0].request_count).toBeGreaterThanOrEqual(result[1].request_count);
      expect(result[0].unit_number).toBe('202');
      expect(result[1].unit_number).toBe('101');
    });

    it('returns empty array when no units exceed the threshold', async () => {
      prismaMock.maintenanceRequest.groupBy.mockResolvedValue([]);

      const result = await service.findRecurringAlerts();

      expect(result).toEqual([]);
      // unit.findMany should not even be called
      expect(prismaMock.unit.findMany).not.toHaveBeenCalled();
    });

    it('uses custom threshold from settings', async () => {
      prismaMock.setting.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.key === 'recurring_maintenance_threshold') return { key: where.key, value: 5 };
        if (where.key === 'recurring_maintenance_window_days') return { key: where.key, value: 60 };
        return null;
      });

      prismaMock.maintenanceRequest.groupBy.mockResolvedValue([]);

      await service.findRecurringAlerts();

      const groupByCall = prismaMock.maintenanceRequest.groupBy.mock.calls[0][0];
      expect(groupByCall.having.id._count.gte).toBe(5);
    });
  });
});
