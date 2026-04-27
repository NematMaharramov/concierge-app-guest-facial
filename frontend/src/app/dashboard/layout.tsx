'use client';
import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useInactivityLogout } from '@/lib/useInactivityLogout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/dashboard/reservations', label: 'Reservations', icon: '📋' },
  { href: '/dashboard/admin/services', label: 'Services', icon: '🏝️', adminOnly: true },
  { href: '/dashboard/admin/categories', label: 'Categories', icon: '📁', adminOnly: true },
  { href: '/dashboard/admin/users', label: 'Users', icon: '👥', adminOnly: true },
  { href: '/dashboard/admin/settings', label: 'Settings', icon: '⚙️', adminOnly: true },
];

type SidebarTheme = 'dark' | 'light';

const THEMES: Record<SidebarTheme, {
  bg: string; border: string; text: string; subtext: string;
  activeText: string; activeBg: string; activeBorder: string;
  hover: string; hoverText: string; logoutText: string; logoutHover: string;
  toggleBg: string; toggleText: string;
}> = {
  dark: {
    bg: 'bg-charcoal-950',
    border: 'border-white/10',
    text: 'text-white',
    subtext: 'text-gold-400',
    activeText: 'text-gold-400',
    activeBg: 'bg-gold-500/20',
    activeBorder: 'border-gold-500',
    hover: 'hover:bg-white/5',
    hoverText: 'hover:text-white',
    logoutText: 'text-white/50',
    logoutHover: 'hover:text-red-400',
    toggleBg: 'bg-white/10 hover:bg-white/20',
    toggleText: 'text-white/60',
  },
  light: {
    bg: 'bg-white border-r border-charcoal-200',
    border: 'border-charcoal-100',
    text: 'text-charcoal-900',
    subtext: 'text-gold-600',
    activeText: 'text-gold-600',
    activeBg: 'bg-gold-50',
    activeBorder: 'border-gold-500',
    hover: 'hover:bg-charcoal-50',
    hoverText: 'hover:text-charcoal-900',
    logoutText: 'text-charcoal-400',
    logoutHover: 'hover:text-red-500',
    toggleBg: 'bg-charcoal-100 hover:bg-charcoal-200',
    toggleText: 'text-charcoal-500',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<SidebarTheme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-theme') as SidebarTheme | null;
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next: SidebarTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('sidebar-theme', next);
  };

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
  const t = THEMES[theme];

  const profilePhotoUrl = user.profilePhoto
    ? (user.profilePhoto.startsWith('http') ? user.profilePhoto : `${API_BASE}${user.profilePhoto}`)
    : null;

  return (
    <div className="min-h-screen flex bg-[#f5f5f3]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 shadow-xl
        ${t.bg}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>

        {/* Header */}
        <div className={`p-6 border-b ${t.border} flex items-center justify-between`}>
          <div>
            <p className={`font-display text-xl font-light tracking-widest ${t.text}`}>RAFFLES</p>
            <p className={`text-[10px] tracking-[0.3em] uppercase mt-0.5 ${t.subtext}`}>Concierge System</p>
          </div>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} sidebar`}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors text-sm ${t.toggleBg} ${t.toggleText}`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors
                ${isActive(item.href, item.exact)
                  ? `${t.activeBg} ${t.activeText} border-l-2 ${t.activeBorder}`
                  : `${t.logoutText} ${t.hover} ${t.hoverText} border-l-2 border-transparent`
                }`}
            >
              <span>{item.icon}</span>
              <span className="tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t ${t.border} space-y-1`}>
          {/* Account settings link */}
          <Link
            href="/dashboard/account"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-none transition-colors w-full
              ${isActive('/dashboard/account')
                ? `${t.activeBg} ${t.activeText} border-l-2 ${t.activeBorder}`
                : `${t.logoutText} ${t.hover} ${t.hoverText} border-l-2 border-transparent`
              }`}
          >
            {/* Profile photo or initials */}
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-charcoal-600 flex items-center justify-center">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-medium">{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${t.text}`}>{user.name}</p>
              <p className={`text-[10px] truncate ${t.subtext}`}>{user.role}</p>
            </div>
          </Link>

          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-4 py-2 text-xs tracking-widest uppercase transition-colors ${t.logoutText} ${t.logoutHover}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
