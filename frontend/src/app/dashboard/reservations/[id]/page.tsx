'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getReservation, updateReservation, deleteReservation, getAllServices } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ARRANGED: 'bg-green-100 text-green-800',
  NOT_ARRANGED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-charcoal-100 text-charcoal-600',
};

const actionColors: Record<string, string> = {
  CREATE: 'text-green-600',
  UPDATE: 'text-blue-600',
  DELETE: 'text-red-500',
};

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [reservation, setReservation] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    Promise.all([getReservation(id), getAllServices()])
      .then(([res, svcs]) => {
        setReservation(res);
        setServices(svcs);
        setForm({
          serviceId: res.serviceId,
          guestName: res.guestName,
          guestCount: res.guestCount,
          dateTime: format(new Date(res.dateTime), "yyyy-MM-dd'T'HH:mm"),
          status: res.status,
          notes: res.notes || '',
          totalPrice: res.totalPrice || '',
          currency: res.currency || 'EUR',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateReservation(id, {
        ...form,
        guestCount: Number(form.guestCount),
        totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
      });
      setReservation(updated);
      toast.success('Reservation updated');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this reservation?')) return;
    try {
      await deleteReservation(id);
      toast.success('Deleted');
      router.push('/dashboard/reservations');
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="p-12 text-center text-charcoal-400">Loading...</div>;
  if (!reservation) return <div className="p-12 text-center">Not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/reservations" className="text-charcoal-400 hover:text-charcoal-900">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-0.5">Reservation</p>
          <h1 className="font-display text-2xl font-light text-charcoal-900">{reservation.guestName}</h1>
        </div>
        <span className={`ml-auto text-xs px-3 py-1 rounded-full font-medium ${statusColors[reservation.status]}`}>{reservation.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit Form */}
        <div className="lg:col-span-2 bg-white border border-charcoal-100">
          <div className="px-6 py-4 border-b border-charcoal-100">
            <h2 className="font-medium text-charcoal-900">Edit Reservation</h2>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="label">Service</label>
              <select value={form.serviceId} onChange={e => setForm((f: any) => ({ ...f, serviceId: e.target.value }))} className="input-field">
                {services.map(s => <option key={s.id} value={s.id}>{s.category?.name} — {s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Guest Name</label>
                <input value={form.guestName} onChange={e => setForm((f: any) => ({ ...f, guestName: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label">No. of Guests</label>
                <input type="number" min={1} value={form.guestCount} onChange={e => setForm((f: any) => ({ ...f, guestCount: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date & Time</label>
                <input type="datetime-local" value={form.dateTime} onChange={e => setForm((f: any) => ({ ...f, dateTime: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label">Status</label>
                <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="input-field">
                  <option>PENDING</option>
                  <option>ARRANGED</option>
                  <option>NOT_ARRANGED</option>
                  <option>CANCELLED</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Total Price</label>
                <input type="number" value={form.totalPrice} onChange={e => setForm((f: any) => ({ ...f, totalPrice: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label">Currency</label>
                <select value={form.currency} onChange={e => setForm((f: any) => ({ ...f, currency: e.target.value }))} className="input-field">
                  <option>EUR</option><option>USD</option><option>SCR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea rows={4} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="input-field resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
              {(user?.role === 'ADMIN' || reservation.userId === user?.id) && (
                <button type="button" onClick={handleDelete} className="px-4 py-2.5 text-sm text-red-500 border border-red-200 hover:bg-red-50 transition-colors tracking-widest uppercase">
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Audit Log */}
        <div className="bg-white border border-charcoal-100">
          <div className="px-5 py-4 border-b border-charcoal-100">
            <h2 className="font-medium text-charcoal-900">Activity Log</h2>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {reservation.auditLogs?.length === 0 ? (
              <p className="text-charcoal-400 text-xs text-center py-4">No activity yet.</p>
            ) : reservation.auditLogs?.map((log: any) => (
              <div key={log.id} className="border-l-2 border-charcoal-100 pl-3 py-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-medium ${actionColors[log.action] || 'text-charcoal-600'}`}>{log.action}</span>
                  <span className="text-[10px] text-charcoal-400">{log.user?.name}</span>
                </div>
                <p className="text-[10px] text-charcoal-400">{format(new Date(log.createdAt), 'dd MMM yyyy HH:mm')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
