import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_SETTINGS } from '@aqari/shared';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async getValue<T = any>(key: string): Promise<T> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (setting) return setting.value as T;
    return (DEFAULT_SETTINGS as any)[key] ?? null;
  }

  async getNumberValue(key: string): Promise<number> {
    const val = await this.getValue(key);
    return typeof val === 'number' ? val : Number(val) || (DEFAULT_SETTINGS as any)[key] || 0;
  }

  async update(key: string, value: any, userId: string) {
    const existing = await this.prisma.setting.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Setting '${key}' not found`);
    }

    return this.prisma.setting.update({
      where: { key },
      data: {
        value,
        updated_by: userId,
      },
    });
  }
}
