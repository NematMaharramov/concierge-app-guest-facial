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
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    getStats().then(setStats);
    getReservations().then((data) => setRecent(data.slice(0, 5)));
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Overview</p>
        <h1 className="font-display text-3xl font-light text-charcoal-900">Welcome, {user?.name}</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-charcoal-900' },
            { label: 'Arranged', value: stats.arranged, color: 'text-green-600' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
            { label: 'Cancelled', value: stats.cancelled, color: 'text-red-500' },
            { label: 'Services', value: stats.services, color: 'text-charcoal-600' },
            { label: 'Staff', value: stats.users, color: 'text-charcoal-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-charcoal-100 p-5">
              <p className="text-xs tracking-widest uppercase text-charcoal-400 mb-2">{s.label}</p>
              <p className={`text-3xl font-light ${s.color}`}>{s.value}</p>
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
            <Link key={r.id} href={`/dashboard/reservations/${r.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-charcoal-50 transition-colors">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/reservations" className="bg-charcoal-950 text-white p-6 hover:bg-charcoal-800 transition-colors group">
          <p className="text-2xl mb-3">📋</p>
          <h3 className="font-medium tracking-wide mb-1">Manage Reservations</h3>
          <p className="text-white/50 text-sm">Create and track guest reservations</p>
          <p className="text-gold-400 text-xs tracking-widest uppercase mt-4 group-hover:text-gold-300">Open →</p>
        </Link>
        {user?.role === 'ADMIN' && (
          <Link href="/dashboard/admin/services" className="bg-gold-500 text-white p-6 hover:bg-gold-600 transition-colors group">
            <p className="text-2xl mb-3">🏝️</p>
            <h3 className="font-medium tracking-wide mb-1">Manage Services</h3>
            <p className="text-white/70 text-sm">Add, edit and organise service listings</p>
            <p className="text-white/50 text-xs tracking-widest uppercase mt-4 group-hover:text-white/70">Open →</p>
          </Link>
        )}
      </div>
    </div>
  );
}
