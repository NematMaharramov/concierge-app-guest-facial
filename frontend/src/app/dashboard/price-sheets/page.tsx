'use client';
import { useEffect, useState } from 'react';
import { getPriceSheetItems, createPriceSheetItem, updatePriceSheetItem, deletePriceSheetItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

const emptyForm = { category: '', label: '', price: '', currency: 'EUR', unit: '', notes: '' };

export default function PriceSheetsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => getPriceSheetItems().then(setItems).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (it: any) => { setSelected(it); setForm({ category: it.category, label: it.label, price: it.price ?? '', currency: it.currency || 'EUR', unit: it.unit || '', notes: it.notes || '' }); setModal('edit'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form, price: form.price === '' ? undefined : Number(form.price) };
      if (modal === 'create') await createPriceSheetItem(data);
      else await updatePriceSheetItem(selected.id, data);
      toast.success(modal === 'create' ? 'Item added' : 'Item updated');
      setModal(null); load();
    } catch { toast.error('Failed to save item'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this item?')) return;
    try { await deletePriceSheetItem(id); toast.success('Removed'); load(); }
    catch { toast.error('Failed to remove'); }
  };

  const grouped = items.reduce((acc: Record<string, any[]>, it) => {
    (acc[it.category] = acc[it.category] || []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Staff Reference</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Price Sheets</h1>
        </div>
        {canEdit && <button onClick={openCreate} className="btn-primary">+ New Item</button>}
      </div>

      {loading ? (
        <div className="bg-white border border-charcoal-100 p-12 text-center text-charcoal-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-charcoal-100 p-12 text-center text-charcoal-400">No price sheet items yet.</div>
      ) : (
        Object.entries(grouped).map(([category, list]) => (
          <div key={category} className="bg-white border border-charcoal-100 overflow-hidden">
            <div className="px-6 py-3 bg-charcoal-50 border-b border-charcoal-100">
              <h2 className="text-xs tracking-widest uppercase text-charcoal-600 font-medium">{category}</h2>
            </div>
            <div className="divide-y divide-charcoal-50">
              {list.map(it => (
                <div key={it.id} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-charcoal-900">{it.label}</p>
                    {it.notes && <p className="text-xs text-charcoal-400">{it.notes}</p>}
                  </div>
                  <p className="text-sm font-medium text-charcoal-900 flex-shrink-0">
                    {it.price != null ? `${it.price} ${it.currency}${it.unit ? ` / ${it.unit}` : ''}` : '—'}
                  </p>
                  {canEdit && (
                    <div className="flex gap-3 flex-shrink-0">
                      <button onClick={() => openEdit(it)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                      <button onClick={() => handleDelete(it.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Del</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-white w-full max-w-md shadow-2xl" onMouseDown={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-charcoal-900">{modal === 'create' ? 'New Item' : 'Edit Item'}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="label">Category</label><input required value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} className="input-field" placeholder="Laundry" /></div>
              <div><label className="label">Item</label><input required value={form.label} onChange={e => setForm((f: any) => ({ ...f, label: e.target.value }))} className="input-field" placeholder="Late checkout fee" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Price</label><input type="number" value={form.price} onChange={e => setForm((f: any) => ({ ...f, price: e.target.value }))} className="input-field" /></div>
                <div><label className="label">Currency</label><select value={form.currency} onChange={e => setForm((f: any) => ({ ...f, currency: e.target.value }))} className="input-field"><option>EUR</option><option>USD</option><option>SCR</option></select></div>
                <div><label className="label">Unit</label><input value={form.unit} onChange={e => setForm((f: any) => ({ ...f, unit: e.target.value }))} className="input-field" placeholder="per item" /></div>
              </div>
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
