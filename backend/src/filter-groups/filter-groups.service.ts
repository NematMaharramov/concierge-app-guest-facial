import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateFilterGroupDto {
  @IsString() name: string;
  @IsBoolean() @IsOptional() isRequired?: boolean;
  @IsNumber() @IsOptional() sortOrder?: number;
  @IsArray() @IsOptional() options?: string[];
}

export class UpdateFilterGroupDto {
  @IsString() @IsOptional() name?: string;
  @IsBoolean() @IsOptional() isRequired?: boolean;
  @IsNumber() @IsOptional() sortOrder?: number;
}

export class AddFilterOptionDto {
  @IsString() label: string;
  @IsNumber() @IsOptional() sortOrder?: number;
}

export class UpdateFilterOptionDto {
  @IsString() @IsOptional() label?: string;
  @IsNumber() @IsOptional() sortOrder?: number;
}

@Injectable()
export class FilterGroupsService {
  constructor(private prisma: PrismaService) {}

  findByCategory(categoryId: string) {
    return this.prisma.filterGroup.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async create(categoryId: string, dto: CreateFilterGroupDto, tenantId?: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, ...(tenantId ? { tenantId } : {}) },
    });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.filterGroup.create({
      data: {
        categoryId,
        tenantId: category.tenantId,
        name: dto.name,
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder ?? 0,
        options: {
          create: (dto.options || []).map((label, i) => ({ label, sortOrder: i })),
        },
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  private async findGroupOrThrow(id: string, tenantId?: string) {
    const group = await this.prisma.filterGroup.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!group) throw new NotFoundException('Filter group not found');
    return group;
  }

  async update(id: string, dto: UpdateFilterGroupDto, tenantId?: string) {
    await this.findGroupOrThrow(id, tenantId);
    return this.prisma.filterGroup.update({
      where: { id },
      data: dto,
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async remove(id: string, tenantId?: string) {
    await this.findGroupOrThrow(id, tenantId);
    return this.prisma.filterGroup.delete({ where: { id } });
  }

  async addOption(filterGroupId: string, dto: AddFilterOptionDto, tenantId?: string) {
    await this.findGroupOrThrow(filterGroupId, tenantId);
    return this.prisma.filterOption.create({
      data: { filterGroupId, label: dto.label, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  private async findOptionOrThrow(id: string, tenantId?: string) {
    const option = await this.prisma.filterOption.findFirst({
      where: { id, ...(tenantId ? { filterGroup: { tenantId } } : {}) },
    });
    if (!option) throw new NotFoundException('Filter option not found');
    return option;
  }

  async updateOption(id: string, dto: UpdateFilterOptionDto, tenantId?: string) {
    await this.findOptionOrThrow(id, tenantId);
    return this.prisma.filterOption.update({ where: { id }, data: dto });
  }

  async removeOption(id: string, tenantId?: string) {
    await this.findOptionOrThrow(id, tenantId);
    return this.prisma.filterOption.delete({ where: { id } });
  }
}
