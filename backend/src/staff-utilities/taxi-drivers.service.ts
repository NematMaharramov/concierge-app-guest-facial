import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateTaxiDriverDto {
  @IsString() name: string;
  @IsString() phone: string;
  @IsString() @IsOptional() vehicleInfo?: string;
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() sortOrder?: number;
}
export class UpdateTaxiDriverDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() vehicleInfo?: string;
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() sortOrder?: number;
}

@Injectable()
export class TaxiDriversService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.taxiDriver.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } });
  }

  create(dto: CreateTaxiDriverDto, tenantId: string) {
    return this.prisma.taxiDriver.create({ data: { ...dto, tenantId } });
  }

  async update(id: string, dto: UpdateTaxiDriverDto, tenantId?: string) {
    const existing = await this.prisma.taxiDriver.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!existing) throw new NotFoundException('Taxi driver not found');
    return this.prisma.taxiDriver.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId?: string) {
    const existing = await this.prisma.taxiDriver.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!existing) throw new NotFoundException('Taxi driver not found');
    return this.prisma.taxiDriver.delete({ where: { id } });
  }
}
