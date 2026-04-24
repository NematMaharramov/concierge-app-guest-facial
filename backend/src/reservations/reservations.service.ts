import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';

export class CreateReservationDto {
  @IsString() serviceId: string;
  @IsString() guestName: string;
  @IsNumber() @IsOptional() guestCount?: number;
  @IsDateString() dateTime: string;
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() totalPrice?: number;
  @IsString() @IsOptional() currency?: string;
}

export class UpdateReservationDto {
  // FIX 1: serviceId was missing — frontend sends it but whitelist:true was silently stripping it
  @IsString() @IsOptional() serviceId?: string;
  @IsString() @IsOptional() guestName?: string;
  @IsNumber() @IsOptional() guestCount?: number;
  @IsDateString() @IsOptional() dateTime?: string;
  @IsEnum(['PENDING', 'ARRANGED', 'NOT_ARRANGED', 'CANCELLED']) @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() totalPrice?: number;
  @IsString() @IsOptional() currency?: string;
}

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService, private auditService: AuditService) {}

  findAll(userId?: string, role?: string) {
    return this.prisma.reservation.findMany({
      where: role === 'ADMIN' ? {} : { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        service: { include: { category: true } },
        user: { select: { name: true, email: true } },
      },
    });
  }

  async findOne(id: string, userId?: string, role?: string) {
    const res = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        service: { include: { category: true } },
        user: { select: { name: true, email: true } },
        auditLogs: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true, email: true, role: true } } },
        },
      },
    });
    if (!res) throw new NotFoundException('Reservation not found');
    if (role !== 'ADMIN' && res.userId !== userId) throw new ForbiddenException();
    return res;
  }

  async create(dto: CreateReservationDto, userId: string, ip?: string) {
    const reservation = await this.prisma.reservation.create({
      data: {
        serviceId: dto.serviceId,
        userId,
        guestName: dto.guestName,
        guestCount: dto.guestCount || 1,
        dateTime: new Date(dto.dateTime),
        notes: dto.notes,
        totalPrice: dto.totalPrice,
        currency: dto.currency,
        status: 'PENDING',
      },
      include: { service: { include: { category: true } } },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE',
      entityType: 'Reservation',
      entityId: reservation.id,
      reservationId: reservation.id,
      changes: dto,
      ipAddress: ip,
    });

    return reservation;
  }

  async update(id: string, dto: UpdateReservationDto, userId: string, role: string, ip?: string) {
    const existing = await this.findOne(id, userId, role);
    if (role !== 'ADMIN' && existing.userId !== userId) throw new ForbiddenException();

    // FIX 1: Build update data explicitly so serviceId is included when provided
    const updateData: any = {};
    if (dto.serviceId !== undefined) updateData.serviceId = dto.serviceId;
    if (dto.guestName !== undefined) updateData.guestName = dto.guestName;
    if (dto.guestCount !== undefined) updateData.guestCount = dto.guestCount;
    if (dto.dateTime !== undefined) updateData.dateTime = new Date(dto.dateTime);
    if (dto.status !== undefined) updateData.status = dto.status as any;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.totalPrice !== undefined) updateData.totalPrice = dto.totalPrice;
    if (dto.currency !== undefined) updateData.currency = dto.currency;

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: updateData,
      include: { service: { include: { category: true } } },
    });

    // Store only the changed fields in audit log, not the full existing object
    const changedFields: Record<string, { before: any; after: any }> = {};
    for (const key of Object.keys(dto) as (keyof UpdateReservationDto)[]) {
      if (dto[key] !== undefined) {
        changedFields[key] = {
          before: (existing as any)[key],
          after: dto[key],
        };
      }
    }

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      entityType: 'Reservation',
      entityId: id,
      reservationId: id,
      changes: changedFields,
      ipAddress: ip,
    });

    return updated;
  }

  async remove(id: string, userId: string, role: string, ip?: string) {
    const existing = await this.findOne(id, userId, role);
    if (role !== 'ADMIN' && existing.userId !== userId) throw new ForbiddenException();

    await this.auditService.log({
      userId,
      action: 'DELETE',
      entityType: 'Reservation',
      entityId: id,
      reservationId: id,
      // FIX 1 (audit): Store only key fields, not the full nested object
      changes: {
        guestName: existing.guestName,
        serviceId: existing.serviceId,
        dateTime: existing.dateTime,
        status: existing.status,
      },
      ipAddress: ip,
    });

    return this.prisma.reservation.delete({ where: { id } });
  }

  // FIX 3: Add NOT_ARRANGED to stats
  getStats() {
    return this.prisma.$transaction([
      this.prisma.reservation.count(),
      this.prisma.reservation.count({ where: { status: 'ARRANGED' } }),
      this.prisma.reservation.count({ where: { status: 'PENDING' } }),
      this.prisma.reservation.count({ where: { status: 'CANCELLED' } }),
      this.prisma.reservation.count({ where: { status: 'NOT_ARRANGED' } }),
      this.prisma.service.count(),
      this.prisma.user.count({ where: { role: 'CONCIERGE' } }),
    ]).then(([total, arranged, pending, cancelled, notArranged, services, users]) => ({
      total, arranged, pending, cancelled, notArranged, services, users,
    }));
  }
}
