import { NextResponse } from 'next/server';
import { getServerTenant } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tenant = await getServerTenant();

  const name = tenant?.branding?.siteTitle || tenant?.name || 'Concierge';
  const shortName = name.length > 12 ? name.slice(0, 12) : name;
  const themeColor = tenant?.branding?.primaryColor || '#1a1a1a';
  const backgroundColor = '#fafaf8';

  const manifest = {
    name: `${name} Concierge`,
    short_name: shortName,
    description: tenant?.branding?.siteSubtitle || 'Curated concierge experiences.',
    start_url: '/',
    display: 'standalone',
    background_color: backgroundColor,
    theme_color: themeColor,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=300' },
  });
}
