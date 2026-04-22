import { Injectable, NotFoundException } from '@nestjs/common';
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

  create(dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: dto,
      include: { category: true, images: true },
    });
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);
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
