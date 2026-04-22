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

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.dateTime ? { dateTime: new Date(dto.dateTime) } : {}),
        status: dto.status as any,
      },
      include: { service: { include: { category: true } } },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      entityType: 'Reservation',
      entityId: id,
      reservationId: id,
      changes: { before: existing, after: dto },
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
      changes: { deleted: existing },
      ipAddress: ip,
    });

    return this.prisma.reservation.delete({ where: { id } });
  }

  getStats() {
    return this.prisma.$transaction([
      this.prisma.reservation.count(),
      this.prisma.reservation.count({ where: { status: 'ARRANGED' } }),
      this.prisma.reservation.count({ where: { status: 'PENDING' } }),
      this.prisma.reservation.count({ where: { status: 'CANCELLED' } }),
      this.prisma.service.count(),
      this.prisma.user.count({ where: { role: 'CONCIERGE' } }),
    ]).then(([total, arranged, pending, cancelled, services, users]) => ({
      total, arranged, pending, cancelled, services, users,
    }));
  }
}
