/**
 * safe-dedup-services.ts
 * ──────────────────────
 * Safely finds and removes duplicate Service records from the database.
 *
 * A "duplicate" is defined as: two or more services that share the same
 * (categoryId, name) pair (case-insensitive).  For each duplicate group the
 * OLDEST record (lowest createdAt) is kept; all newer duplicates are deleted
 * along with their images, reservations, and audit logs via cascading deletes.
 *
 * Usage:
 *   npx ts-node --project tsconfig.seed.json prisma/safe-dedup-services.ts
 *
 * Flags:
 *   --dry-run   Print what would be deleted without touching the database
 *               (default if the env var DRY_RUN=true is set)
 *
 * Safety guarantees:
 *   • Runs inside a transaction — either everything succeeds or nothing changes
 *   • Prints a full report before and after
 *   • The original/canonical record is never deleted
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN =
  process.argv.includes('--dry-run') ||
  process.env.DRY_RUN === 'true';

async function main() {
  console.log(`\n🔍  Scanning for duplicate services… (dry-run=${DRY_RUN})\n`);

  // Fetch all services ordered by createdAt so we can keep the oldest
  const allServices = await prisma.service.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, categoryId: true, name: true, createdAt: true },
  });

  // Group by (categoryId + normalised name)
  const groups = new Map<string, typeof allServices>();
  for (const svc of allServices) {
    const key = `${svc.categoryId}::${svc.name.trim().toLowerCase()}`;
    const existing = groups.get(key) || [];
    existing.push(svc);
    groups.set(key, existing);
  }

  // Find groups with duplicates
  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('✅  No duplicate services found. Nothing to do.\n');
    return;
  }

  console.log(`⚠️   Found ${duplicateGroups.length} duplicate group(s):\n`);

  const toDelete: string[] = [];

  for (const group of duplicateGroups) {
    const [keep, ...dupes] = group; // oldest first (already sorted)
    console.log(`  📌  Keep : [${keep.id}] "${keep.name}" (created ${keep.createdAt.toISOString()})`);
    for (const d of dupes) {
      console.log(`  🗑️   Delete: [${d.id}] "${d.name}" (created ${d.createdAt.toISOString()})`);
      toDelete.push(d.id);
    }
    console.log('');
  }

  console.log(`Total services to delete: ${toDelete.length}`);

  if (DRY_RUN) {
    console.log('\n🚫  Dry-run mode — no changes made.\n');
    return;
  }

  // Confirm prompt (skip in CI)
  if (process.stdin.isTTY) {
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((res) => {
      rl.question('\nProceed with deletion? (yes/no): ', (a) => { rl.close(); res(a); });
    });
    if (answer.trim().toLowerCase() !== 'yes') {
      console.log('Aborted.\n');
      return;
    }
  }

  // Execute inside a transaction
  await prisma.$transaction(async (tx) => {
    // Delete in dependency order:
    // 1. audit logs referencing the duplicate reservations
    const reservations = await tx.reservation.findMany({
      where: { serviceId: { in: toDelete } },
      select: { id: true },
    });
    const reservationIds = reservations.map((r) => r.id);

    if (reservationIds.length > 0) {
      const auditDeleted = await tx.auditLog.deleteMany({
        where: { reservationId: { in: reservationIds } },
      });
      console.log(`  Deleted ${auditDeleted.count} audit log(s)`);

      const resDeleted = await tx.reservation.deleteMany({
        where: { id: { in: reservationIds } },
      });
      console.log(`  Deleted ${resDeleted.count} reservation(s)`);
    }

    // 2. service images
    const imgDeleted = await tx.serviceImage.deleteMany({
      where: { serviceId: { in: toDelete } },
    });
    console.log(`  Deleted ${imgDeleted.count} service image record(s)`);

    // 3. the duplicate services themselves
    const svcDeleted = await tx.service.deleteMany({
      where: { id: { in: toDelete } },
    });
    console.log(`  Deleted ${svcDeleted.count} duplicate service(s)`);
  });

  console.log('\n✅  Deduplication complete.\n');
}

main()
  .catch((e) => {
    console.error('Error during deduplication:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
