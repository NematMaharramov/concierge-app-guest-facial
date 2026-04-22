'use client';
import { useEffect, useState } from 'react';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', slug: '', description: '', icon: '', sortOrder: 0, isVisible: true };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => getAllCategories().then(setCategories).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (cat: any) => {
    setSelected(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', icon: cat.icon || '', sortOrder: cat.sortOrder, isVisible: cat.isVisible });
    setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'create') await createCategory({ ...form, sortOrder: Number(form.sortOrder) });
      else await updateCategory(selected.id, { ...form, sortOrder: Number(form.sortOrder) });
      toast.success(modal === 'create' ? 'Category created' : 'Category updated');
      setModal(null); load();
    } catch { toast.error('Failed to save category'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category and all its services?')) return;
    try { await deleteCategory(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Admin</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Categories</h1>
        </div>
        <button onClick={openCreate} className="btn-primary">+ New Category</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(6)].map((_, i) => <div key={i} className="h-36 bg-charcoal-100 animate-pulse" />) :
          categories.map(cat => (
            <div key={cat.id} className="bg-white border border-charcoal-100 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl mb-1">{cat.icon || '📁'}</p>
                  <h3 className="font-medium text-charcoal-900">{cat.name}</h3>
                  <p className="text-xs text-charcoal-400 mt-0.5">/{cat.slug}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${cat.isVisible ? 'bg-green-100 text-green-700' : 'bg-charcoal-100 text-charcoal-500'}`}>
                    {cat.isVisible ? 'Visible' : 'Hidden'}
                  </span>
                  <span className="text-[10px] text-charcoal-400">{cat._count?.services || 0} services</span>
                </div>
              </div>
              {cat.description && <p className="text-xs text-charcoal-500 leading-relaxed line-clamp-2">{cat.description}</p>}
              <div className="flex gap-3 pt-1 border-t border-charcoal-50">
                <button onClick={() => openEdit(cat)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                <button onClick={() => handleDelete(cat.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Delete</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-charcoal-900">{modal === 'create' ? 'New Category' : 'Edit Category'}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="label">Icon</label>
                  <input value={form.icon} onChange={e => setForm((f: any) => ({ ...f, icon: e.target.value }))} className="input-field text-center text-xl" placeholder="🏝️" maxLength={4} />
                </div>
                <div className="col-span-3">
                  <label className="label">Name</label>
                  <input required value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value, slug: modal === 'create' ? autoSlug(e.target.value) : f.slug }))} className="input-field" placeholder="e.g. Boat Excursions" />
                </div>
              </div>
              <div>
                <label className="label">Slug (URL)</label>
                <input required value={form.slug} onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value }))} className="input-field" placeholder="boat-excursions" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="input-field resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Sort Order</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm((f: any) => ({ ...f, sortOrder: e.target.value }))} className="input-field" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="vis" checked={form.isVisible} onChange={e => setForm((f: any) => ({ ...f, isVisible: e.target.checked }))} className="w-4 h-4 accent-gold-500" />
                  <label htmlFor="vis" className="text-sm text-charcoal-700">Visible</label>
                </div>
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
