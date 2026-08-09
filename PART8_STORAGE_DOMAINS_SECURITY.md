# Part 8 — File Storage, Domain/Subdomain Routing, Security (implemented)

Branch: `feature/part8-storage-domains-security`, on top of merged `main` (Parts 1, 2, 3, 7).

## 1. File storage — S3/R2 migration

**The concrete bug this fixes:** Render's local disk (`/app/uploads`) is **not persistent**
across deploys or restarts. Every redeploy was silently wiping every uploaded service/category/
profile photo. This wasn't hypothetical — it's how the existing Dockerfile/media code already worked.

- New `backend/src/storage/` module: `StorageService.upload(buffer, key, contentType)` /
  `.delete(url)`. When `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` are all set, files
  go to S3-compatible storage (works for AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean
  Spaces — anything with an S3 API). Without them, it transparently falls back to local disk
  exactly as before, so local dev / docker-compose needs no changes.
- If an S3 upload fails at runtime, it falls back to local disk rather than hard-failing the
  request (logged, not silent).
- `media.controller.ts` switched from `diskStorage` to `memoryStorage` (Multer just holds the
  buffer momentarily now; `StorageService` decides where it actually lands).
- `media.service.ts` now calls `storage.upload()` / `storage.delete()` instead of touching the
  filesystem directly.
- New dependency: `@aws-sdk/client-s3` (lazy-imported — only actually loaded if S3 env vars are
  present, so it costs nothing for anyone who doesn't configure it).

**Env vars to set on Render** (backend service) once you have a bucket:
```
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto                          # or e.g. us-east-1 for real AWS S3
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com   # omit entirely for real AWS S3
S3_FORCE_PATH_STYLE=true                # needed for R2/most non-AWS S3-compatible services
S3_PUBLIC_URL=https://pub-xxxx.r2.dev   # or your CDN/custom domain in front of the bucket
```
Until these are set, uploads keep going to local disk (still lost on every redeploy — same as
today). **This is the one action item that actually matters here**: set these before onboarding
a real second tenant, or their photos won't survive the first redeploy.

## 2. Domain / subdomain routing

- `Tenant.customDomain` (nullable, unique) — alongside the existing `slug` from Part 1.
- `TenantsService.resolveFromRequest()` rewritten to try, in order: `x-tenant-slug` header (exact)
  → `x-tenant-host` header (browser hostname, see below) → `req.headers.host` (server-side
  fallback) → default tenant. Each hostname is checked as an exact `customDomain` match first,
  then as a subdomain (`hilton.yourapp.com` → slug `hilton`).
- **Why a new `x-tenant-host` header, not just `req.headers.host`:** the frontend and backend are
  separate Render services with separate domains. The Host header the *backend* receives is its
  own domain — never the one the guest actually visited — so subdomain/custom-domain detection
  can't work off `req.headers.host` alone in this topology. `frontend/src/lib/api.ts` now sends
  `x-tenant-host: window.location.hostname` on every request, which is the thing that actually
  makes this functional end-to-end rather than just theoretically wired up.
- Super Admin → Tenants → Manage → General now has a **Custom Domain** field.

**What's still a manual step (can't be done from code):** pointing DNS at Render and adding the
domain as a Render Custom Domain for the frontend service. The app-level plumbing above is what
makes the *backend* recognize that domain once traffic reaches it; Render/DNS config is what
makes traffic reach it in the first place.

## 3. Tenant-scoped audit log

Already satisfied by Part 1 — `AuditLog.tenantId` exists, and every write path scopes by it.
No changes needed here; noting it as verified rather than skipped.

## 4. Credential encryption

- New `backend/src/common/crypto.service.ts` (`CryptoService`) — AES-256-GCM `encrypt()`/
  `decrypt()`, key derived from an `ENCRYPTION_KEY` env var via scrypt. Nothing calls this yet —
  there's no credentials table until Part 5's Outlook/Opera integrations — this is scaffolding so
  that work doesn't have to invent its own encryption approach later.
- **Set `ENCRYPTION_KEY` on Render now**, even though nothing uses it yet: without it, the
  service falls back to a random per-process key so the app still boots, but anything encrypted
  would become unreadable after the next restart. Any non-empty string works (doesn't need to be
  hex/base64/a specific length).

## What you need to do on Render

1. (Recommended before onboarding tenant #2) Create an S3-compatible bucket (Cloudflare R2 is
   the cheapest fit for this use case) and set the `S3_*` env vars above.
2. Set `ENCRYPTION_KEY` to any long random string now, ahead of Part 5 needing it.
3. For any tenant that wants a custom domain: set it via the Super Admin panel, point its DNS at
   Render, and add it as a Custom Domain on the frontend Render service.

No new `prisma db push`/seed step beyond the schema change itself.
