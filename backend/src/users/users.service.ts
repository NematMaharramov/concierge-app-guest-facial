import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() password: string;
  @IsString() name: string;
  @IsEnum(['ADMIN', 'CONCIERGE']) @IsOptional() role?: string;
}

export class UpdateUserDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() password?: string;
  @IsEnum(['ADMIN', 'CONCIERGE']) @IsOptional() role?: string;
  @IsOptional() isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.findByEmail(dto.email);
    if (exists) throw new ConflictException('Email already in use');
    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { email: dto.email, password, name: dto.name, role: (dto.role as any) || 'CONCIERGE' },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // FIX 2: Check for reservations owned by this user before deleting.
    // Deleting a user with reservations would violate the FK constraint on
    // Reservation.userId (no cascade defined) and throw a 500 in production.
    const reservationCount = await this.prisma.reservation.count({ where: { userId: id } });
    if (reservationCount > 0) {
      throw new BadRequestException(
        `Cannot delete user: they have ${reservationCount} reservation(s) on record. ` +
        `Deactivate the account instead, or reassign their reservations first.`
      );
    }

    // AuditLog.userId also has no cascade, so check that too.
    const auditCount = await this.prisma.auditLog.count({ where: { userId: id } });
    if (auditCount > 0) {
      throw new BadRequestException(
        `Cannot delete user: they have ${auditCount} audit log entry/entries. ` +
        `Deactivate the account instead to preserve the audit trail.`
      );
    }

    return this.prisma.user.delete({ where: { id } });
  }
}
