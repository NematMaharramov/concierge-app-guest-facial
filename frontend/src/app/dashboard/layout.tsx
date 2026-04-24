'use client';
import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useInactivityLogout } from '@/lib/useInactivityLogout';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/dashboard/reservations', label: 'Reservations', icon: '📋' },
  { href: '/dashboard/admin/services', label: 'Services', icon: '🏝️', adminOnly: true },
  { href: '/dashboard/admin/categories', label: 'Categories', icon: '📁', adminOnly: true },
  { href: '/dashboard/admin/users', label: 'Users', icon: '👥', adminOnly: true },
  { href: '/dashboard/admin/settings', label: 'Settings', icon: '⚙️', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-logout after 10 minutes of inactivity
  useInactivityLogout(logout, !!user && !loading);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf8]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      </div>
    </div>
  );

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const visibleNav = navItems.filter(item => !item.adminOnly || user.role === 'ADMIN');

  return (
    <div className="min-h-screen flex bg-[#f5f5f3]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-charcoal-950 text-white flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <div className="p-6 border-b border-white/10">
          <p className="font-display text-xl font-light tracking-widest">RAFFLES</p>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold-400 mt-0.5">Concierge System</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-sm rounded-none transition-colors ${
                isActive(item.href, item.exact)
                  ? 'bg-gold-500/20 text-gold-400 border-l-2 border-gold-500'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{item.icon}</span>
              <span className="tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="px-4 py-3 mb-2">
            <p className="text-white text-sm font-medium">{user.name}</p>
            <p className="text-white/40 text-xs mt-0.5">{user.role}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs tracking-widest uppercase text-white/50 hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-charcoal-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <button className="lg:hidden text-charcoal-600" onClick={() => setSidebarOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs tracking-widest uppercase text-charcoal-400 hover:text-charcoal-900 transition-colors">
              Guest Site
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
