'use client';
import { useEffect, useState } from 'react';
import { getStats, getReservations } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ARRANGED: 'bg-green-100 text-green-800',
  NOT_ARRANGED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-charcoal-100 text-charcoal-600',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

const statusDot: Record<string, string> = {
  PENDING: 'bg-amber-400',
  ARRANGED: 'bg-green-400',
  NOT_ARRANGED: 'bg-red-400',
  CANCELLED: 'bg-charcoal-300',
  COMPLETED: 'bg-blue-400',
};

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
      <div>
        <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Admin Overview</p>
        <h1 className="font-display text-3xl font-light text-charcoal-900">Dashboard</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-charcoal-900', bg: 'bg-white' },
            { label: 'Arranged', value: stats.arranged, color: 'text-green-600', bg: 'bg-white' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-white' },
            { label: 'Not Arranged', value: stats.notArranged, color: 'text-red-500', bg: 'bg-white' },
            { label: 'Cancelled', value: stats.cancelled, color: 'text-charcoal-400', bg: 'bg-white' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-charcoal-100 p-5`}>
              <p className="text-xs tracking-widest uppercase text-charcoal-400 mb-2">{s.label}</p>
              <p className={`text-3xl font-light ${s.color}`}>{s.value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Reservations */}
      <div className="bg-white border border-charcoal-100">
        <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
          <h2 className="font-medium text-charcoal-900 tracking-wide">Recent Reservations</h2>
          <Link href="/dashboard/reservations" className="text-xs tracking-widest uppercase text-gold-500 hover:text-gold-600">View All →</Link>
        </div>
        <div className="divide-y divide-charcoal-50">
          {recent.length === 0 ? (
            <p className="text-charcoal-400 text-sm p-6 text-center">No reservations yet.</p>
          ) : recent.map(r => (
            <Link key={r.id} href={`/dashboard/reservations/${r.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-charcoal-50 transition-colors">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[r.status] || 'bg-charcoal-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal-900 truncate">{r.guestName}</p>
                <p className="text-xs text-charcoal-400 truncate">{r.service?.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-charcoal-500">{format(new Date(r.dateTime), 'dd MMM yyyy')}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[r.status]}`}>{r.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Admin Quick Actions */}
      <div>
        <p className="text-xs tracking-widest uppercase text-charcoal-400 mb-4">Quick Actions</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/admin/services" className="bg-gold-500 text-white p-5 hover:bg-gold-600 transition-colors group">
            <p className="text-xl mb-2">🏝️</p>
            <h3 className="font-medium tracking-wide text-sm mb-1">Manage Services</h3>
            <p className="text-white/70 text-xs">Add, edit, organise services</p>
          </Link>
          <Link href="/dashboard/admin/categories" className="bg-charcoal-800 text-white p-5 hover:bg-charcoal-700 transition-colors group">
            <p className="text-xl mb-2">📁</p>
            <h3 className="font-medium tracking-wide text-sm mb-1">Categories</h3>
            <p className="text-white/60 text-xs">Manage service categories</p>
          </Link>
          <Link href="/dashboard/admin/users" className="bg-charcoal-900 text-white p-5 hover:bg-charcoal-800 transition-colors group">
            <p className="text-xl mb-2">👥</p>
            <h3 className="font-medium tracking-wide text-sm mb-1">Staff Users</h3>
            <p className="text-white/60 text-xs">Manage concierge accounts</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Concierge (User) Dashboard ───────────────────────────────────────────────
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

  const pending = reservations.filter(r => r.status === 'PENDING');
  const arranged = reservations.filter(r => r.status === 'ARRANGED');
  const recent = reservations.slice(0, 6);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-none" style={{ background: 'linear-gradient(135deg, #16140f 0%, #2a2318 50%, #1a1510 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full" style={{ background: '#c9a96e', filter: 'blur(80px)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full" style={{ background: '#c9a96e', filter: 'blur(60px)', transform: 'translate(-20%, 20%)' }} />
        </div>
        <div className="relative px-8 py-8">
          <p className="text-[10px] tracking-[0.5em] uppercase text-gold-400 mb-2">Concierge Portal</p>
          <h1 className="font-display text-3xl font-light text-white mb-1">Welcome, {userName}</h1>
          <p className="text-white/40 text-sm">{format(today, 'EEEE, d MMMM yyyy')}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-charcoal-100 p-5">
          <p className="text-xs tracking-widest uppercase text-charcoal-400 mb-2">Today</p>
          <p className="text-3xl font-light text-charcoal-900">{todayItems.length}</p>
          <p className="text-xs text-charcoal-400 mt-1">reservations</p>
        </div>
        <div className="bg-white border border-charcoal-100 p-5">
          <p className="text-xs tracking-widest uppercase text-charcoal-400 mb-2">Pending</p>
          <p className="text-3xl font-light text-amber-600">{pending.length}</p>
          <p className="text-xs text-charcoal-400 mt-1">need attention</p>
        </div>
        <div className="bg-white border border-charcoal-100 p-5 col-span-2 md:col-span-1">
          <p className="text-xs tracking-widest uppercase text-charcoal-400 mb-2">Arranged</p>
          <p className="text-3xl font-light text-green-600">{arranged.length}</p>
          <p className="text-xs text-charcoal-400 mt-1">confirmed</p>
        </div>
      </div>

      {/* Today's Reservations */}
      {todayItems.length > 0 && (
        <div className="bg-white border border-charcoal-100">
          <div className="px-6 py-4 border-b border-charcoal-100">
            <h2 className="font-medium text-charcoal-900 tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold-500 inline-block" />
              Today's Schedule
            </h2>
          </div>
          <div className="divide-y divide-charcoal-50">
            {todayItems.map(r => (
              <Link key={r.id} href={`/dashboard/reservations/${r.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-charcoal-50 transition-colors">
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

      {/* All recent reservations */}
      <div className="bg-white border border-charcoal-100">
        <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
          <h2 className="font-medium text-charcoal-900 tracking-wide">Recent Reservations</h2>
          <Link href="/dashboard/reservations" className="text-xs tracking-widest uppercase text-gold-500 hover:text-gold-600">
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
              <Link key={r.id} href={`/dashboard/reservations/${r.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-charcoal-50 transition-colors">
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
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'ADMIN') return <AdminDashboard />;
  return <ConciergeDashboard userName={user.name} />;
}
