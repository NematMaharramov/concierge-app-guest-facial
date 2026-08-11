'use client';
import { useEffect, useState } from 'react';
import { getRoomTypes, createRoomType, updateRoomType, deleteRoomType } from '@/lib/api';
import toast from 'react-hot-toast';

const emptyForm = { roomTypeName: '', inclusionsText: '', pmsRoomCode: '' };

export default function AdminRoomTypesPage() {
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => getRoomTypes().then(setRoomTypes).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (rt: any) => {
    setSelected(rt);
    setForm({ roomTypeName: rt.roomTypeName, inclusionsText: rt.inclusionsText || '', pmsRoomCode: rt.pmsRoomCode || '' });
    setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'create') await createRoomType(form);
      else await updateRoomType(selected.id, form);
      toast.success(modal === 'create' ? 'Room type created' : 'Room type updated');
      setModal(null); load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save room type');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room type?')) return;
    try { await deleteRoomType(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Admin</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Room Types</h1>
          <p className="text-xs text-charcoal-400 mt-1">
            Used to fill in {'{{room_inclusions}}'} on pre-arrival letters — works with or without a PMS connection.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ New Room Type</button>
      </div>

      <div className="bg-white border border-charcoal-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-charcoal-400">Loading...</div>
        ) : roomTypes.length === 0 ? (
          <div className="p-12 text-center text-charcoal-400">No room types yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-charcoal-50 border-b border-charcoal-100">
              <tr>
                {['Room Type', 'Inclusions', 'PMS Code', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs tracking-widest uppercase text-charcoal-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-50">
              {roomTypes.map(rt => (
                <tr key={rt.id} className="hover:bg-charcoal-50/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-charcoal-900">{rt.roomTypeName}</td>
                  <td className="px-5 py-3 text-charcoal-500 text-xs max-w-xs truncate">{rt.inclusionsText || '—'}</td>
                  <td className="px-5 py-3 text-charcoal-400 text-xs">{rt.pmsRoomCode || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(rt)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                      <button onClick={() => handleDelete(rt.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-white w-full max-w-lg shadow-2xl" onMouseDown={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-charcoal-900">{modal === 'create' ? 'New Room Type' : 'Edit Room Type'}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Room Type Name</label>
                <input required value={form.roomTypeName} onChange={e => setForm((f: any) => ({ ...f, roomTypeName: e.target.value }))} className="input-field" placeholder="Deluxe King" />
              </div>
              <div>
                <label className="label">Inclusions</label>
                <textarea rows={4} value={form.inclusionsText} onChange={e => setForm((f: any) => ({ ...f, inclusionsText: e.target.value }))} className="input-field resize-none" placeholder="Breakfast for two, complimentary minibar, city view…" />
              </div>
              <div>
                <label className="label">PMS Room Code <span className="text-charcoal-400 normal-case tracking-normal font-normal">(optional)</span></label>
                <input value={form.pmsRoomCode} onChange={e => setForm((f: any) => ({ ...f, pmsRoomCode: e.target.value }))} className="input-field" placeholder="DLK" />
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
