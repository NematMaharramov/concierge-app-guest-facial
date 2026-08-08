# Part 3 — Category Facet / Filter System (implemented)

Branch: `feature/part3-filter-facets`, on top of merged `main` (Parts 1 & 2).

## What changed

**Schema**
- New `FilterGroup` model (`tenantId`, `categoryId`, `name`, `isRequired`, `sortOrder`) — a facet dimension on a category, e.g. "Cuisine Type".
- New `FilterOption` model — the values within a group, e.g. "Japanese".
- New `ServiceFilterValue` join model (many-to-many `Service` ↔ `FilterOption`) — a service can match more than one option in the same group (e.g. a restaurant tagged both "Japanese" and "Fusion").
- `Category.filterGroups`, `Service.filterValues` relations added.

**Part 2 → Part 3 link**
- `CategoryTemplatesService.instantiateForTenant()` now also copies each template category's `FilterGroupTemplate`s into real `FilterGroup`/`FilterOption` rows when a new tenant is created — closing the gap Part 2 deliberately left open.

**New backend module: `backend/src/filter-groups/`**
- `GET /categories/:categoryId/filter-groups` — public (guest site + admin both use it)
- `POST /categories/:categoryId/filter-groups` — `ADMIN`, create a group with an initial options list
- `PUT /filter-groups/:id`, `DELETE /filter-groups/:id` — `ADMIN`
- `POST /filter-groups/:id/options`, `PUT /filter-options/:id`, `DELETE /filter-options/:id` — `ADMIN`
- Admins are **not** restricted to template-provided groups — they can create their own, per the spec.

**`categories` / `services`**
- `CategoriesService.findOne/findBySlug` now include `filterGroups` (with `options`) and each service's `filterValues`.
- `ServicesService` create/update accept an optional `filterOptionIds: string[]` and sync the `ServiceFilterValue` rows (delete-then-recreate; `undefined` = untouched, `[]` = explicitly cleared).

**Guest site — `frontend/src/app/services/[slug]/page.tsx`**
- If `category.filterGroups.length > 0`, renders one chip row per group ("All" + each option) above the grid.
- Selecting a chip filters the visible services client-side by matching `service.filterValues` against the selected `filterOptionId`; multiple groups combine with AND.
- Categories with no filter groups render exactly as before — no per-category special-casing.

**Admin panel**
- Category edit modal (`dashboard/admin/categories`) gains a "Filter Groups" section: add a group (name + comma-separated options), add/remove options, delete a group. Only available once the category exists (same pattern as image upload).
- Service create/edit modal (`dashboard/admin/services`) shows checkbox-style tags for each filter group belonging to the selected category, so staff can assign a service to e.g. "Cuisine Type → Japanese". Selection is included in the save payload as `filterOptionIds`.

## What you need to do on Render

Nothing beyond the usual `prisma db push` on deploy — no new seed/backfill step for this Part (existing tenants simply have zero `FilterGroup`s until an admin adds some, or a *new* tenant is created via Part 2's `POST /tenants` with a vertical that has template filter groups, e.g. `BUSINESS_CITY_HOTEL`).

## Explicitly out of scope for this Part

- Server-side filtering/pagination by facet (filtering happens client-side on the already-loaded category service list, matching the existing guest site's architecture — fine at current data volumes).
- Bulk/CSV assignment of filter values to many services at once (that's naturally covered by Part 6, Excel import).
