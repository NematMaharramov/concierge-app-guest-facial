import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateLetterTemplateDto {
  @IsString() name: string;
  @IsString() subject: string;
  @IsString() bodyHtml: string;
  @IsBoolean() @IsOptional() isDefault?: boolean;
}

export class UpdateLetterTemplateDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() subject?: string;
  @IsString() @IsOptional() bodyHtml?: string;
  @IsBoolean() @IsOptional() isDefault?: boolean;
}

@Injectable()
export class LetterTemplatesService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.letterTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string, tenantId?: string) {
    const template = await this.prisma.letterTemplate.findFirst({ where: { id, ...(tenantId ? { tenantId } : {}) } });
    if (!template) throw new NotFoundException('Letter template not found');
    return template;
  }

  async create(dto: CreateLetterTemplateDto, tenantId: string) {
    if (dto.isDefault) await this.clearExistingDefault(tenantId);
    return this.prisma.letterTemplate.create({ data: { ...dto, tenantId } });
  }

  async update(id: string, dto: UpdateLetterTemplateDto, tenantId?: string) {
    const existing = await this.findOne(id, tenantId);
    if (dto.isDefault) await this.clearExistingDefault(existing.tenantId);
    return this.prisma.letterTemplate.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId?: string) {
    await this.findOne(id, tenantId);
    return this.prisma.letterTemplate.delete({ where: { id } });
  }

  private async clearExistingDefault(tenantId: string) {
    await this.prisma.letterTemplate.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } });
  }
}
