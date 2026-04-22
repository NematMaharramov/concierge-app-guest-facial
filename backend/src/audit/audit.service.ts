import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(data: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    reservationId?: string;
    changes?: any;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  findAll(reservationId?: string) {
    return this.prisma.auditLog.findMany({
      where: reservationId ? { reservationId } : {},
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true, role: true } } },
      take: 500,
    });
  }

  findByReservation(reservationId: string) {
    return this.prisma.auditLog.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true, email: true, role: true } } },
    });
  }
}
