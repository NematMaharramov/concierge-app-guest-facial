'use client';
import { useEffect, useState } from 'react';
import { getAllServices, getAllCategories, createService, updateService, deleteService, uploadImages, deleteImage } from '@/lib/api';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const emptyForm = { categoryId: '', name: '', description: '', priceInfo: '', priceAmount: '', priceCurrency: 'EUR', contactName: '', contactPhone: '', sortOrder: 0, isVisible: true };

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'images' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('ALL');
  const [uploadingFiles, setUploadingFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = () => Promise.all([getAllServices(), getAllCategories()]).then(([svcs, cats]) => {
    setServices(svcs); setCategories(cats);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (svc: any) => {
    setSelected(svc);
    setForm({ categoryId: svc.categoryId, name: svc.name, description: svc.description || '', priceInfo: svc.priceInfo || '', priceAmount: svc.priceAmount || '', priceCurrency: svc.priceCurrency || 'EUR', contactName: svc.contactName || '', contactPhone: svc.contactPhone || '', sortOrder: svc.sortOrder, isVisible: svc.isVisible });
    setModal('edit');
  };
  const openImages = (svc: any) => { setSelected(svc); setModal('images'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form, priceAmount: form.priceAmount ? Number(form.priceAmount) : undefined, sortOrder: Number(form.sortOrder) };
      if (modal === 'create') await createService(data);
      else await updateService(selected.id, data);
      toast.success(modal === 'create' ? 'Service created' : 'Service updated');
      setModal(null); load();
    } catch { toast.error('Failed to save service'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service? This will also remove its images and reservations.')) return;
    try { await deleteService(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleUpload = async () => {
    if (!uploadingFiles || !selected) return;
    setUploading(true);
    try { await uploadImages(selected.id, uploadingFiles); toast.success('Images uploaded'); setUploadingFiles(null); load(); }
    catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDeleteImage = async (imageId: string) => {
    try { await deleteImage(imageId); toast.success('Image removed'); load(); }
    catch { toast.error('Failed to remove image'); }
  };

  const filtered = filterCat === 'ALL' ? services : services.filter(s => s.categoryId === filterCat);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Admin</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Services</h1>
        </div>
        <button onClick={openCreate} className="btn-primary">+ New Service</button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('ALL')} className={`px-4 py-1.5 text-xs tracking-widest uppercase transition-colors ${filterCat === 'ALL' ? 'bg-charcoal-900 text-white' : 'bg-white border border-charcoal-200 text-charcoal-600 hover:bg-charcoal-50'}`}>All</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setFilterCat(c.id)} className={`px-4 py-1.5 text-xs tracking-widest uppercase transition-colors ${filterCat === c.id ? 'bg-charcoal-900 text-white' : 'bg-white border border-charcoal-200 text-charcoal-600 hover:bg-charcoal-50'}`}>{c.name}</button>
        ))}
      </div>

      {/* Services Table */}
      <div className="bg-white border border-charcoal-100 overflow-hidden">
        {loading ? <div className="p-12 text-center text-charcoal-400">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-charcoal-50 border-b border-charcoal-100">
                <tr>
                  {['Service', 'Category', 'Price', 'Contact', 'Images', 'Visible', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs tracking-widest uppercase text-charcoal-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-50">
                {filtered.map(svc => (
                  <tr key={svc.id} className="hover:bg-charcoal-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-charcoal-900 max-w-[200px] truncate">{svc.name}</p>
                      {svc.description && <p className="text-xs text-charcoal-400 truncate max-w-[200px]">{svc.description}</p>}
                    </td>
                    <td className="px-5 py-3 text-charcoal-500 text-xs">{svc.category?.name}</td>
                    <td className="px-5 py-3 text-charcoal-700 whitespace-nowrap text-xs">{svc.priceInfo || '—'}</td>
                    <td className="px-5 py-3 text-charcoal-500 text-xs whitespace-nowrap">{svc.contactName || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {svc.images.slice(0, 3).map((img: any) => (
                          <div key={img.id} className="w-8 h-8 rounded overflow-hidden bg-charcoal-100">
                            <img src={`${API_BASE}${img.url}`} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        <button onClick={() => openImages(svc)} className="w-8 h-8 bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-500 text-xs flex items-center justify-center transition-colors">+</button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`w-2 h-2 rounded-full inline-block ${svc.isVisible ? 'bg-green-400' : 'bg-charcoal-300'}`} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(svc)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                        <button onClick={() => handleDelete(svc.id)} className="text-red-400 hover:text-red-600 text-xs tracking-widest uppercase">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-charcoal-900">{modal === 'create' ? 'New Service' : 'Edit Service'}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Category</label>
                <select required value={form.categoryId} onChange={e => setForm((f: any) => ({ ...f, categoryId: e.target.value }))} className="input-field">
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Service Name</label>
                <input required value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. Raffles to Jetty (Taxi)" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="input-field resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Price Info</label>
                  <input value={form.priceInfo} onChange={e => setForm((f: any) => ({ ...f, priceInfo: e.target.value }))} className="input-field" placeholder="€45 one way" />
                </div>
                <div>
                  <label className="label">Amount</label>
                  <input type="number" value={form.priceAmount} onChange={e => setForm((f: any) => ({ ...f, priceAmount: e.target.value }))} className="input-field" placeholder="45" />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select value={form.priceCurrency} onChange={e => setForm((f: any) => ({ ...f, priceCurrency: e.target.value }))} className="input-field">
                    <option>EUR</option><option>USD</option><option>SCR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Contact Name</label>
                  <input value={form.contactName} onChange={e => setForm((f: any) => ({ ...f, contactName: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Contact Phone</label>
                  <input value={form.contactPhone} onChange={e => setForm((f: any) => ({ ...f, contactPhone: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Sort Order</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm((f: any) => ({ ...f, sortOrder: e.target.value }))} className="input-field" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="visible" checked={form.isVisible} onChange={e => setForm((f: any) => ({ ...f, isVisible: e.target.checked }))} className="w-4 h-4 accent-gold-500" />
                  <label htmlFor="visible" className="text-sm text-charcoal-700">Visible to guests</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Service'}</button>
                <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Images Modal */}
      {modal === 'images' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-display text-xl font-light text-charcoal-900">Images — {selected.name}</h2>
              <button onClick={() => setModal(null)} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Existing images */}
              <div className="grid grid-cols-4 gap-2">
                {(services.find(s => s.id === selected.id)?.images || []).map((img: any) => (
                  <div key={img.id} className="relative group">
                    <div className="aspect-square overflow-hidden bg-charcoal-100">
                      <img src={`${API_BASE}${img.url}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <button onClick={() => handleDeleteImage(img.id)} className="absolute top-1 right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
              </div>
              {/* Upload */}
              <div>
                <label className="label">Upload New Images</label>
                <input type="file" multiple accept="image/*" onChange={e => setUploadingFiles(e.target.files)} className="input-field text-xs" />
                {uploadingFiles && uploadingFiles.length > 0 && (
                  <p className="text-xs text-charcoal-500 mt-1">{uploadingFiles.length} file(s) selected</p>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={handleUpload} disabled={!uploadingFiles || uploading} className="btn-primary flex-1">{uploading ? 'Uploading...' : 'Upload Images'}</button>
                <button onClick={() => setModal(null)} className="btn-ghost flex-1">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
