'use client';
import { useEffect, useState } from 'react';
import { getTaxiDrivers, createTaxiDriver, updateTaxiDriver, deleteTaxiDriver } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

const emptyForm = { name: '', phone: '', vehicleInfo: '', notes: '' };

export default function TaxiDirectoryPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => getTaxiDrivers().then(setDrivers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (d: any) => { setSelected(d); setForm({ name: d.name, phone: d.phone, vehicleInfo: d.vehicleInfo || '', notes: d.notes || '' }); setModal('edit'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'create') await createTaxiDriver(form);
      else await updateTaxiDriver(selected.id, form);
      toast.success(modal === 'create' ? 'Driver added' : 'Driver updated');
      setModal(null); load();
    } catch { toast.error('Failed to save driver'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this driver?')) return;
    try { await deleteTaxiDriver(id); toast.success('Removed'); load(); }
    catch { toast.error('Failed to remove'); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Staff Reference</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Taxi Drivers</h1>
        </div>
        {canEdit && <button onClick={openCreate} className="btn-primary">+ New Driver</button>}
      </div>

      <div className="bg-white border border-charcoal-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-charcoal-400">Loading...</div>
        ) : drivers.length === 0 ? (
          <div className="p-12 text-center text-charcoal-400">No drivers listed yet.</div>
        ) : (
          <div className="divide-y divide-charcoal-50">
            {drivers.map(d => (
              <div key={d.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-900">{d.name}</p>
                  <p className="text-xs text-charcoal-500">{d.phone}{d.vehicleInfo ? ` · ${d.vehicleInfo}` : ''}</p>
                  {d.notes && <p className="text-xs text-charcoal-400 mt-0.5">{d.notes}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-3 flex-shrink-0">
                    <button onClick={() => openEdit(d)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Del</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-white w-full max-w-md shadow-2xl" onMouseDown={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-charcoal-900">{modal === 'create' ? 'New Driver' : 'Edit Driver'}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="label">Name</label><input required value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-field" /></div>
              <div><label className="label">Phone</label><input required value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} className="input-field" /></div>
              <div><label className="label">Vehicle Info</label><input value={form.vehicleInfo} onChange={e => setForm((f: any) => ({ ...f, vehicleInfo: e.target.value }))} className="input-field" placeholder="White Toyota, plate ABC123" /></div>
              <div><label className="label">Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="input-field resize-none" /></div>
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
