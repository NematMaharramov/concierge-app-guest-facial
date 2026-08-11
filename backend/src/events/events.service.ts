import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateEventDto {
  @IsString() title: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() imageUrl?: string;
  @IsDateString() startDate: string;
  @IsDateString() @IsOptional() endDate?: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() category?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

export class UpdateEventDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() imageUrl?: string;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() endDate?: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() category?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string, includeInactive = false) {
    return this.prisma.event.findMany({
      where: { tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { startDate: 'asc' },
    });
  }

  /** Upcoming + currently-running events — what the guest-site section and
   * the default admin view actually want, rather than the full history. */
  findUpcoming(tenantId: string) {
    const now = new Date();
    return this.prisma.event.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ endDate: { gte: now } }, { endDate: null, startDate: { gte: now } }],
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /** Events whose date range overlaps a guest's stay — used by Part 5's
   * Pre-Arrival Letter wizard to suggest events for {{event_list}}. */
  findOverlapping(tenantId: string, checkIn: Date, checkOut: Date) {
    return this.prisma.event.findMany({
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: checkOut },
        OR: [{ endDate: { gte: checkIn } }, { endDate: null, startDate: { gte: checkIn } }],
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string, tenantId?: string) {
    const event = await this.prisma.event.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  create(dto: CreateEventDto, tenantId: string) {
    return this.prisma.event.create({ data: { ...dto, tenantId } });
  }

  async update(id: string, dto: UpdateEventDto, tenantId?: string) {
    await this.findOne(id, tenantId);
    return this.prisma.event.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId?: string) {
    await this.findOne(id, tenantId);
    return this.prisma.event.delete({ where: { id } });
  }
}
