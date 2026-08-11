'use client';
import { useEffect, useState } from 'react';
import { getAllEvents, createEvent, updateEvent, deleteEvent } from '@/lib/api';
import { format, isValid } from 'date-fns';
import toast from 'react-hot-toast';

const emptyForm = { title: '', description: '', imageUrl: '', startDate: '', endDate: '', location: '', category: '', isActive: true };

function groupByMonth(events: any[]) {
  const groups: Record<string, any[]> = {};
  for (const e of events) {
    const d = new Date(e.startDate);
    const key = isValid(d) ? format(d, 'MMMM yyyy') : 'Unknown';
    (groups[key] ||= []).push(e);
  }
  return groups;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => getAllEvents().then(setEvents).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (e: any) => {
    setSelected(e);
    setForm({
      title: e.title, description: e.description || '', imageUrl: e.imageUrl || '',
      startDate: e.startDate ? format(new Date(e.startDate), "yyyy-MM-dd'T'HH:mm") : '',
      endDate: e.endDate ? format(new Date(e.endDate), "yyyy-MM-dd'T'HH:mm") : '',
      location: e.location || '', category: e.category || '', isActive: e.isActive,
    });
    setModal('edit');
  };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      const data = { ...form, endDate: form.endDate || undefined };
      if (modal === 'create') await createEvent(data);
      else await updateEvent(selected.id, data);
      toast.success(modal === 'create' ? 'Event created' : 'Event updated');
      setModal(null); load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save event');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try { await deleteEvent(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const grouped = groupByMonth(events);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Admin</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Events</h1>
          <p className="text-xs text-charcoal-400 mt-1">
            Optionally shown to guests (toggle "Monthly Events List" on for this tenant in the Super Admin panel) and suggested to concierges when writing Pre-Arrival Letters.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ New Event</button>
      </div>

      {loading ? (
        <div className="bg-white border border-charcoal-100 p-12 text-center text-charcoal-400">Loading...</div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-charcoal-100 p-12 text-center text-charcoal-400">No events yet.</div>
      ) : (
        Object.entries(grouped).map(([month, items]) => (
          <div key={month} className="bg-white border border-charcoal-100">
            <div className="px-6 py-3 border-b border-charcoal-100 bg-charcoal-50">
              <h2 className="text-xs tracking-[0.3em] uppercase text-charcoal-600 font-medium">{month}</h2>
            </div>
            <div className="divide-y divide-charcoal-50">
              {items.map(e => (
                <div key={e.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="text-center w-14 flex-shrink-0">
                    <p className="text-lg font-light text-charcoal-900">{format(new Date(e.startDate), 'd')}</p>
                    <p className="text-[10px] text-charcoal-400 uppercase">{format(new Date(e.startDate), 'EEE')}</p>
                  </div>
                  <div className="w-px h-10 bg-charcoal-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 truncate">{e.title}</p>
                    <p className="text-xs text-charcoal-400 truncate">
                      {[e.location, e.category].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${e.isActive ? 'bg-green-100 text-green-700' : 'bg-charcoal-100 text-charcoal-500'}`}>
                    {e.isActive ? 'Active' : 'Hidden'}
                  </span>
                  <div className="flex gap-3 flex-shrink-0">
                    <button onClick={() => openEdit(e)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                    <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-white w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onMouseDown={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-charcoal-900">{modal === 'create' ? 'New Event' : 'Edit Event'}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Title</label>
                <input required value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="input-field resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start</label>
                  <input required type="datetime-local" value={form.startDate} onChange={e => setForm((f: any) => ({ ...f, startDate: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">End <span className="text-charcoal-400 normal-case tracking-normal font-normal">(optional)</span></label>
                  <input type="datetime-local" value={form.endDate} onChange={e => setForm((f: any) => ({ ...f, endDate: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Location</label>
                  <input value={form.location} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} className="input-field" placeholder="Hotel Ballroom" />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} className="input-field" placeholder="Music, Culinary…" />
                </div>
              </div>
              <div>
                <label className="label">Image URL</label>
                <input value={form.imageUrl} onChange={e => setForm((f: any) => ({ ...f, imageUrl: e.target.value }))} className="input-field" placeholder="https://…" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="event-active" checked={form.isActive} onChange={e => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-gold-500" />
                <label htmlFor="event-active" className="text-sm text-charcoal-700">Active (visible to guests, if the module is enabled)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
