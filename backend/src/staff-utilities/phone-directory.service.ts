import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreatePhoneEntryDto {
  @IsString() name: string;
  @IsString() phone: string;
  @IsString() @IsOptional() department?: string;
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() sortOrder?: number;
}
export class UpdatePhoneEntryDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() department?: string;
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() sortOrder?: number;
}

@Injectable()
export class PhoneDirectoryService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.phoneDirectoryEntry.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } });
  }

  create(dto: CreatePhoneEntryDto, tenantId: string) {
    return this.prisma.phoneDirectoryEntry.create({ data: { ...dto, tenantId } });
  }

  async update(id: string, dto: UpdatePhoneEntryDto, tenantId?: string) {
    const existing = await this.prisma.phoneDirectoryEntry.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!existing) throw new NotFoundException('Phone directory entry not found');
    return this.prisma.phoneDirectoryEntry.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId?: string) {
    const existing = await this.prisma.phoneDirectoryEntry.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!existing) throw new NotFoundException('Phone directory entry not found');
    return this.prisma.phoneDirectoryEntry.delete({ where: { id } });
  }
}
