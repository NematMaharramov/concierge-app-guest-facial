import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const rows = await this.prisma.siteSettings.findMany();
    return rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {});
  }

  async upsert(key: string, value: string) {
    return this.prisma.siteSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async updateMany(settings: Record<string, string>) {
    const ops = Object.entries(settings).map(([key, value]) =>
      this.prisma.siteSettings.upsert({ where: { key }, update: { value }, create: { key, value } })
    );
    return Promise.all(ops);
  }
}
