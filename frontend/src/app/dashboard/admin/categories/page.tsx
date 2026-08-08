'use client';
import { useEffect, useState } from 'react';
import { getAllCategories, createCategory, updateCategory, deleteCategory, uploadCategoryPhoto, getFilterGroups, createFilterGroup, deleteFilterGroup, addFilterOption, deleteFilterOption } from '@/lib/api';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { CROP_PRESETS } from '@/lib/imageUtils';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const emptyForm = { name: '', slug: '', description: '', icon: '', sortOrder: 0, isVisible: true };

function resolveUrl(url?: string) {
  if (!url) return undefined;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

// ── Filter groups manager (Part 3) — shown inside the edit modal ────────────
function FilterGroupsManager({ categoryId }: { categoryId: string }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupOptions, setNewGroupOptions] = useState('');
  const [newOptionByGroup, setNewOptionByGroup] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = () => getFilterGroups(categoryId).then(setGroups).finally(() => setLoading(false));
  useEffect(() => { load(); }, [categoryId]);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setSaving(true);
    try {
      const options = newGroupOptions.split(',').map(o => o.trim()).filter(Boolean);
      await createFilterGroup(categoryId, { name: newGroupName.trim(), options });
      setNewGroupName(''); setNewGroupOptions('');
      toast.success('Filter group added');
      load();
    } catch { toast.error('Failed to add filter group'); }
    finally { setSaving(false); }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this filter group and all its options?')) return;
    try { await deleteFilterGroup(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleAddOption = async (groupId: string) => {
    const label = (newOptionByGroup[groupId] || '').trim();
    if (!label) return;
    try {
      await addFilterOption(groupId, { label });
      setNewOptionByGroup(m => ({ ...m, [groupId]: '' }));
      load();
    } catch { toast.error('Failed to add option'); }
  };

  const handleDeleteOption = async (id: string) => {
    try { await deleteFilterOption(id); load(); }
    catch { toast.error('Failed to remove option'); }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs text-charcoal-400">Loading filter groups…</p>
      ) : groups.length === 0 ? (
        <p className="text-xs text-charcoal-400">No filter groups yet. Guests will see a plain list for this category.</p>
      ) : (
        groups.map(group => (
          <div key={group.id} className="border border-charcoal-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-charcoal-900">{group.name}</p>
              <button type="button" onClick={() => handleDeleteGroup(group.id)} className="text-red-400 hover:text-red-600 text-[10px] tracking-widest uppercase">Delete group</button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {group.options.map((opt: any) => (
                <span key={opt.id} className="flex items-center gap-1 bg-charcoal-50 border border-charcoal-100 px-2 py-1 text-xs text-charcoal-700">
                  {opt.label}
                  <button type="button" onClick={() => handleDeleteOption(opt.id)} className="text-charcoal-400 hover:text-red-500">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newOptionByGroup[group.id] || ''}
                onChange={e => setNewOptionByGroup(m => ({ ...m, [group.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(group.id); } }}
                className="input-field text-xs py-1.5"
                placeholder="New option (e.g. Japanese)"
              />
              <button type="button" onClick={() => handleAddOption(group.id)} className="btn-ghost text-[10px] px-3">Add</button>
            </div>
          </div>
        ))
      )}

      <form onSubmit={handleAddGroup} className="border border-dashed border-charcoal-300 p-3 space-y-2">
        <p className="text-[10px] tracking-widest uppercase text-charcoal-500">Add a new filter group</p>
        <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="input-field text-xs py-1.5" placeholder="Group name (e.g. Cuisine Type)" />
        <input value={newGroupOptions} onChange={e => setNewGroupOptions(e.target.value)} className="input-field text-xs py-1.5" placeholder="Options, comma separated (e.g. Italian, Japanese, Local)" />
        <button type="submit" disabled={saving} className="btn-ghost text-[10px] px-3">{saving ? 'Adding…' : '+ Add Group'}</button>
      </form>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);

  const load = () => getAllCategories().then(setCategories).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setPendingPhoto(null); setModal('create'); };
  const openEdit = (cat: any) => {
    setSelected(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', icon: cat.icon || '', sortOrder: cat.sortOrder, isVisible: cat.isVisible });
    setPendingPhoto(null);
    setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let savedId: string;
      if (modal === 'create') {
        const created = await createCategory({ ...form, sortOrder: Number(form.sortOrder) });
        savedId = created.id;
      } else {
        await updateCategory(selected.id, { ...form, sortOrder: Number(form.sortOrder) });
        savedId = selected.id;
      }
      // Upload photo after save if one was selected
      if (pendingPhoto) {
        await uploadCategoryPhoto(savedId, pendingPhoto);
      }
      toast.success(modal === 'create' ? 'Category created' : 'Category updated');
      setModal(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
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
            <div key={cat.id} className="bg-white border border-charcoal-100 overflow-hidden flex flex-col">
              {/* Category photo thumbnail */}
              {cat.photo && (
                <div className="h-32 overflow-hidden bg-charcoal-100">
                  <img src={resolveUrl(cat.photo)} alt={cat.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 flex flex-col gap-3 flex-1">
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
                    {cat.photo && <span className="text-[10px] text-blue-500">Has photo</span>}
                  </div>
                </div>
                {cat.description && <p className="text-xs text-charcoal-500 leading-relaxed line-clamp-2">{cat.description}</p>}
                <div className="flex gap-3 pt-1 border-t border-charcoal-50 mt-auto">
                  <button onClick={() => openEdit(cat)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Delete</button>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-white w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            onMouseDown={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-charcoal-900">{modal === 'create' ? 'New Category' : 'Edit Category'}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Category Photo Upload */}
              <div>
                <label className="label">Category Photo <span className="text-charcoal-400 normal-case tracking-normal font-normal">(shown on guest site)</span></label>
                <ImageUploadButton
                  label="Category Photo"
                  currentUrl={modal === 'edit' ? selected?.photo : undefined}
                  cropOptions={CROP_PRESETS.categoryPhoto}
                  onFile={(file) => setPendingPhoto(file)}
                />
              </div>

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

            {/* Filter groups (Part 3) — only manageable once the category exists */}
            {modal === 'edit' && selected && (
              <div className="px-6 pb-6">
                <label className="label">Filter Groups <span className="text-charcoal-400 normal-case tracking-normal font-normal">(guest-site chip filters, e.g. Cuisine Type)</span></label>
                <FilterGroupsManager categoryId={selected.id} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
