'use client';
import { useEffect, useState } from 'react';
import { getLetterTemplates, createLetterTemplate, updateLetterTemplate, deleteLetterTemplate, getMergeFields } from '@/lib/api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', subject: '', bodyHtml: '', isDefault: false };

export default function AdminLetterTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [mergeFields, setMergeFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => getLetterTemplates().then(setTemplates).finally(() => setLoading(false));
  useEffect(() => { load(); getMergeFields().then(setMergeFields); }, []);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (t: any) => {
    setSelected(t);
    setForm({ name: t.name, subject: t.subject, bodyHtml: t.bodyHtml, isDefault: t.isDefault });
    setModal('edit');
  };

  const insertField = (key: string) => {
    setForm((f: any) => ({ ...f, bodyHtml: f.bodyHtml + `{{${key}}}` }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'create') await createLetterTemplate(form);
      else await updateLetterTemplate(selected.id, form);
      toast.success(modal === 'create' ? 'Template created' : 'Template updated');
      setModal(null); load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save template');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this letter template?')) return;
    try { await deleteLetterTemplate(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Admin</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Letter Templates</h1>
        </div>
        <button onClick={openCreate} className="btn-primary">+ New Template</button>
      </div>

      <div className="bg-white border border-charcoal-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-charcoal-400">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center text-charcoal-400">No letter templates yet.</div>
        ) : (
          <div className="divide-y divide-charcoal-50">
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-900 truncate">{t.name} {t.isDefault && <span className="text-[10px] text-gold-600 ml-1">(default)</span>}</p>
                  <p className="text-xs text-charcoal-400 truncate">{t.subject}</p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <button onClick={() => openEdit(t)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Del</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-white w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onMouseDown={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-charcoal-900">{modal === 'create' ? 'New Template' : 'Edit Template'}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Template Name</label>
                <input required value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Standard Pre-Arrival" />
              </div>
              <div>
                <label className="label">Subject</label>
                <input required value={form.subject} onChange={e => setForm((f: any) => ({ ...f, subject: e.target.value }))} className="input-field" placeholder="Welcome to {{hotel_name}}, {{guest_first_name}}!" />
              </div>
              <div>
                <label className="label mb-2">Merge Fields <span className="text-charcoal-400 normal-case tracking-normal font-normal">(click to insert into body)</span></label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {mergeFields.map(f => (
                    <button key={f.key} type="button" onClick={() => insertField(f.key)}
                      className="px-2.5 py-1 text-[11px] bg-charcoal-50 border border-charcoal-100 hover:border-gold-300 text-charcoal-600 transition-colors">
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Body (HTML)</label>
                <textarea required rows={12} value={form.bodyHtml} onChange={e => setForm((f: any) => ({ ...f, bodyHtml: e.target.value }))}
                  className="input-field resize-y font-mono text-xs" placeholder="<p>Dear {{guest_first_name}},</p>..." />
                <p className="text-[10px] text-charcoal-400 mt-1">Plain HTML — no visual editor yet, but any valid HTML (including inline styles) works.</p>
              </div>
              {form.bodyHtml && (
                <div>
                  <label className="label mb-1">Live Preview <span className="text-charcoal-400 normal-case tracking-normal font-normal">(merge fields shown as-is)</span></label>
                  <div className="border border-charcoal-100 p-4 max-h-56 overflow-y-auto text-sm" dangerouslySetInnerHTML={{ __html: form.bodyHtml }} />
                </div>
              )}
              <div className="flex items-center gap-3">
                <input type="checkbox" id="tpl-default" checked={form.isDefault} onChange={e => setForm((f: any) => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 accent-gold-500" />
                <label htmlFor="tpl-default" className="text-sm text-charcoal-700">Set as default template</label>
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
