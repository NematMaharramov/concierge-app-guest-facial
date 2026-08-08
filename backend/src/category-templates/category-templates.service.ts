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
   * Category rows. Used when a new Tenant is created (see
   * TenantsService.create). Skipped entirely for CUSTOM/undefined verticals
   * — those tenants start with an empty category list, built by hand.
   *
   * NOTE: FilterGroupTemplate → FilterGroup/FilterOption copying is not
   * implemented yet — those relational models land in Part 3. The template
   * data is already seeded and waiting; Part 3 only needs to add the copy
   * step here once its schema exists.
   */
  async instantiateForTenant(tenantId: string, vertical: BusinessVertical | null | undefined) {
    if (!vertical || vertical === 'CUSTOM') return [];

    const templates = await this.findByVertical(vertical);
    if (templates.length === 0) return [];

    await this.prisma.category.createMany({
      data: templates.map((t) => ({
        tenantId,
        name: t.name,
        slug: t.slug,
        icon: t.icon,
        description: t.description,
        sortOrder: t.sortOrder,
      })),
    });

    return this.prisma.category.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } });
  }
}
