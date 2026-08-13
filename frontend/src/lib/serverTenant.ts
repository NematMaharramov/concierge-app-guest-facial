import { headers } from 'next/headers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ServerTenantInfo {
  id: string;
  slug: string;
  name: string;
  branding?: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    siteTitle?: string | null;
    siteSubtitle?: string | null;
  } | null;
}

/**
 * Resolves the tenant for the current request on the server, for use in
 * Next.js special files that render *before* any client-side JS runs
 * (manifest.webmanifest, icon routes) — those can't rely on the
 * client-side x-tenant-host header trick from Part 8's api.ts, since
 * there's no browser JS involved yet. Here, though, the Next.js server
 * genuinely receives the guest's real Host header (they're requesting
 * these files directly from the frontend's own domain), so it's forwarded
 * to the backend as x-tenant-host, same header name the backend already
 * knows how to resolve from.
 */
export async function getServerTenant(): Promise<ServerTenantInfo | null> {
  try {
    const hdrs = headers();
    const host = hdrs.get('host') || '';
    const res = await fetch(`${API_BASE}/tenants/current`, {
      headers: { 'x-tenant-host': host },
      // PWA metadata doesn't need to be second-by-second fresh.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data || null;
  } catch {
    return null;
  }
}
