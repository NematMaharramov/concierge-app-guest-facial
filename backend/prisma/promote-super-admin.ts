/**
 * promote-super-admin.ts
 * ───────────────────────
 * One-off helper — NOT part of the automated build/deploy pipeline.
 *
 * Part 2 introduces the SUPER_ADMIN role (platform owner), but no existing
 * account has it yet. Run this manually, once, against your production
 * database to promote your own account:
 *
 *   SUPER_ADMIN_EMAIL=you@example.com \
 *     npx ts-node --project tsconfig.seed.json prisma/promote-super-admin.ts
 *
 * (On Render: Shell tab on the backend service, run the command above with
 * your real email.)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  if (!email) {
    console.error('Set SUPER_ADMIN_EMAIL to the account you want to promote.');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  await prisma.user.update({ where: { email }, data: { role: 'SUPER_ADMIN' } });
  console.log(`✅  ${email} is now SUPER_ADMIN.`);
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
