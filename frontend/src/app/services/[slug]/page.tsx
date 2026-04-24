'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCategoryBySlug, getSettings } from '@/lib/api';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    // FIX 5: Fetch settings alongside category so accent colour is available
    Promise.all([getCategoryBySlug(slug), getSettings()])
      .then(([cat, sets]) => { setCategory(cat); setSettings(sets); })
      .finally(() => setLoading(false));
  }, [slug]);

  // FIX 5: Apply brand colours as CSS custom properties
  useEffect(() => {
    if (!settings.primary_color && !settings.accent_color) return;
    const root = document.documentElement;
    if (settings.primary_color) root.style.setProperty('--brand-primary', settings.primary_color);
    if (settings.accent_color) root.style.setProperty('--brand-accent', settings.accent_color);
  }, [settings.primary_color, settings.accent_color]);

  const accent = settings.accent_color || '#c9a96e';
  const primary = settings.primary_color || '#1a1a1a';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf8]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${accent} transparent transparent transparent` }} />
        <p className="text-xs tracking-widest uppercase text-charcoal-400">Loading</p>
      </div>
    </div>
  );

  if (!category) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Category not found</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-charcoal-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6">
          <Link href="/" className="font-display text-xl font-light tracking-[0.15em]" style={{ color: primary }}>RAFFLES PRASLIN</Link>
          <span className="text-charcoal-300">/</span>
          <span className="text-xs tracking-widest uppercase text-charcoal-500">{category.name}</span>
        </div>
      </nav>

      {/* Header */}
      <div className="pt-20 pb-12 px-6 bg-white border-b border-charcoal-100 text-center">
        <p className="text-3xl mb-3">{category.icon}</p>
        <h1 className="section-title mb-3">{category.name}</h1>
        {/* FIX 5: divider uses dynamic accent colour */}
        <div className="w-12 h-px mx-auto mb-4" style={{ background: accent }} />
        <p className="text-charcoal-500 text-sm max-w-xl mx-auto">{category.description}</p>
      </div>

      {/* Services */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {category.services.map((service: any) => (
            <div
              key={service.id}
              className="card cursor-pointer group hover:shadow-lg transition-shadow duration-300 animate-slide-up"
              onClick={() => setSelectedService(service)}
            >
              {/* Image */}
              <div className="relative h-44 overflow-hidden bg-charcoal-100">
                {service.images[0] ? (
                  <img
                    src={`${API_BASE}${service.images[0].url}`}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-charcoal-100 to-charcoal-200 flex items-center justify-center">
                    <span className="text-4xl opacity-30">🏝️</span>
                  </div>
                )}
                {service.images.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                    +{service.images.length - 1} photos
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-medium text-charcoal-900 mb-2 leading-snug">{service.name}</h3>
                {service.description && (
                  <p className="text-charcoal-500 text-xs leading-relaxed mb-3 line-clamp-2">{service.description}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-charcoal-100">
                  <div>
                    {service.priceInfo && (
                      <p className="text-charcoal-900 font-medium text-sm">{service.priceInfo}</p>
                    )}
                    {service.contactName && (
                      <p className="text-charcoal-400 text-xs mt-0.5">{service.contactName}</p>
                    )}
                  </div>
                  {/* FIX 5: "Details →" link uses dynamic accent colour */}
                  <span className="text-xs tracking-widest uppercase transition-colors" style={{ color: accent }}>Details →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Detail Modal */}
      {/* FIX 6: Added body scroll lock while modal is open */}
      {selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedService(null)}
        >
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {selectedService.images.length > 0 && (
              <div className="relative h-56 overflow-hidden">
                <img src={`${API_BASE}${selectedService.images[0].url}`} alt={selectedService.name} className="w-full h-full object-cover" />
                {selectedService.images.length > 1 && (
                  <div className="absolute bottom-3 right-3 flex gap-1">
                    {selectedService.images.slice(0, 4).map((img: any, i: number) => (
                      <div key={i} className="w-8 h-8 overflow-hidden border border-white/50">
                        <img src={`${API_BASE}${img.url}`} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-display text-2xl font-light text-charcoal-900">{selectedService.name}</h2>
                <button onClick={() => setSelectedService(null)} className="text-charcoal-400 hover:text-charcoal-900 ml-4 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {selectedService.description && (
                <p className="text-charcoal-600 text-sm leading-relaxed mb-4">{selectedService.description}</p>
              )}

              <div className="space-y-3 border-t border-charcoal-100 pt-4">
                {selectedService.priceInfo && (
                  <div className="flex justify-between">
                    <span className="text-xs tracking-widest uppercase text-charcoal-400">Price</span>
                    <span className="text-charcoal-900 font-medium text-sm">{selectedService.priceInfo}</span>
                  </div>
                )}
                {selectedService.contactName && (
                  <div className="flex justify-between">
                    <span className="text-xs tracking-widest uppercase text-charcoal-400">Contact</span>
                    <span className="text-charcoal-900 text-sm">{selectedService.contactName}</span>
                  </div>
                )}
                {selectedService.contactPhone && (
                  <div className="flex justify-between">
                    <span className="text-xs tracking-widest uppercase text-charcoal-400">Phone</span>
                    <a href={`tel:${selectedService.contactPhone}`} className="text-sm" style={{ color: accent }}>{selectedService.contactPhone}</a>
                  </div>
                )}
              </div>

              <p className="text-xs text-charcoal-400 mt-6 text-center">Please contact the concierge desk to arrange this service.</p>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <div className="fixed bottom-6 left-6">
        <Link href="/" className="text-white px-4 py-2 text-xs tracking-widest uppercase flex items-center gap-2 shadow-lg transition-colors" style={{ background: primary }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
      </div>
    </div>
  );
}
