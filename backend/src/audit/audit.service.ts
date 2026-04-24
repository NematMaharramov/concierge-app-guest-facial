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

  // FIX 7: findByReservation() was dead code — the reservation detail page
  // fetches audit logs via the reservation's own Prisma include, not this method.
  // Removed to avoid confusion about which path is authoritative.
}
