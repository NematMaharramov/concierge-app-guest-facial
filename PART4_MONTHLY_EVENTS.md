# Part 4 — Monthly Events List (implemented)

Branch: `feature/part4-monthly-events`, on top of merged `main` (Parts 1, 2, 3, 6, 7, 8).

## What changed

**Schema** — new `Event` model (`tenantId` required — this is a brand-new model, no existing
rows to backfill, so no nullable/backward-compat concern here unlike Part 1's retrofits):
`title`, `description`, `imageUrl`, `startDate`, `endDate?`, `location?`, `category?` (free
text, no filter system — per spec), `isActive`.

**Backend — new `backend/src/events/` module**
- `GET /events` — public, guest site. Scoped by the host-resolved tenant; `?upcoming=true` filters
  to events that haven't ended yet (or have no end date and haven't started yet). Returns `[]`
  rather than erroring if no tenant resolves.
- `GET /events/admin` — `ADMIN`, own tenant, includes inactive events.
- `POST/PUT/DELETE /events` — `ADMIN`.
- `EventsService.findOverlapping(tenantId, checkIn, checkOut)` — not called by anything yet, but
  built now since it's exactly what Part 5's Pre-Arrival Letter wizard will need ("qalma tarixinə
  uyğun tədbirlər avtomatik önə çıxarılır").
- `GET /tenants/current` (from Part 7) now also returns `featureFlags: Record<string, boolean>`
  — the mechanism the guest site uses to check whether `monthly_events` is on for this tenant.
  This is the first real *consumer* of a feature flag; Part 9 is where flag-gating becomes a
  general pattern across modules, but this one needed it now to satisfy the spec's explicit
  "feature flag ilə açıq/qapalı" requirement for this Part.

**Frontend**
- `dashboard/admin/events` (new nav item) — list grouped by month, create/edit modal.
- Guest homepage (`app/page.tsx`) — new "This Month at {hotel}" section, rendered only when
  `tenant.featureFlags.monthly_events` is true **and** there's at least one upcoming event.
  Placed between the services grid and the concierge strip, matching the page's existing section
  rhythm/spacing rather than introducing a new visual language.

## Scope decisions (flagging explicitly)

1. **Answering open question #3 from the spec** ("ictimai olsun, yoxsa daxili?") **by building
   both, gated by the flag** — off by default for a new tenant (feature flags default to `false`
   per Part 7's `getFeatureFlags`), so nothing appears on a guest site unless a Super Admin (or,
   once you decide, perhaps the tenant's own ADMIN — currently only `SUPER_ADMIN` can toggle
   flags) explicitly turns it on. If you wanted a different default, say so.
2. **List view, not a calendar grid.** The spec says a calendar view is "tövsiyə olunur"
   (recommended, not required). I built a simpler month-grouped list instead — meets the actual
   need (browse events by month) without a calendar-grid library dependency. Happy to add a real
   calendar UI as a follow-up if you'd prefer it.
3. **`ADMIN` cannot toggle their own `monthly_events` flag** — only `SUPER_ADMIN` can (Part 7's
   existing feature-flag endpoints). If tenants should be able to turn this on/off themselves,
   that's a small addition to the Settings page, not a structural change.

## What you need to do on Render

Just the usual `prisma db push` — new model, no backfill needed. To actually see the guest-site
section for a tenant: Super Admin → Tenants → Manage → Feature Flags → enable "Monthly Events
List", then add events from that tenant's own Admin → Events.
