# Part 9 — Staff Utility Modules (implemented)

Branch: `feature/part9-staff-utilities`, rebased cleanly onto `main` (Parts 1-8 all merged
by the time this was built).

## What changed

**Schema** — three small, flat, tenant-scoped models: `TaxiDriver` (name, phone, vehicleInfo,
notes), `PhoneDirectoryEntry` (name, phone, department, notes), `PriceSheetItem` (category, label,
price, currency, unit, notes — grouped by a free-text `category` for display, not tied to the
full `Category`/`FilterGroup` machinery since these are one-off reference items like "Late
checkout fee", not bookable services).

**Backend** — one `backend/src/staff-utilities` module covering all three (three near-identical
flat CRUD resources didn't seem worth three separate modules). Read is `ADMIN`+`CONCIERGE`
(staff reference material); write is `ADMIN` only, matching the rest of the app's
content-management convention.

**This Part is also where the `TenantFeatureFlag`s from Part 7 actually start doing something.**
Per the spec's own framing — "bu, sadəcə hansı modulların `TenantFeatureFlag` ilə açıldığına
aiddir, struktur dəyişikliyi tələb etmir" — the three nav items (`Taxi Drivers`, `Phone
Directory`, `Price Sheets`) are now gated by their matching flags (`taxi_directory`,
`phone_directory`, `price_sheets`, all already defined in Part 7). `dashboard/layout.tsx` fetches
the current tenant's flags via `GET /tenants/current` (already returning `featureFlags` since
Part 4) and hides/shows each item accordingly — so a business-hotel tenant can leave
`taxi_directory` off and never see an irrelevant list, exactly the example the spec gives.

**Default state:** since `TenantFeatureFlag.enabled` defaults to `false` (Part 7), all three
utility modules are **hidden for every existing tenant** until a Super Admin turns them on
per-tenant from Tenants → Manage → Feature Flags. Nothing appears unexpectedly for anyone.

## Scope decisions

1. Only `ADMIN` can create/edit/delete entries; `CONCIERGE` sees a read-only list. These change
   often in practice (a driver's number, say) — if you'd rather any staff member edit them
   directly, that's a one-line guard change per resource.
2. `PriceSheetItem` is deliberately separate from the existing `Service.priceInfo` — this is for
   ad-hoc fees/rates that aren't a bookable service in a category (towel replacement, late
   checkout), not a duplicate pricing system for things already in Services.

## What you need to do on Render

`prisma db push` picks up the three new tables — no backfill needed. Then, per tenant that wants
any of these: Super Admin → Tenants → Manage → Feature Flags → toggle on.
