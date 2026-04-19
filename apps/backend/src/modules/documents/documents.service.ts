import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta } from '../../common/dto/pagination.dto';

export interface CreateDocumentDto {
  name: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  property_id?: string;
}

export interface UpdateDocumentDto {
  name?: string;
  description?: string;
}

export interface QueryDocumentDto {
  page?: number;
  limit?: number;
  property_id?: string;
  search?: string;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List ────────────────────────────────────────────────────────────────────

  async findAll(query: QueryDocumentDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Parameters<typeof this.prisma.document.findMany>[0]['where'] = {
      deleted_at: null,
    };

    if (query.property_id) {
      where.property_id = query.property_id;
    }

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ─── Get One ─────────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, deleted_at: null },
    });

    if (!document) {
      throw new NotFoundException(`Document with id '${id}' not found`);
    }

    return document;
  }

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateDocumentDto, userId: string) {
    return this.prisma.document.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        file_url: dto.file_url,
        file_type: dto.file_type ?? null,
        file_size: dto.file_size ?? null,
        uploaded_by: userId,
        property_id: dto.property_id ?? null,
      },
    });
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateDocumentDto) {
    await this.assertExists(id);

    const data: Parameters<typeof this.prisma.document.update>[0]['data'] = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;

    return this.prisma.document.update({
      where: { id },
      data,
    });
  }

  // ─── Remove (soft delete) ────────────────────────────────────────────────────

  async remove(id: string) {
    await this.assertExists(id);

    await this.prisma.document.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { message: 'Document deleted successfully' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async assertExists(id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });

    if (!document) {
      throw new NotFoundException(`Document with id '${id}' not found`);
    }

    return document;
  }
}
