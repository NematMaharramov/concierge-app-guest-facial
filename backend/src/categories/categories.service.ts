import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateCategoryDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() icon?: string;
  @IsString() @IsOptional() photo?: string;
  @IsNumber() @IsOptional() sortOrder?: number;
  @IsBoolean() @IsOptional() isVisible?: boolean;
}

export class UpdateCategoryDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() icon?: string;
  @IsString() @IsOptional() photo?: string;
  @IsNumber() @IsOptional() sortOrder?: number;
  @IsBoolean() @IsOptional() isVisible?: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // NOTE (Part 1): tenantId is optional everywhere below on purpose.
  // Existing rows are being backfilled by prisma/backfill-tenant.ts, and
  // the platform still runs on a single Render domain, so callers that
  // don't yet pass a tenantId keep working exactly as before. Once
  // subdomain routing lands, controllers will always pass req.tenant.id.

  findAll(includeHidden = false, tenantId?: string) {
    return this.prisma.category.findMany({
      where: {
        ...(includeHidden ? {} : { isVisible: true }),
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { services: true } } },
    });
  }

  async findOne(id: string, tenantId?: string) {
    const cat = await this.prisma.category.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include: {
        services: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } }, filterValues: true },
        },
        filterGroups: { orderBy: { sortOrder: 'asc' }, include: { options: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async findBySlug(slug: string, tenantId?: string) {
    const cat = await this.prisma.category.findFirst({
      where: { slug, ...(tenantId ? { tenantId } : {}) },
      include: {
        services: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } }, filterValues: true },
        },
        filterGroups: { orderBy: { sortOrder: 'asc' }, include: { options: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  create(dto: CreateCategoryDto, tenantId?: string) {
    return this.prisma.category.create({ data: { ...dto, ...(tenantId ? { tenantId } : {}) } });
  }

  async update(id: string, dto: UpdateCategoryDto, tenantId?: string) {
    await this.findOne(id, tenantId);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId?: string) {
    await this.findOne(id, tenantId);
    return this.prisma.category.delete({ where: { id } });
  }
}
