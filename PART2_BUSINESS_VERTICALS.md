# Part 2 — Business Vertical Templates (implemented)

Branch: `feature/part2-business-verticals`, based on top of
`feature/part1-tenant-infra` (Part 2 depends on Part 1's Tenant/guard
infrastructure — merge Part 1 first, or merge both together).

## What changed

**Schema**
- `Role` enum gains `SUPER_ADMIN` (platform owner — needed to gate
  cross-tenant actions like "create a tenant", which is different from a
  tenant-scoped `ADMIN`).
- New `BusinessVertical` enum: `RESORT_LEISURE`, `BUSINESS_CITY_HOTEL`,
  `BOUTIQUE_HOTEL`, `CUSTOM`.
- New `CategoryTemplate` model — the reusable "starter kit" categories per
  vertical, unique per `(vertical, slug)`.
- New `FilterGroupTemplate` model — sub-filter blueprints per template
  category (e.g. "Cuisine Type" for Restaurants). `options` is stored as a
  JSON string array at the template stage. **Not yet copied into anything
  concrete** — Part 3 defines the real `FilterGroup`/`FilterOption` models
  and the copy step; this Part only seeds and stores the templates.
- `Tenant.businessVertical` — nullable, records which vertical a tenant
  picked (or none, for `CUSTOM`/hand-built tenants like the existing demo).

**New backend module: `backend/src/category-templates/`**
- `CategoryTemplatesService.findByVertical()` / `findAll()`
- `CategoryTemplatesService.instantiateForTenant(tenantId, vertical)` —
  copies `CategoryTemplate` rows into real, tenant-owned `Category` rows.
  Called automatically from `TenantsService.create()`.
- `CategoryTemplatesController` — `GET /category-templates?vertical=X`,
  `SUPER_ADMIN` only (read access for the future tenant-creation wizard, Part 7).

**`TenantsService` / `TenantsController`**
- New `POST /tenants` (`SUPER_ADMIN` only) — creates a tenant, optionally
  with a `businessVertical`, and auto-populates its categories from the
  matching template library in the same call.
- Existing `GET /tenants`, `GET /tenants/:id` are now `SUPER_ADMIN`-gated
  instead of `ADMIN` (tenant management is a platform-level action per the
  role table in the spec, not a per-tenant admin action).

**Template library seed: `backend/prisma/seed-category-templates.ts`**
- Idempotent (upserts on `[vertical, slug]`). Seeds the two starter
  verticals exactly as specified:
  - `RESORT_LEISURE`: Taxi & Transfers, Boat Excursions, Water Sports &
    Catamaran, Car Rental, Golf, Helicopter/Air Transfers.
  - `BUSINESS_CITY_HOTEL`: Museums, Restaurants & Dining (Cuisine Type
    filter), Tours (Location + Duration filters), Spa & Relaxing, Shopping
    & Local Markets, Business Services, Airport & City Transfers.
- `package.json` `setup` script now runs this between the tenant backfill
  and the demo data seed.

**One-off helper: `backend/prisma/promote-super-admin.ts`**
- Not part of the automated build. No account has `SUPER_ADMIN` yet — run
  this manually once against production to promote yourself:
  ```
  SUPER_ADMIN_EMAIL=you@example.com npx ts-node --project tsconfig.seed.json prisma/promote-super-admin.ts
  ```

## What you need to do on Render

Add the template seed step to the Build Command (same place you added the
Part 1 backfill step):

```
npx prisma generate && npx prisma db push && npx ts-node --project tsconfig.seed.json prisma/backfill-tenant.ts && npx ts-node --project tsconfig.seed.json prisma/seed-category-templates.ts && npx ts-node --project tsconfig.seed.json prisma/seed.ts && npm run build
```

After the first successful deploy, run `promote-super-admin.ts` once via
Render's Shell tab with your own email.

## Explicitly out of scope for this Part (by design)

- No UI for any of this — the Super Admin tenant-creation **wizard** is Part 7.
- `FilterGroupTemplate` → real `FilterGroup`/`FilterOption` copying — Part 3.
- No changes to existing per-tenant `ADMIN`/`CONCIERGE` flows.

## Question for you

`instantiateForTenant` currently only copies category **structure** (name,
slug, icon, description, sort order) — no services, since templates
intentionally ship empty ("guest gets real prices/photos via your team or
Excel import, Part 6"). Confirm that matches what you want, or if you'd
rather templates also ship placeholder services.
