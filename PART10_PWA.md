# Part 10 — PWA / Desktop Shortcuts (implemented) — final Part

Branch: `feature/part10-pwa`, rebased cleanly onto `main` (Parts 1-9 all merged).

The spec gives almost no detail here beyond the heading ("v1-dəki Part 7 — dəyişməz") — I built
a standard, working PWA implementation, made tenant-aware throughout since that's the theme of
this entire transformation and a generic/hardcoded manifest would have been a step backward.

## What changed

**Tenant-aware PWA metadata**, all resolved server-side per request (no client JS needed before
install-prompt eligibility, which is how browsers actually evaluate installability):
- `frontend/src/lib/serverTenant.ts` — new helper, reads the request's real `Host` header (this
  genuinely is the guest's visited domain here, unlike the client-side case in Part 8, since it's
  the Next.js server handling the request directly) and forwards it to the backend as
  `x-tenant-host`, same mechanism Part 8 already established.
- `app/manifest.webmanifest/route.tsx` — dynamic manifest: tenant's name, description, and
  `theme_color` (from `TenantBranding.primaryColor`), pointing at the icon routes below.
- `app/icon.tsx` / `app/apple-icon.tsx` / `app/icon-192.png` / `app/icon-512.png` — all generated
  on the fly via Next's built-in `next/og` `ImageResponse` (no external image library, no
  pre-made asset files): a solid square in the tenant's primary color with the first letter of
  their name in the accent color. Not a substitute for a real uploaded logo, but a real, working,
  tenant-distinct icon rather than a generic placeholder — and it automatically looks right for
  every tenant without anyone needing to prepare icon files.
- `app/layout.tsx` — `generateMetadata`/`generateViewport` now resolve per-tenant too (this also
  quietly fixes the last hardcoded "Raffles Praslin Concierge" title left over from the
  single-tenant original — every tenant's browser tab/share preview now shows their own name).

**Service worker** — `public/sw.js` + `components/ServiceWorkerRegistration.tsx` (registered from
the root layout, covers guest site and staff dashboard alike). Deliberately conservative:
cache-first only for immutable `_next/static/**` build assets; everything else (pages, API calls)
is network-first, falling back to cache only when genuinely offline. Caching HTML/API responses
aggressively in a multi-tenant app risks showing stale or wrong-tenant content, so this errs
toward "always fresh when online" over "works fully offline."

**Desktop shortcuts**: this is the same mechanism as mobile installability, not separate work —
once a manifest + service worker exist, Chrome/Edge on desktop offer "Install [App Name]" from
the address bar, which creates a real desktop/taskbar/Start-menu shortcut. Nothing
desktop-specific needed beyond what's above.

## What I verified vs. what I couldn't

Unlike every prior Part, I was able to run **a real `next build`** in this sandbox (frontend
builds don't need Prisma) — it compiled clean, including all five new PWA routes rendering
correctly as dynamic routes. This is stronger verification than the hand-review I've had to rely
on for backend changes all along.

What I could **not** verify: how the generated icons actually look, whether install prompts fire
correctly in real browsers, and whether iOS/Android home-screen behavior matches expectations —
none of that is testable without a live deployed URL and real devices. Please try "Add to Home
Screen" (mobile) and "Install" (desktop Chrome/Edge) after this deploys and let me know if
anything looks off — the icon design in particular is a first pass, easy to swap for an
uploaded-logo-based icon later using `TenantBranding.logoUrl` directly once tenants have real
logos uploaded.

## What you need to do on Render

Nothing — no schema changes, no env vars. Just deploy and test installability on a real device.

---

## This was the last Part in the transformation spec's execution order

All 10 Parts (1, 2, 3, 7, 8, 6, 4, 5, 9, 10) now have branches pushed. Per your instruction to
build through everything before doing a consolidated review — that comprehensive check across all
Parts together is the natural next step once these are all merged.
