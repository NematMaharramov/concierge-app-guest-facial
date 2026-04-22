'use client';
import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(data => { setSettings(data); setLoading(false); });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const set = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }));

  if (loading) return <div className="p-12 text-center text-charcoal-400">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Admin</p>
        <h1 className="font-display text-3xl font-light text-charcoal-900">Site Settings</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding */}
        <div className="bg-white border border-charcoal-100 p-6 space-y-4">
          <h2 className="font-medium text-charcoal-900 tracking-wide border-b border-charcoal-100 pb-3">Branding</h2>
          <div>
            <label className="label">Site Title</label>
            <input value={settings.site_title || ''} onChange={e => set('site_title', e.target.value)} className="input-field" placeholder="Raffles Praslin Concierge" />
          </div>
          <div>
            <label className="label">Subtitle / Tagline</label>
            <input value={settings.site_subtitle || ''} onChange={e => set('site_subtitle', e.target.value)} className="input-field" placeholder="Curated experiences for every moment" />
          </div>
        </div>

        {/* Hero */}
        <div className="bg-white border border-charcoal-100 p-6 space-y-4">
          <h2 className="font-medium text-charcoal-900 tracking-wide border-b border-charcoal-100 pb-3">Hero Section</h2>
          <div>
            <label className="label">Hero Image URL</label>
            <input value={settings.hero_image || ''} onChange={e => set('hero_image', e.target.value)} className="input-field" placeholder="https://... (leave empty for default)" />
            <p className="text-xs text-charcoal-400 mt-1">Provide a direct URL to a high-resolution landscape image (min 1920×1080).</p>
          </div>
          {settings.hero_image && (
            <div className="h-32 overflow-hidden border border-charcoal-100">
              <img src={settings.hero_image} alt="Hero preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.src = '')} />
            </div>
          )}
        </div>

        {/* Layout */}
        <div className="bg-white border border-charcoal-100 p-6 space-y-4">
          <h2 className="font-medium text-charcoal-900 tracking-wide border-b border-charcoal-100 pb-3">Layout</h2>
          <div>
            <label className="label">Service Display Layout</label>
            <div className="flex gap-4">
              {['grid', 'list'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="layout" value={opt} checked={settings.layout_style === opt} onChange={() => set('layout_style', opt)} className="accent-gold-500" />
                  <span className="text-sm text-charcoal-700 capitalize">{opt} View</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Colours */}
        <div className="bg-white border border-charcoal-100 p-6 space-y-4">
          <h2 className="font-medium text-charcoal-900 tracking-wide border-b border-charcoal-100 pb-3">Colours</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Primary Colour</label>
              <div className="flex gap-2">
                <input type="color" value={settings.primary_color || '#1a1a1a'} onChange={e => set('primary_color', e.target.value)} className="w-10 h-10 border border-charcoal-200 cursor-pointer" />
                <input value={settings.primary_color || '#1a1a1a'} onChange={e => set('primary_color', e.target.value)} className="input-field flex-1" />
              </div>
            </div>
            <div>
              <label className="label">Accent Colour</label>
              <div className="flex gap-2">
                <input type="color" value={settings.accent_color || '#c9a96e'} onChange={e => set('accent_color', e.target.value)} className="w-10 h-10 border border-charcoal-200 cursor-pointer" />
                <input value={settings.accent_color || '#c9a96e'} onChange={e => set('accent_color', e.target.value)} className="input-field flex-1" />
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving Settings...' : 'Save All Settings'}
        </button>
      </form>
    </div>
  );
}
