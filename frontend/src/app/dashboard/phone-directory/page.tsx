'use client';
import { useEffect, useState } from 'react';
import { getPhoneDirectory, createPhoneEntry, updatePhoneEntry, deletePhoneEntry } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

const emptyForm = { name: '', phone: '', department: '', notes: '' };

export default function PhoneDirectoryPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => getPhoneDirectory().then(setEntries).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (e: any) => { setSelected(e); setForm({ name: e.name, phone: e.phone, department: e.department || '', notes: e.notes || '' }); setModal('edit'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'create') await createPhoneEntry(form);
      else await updatePhoneEntry(selected.id, form);
      toast.success(modal === 'create' ? 'Entry added' : 'Entry updated');
      setModal(null); load();
    } catch { toast.error('Failed to save entry'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this entry?')) return;
    try { await deletePhoneEntry(id); toast.success('Removed'); load(); }
    catch { toast.error('Failed to remove'); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Staff Reference</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Phone Directory</h1>
        </div>
        {canEdit && <button onClick={openCreate} className="btn-primary">+ New Entry</button>}
      </div>

      <div className="bg-white border border-charcoal-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-charcoal-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-charcoal-400">No entries yet.</div>
        ) : (
          <div className="divide-y divide-charcoal-50">
            {entries.map(en => (
              <div key={en.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-900">{en.name} {en.department && <span className="text-xs text-charcoal-400 font-normal">· {en.department}</span>}</p>
                  <p className="text-xs text-charcoal-500">{en.phone}</p>
                  {en.notes && <p className="text-xs text-charcoal-400 mt-0.5">{en.notes}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-3 flex-shrink-0">
                    <button onClick={() => openEdit(en)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                    <button onClick={() => handleDelete(en.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Del</button>
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
              <h2 className="font-display text-2xl font-light text-charcoal-900">{modal === 'create' ? 'New Entry' : 'Edit Entry'}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="label">Name</label><input required value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Front Desk" /></div>
              <div><label className="label">Phone</label><input required value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} className="input-field" /></div>
              <div><label className="label">Department</label><input value={form.department} onChange={e => setForm((f: any) => ({ ...f, department: e.target.value }))} className="input-field" placeholder="Housekeeping" /></div>
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
