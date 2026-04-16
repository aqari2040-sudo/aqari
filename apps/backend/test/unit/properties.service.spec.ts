import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PropertiesService } from '@/modules/properties/properties.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createMockProperty } from '../helpers/factory';

// ─── Prisma mock factory ──────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    property: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    unit: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  };
}

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prismaMock = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated results with unit count', async () => {
      const raw = [
        {
          ...createMockProperty(),
          _count: { units: 5 },
        },
      ];
      prismaMock.property.findMany.mockResolvedValue(raw);
      prismaMock.property.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].unit_count).toBe(5);
      // Service sets _count to undefined to strip it from the response
      expect((result.data[0] as any)._count).toBeUndefined();
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 20, total_pages: 1 });
    });

    it('applies search filter correctly', async () => {
      prismaMock.property.findMany.mockResolvedValue([]);
      prismaMock.property.count.mockResolvedValue(0);

      await service.findAll({ search: 'Noor', page: 1, limit: 20 });

      const calledWhere = prismaMock.property.findMany.mock.calls[0][0].where;
      expect(calledWhere.OR).toBeDefined();
      expect(calledWhere.OR[0].name.contains).toBe('Noor');
    });

    it('applies type filter correctly', async () => {
      prismaMock.property.findMany.mockResolvedValue([]);
      prismaMock.property.count.mockResolvedValue(0);

      await service.findAll({ type: 'villa' as any, page: 1, limit: 20 });

      const calledWhere = prismaMock.property.findMany.mock.calls[0][0].where;
      expect(calledWhere.type).toBe('villa');
    });

    it('always filters out soft-deleted records', async () => {
      prismaMock.property.findMany.mockResolvedValue([]);
      prismaMock.property.count.mockResolvedValue(0);

      await service.findAll({});

      const calledWhere = prismaMock.property.findMany.mock.calls[0][0].where;
      expect(calledWhere.deleted_at).toBeNull();
    });

    it('returns correct pagination meta for multiple pages', async () => {
      prismaMock.property.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) =>
          ({ ...createMockProperty({ id: `prop-${i}` }), _count: { units: 0 } }),
        ),
      );
      prismaMock.property.count.mockResolvedValue(25);

      const result = await service.findAll({ page: 2, limit: 5 });

      expect(result.meta).toMatchObject({ total: 25, page: 2, limit: 5, total_pages: 5 });
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns property with unit status summary', async () => {
      prismaMock.property.findFirst.mockResolvedValue(createMockProperty());
      prismaMock.unit.groupBy.mockResolvedValue([
        { status: 'occupied', _count: { id: 3 } },
        { status: 'vacant', _count: { id: 2 } },
        { status: 'under_maintenance', _count: { id: 1 } },
      ]);

      const result = await service.findOne('prop-uuid-1');

      expect(result.units_summary).toEqual({
        total: 6,
        occupied: 3,
        vacant: 2,
        under_maintenance: 1,
      });
    });

    it('throws NotFoundException when property not found', async () => {
      prismaMock.property.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('returns zero counts when property has no units', async () => {
      prismaMock.property.findFirst.mockResolvedValue(createMockProperty());
      prismaMock.unit.groupBy.mockResolvedValue([]);

      const result = await service.findOne('prop-uuid-1');

      expect(result.units_summary).toEqual({
        total: 0,
        occupied: 0,
        vacant: 0,
        under_maintenance: 0,
      });
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a property with correct data', async () => {
      const dto = {
        name: 'Marina Heights',
        name_ar: 'مارينا هايتس',
        type: 'tower' as any,
        address: 'Abu Dhabi, UAE',
        address_ar: 'أبوظبي، الإمارات',
      };
      const created = createMockProperty({ ...dto, id: 'new-prop-uuid' });
      prismaMock.property.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(prismaMock.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Marina Heights' }),
        }),
      );
      expect(result.id).toBe('new-prop-uuid');
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes a property by setting deleted_at', async () => {
      // assertExists call
      prismaMock.property.findFirst.mockResolvedValue(createMockProperty());
      // unit count for occupied check
      prismaMock.unit.count.mockResolvedValue(0);
      prismaMock.property.update.mockResolvedValue({});

      const result = await service.remove('prop-uuid-1');

      expect(prismaMock.property.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-uuid-1' },
          data: expect.objectContaining({ deleted_at: expect.any(Date) }),
        }),
      );
      expect(result.message).toBe('Property deleted successfully');
    });

    it('throws BadRequestException when property has occupied units', async () => {
      prismaMock.property.findFirst.mockResolvedValue(createMockProperty());
      prismaMock.unit.count.mockResolvedValue(2);

      await expect(service.remove('prop-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when property does not exist', async () => {
      prismaMock.property.findFirst.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
