import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreatePriceSheetItemDto {
  @IsString() category: string;
  @IsString() label: string;
  @IsNumber() @IsOptional() price?: number;
  @IsString() @IsOptional() currency?: string;
  @IsString() @IsOptional() unit?: string;
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() sortOrder?: number;
}
export class UpdatePriceSheetItemDto {
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() label?: string;
  @IsNumber() @IsOptional() price?: number;
  @IsString() @IsOptional() currency?: string;
  @IsString() @IsOptional() unit?: string;
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() sortOrder?: number;
}

@Injectable()
export class PriceSheetsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.priceSheetItem.findMany({ where: { tenantId }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
  }

  create(dto: CreatePriceSheetItemDto, tenantId: string) {
    return this.prisma.priceSheetItem.create({ data: { ...dto, tenantId } });
  }

  async update(id: string, dto: UpdatePriceSheetItemDto, tenantId?: string) {
    const existing = await this.prisma.priceSheetItem.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!existing) throw new NotFoundException('Price sheet item not found');
    return this.prisma.priceSheetItem.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId?: string) {
    const existing = await this.prisma.priceSheetItem.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!existing) throw new NotFoundException('Price sheet item not found');
    return this.prisma.priceSheetItem.delete({ where: { id } });
  }
}
