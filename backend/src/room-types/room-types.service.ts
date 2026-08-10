import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional } from 'class-validator';

export class CreateRoomTypeDto {
  @IsString() roomTypeName: string;
  @IsString() @IsOptional() inclusionsText?: string;
  @IsString() @IsOptional() pmsRoomCode?: string;
}

export class UpdateRoomTypeDto {
  @IsString() @IsOptional() roomTypeName?: string;
  @IsString() @IsOptional() inclusionsText?: string;
  @IsString() @IsOptional() pmsRoomCode?: string;
}

@Injectable()
export class RoomTypesService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.roomTypeInfo.findMany({ where: { tenantId }, orderBy: { roomTypeName: 'asc' } });
  }

  create(dto: CreateRoomTypeDto, tenantId: string) {
    return this.prisma.roomTypeInfo.create({ data: { ...dto, tenantId } });
  }

  async update(id: string, dto: UpdateRoomTypeDto, tenantId?: string) {
    const existing = await this.prisma.roomTypeInfo.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!existing) throw new NotFoundException('Room type not found');
    return this.prisma.roomTypeInfo.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId?: string) {
    const existing = await this.prisma.roomTypeInfo.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!existing) throw new NotFoundException('Room type not found');
    return this.prisma.roomTypeInfo.delete({ where: { id } });
  }
}
