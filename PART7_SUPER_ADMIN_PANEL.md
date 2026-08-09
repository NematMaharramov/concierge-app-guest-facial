# Part 7 — Super Admin Panel (implemented)

Branch: `feature/part7-super-admin-panel`, on top of merged `main` (Parts 1, 2, 3).

## What changed

**Schema**
- New `TenantFeatureFlag` model (`tenantId`, `key`, `enabled`, unique per `[tenantId, key]`) — simple on/off switches for optional modules. Nothing reads these yet (no module actually gates on them); this Part only ships the toggle UI so the switches exist ahead of the modules that will consume them (Part 9 and others).

**Backend — `tenants` module extended**
- `POST /tenants` (already existed from Part 2) now also accepts optional `adminEmail` / `adminPassword` / `adminName` and, when given, creates that tenant's first `ADMIN` user in the same call — solves the practical "how does anyone log into a brand-new tenant" bootstrap problem without a separate invite flow (not specified anywhere in the doc, so kept minimal).
- `PUT /tenants/:id` — update name / `isActive`. Slug is intentionally **not** editable yet (it's load-bearing for tenant resolution — see Part 1/8).
- `GET/PUT /tenants/:id/branding` — `TenantBranding` upsert (logo, colors, site title/subtitle).
- `GET/PUT /tenants/:id/feature-flags` — always returns the full known-flag list (defaulting unset ones to `false`) so the UI has a stable checklist.
- All of the above are `SUPER_ADMIN`-only, consistent with `GET /tenants`, `GET /tenants/:id` from Part 2.

**Frontend — new Super Admin area**
- `dashboard/layout.tsx` — nav is now role-aware: `SUPER_ADMIN` sees only **Dashboard** and **Tenants** (no Reservations/Services/Categories/Users/Settings — those are tenant-scoped and a platform owner has no tenant of their own, per the spec's "Guest site ≠ Admin panel ≠ Super Admin panel" scope rule). `ADMIN`/`CONCIERGE` nav is unchanged.
- `dashboard/page.tsx` — new `SuperAdminDashboard`: tenant count, active count, recent tenants list, link to full management.
- `dashboard/super-admin/tenants/page.tsx` (new) — tenant list table + two modals:
  - **Create wizard** (2 steps): Step 1 — name/slug/business vertical; Step 2 — optional first-admin bootstrap fields, plus a plain-text note that Excel import isn't available yet (Part 6 hasn't shipped — see below).
  - **Manage modal** (tabs): General (name, active toggle), Branding (logo/colors/site title), Feature Flags (checklist against `TenantFeatureFlag`).

## Scope decisions / deviations from the doc (flagging these explicitly)

1. **"Domen" (domain) management** — the spec lists this as part of the unchanged v1 functionality, but the actual v1 Part 2 document wasn't available to me (only this v2 doc, which treats v1 Part 2 as a black box). I did **not** build custom-domain UI here — `slug` (from Part 1) is the only tenant-resolution mechanism right now, and real subdomain/domain routing is explicitly Part 8. Flag if you expected more here.
2. **Excel import wizard step** — the spec's onboarding wizard ends with "upload Excel now (optional)". Since Part 6 (the import tool) hasn't been built yet and the execution order in the doc itself schedules it *after* this Part, step 2 shows an honest placeholder note instead of a non-functional upload button. Once Part 6 ships, this is the natural place to wire it in.
3. **Tenant deletion** — no `DELETE /tenants/:id`. Deleting a tenant would cascade-delete an entire hotel's categories/services/reservations/users; I only exposed `isActive` deactivation, which seemed safer to ship without an explicit request for hard delete. Say the word if you want hard delete too.

## What you need to do on Render

Nothing beyond the usual `prisma db push` — no new seed/backfill step for this Part.

After deploying, log in as your `SUPER_ADMIN` account (promoted via `promote-super-admin.ts` in Part 2) and you should see the **Tenants** nav item instead of the usual dashboard sections.
