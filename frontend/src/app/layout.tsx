import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { getServerTenant } from '@/lib/serverTenant';

// Part 10: tenant-aware metadata + PWA manifest/icons. generateMetadata
// runs per-request (same as the manifest/icon routes), so a guest visiting
// a specific tenant's domain gets that tenant's name in the browser tab,
// share previews, and "Add to Home Screen" prompt — not a hardcoded
// "Raffles Praslin" left over from the single-tenant original.
export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getServerTenant();
  const name = tenant?.branding?.siteTitle || tenant?.name || 'Concierge';
  const description = tenant?.branding?.siteSubtitle || 'Curated concierge experiences, thoughtfully arranged.';

  return {
    title: `${name} Concierge`,
    description,
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: name,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const tenant = await getServerTenant();
  return {
    themeColor: tenant?.branding?.primaryColor || '#1a1a1a',
    width: 'device-width',
    initialScale: 1,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <ServiceWorkerRegistration />
          <Toaster position="top-right" toastOptions={{
            style: { borderRadius: 0, fontFamily: 'Inter, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#c9a96e', secondary: '#fff' } },
          }} />
        </AuthProvider>
      </body>
    </html>
  );
}
