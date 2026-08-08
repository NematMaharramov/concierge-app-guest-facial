import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateServiceDto {
  @IsString() categoryId: string;
  @IsString() name: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() priceInfo?: string;
  @IsNumber() @IsOptional() priceAmount?: number;
  @IsString() @IsOptional() priceCurrency?: string;
  @IsString() @IsOptional() contactName?: string;
  @IsString() @IsOptional() contactPhone?: string;
  @IsOptional() details?: any;
  @IsNumber() @IsOptional() sortOrder?: number;
  @IsBoolean() @IsOptional() isVisible?: boolean;
  @IsArray() @IsOptional() filterOptionIds?: string[];
}

export class UpdateServiceDto {
  @IsString() @IsOptional() categoryId?: string;
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() priceInfo?: string;
  @IsNumber() @IsOptional() priceAmount?: number;
  @IsString() @IsOptional() priceCurrency?: string;
  @IsString() @IsOptional() contactName?: string;
  @IsString() @IsOptional() contactPhone?: string;
  @IsOptional() details?: any;
  @IsNumber() @IsOptional() sortOrder?: number;
  @IsBoolean() @IsOptional() isVisible?: boolean;
  @IsArray() @IsOptional() filterOptionIds?: string[];
}

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  findAll(categoryId?: string, includeHidden = false, tenantId?: string) {
    return this.prisma.service.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(includeHidden ? {} : { isVisible: true }),
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        filterValues: true,
      },
    });
  }

  async findOne(id: string, tenantId?: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        filterValues: true,
      },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async create(dto: CreateServiceDto, tenantId?: string) {
    const existing = await this.prisma.service.findFirst({
      where: {
        categoryId: dto.categoryId,
        name: { equals: dto.name, mode: 'insensitive' },
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        `A service named "${dto.name}" already exists in this category. ` +
        `Please use a unique name or edit the existing service.`,
      );
    }

    const { filterOptionIds, ...data } = dto;

    return this.prisma.service.create({
      data: {
        ...data,
        ...(tenantId ? { tenantId } : {}),
        ...(filterOptionIds?.length
          ? { filterValues: { create: filterOptionIds.map((filterOptionId) => ({ filterOptionId })) } }
          : {}),
      },
      include: { category: true, images: true, filterValues: true },
    });
  }

  async update(id: string, dto: UpdateServiceDto, tenantId?: string) {
    const current = await this.findOne(id, tenantId);

    // Check for duplicate name if name or categoryId is being changed
    if (dto.name !== undefined || dto.categoryId !== undefined) {
      const targetCategoryId = dto.categoryId ?? current.categoryId;
      const targetName = dto.name ?? current.name;

      const duplicate = await this.prisma.service.findFirst({
        where: {
          categoryId: targetCategoryId,
          name: { equals: targetName, mode: 'insensitive' },
          NOT: { id },
          ...(tenantId ? { tenantId } : {}),
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `A service named "${targetName}" already exists in this category.`,
        );
      }
    }

    const { filterOptionIds, ...data } = dto;

    await this.prisma.service.update({ where: { id }, data });

    // filterOptionIds undefined = "not touched by this request" (e.g. the
    // basic edit form). An explicit [] clears all assignments.
    if (filterOptionIds !== undefined) {
      await this.prisma.serviceFilterValue.deleteMany({ where: { serviceId: id } });
      if (filterOptionIds.length) {
        await this.prisma.serviceFilterValue.createMany({
          data: filterOptionIds.map((filterOptionId) => ({ serviceId: id, filterOptionId })),
        });
      }
    }

    return this.prisma.service.findUnique({
      where: { id },
      include: { category: true, images: true, filterValues: true },
    });
  }

  async remove(id: string, tenantId?: string) {
    await this.findOne(id, tenantId);
    return this.prisma.service.delete({ where: { id } });
  }
}
