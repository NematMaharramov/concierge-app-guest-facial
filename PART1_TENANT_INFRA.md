# Part 1 — Tenant Infrastructure (implemented)

This branch (`feature/part1-tenant-infra`) implements Part 1 of
`concierge-platform-transformation-prompt-v2.md`: the foundational
multi-tenancy infrastructure. No UI changes — this is backend-only.

## What changed

**Schema (`backend/prisma/schema.prisma`)**
- New `Tenant` model (`id, name, slug, isActive`)
- New `TenantBranding` model (1:1 with Tenant — logo/colors/site title, not yet wired into any endpoint; reserved for a later Part)
- `tenantId` added as a **nullable** foreign key to `User`, `Category`, `Service`, `Reservation`, `AuditLog`
  - Nullable is intentional: this project uses `prisma db push` (no migration files), so the column has to be backward-compatible with existing rows on first push. A follow-up Part should tighten this to `NOT NULL` once the backfill has run in production and you've confirmed via Prisma Studio that no row has `tenantId = null`.
- `Category.slug` / `Category.name` are no longer globally unique — they're now unique **per tenant** (`@@unique([tenantId, slug])`, `@@unique([tenantId, name])`), since two different hotel tenants will each want e.g. a "Golf" category.

**New backend module: `backend/src/tenants/`**
- `tenants.service.ts` — tenant lookup by id/slug, and `resolveFromRequest()` which checks (in order) an `x-tenant-slug` header, then the Host header's subdomain, then falls back to `DEFAULT_TENANT_SLUG` (default: `raffles-praslin`) so the current single-domain Render deployment keeps working unchanged.
- `tenant-context.middleware.ts` — runs on every request, resolves the tenant, attaches it as `req.tenant`.
- `tenants.controller.ts` — `GET /tenants/current` (public, returns the resolved tenant), `GET /tenants` and `GET /tenants/:id` (ADMIN only).

**Auth**
- JWT payload now carries `tenantId` (`auth.service.ts`, `jwt.strategy.ts`).
- New `TenantGuard` (`auth/guards.ts`) — defense-in-depth check that rejects requests where the authenticated user's `tenantId` doesn't match the host-resolved tenant. It's a no-op today (single domain → everyone resolves to the same default tenant) and only becomes meaningful once real subdomains exist.

**Scoped services/controllers**
`categories`, `services`, `reservations`, `audit`, `users` — all read/write paths now accept an optional `tenantId` and filter/assign by it. Guest-facing (public) routes scope by `req.tenant.id` (host-resolved); authenticated admin routes scope by `req.user.tenantId` (from JWT).

**Data backfill**
- `backend/prisma/backfill-tenant.ts` — idempotent script: creates/reuses a "Raffles Praslin (Demo)" tenant (slug `raffles-praslin`) and sets `tenantId` on any row that doesn't have one yet.
- `backend/prisma/seed.ts` — now creates/reuses that same default tenant and assigns `tenantId` to every row it seeds, so a fresh deploy is tenant-correct from the start.
- `backend/package.json` → `setup` script updated to: `prisma generate && prisma db push && backfill-tenant && seed`.

## What you need to do on Render

Update the **Build Command** for the backend service to run the backfill
script between `db push` and `seed` (if it isn't already using `npm run setup`,
add the backfill step explicitly):

```
npx prisma generate && npx prisma db push --accept-data-loss=false && npx ts-node --project tsconfig.seed.json prisma/backfill-tenant.ts && npx ts-node --project tsconfig.seed.json prisma/seed.ts && npm run build
```

(Adjust to match whatever your current Build Command already does — the
important new step is `backfill-tenant.ts`, and it must run **before**
you ever consider making `tenantId` required.)

No changes needed to the **Start Command**.

## Open questions for you before later Parts build on this

1. Should `TenantBranding` replace `SiteSettings`, or live alongside it? Left untouched in this Part.
2. `User.email` is still globally unique (not per-tenant) — login has no tenant context yet. Fine for one demo tenant; will need a decision once a second real tenant with overlapping staff emails shows up.
3. Confirm you're happy with the `DEFAULT_TENANT_SLUG=raffles-praslin` fallback name/slug, or want it renamed before this hits production.
