# Part 5 — Pre-Arrival Letter System (implemented)

Branch: `feature/part5-pre-arrival-letters`, branched from `feature/part4-monthly-events`
(depends on Part 4's `Event` model for stay-overlap suggestions) — **not yet based on merged
main**, since Parts 4-8-6 hadn't all been merged when this was built. Rebase before merging if
`main` has moved.

This was the biggest Part so far, covering all three pieces the spec calls out: **Template
Engine**, **Sending Wizard**, and **Outlook/Opera integration**.

## 5.1 Template Engine

- New `LetterTemplate` model (name, subject, bodyHtml, isDefault — one default per tenant,
  enforced by clearing any prior default on save).
- `backend/src/common/merge-engine.ts` — plain `{{field}}` replacement, all 10 fields from the
  spec (`guest_first_name` through `event_list`).
- Admin page `dashboard/admin/letter-templates`: name/subject/HTML body fields, a live HTML
  preview pane, and click-to-insert buttons for every merge field.
- **Deviation from spec:** no TipTap rich-text editor — a plain HTML textarea with a live preview
  instead. TipTap is a real dependency + integration effort or its own; given the number of other
  pieces in this Part, I judged a working plain-HTML editor now beats a partially-wired rich-text
  one. Swapping in TipTap later only touches this one page.

## 5.2 Sending Wizard

- `dashboard/pre-arrival` (new nav item, visible to `CONCIERGE` and `ADMIN`): 4 steps — guest
  details (always manual entry, see below) + template pick → suggested events (checkboxes, using
  Part 4's `Event.startDate/endDate` overlap logic) → preview → send. Includes a **History** view
  (`GuestCommunication` log, SENT/FAILED badges).
- Step 4 lets the concierge hand-edit the rendered subject/HTML before sending — the spec calls
  this out explicitly as a personalization requirement, not optional polish.
- `RoomTypeInfo` + `dashboard/admin/room-types` — the "otaq tipi ↔ inclusions" mapping, maintained
  by hand, used whether or not a PMS is connected.
- **Weather:** `WeatherService` uses **Open-Meteo** (no API key/signup needed) rather than
  OpenWeatherMap — answers the spec's open question #2 with "whichever works today"; swapping
  providers later is a one-file change (`common/weather.service.ts`). Failure always degrades to
  "Please check the local forecast closer to your arrival," never blocks sending, per the spec's
  explicit resilience requirement.
- `TenantBranding` gained `latitude`/`longitude` (Super Admin → Manage → Branding) — the weather
  lookup's location source.

## 5.3 Outlook Integration

- Built **Option B** (application permission / shared mailbox) — the spec's own recommendation
  for a first version. `backend/src/integrations/providers/outlook/outlook.adapter.ts` —
  client-credentials OAuth against Microsoft Graph, `sendMail(to, subject, html)`, one retry on
  failure.
- `TenantIntegration` (generic, provider-keyed) stores encrypted credentials via Part 8's
  `CryptoService` — nothing is ever stored as plaintext.
- Configured from Super Admin → Tenants → Manage → **Outlook** tab (Azure Tenant ID, Client ID,
  Client Secret, sender mailbox). Falls back to platform-wide `OUTLOOK_*` env vars if a tenant
  hasn't configured its own — one Azure App Registration can serve every tenant until a brand
  needs its own mailbox.
- **What you still have to do manually:** create the Azure AD App Registration and grant it
  `Mail.Send` **application** permission with admin consent — that's a Azure Portal step no code
  can do for you. Nothing sends until that exists and its credentials are entered somewhere
  (per-tenant in the panel, or as Render env vars).
- Failure handling: `GuestCommunication.status` becomes `FAILED` (not silently dropped), and the
  concierge sees an error toast pointing at "ask your Super Admin to set it up" when nothing is
  configured yet.

## 5.4 Opera PMS Integration — **not built**, and here's exactly why

The spec's own resilience principle — "sistem heç vaxt 'yalnız PMS ilə işləyər' vəziyyətinə
düşməməlidir" — is fully satisfied: guest info is **always** entered by hand in this version,
which is not a fallback path here, it's the *only* path. There is no `GuestArrival` model, no
Opera adapter, and no "pull expected arrivals" list.

Building a real Opera adapter needs an actual Opera PMS instance, API credentials, and its
specific integration contract (OHIP/OXI or whatever a given property runs) — none of which exist
yet on your side. Writing an adapter against a guessed API shape would be code that looks done but
doesn't work against a real property, which is worse than clearly not having it. `TenantIntegration`
already has a generic `provider` field ready for `'opera'` when you have something real to point it
at, and `RoomTypeInfo.pmsRoomCode` is already there for the room-code mapping mentioned in the spec.

## What you need to do on Render

1. `prisma db push` picks up the new models — no backfill needed (all new tables).
2. To actually send anything: register an Azure AD app (`Mail.Send` application permission,
   admin-consented), then either set `OUTLOOK_AZURE_TENANT_ID` / `OUTLOOK_CLIENT_ID` /
   `OUTLOOK_CLIENT_SECRET` / `OUTLOOK_SENDER_EMAIL` as Render env vars, or configure it per-tenant
   from the Super Admin panel.
3. For weather to work, set each tenant's latitude/longitude in Super Admin → Manage → Branding.
4. Add at least one `LetterTemplate` and (optionally) some `RoomTypeInfo` rows from each tenant's
   own Admin panel before a concierge tries to send anything.
