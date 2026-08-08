/**
 * seed-category-templates.ts
 * ───────────────────────────
 * Part 2 of the multi-tenancy transformation.
 *
 * Populates the CategoryTemplate / FilterGroupTemplate library — the
 * "starter kit" of categories offered when a Super Admin creates a new
 * tenant and picks a Business Vertical. This is platform-wide data (not
 * tenant-scoped) and is safe to re-run (upserts on the [vertical, slug]
 * unique constraint).
 *
 * Usage:
 *   npx ts-node --project tsconfig.seed.json prisma/seed-category-templates.ts
 */

import { PrismaClient, BusinessVertical } from '@prisma/client';

const prisma = new PrismaClient();

interface FilterGroupSeed {
  name: string;
  options: string[];
  isRequired?: boolean;
  sortOrder?: number;
}

interface CategoryTemplateSeed {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  sortOrder: number;
  filterGroups?: FilterGroupSeed[];
}

const RESORT_LEISURE: CategoryTemplateSeed[] = [
  { name: 'Taxi & Transfers', slug: 'taxi-transfers', icon: '🚗', description: 'Private taxi and transfer services', sortOrder: 1 },
  { name: 'Boat Excursions', slug: 'boat-excursions', icon: '⛵', description: 'Private and group boat trips, island hopping and fishing charters', sortOrder: 2 },
  { name: 'Water Sports & Catamaran', slug: 'water-sports-catamaran', icon: '🛥️', description: 'Catamaran charters and water sports', sortOrder: 3 },
  { name: 'Car Rental', slug: 'car-rental', icon: '🔑', description: 'Self-drive car rental including insurance', sortOrder: 4 },
  { name: 'Golf', slug: 'golf', icon: '⛳', description: 'Golf course access and tee times', sortOrder: 5 },
  { name: 'Helicopter / Air Transfers', slug: 'helicopter-air-transfers', icon: '🚁', description: 'Scenic and inter-location air transfers', sortOrder: 6 },
];

const BUSINESS_CITY_HOTEL: CategoryTemplateSeed[] = [
  { name: 'Museums', slug: 'museums', icon: '🏛️', description: 'Museums and cultural sites', sortOrder: 1 },
  {
    name: 'Restaurants & Dining', slug: 'restaurants-dining', icon: '🍽️', description: 'Restaurant recommendations and reservations', sortOrder: 2,
    filterGroups: [
      { name: 'Cuisine Type', options: ['Azerbaijani', 'Italian', 'Japanese', 'Steakhouse', 'Seafood', 'Fusion'], isRequired: false, sortOrder: 1 },
    ],
  },
  {
    name: 'Tours', slug: 'tours', icon: '🗺️', description: 'Guided tours and excursions', sortOrder: 3,
    filterGroups: [
      { name: 'Location', options: ['City Center', 'Out of City'], isRequired: false, sortOrder: 1 },
      { name: 'Duration', options: ['Half Day', 'Full Day'], isRequired: false, sortOrder: 2 },
    ],
  },
  { name: 'Spa & Relaxing', slug: 'spa-relaxing', icon: '💆', description: 'Spa and wellness services', sortOrder: 4 },
  { name: 'Shopping & Local Markets', slug: 'shopping-local-markets', icon: '🛍️', description: 'Shopping recommendations and local markets', sortOrder: 5 },
  { name: 'Business Services', slug: 'business-services', icon: '💼', description: 'Printing, translation, conference support and other business-traveller needs', sortOrder: 6 },
  { name: 'Airport & City Transfers', slug: 'airport-city-transfers', icon: '🚕', description: 'Airport pickups and city transfers', sortOrder: 7 },
];

async function seedVertical(vertical: BusinessVertical, templates: CategoryTemplateSeed[]) {
  console.log(`\n📦  Seeding vertical: ${vertical}`);
  for (const t of templates) {
    const template = await prisma.categoryTemplate.upsert({
      where: { vertical_slug: { vertical, slug: t.slug } },
      update: { name: t.name, icon: t.icon, description: t.description, sortOrder: t.sortOrder },
      create: { vertical, name: t.name, slug: t.slug, icon: t.icon, description: t.description, sortOrder: t.sortOrder },
    });

    if (t.filterGroups?.length) {
      // Templates are small and rebuilt wholesale on re-seed — simplest
      // idempotent approach given options is a JSON blob, not relational.
      await prisma.filterGroupTemplate.deleteMany({ where: { categoryTemplateId: template.id } });
      for (const fg of t.filterGroups) {
        await prisma.filterGroupTemplate.create({
          data: {
            categoryTemplateId: template.id,
            name: fg.name,
            options: fg.options,
            isRequired: fg.isRequired ?? false,
            sortOrder: fg.sortOrder ?? 0,
          },
        });
      }
    }
    console.log(`  ✓ ${t.name}${t.filterGroups?.length ? ` (${t.filterGroups.length} filter group(s))` : ''}`);
  }
}

async function main() {
  await seedVertical('RESORT_LEISURE', RESORT_LEISURE);
  await seedVertical('BUSINESS_CITY_HOTEL', BUSINESS_CITY_HOTEL);
  console.log('\n✅  Category template library seeded.\n');
}

main()
  .catch((e) => {
    console.error('Category template seed error:', e.message);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
