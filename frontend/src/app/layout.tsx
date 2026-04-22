import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Raffles Praslin Concierge',
  description: 'Curated experiences for every moment in the Seychelles',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" toastOptions={{
            style: { borderRadius: 0, fontFamily: 'Inter, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#c9a96e', secondary: '#fff' } },
          }} />
        </AuthProvider>
      </body>
    </html>
  );
}
