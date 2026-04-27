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
  @IsString() @IsOptional() profilePhoto?: string;
}

export class UpdateProfileDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() currentPassword?: string;
  @IsString() @IsOptional() newPassword?: string;
  @IsString() @IsOptional() profilePhoto?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, profilePhoto: true, createdAt: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, profilePhoto: true, createdAt: true },
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
      select: { id: true, email: true, name: true, role: true, isActive: true, profilePhoto: true, createdAt: true },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, profilePhoto: true, createdAt: true },
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = {};

    if (dto.name) data.name = dto.name;
    if (dto.profilePhoto !== undefined) data.profilePhoto = dto.profilePhoto;

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) throw new BadRequestException('Current password is incorrect');
      data.password = await bcrypt.hash(dto.newPassword, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, profilePhoto: true, createdAt: true },
    });
  }

  // ── Per-user theme preference stored in SiteSettings as user_theme:{userId} ──
  async getTheme(userId: string): Promise<string> {
    try {
      const row = await this.prisma.siteSettings.findUnique({
        where: { key: `user_theme:${userId}` },
      });
      return row?.value || 'dark';
    } catch {
      return 'dark';
    }
  }

  async setTheme(userId: string, theme: string): Promise<{ theme: string }> {
    const validThemes = ['dark', 'light'];
    const value = validThemes.includes(theme) ? theme : 'dark';
    await this.prisma.siteSettings.upsert({
      where: { key: `user_theme:${userId}` },
      update: { value },
      create: { key: `user_theme:${userId}`, value },
    });
    return { theme: value };
  }

  async remove(id: string) {
    await this.findOne(id);

    const reservationCount = await this.prisma.reservation.count({ where: { userId: id } });
    if (reservationCount > 0) {
      throw new BadRequestException(
        `Cannot delete user: they have ${reservationCount} reservation(s) on record. ` +
        `Deactivate the account instead, or reassign their reservations first.`
      );
    }

    const auditCount = await this.prisma.auditLog.count({ where: { userId: id } });
    if (auditCount > 0) {
      throw new BadRequestException(
        `Cannot delete user: they have ${auditCount} audit log entry/entries. ` +
        `Deactivate the account instead to preserve the audit trail.`
      );
    }

    // Clean up theme preference
    await this.prisma.siteSettings.deleteMany({
      where: { key: `user_theme:${id}` },
    });

    return this.prisma.user.delete({ where: { id } });
  }
}
