# Part 6 — Excel Import Tool (implemented)

Branch: `feature/part6-excel-import`, on top of merged `main` (Parts 1, 2, 3, 7, 8).

## What changed

**Backend — new `backend/src/import/` module**
- `ImportService.parseFile()` — reads an `.xlsx`/`.xls`/`.csv` buffer (via the `xlsx` library),
  returns headers, a 25-row preview, total row count, and a suggested column→field mapping
  (simple synonym matching — e.g. a header containing "price"/"cost"/"rate" suggests
  `priceAmount`; good enough to save re-selecting every column by hand without a fuzzy-matching
  dependency).
- `ImportService.commit()` — creates `Service` rows from the mapped columns. Rows without a name
  are skipped and counted. Columns mapped to `filter:<filterGroupId>` are matched against that
  group's existing `FilterOption`s (comma/slash-separated cell values become multiple matches,
  e.g. "Japanese, Fusion"); an unrecognized label is **created** as a new `FilterOption` rather
  than rejected — the simplest reading of the spec's "suggest creating a new filter option" for a
  first version, with no separate confirmation round-trip.
- `mode: 'replace'` deletes all existing services in the target category first (mirrors
  `seed.ts`'s own "delete then recreate" pattern, as the spec suggested for a first version);
  `mode: 'append'` adds alongside what's already there. "Smart merge" (update only what changed)
  is explicitly deferred, per the spec.
- Tenant scoping: an `ADMIN` can only import into a category belonging to their own tenant;
  `SUPER_ADMIN` can import into any tenant's category (needed to actually do onboarding imports).
- `POST /import/commit` re-uploads the same file (rather than trusting a large JSON row payload
  from the client) and re-parses it server-side — keeps the request size sane for large price
  sheets and avoids trusting client-side row data that could drift from the actual file.
- Routes: `GET /import/fields`, `GET /import/categories`, `POST /import/preview`,
  `POST /import/commit` — all `ADMIN`/`SUPER_ADMIN` only.

**Frontend**
- New shared `frontend/src/components/ExcelImportWizard.tsx` — 3-step wizard (choose category +
  upload → map columns → choose replace/append and confirm), used from two places:
  - `dashboard/admin/import` (new nav item, "Import from Excel") — a tenant `ADMIN` importing
    their own price sheets, any time, not just at onboarding.
  - Super Admin → Tenants list → **Import Data** action per tenant — lets your team import a
    brand's data into any tenant's categories right after creating it (or later). This also
    replaces the placeholder note that was in the Part 7 creation wizard's step 2.

## Scope decisions (flagging explicitly)

1. **No `TenantFeatureFlag` gating.** Part 7 already created an `excel_import` feature flag as
   one of the known toggles, but nothing checks it yet — wiring flags to actual module visibility
   is explicitly Part 9's job ("bu, sadəcə hansı modulların `TenantFeatureFlag` ilə açıldığına
   aiddir"), so I left this Part's routes/nav ungated rather than partially implementing that here.
2. **Answering open question #4 from the spec** ("Excel idxal aləti kimin üçündür?") **by
   building it for both** — your team via the Super Admin panel, and a tenant's own `ADMIN` via
   their dashboard. If you only wanted your team to have it, the `dashboard/admin/import` nav
   item is one line to remove.
3. **No cell-level editing in the preview step** — the wizard shows a preview and lets you remap
   columns, but doesn't let you edit individual cell values before import. If a row is wrong,
   fix the source file and re-upload.

## What you need to do on Render

Nothing beyond the usual `prisma db push` — no schema changes in this Part (it only creates
`Service`/`FilterOption`/`ServiceFilterValue` rows, all of which already exist). The `xlsx`
npm package is a new backend dependency — Render's build (`npm install`) picks it up automatically.
