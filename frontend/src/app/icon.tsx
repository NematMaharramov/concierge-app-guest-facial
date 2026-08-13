import { ImageResponse } from 'next/og';
import { getServerTenant } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  const tenant = await getServerTenant();
  const initial = (tenant?.branding?.siteTitle || tenant?.name || 'C').trim().charAt(0).toUpperCase();
  const bg = tenant?.branding?.primaryColor || '#1a1a1a';
  const fg = tenant?.branding?.accentColor || '#c9a96e';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
        <span style={{ color: fg, fontSize: 20, fontFamily: 'serif', fontWeight: 300 }}>{initial}</span>
      </div>
    ),
    { ...size },
  );
}
