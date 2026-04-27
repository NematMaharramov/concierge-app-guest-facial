import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

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
}

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  findAll(categoryId?: string, includeHidden = false) {
    return this.prisma.service.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(includeHidden ? {} : { isVisible: true }),
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async create(dto: CreateServiceDto) {
    const existing = await this.prisma.service.findFirst({
      where: {
        categoryId: dto.categoryId,
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A service named "${dto.name}" already exists in this category. ` +
        `Please use a unique name or edit the existing service.`,
      );
    }

    return this.prisma.service.create({
      data: dto,
      include: { category: true, images: true },
    });
  }

  async update(id: string, dto: UpdateServiceDto) {
    const current = await this.findOne(id);

    // Check for duplicate name if name or categoryId is being changed
    if (dto.name !== undefined || dto.categoryId !== undefined) {
      const targetCategoryId = dto.categoryId ?? current.categoryId;
      const targetName = dto.name ?? current.name;

      const duplicate = await this.prisma.service.findFirst({
        where: {
          categoryId: targetCategoryId,
          name: { equals: targetName, mode: 'insensitive' },
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `A service named "${targetName}" already exists in this category.`,
        );
      }
    }

    return this.prisma.service.update({
      where: { id },
      data: dto,
      include: { category: true, images: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.service.delete({ where: { id } });
  }
}
