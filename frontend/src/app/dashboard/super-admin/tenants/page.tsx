'use client';
import { useEffect, useState } from 'react';
import {
  getTenants, createTenant, updateTenant,
  getTenantBranding, updateTenantBranding,
  getTenantFeatureFlags, setTenantFeatureFlag,
} from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const VERTICALS = [
  { value: '', label: 'None (build categories by hand)' },
  { value: 'RESORT_LEISURE', label: 'Resort / Leisure' },
  { value: 'BUSINESS_CITY_HOTEL', label: 'Business / City Hotel' },
  { value: 'BOUTIQUE_HOTEL', label: 'Boutique Hotel' },
  { value: 'CUSTOM', label: 'Custom (no starter categories)' },
];

const emptyWizard = {
  name: '', slug: '', businessVertical: '',
  adminEmail: '', adminPassword: '', adminName: '',
};

function autoSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Creation wizard ──────────────────────────────────────────────────────────
function CreateTenantWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<any>(emptyWizard);
  const [saving, setSaving] = useState(false);

  const set = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));

  const canProceed = form.name.trim() && form.slug.trim();

  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload: any = { name: form.name, slug: form.slug };
      if (form.businessVertical) payload.businessVertical = form.businessVertical;
      if (form.adminEmail && form.adminPassword) {
        payload.adminEmail = form.adminEmail;
        payload.adminPassword = form.adminPassword;
        payload.adminName = form.adminName || 'Admin';
      }
      await createTenant(payload);
      toast.success('Tenant created');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create tenant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-0.5">New Tenant</p>
            <h2 className="font-display text-2xl font-light text-charcoal-900">Step {step} of 2</h2>
          </div>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
        </div>

        {step === 1 && (
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Hotel / Brand Name</label>
              <input
                required autoFocus value={form.name}
                onChange={e => set({ name: e.target.value, slug: autoSlug(e.target.value) })}
                className="input-field" placeholder="e.g. Fairmont Baku"
              />
            </div>
            <div>
              <label className="label">Slug</label>
              <input required value={form.slug} onChange={e => set({ slug: e.target.value })} className="input-field" placeholder="fairmont-baku" />
              <p className="text-[10px] text-charcoal-400 mt-1">Used to resolve this tenant by subdomain/header until per-tenant domains are wired up (Part 8).</p>
            </div>
            <div>
              <label className="label">Business Vertical</label>
              <select value={form.businessVertical} onChange={e => set({ businessVertical: e.target.value })} className="input-field">
                {VERTICALS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
              <p className="text-[10px] text-charcoal-400 mt-1">Pre-fills starter categories (and their filters, where defined) — the brand's team still adds real prices/photos.</p>
            </div>
            <div className="pt-2">
              <button type="button" disabled={!canProceed} onClick={() => setStep(2)} className="btn-primary w-full disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6 space-y-4">
            <div>
              <p className="label mb-2">First Admin Account <span className="text-charcoal-400 normal-case tracking-normal font-normal">(optional — you can invite one later instead)</span></p>
              <div className="space-y-3">
                <input value={form.adminName} onChange={e => set({ adminName: e.target.value })} className="input-field" placeholder="Full name" />
                <input type="email" value={form.adminEmail} onChange={e => set({ adminEmail: e.target.value })} className="input-field" placeholder="admin@brand.com" />
                <input type="password" value={form.adminPassword} onChange={e => set({ adminPassword: e.target.value })} className="input-field" placeholder="Temporary password (min. 8 chars)" minLength={8} />
              </div>
            </div>

            <div className="p-4 bg-charcoal-50 border border-charcoal-100 text-xs text-charcoal-500 leading-relaxed">
              <span className="font-medium text-charcoal-700">Excel data import</span> isn't available yet in this build —
              the brand's price sheets can be added by hand from their Services panel for now, or by your team directly.
              A dedicated import tool is planned.
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
              <button type="button" disabled={saving} onClick={handleCreate} className="btn-primary flex-1">
                {saving ? 'Creating…' : 'Create Tenant'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit modal: General / Branding / Feature Flags ───────────────────────────
function EditTenantModal({ tenant, onClose, onSaved }: { tenant: any; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<'general' | 'branding' | 'flags'>('general');

  const [name, setName] = useState(tenant.name);
  const [customDomain, setCustomDomain] = useState(tenant.customDomain || '');
  const [isActive, setIsActive] = useState(tenant.isActive);
  const [savingGeneral, setSavingGeneral] = useState(false);

  const [branding, setBranding] = useState<any>({});
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);

  const [flags, setFlags] = useState<any[]>([]);
  const [flagsLoaded, setFlagsLoaded] = useState(false);

  useEffect(() => {
    if (tab === 'branding' && !brandingLoaded) {
      getTenantBranding(tenant.id).then(b => setBranding(b || {})).finally(() => setBrandingLoaded(true));
    }
    if (tab === 'flags' && !flagsLoaded) {
      getTenantFeatureFlags(tenant.id).then(setFlags).finally(() => setFlagsLoaded(true));
    }
  }, [tab]);

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      await updateTenant(tenant.id, { name, customDomain: customDomain.trim() || undefined, isActive });
      toast.success('Tenant updated');
      onSaved();
    } catch { toast.error('Failed to update tenant'); }
    finally { setSavingGeneral(false); }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      await updateTenantBranding(tenant.id, branding);
      toast.success('Branding saved');
    } catch { toast.error('Failed to save branding'); }
    finally { setSavingBranding(false); }
  };

  const toggleFlag = async (key: string, enabled: boolean) => {
    setFlags(fs => fs.map(f => f.key === key ? { ...f, enabled } : f));
    try { await setTenantFeatureFlag(tenant.id, key, enabled); }
    catch { toast.error('Failed to update flag'); setFlags(fs => fs.map(f => f.key === key ? { ...f, enabled: !enabled } : f)); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
          <h2 className="font-display text-2xl font-light text-charcoal-900">{tenant.name}</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
        </div>

        <div className="px-6 pt-4 flex gap-4 border-b border-charcoal-100">
          {(['general', 'branding', 'flags'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-xs tracking-widest uppercase transition-colors border-b-2 ${tab === t ? 'text-gold-600 border-gold-500 font-medium' : 'text-charcoal-400 border-transparent hover:text-charcoal-700'}`}>
              {t === 'general' ? 'General' : t === 'branding' ? 'Branding' : 'Feature Flags'}
            </button>
          ))}
        </div>

        {tab === 'general' && (
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Slug</label>
              <input value={tenant.slug} disabled className="input-field bg-charcoal-50 text-charcoal-400 cursor-not-allowed" />
              <p className="text-[10px] text-charcoal-400 mt-1">Slug changes aren't supported yet — it's used for tenant resolution.</p>
            </div>
            <div>
              <label className="label">Custom Domain <span className="text-charcoal-400 normal-case tracking-normal font-normal">(optional)</span></label>
              <input value={customDomain} onChange={e => setCustomDomain(e.target.value)} className="input-field" placeholder="concierge.fairmontbaku.com" />
              <p className="text-[10px] text-charcoal-400 mt-1">Point this domain's DNS at Render, then add it as a Custom Domain on the frontend service there — this field only tells the backend which tenant it belongs to.</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="tenant-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-gold-500" />
              <label htmlFor="tenant-active" className="text-sm text-charcoal-700">Active</label>
            </div>
            <button onClick={handleSaveGeneral} disabled={savingGeneral} className="btn-primary w-full">
              {savingGeneral ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}

        {tab === 'branding' && (
          <div className="p-6 space-y-4">
            {!brandingLoaded ? (
              <p className="text-xs text-charcoal-400">Loading…</p>
            ) : (
              <>
                <div>
                  <label className="label">Logo URL</label>
                  <input value={branding.logoUrl || ''} onChange={e => setBranding((b: any) => ({ ...b, logoUrl: e.target.value }))} className="input-field" placeholder="https://..." />
                </div>
                <div>
                  <label className="label">Site Title</label>
                  <input value={branding.siteTitle || ''} onChange={e => setBranding((b: any) => ({ ...b, siteTitle: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Site Subtitle</label>
                  <input value={branding.siteSubtitle || ''} onChange={e => setBranding((b: any) => ({ ...b, siteSubtitle: e.target.value }))} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Primary Colour</label>
                    <div className="flex gap-2">
                      <input type="color" value={branding.primaryColor || '#1a1a1a'} onChange={e => setBranding((b: any) => ({ ...b, primaryColor: e.target.value }))} className="w-10 h-10 border border-charcoal-200 cursor-pointer" />
                      <input value={branding.primaryColor || ''} onChange={e => setBranding((b: any) => ({ ...b, primaryColor: e.target.value }))} className="input-field flex-1" placeholder="#1a1a1a" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Accent Colour</label>
                    <div className="flex gap-2">
                      <input type="color" value={branding.accentColor || '#c9a96e'} onChange={e => setBranding((b: any) => ({ ...b, accentColor: e.target.value }))} className="w-10 h-10 border border-charcoal-200 cursor-pointer" />
                      <input value={branding.accentColor || ''} onChange={e => setBranding((b: any) => ({ ...b, accentColor: e.target.value }))} className="input-field flex-1" placeholder="#c9a96e" />
                    </div>
                  </div>
                </div>
                <button onClick={handleSaveBranding} disabled={savingBranding} className="btn-primary w-full">
                  {savingBranding ? 'Saving…' : 'Save Branding'}
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'flags' && (
          <div className="p-6 space-y-1">
            {!flagsLoaded ? (
              <p className="text-xs text-charcoal-400">Loading…</p>
            ) : (
              flags.map(f => (
                <label key={f.key} className="flex items-center justify-between py-3 border-b border-charcoal-50 last:border-0 cursor-pointer">
                  <span className="text-sm text-charcoal-700">{f.label}</span>
                  <input type="checkbox" checked={f.enabled} onChange={e => toggleFlag(f.key, e.target.checked)} className="w-4 h-4 accent-gold-500" />
                </label>
              ))
            )}
            <p className="text-[10px] text-charcoal-400 pt-3">Modules aren't wired up to these flags yet — this panel just records the intended configuration ahead of each module shipping.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = () => getTenants().then(setTenants).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Super Admin</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Tenants</h1>
        </div>
        <button onClick={() => setShowWizard(true)} className="btn-primary">+ New Tenant</button>
      </div>

      <div className="bg-white border border-charcoal-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-charcoal-400">Loading...</div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center text-charcoal-400">No tenants yet. Create the first one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-charcoal-50 border-b border-charcoal-100">
                <tr>
                  {['Name', 'Slug', 'Vertical', 'Status', 'Created', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs tracking-widest uppercase text-charcoal-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-50">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-charcoal-50/50 transition-colors">
                    <td className="px-5 py-4 font-medium text-charcoal-900">{t.name}</td>
                    <td className="px-5 py-4 text-charcoal-500 text-xs">{t.slug}</td>
                    <td className="px-5 py-4 text-charcoal-500 text-xs">{t.businessVertical || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-charcoal-100 text-charcoal-500'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-charcoal-500 text-xs">{format(new Date(t.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-5 py-4">
                      <button onClick={() => setEditing(t)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showWizard && <CreateTenantWizard onClose={() => setShowWizard(false)} onCreated={load} />}
      {editing && <EditTenantModal tenant={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}
