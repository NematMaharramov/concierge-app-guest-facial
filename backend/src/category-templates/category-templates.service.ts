import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessVertical } from '@prisma/client';

@Injectable()
export class CategoryTemplatesService {
  constructor(private prisma: PrismaService) {}

  findByVertical(vertical: BusinessVertical) {
    return this.prisma.categoryTemplate.findMany({
      where: { vertical },
      orderBy: { sortOrder: 'asc' },
      include: { filterGroups: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  findAll() {
    return this.prisma.categoryTemplate.findMany({
      orderBy: [{ vertical: 'asc' }, { sortOrder: 'asc' }],
      include: { filterGroups: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  /**
   * Copies the CategoryTemplate rows for a vertical into real, tenant-owned
   * Category rows — and, for any template category that has
   * FilterGroupTemplates (Part 2 groundwork), copies those into real
   * FilterGroup/FilterOption rows too (Part 3). Used when a new Tenant is
   * created (see TenantsService.create). Skipped entirely for
   * CUSTOM/undefined verticals — those tenants start with an empty
   * category list, built by hand.
   */
  async instantiateForTenant(tenantId: string, vertical: BusinessVertical | null | undefined) {
    if (!vertical || vertical === 'CUSTOM') return [];

    const templates = await this.findByVertical(vertical);
    if (templates.length === 0) return [];

    for (const t of templates) {
      const category = await this.prisma.category.create({
        data: {
          tenantId,
          name: t.name,
          slug: t.slug,
          icon: t.icon,
          description: t.description,
          sortOrder: t.sortOrder,
        },
      });

      for (const fg of t.filterGroups) {
        const options = Array.isArray(fg.options) ? (fg.options as unknown as string[]) : [];
        await this.prisma.filterGroup.create({
          data: {
            tenantId,
            categoryId: category.id,
            name: fg.name,
            isRequired: fg.isRequired,
            sortOrder: fg.sortOrder,
            options: {
              create: options.map((label, i) => ({ label, sortOrder: i })),
            },
          },
        });
      }
    }

    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { filterGroups: { include: { options: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }
}
