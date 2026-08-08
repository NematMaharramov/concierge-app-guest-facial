/**
 * backfill-tenant.ts
 * ──────────────────
 * Part 1 of the multi-tenancy transformation.
 *
 * `tenantId` was added as a NULLABLE column on User, Category, Service,
 * Reservation and AuditLog so that `prisma db push` can apply the schema
 * change safely against a live database (this project does not use
 * `prisma migrate`, see README). This script fills in the gap:
 *
 *   1. Creates (or reuses) a single default Tenant — the existing
 *      Raffles Praslin data becomes that tenant's demo data.
 *   2. Sets tenantId on every row that doesn't have one yet.
 *
 * Safe to run repeatedly (idempotent) and safe to run before or after
 * prisma/seed.ts — seed.ts wipes and recreates Category/Service rows
 * fresh on every run, and now assigns tenantId directly on creation, so
 * this script's real job going forward is mainly the User table (which
 * is upserted, not recreated, and therefore can carry over from before
 * this change).
 *
 * Usage:
 *   npx ts-node --project tsconfig.seed.json prisma/backfill-tenant.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'raffles-praslin';
const DEFAULT_TENANT_NAME = process.env.DEFAULT_TENANT_NAME || 'Raffles Praslin (Demo)';

async function main() {
  console.log(`\n🏢  Ensuring default tenant "${DEFAULT_TENANT_SLUG}" exists...`);

  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    update: {},
    create: { name: DEFAULT_TENANT_NAME, slug: DEFAULT_TENANT_SLUG },
  });

  console.log(`✅  Default tenant ready: ${tenant.id} (${tenant.slug})`);

  console.log('\n🔧  Backfilling tenantId on existing rows...');

  const [users, categories, services, reservations, auditLogs] = await Promise.all([
    prisma.user.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
    prisma.category.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
    prisma.service.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
    prisma.reservation.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
    prisma.auditLog.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } }),
  ]);

  console.log(`  Users:        ${users.count} row(s) updated`);
  console.log(`  Categories:   ${categories.count} row(s) updated`);
  console.log(`  Services:     ${services.count} row(s) updated`);
  console.log(`  Reservations: ${reservations.count} row(s) updated`);
  console.log(`  AuditLogs:    ${auditLogs.count} row(s) updated`);

  console.log('\n✅  Backfill complete.\n');
}

main()
  .catch((e) => {
    console.error('Backfill error:', e.message);
    // Non-fatal by design (mirrors seed.ts) — a build should not be
    // blocked if backfill has nothing to do or hits a transient issue;
    // it's safe to re-run.
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
