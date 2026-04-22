'use client';
import { useEffect, useState } from 'react';
import { getReservations, deleteReservation, getAllServices, createReservation } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ARRANGED: 'bg-green-100 text-green-800',
  NOT_ARRANGED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-charcoal-100 text-charcoal-600',
};

export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ serviceId: '', guestName: '', guestCount: 1, dateTime: '', notes: '', totalPrice: '', currency: 'EUR' });
  const [saving, setSaving] = useState(false);
  const load = () => getReservations().then(setReservations).finally(() => setLoading(false));

  useEffect(() => {
    load();
    getAllServices().then(setServices);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createReservation({ ...form, guestCount: Number(form.guestCount), totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined });
      toast.success('Reservation created');
      setShowNew(false);
      setForm({ serviceId: '', guestName: '', guestCount: 1, dateTime: '', notes: '', totalPrice: '', currency: 'EUR' });
      load();
    } catch { toast.error('Failed to create reservation'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reservation?')) return;
    try {
      await deleteReservation(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = filter === 'ALL' ? reservations : reservations.filter(r => r.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Concierge</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Reservations</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New Reservation</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'PENDING', 'ARRANGED', 'NOT_ARRANGED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 text-xs tracking-widest uppercase transition-colors ${filter === s ? 'bg-charcoal-900 text-white' : 'bg-white border border-charcoal-200 text-charcoal-600 hover:bg-charcoal-50'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-charcoal-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-charcoal-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-charcoal-400">No reservations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-charcoal-50 border-b border-charcoal-100">
                <tr>
                  {['Guest', 'Service', 'Date & Time', 'Guests', 'Status', 'Staff', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs tracking-widest uppercase text-charcoal-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-charcoal-50/50 transition-colors">
                    <td className="px-5 py-4 font-medium text-charcoal-900">{r.guestName}</td>
                    <td className="px-5 py-4 text-charcoal-600 max-w-[180px] truncate">{r.service?.name}</td>
                    <td className="px-5 py-4 text-charcoal-600 whitespace-nowrap">{format(new Date(r.dateTime), 'dd MMM yyyy HH:mm')}</td>
                    <td className="px-5 py-4 text-charcoal-600">{r.guestCount}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${statusColors[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-5 py-4 text-charcoal-500 text-xs">{r.user?.name}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-3">
                        <Link href={`/dashboard/reservations/${r.id}`} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</Link>
                        <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Reservation Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowNew(false)}>
          <div className="bg-white w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-charcoal-900">New Reservation</h2>
              <button onClick={() => setShowNew(false)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="label">Service</label>
                <select required value={form.serviceId} onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))} className="input-field">
                  <option value="">Select a service...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.category?.name} — {s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Guest Name</label>
                  <input required value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} className="input-field" placeholder="Full name" />
                </div>
                <div>
                  <label className="label">No. of Guests</label>
                  <input type="number" min={1} value={form.guestCount} onChange={e => setForm(f => ({ ...f, guestCount: Number(e.target.value) }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="label">Date & Time</label>
                <input required type="datetime-local" value={form.dateTime} onChange={e => setForm(f => ({ ...f, dateTime: e.target.value }))} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Total Price</label>
                  <input type="number" value={form.totalPrice} onChange={e => setForm(f => ({ ...f, totalPrice: e.target.value }))} className="input-field" placeholder="Optional" />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="input-field">
                    <option>EUR</option><option>USD</option><option>SCR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field resize-none" placeholder="Special requests, details..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Create Reservation'}</button>
                <button type="button" onClick={() => setShowNew(false)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
