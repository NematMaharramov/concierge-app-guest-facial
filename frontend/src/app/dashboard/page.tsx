'use client';
import { useEffect, useState } from 'react';
import { getStats, getReservations } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  PENDING:       'bg-amber-100 text-amber-800',
  ARRANGED:      'bg-emerald-100 text-emerald-800',
  NOT_ARRANGED:  'bg-red-100 text-red-800',
  CANCELLED:     'bg-charcoal-100 text-charcoal-600',
  COMPLETED:     'bg-blue-100 text-blue-800',
};

const statusDot: Record<string, string> = {
  PENDING:       'bg-amber-400',
  ARRANGED:      'bg-emerald-400',
  NOT_ARRANGED:  'bg-red-400',
  CANCELLED:     'bg-charcoal-300',
  COMPLETED:     'bg-blue-400',
};

// ─── Stat card variants ───────────────────────────────────────────────────────
function AdminStatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white border border-charcoal-100 p-5 relative overflow-hidden group">
      {/* Subtle left accent line */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${color}`} />
      <p className="text-xs tracking-widest uppercase text-charcoal-400 mb-2 pl-3">{label}</p>
      <p className={`text-3xl font-light pl-3 ${color.replace('bg-', 'text-')}`}>{value ?? '—'}</p>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    getStats().then(setStats);
    getReservations().then((data) => setRecent(data.slice(0, 8)));
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Admin Overview</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 bg-gold-50 border border-gold-200 px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
          <span className="text-xs tracking-widest uppercase text-gold-700 font-medium">Admin Mode</span>
        </div>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <AdminStatCard label="Total"        value={stats.total}       color="bg-charcoal-900" />
          <AdminStatCard label="Arranged"     value={stats.arranged}    color="bg-emerald-500" />
          <AdminStatCard label="Pending"      value={stats.pending}     color="bg-amber-500" />
          <AdminStatCard label="Not Arranged" value={stats.notArranged} color="bg-red-500" />
          <AdminStatCard label="Cancelled"    value={stats.cancelled}   color="bg-charcoal-400" />
        </div>
      )}

      {/* ── Recent reservations ── */}
      <div className="bg-white border border-charcoal-100">
        <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
          <h2 className="font-medium text-charcoal-900 tracking-wide">Recent Reservations</h2>
          <Link
            href="/dashboard/reservations"
            className="text-xs tracking-widest uppercase text-gold-500 hover:text-gold-600 transition-colors"
          >
            View All →
          </Link>
        </div>
        <div className="divide-y divide-charcoal-50">
          {recent.length === 0 ? (
            <p className="text-charcoal-400 text-sm p-6 text-center">No reservations yet.</p>
          ) : (
            recent.map(r => (
              <Link
                key={r.id}
                href={`/dashboard/reservations/${r.id}`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-charcoal-50 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[r.status] || 'bg-charcoal-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-900 truncate">{r.guestName}</p>
                  <p className="text-xs text-charcoal-400 truncate">{r.service?.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-charcoal-500 mb-0.5">{format(new Date(r.dateTime), 'dd MMM yyyy')}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* ── Admin quick actions ── */}
      <div>
        <p className="text-xs tracking-widest uppercase text-charcoal-400 mb-4">Quick Actions</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/admin/services',    icon: '🏝️', label: 'Services',   sub: 'Add, edit, organise',     bg: 'bg-gold-500 hover:bg-gold-600',       text: 'text-white' },
            { href: '/dashboard/admin/categories',  icon: '📁', label: 'Categories', sub: 'Manage categories',        bg: 'bg-charcoal-800 hover:bg-charcoal-700', text: 'text-white' },
            { href: '/dashboard/admin/users',       icon: '👥', label: 'Staff',      sub: 'Manage concierge accounts', bg: 'bg-charcoal-900 hover:bg-charcoal-800', text: 'text-white' },
            { href: '/dashboard/admin/settings',    icon: '⚙️', label: 'Settings',   sub: 'Site & branding options',  bg: 'bg-white hover:bg-charcoal-50 border border-charcoal-200', text: 'text-charcoal-900' },
          ].map(item => (
            <Link key={item.href} href={item.href} className={`${item.bg} ${item.text} p-5 transition-colors`}>
              <p className="text-xl mb-2">{item.icon}</p>
              <h3 className="font-medium tracking-wide text-sm mb-1">{item.label}</h3>
              <p className="text-xs opacity-60">{item.sub}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Concierge Dashboard ──────────────────────────────────────────────────────
// Visually distinct from Admin: uses a teal/blue-toned color scheme,
// focuses on "what's happening today" rather than system management.
function ConciergeDashboard({ userName }: { userName: string }) {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReservations().then(data => {
      setReservations(data);
      setLoading(false);
    });
  }, []);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const todayItems = reservations.filter(r => {
    try { return format(new Date(r.dateTime), 'yyyy-MM-dd') === todayStr; } catch { return false; }
  });
  const pending  = reservations.filter(r => r.status === 'PENDING');
  const arranged = reservations.filter(r => r.status === 'ARRANGED');
  const recent   = reservations.slice(0, 6);

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Welcome banner — uses slate/teal palette, clearly NOT admin gold ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0e1821 0%, #152433 50%, #0a1c2e 100%)' }}
      >
        {/* Decorative glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full"
            style={{ background: '#1d8a9a', filter: 'blur(90px)', opacity: 0.18, transform: 'translate(30%, -30%)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-56 h-56 rounded-full"
            style={{ background: '#0e7a88', filter: 'blur(70px)', opacity: 0.14, transform: 'translate(-20%, 20%)' }}
          />
        </div>

        <div className="relative px-8 py-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] tracking-[0.5em] uppercase text-teal-400 mb-2">Concierge Portal</p>
            <h1 className="font-display text-3xl font-light text-white mb-1">
              Welcome, {userName}
            </h1>
            <p className="text-white/40 text-sm">{format(today, 'EEEE, d MMMM yyyy')}</p>
          </div>
          <div className="flex items-center gap-2 bg-teal-900/40 border border-teal-700/40 px-4 py-2 self-start mt-1">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs tracking-widest uppercase text-teal-300 font-medium">Concierge</span>
          </div>
        </div>
      </div>

      {/* ── Stats — teal accent instead of gold ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Today',   value: todayItems.length, color: '#0e7a88', bg: '#f0fafa' },
          { label: 'Pending', value: pending.length,    color: '#b45309', bg: '#fffbeb' },
          { label: 'Arranged',value: arranged.length,   color: '#047857', bg: '#f0fdf4' },
        ].map(s => (
          <div
            key={s.label}
            className="p-5 border col-span-1 md:last:col-span-1"
            style={{ background: s.bg, borderColor: `${s.color}22` }}
          >
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: `${s.color}99` }}>
              {s.label}
            </p>
            <p className="text-3xl font-light" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs mt-1 text-charcoal-400">reservations</p>
          </div>
        ))}
      </div>

      {/* ── Today's schedule ── */}
      {todayItems.length > 0 && (
        <div className="bg-white border border-charcoal-100">
          <div className="px-6 py-4 border-b border-charcoal-100">
            <h2 className="font-medium text-charcoal-900 tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
              Today's Schedule
              <span className="ml-auto text-xs text-charcoal-400 font-normal">
                {format(today, 'EEEE d MMM')}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-charcoal-50">
            {todayItems.map(r => (
              <Link
                key={r.id}
                href={`/dashboard/reservations/${r.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="text-center w-12 flex-shrink-0">
                  <p className="text-sm font-medium text-charcoal-900">
                    {format(new Date(r.dateTime), 'HH:mm')}
                  </p>
                </div>
                <div className="w-px h-8 bg-charcoal-100 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-900 truncate">{r.guestName}</p>
                  <p className="text-xs text-charcoal-400 truncate">{r.service?.name}</p>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${statusColors[r.status]}`}>
                  {r.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent reservations ── */}
      <div className="bg-white border border-charcoal-100">
        <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
          <h2 className="font-medium text-charcoal-900 tracking-wide">All Reservations</h2>
          <Link
            href="/dashboard/reservations"
            className="text-xs tracking-widest uppercase transition-colors"
            style={{ color: '#0e7a88' }}
          >
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-charcoal-400 text-sm">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-charcoal-400 text-sm mb-4">No reservations yet.</p>
            <Link href="/dashboard/reservations" className="btn-primary text-xs">
              + Create First Reservation
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-charcoal-50">
            {recent.map(r => (
              <Link
                key={r.id}
                href={`/dashboard/reservations/${r.id}`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[r.status] || 'bg-charcoal-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-900 truncate">{r.guestName}</p>
                  <p className="text-xs text-charcoal-400 truncate">{r.service?.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-charcoal-500 mb-0.5">{format(new Date(r.dateTime), 'dd MMM')}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick action: new reservation ── */}
      <div>
        <Link
          href="/dashboard/reservations"
          className="flex items-center gap-4 p-5 border transition-all hover:shadow-sm group"
          style={{ background: '#f0fafa', borderColor: '#0e7a8830' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-lg"
            style={{ background: '#0e7a88' }}
          >
            +
          </div>
          <div>
            <p className="font-medium text-charcoal-900 text-sm">New Reservation</p>
            <p className="text-xs text-charcoal-400">Create a reservation for a guest</p>
          </div>
          <span className="ml-auto text-charcoal-300 group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'ADMIN') return <AdminDashboard />;
  return <ConciergeDashboard userName={user.name} />;
}
