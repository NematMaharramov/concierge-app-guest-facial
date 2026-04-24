'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getCategoryBySlug, getSettings } from '@/lib/api';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const CATEGORY_BG: Record<string, string> = {
  'taxi-transfers': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=90',
  'boat-excursions': 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=1200&q=90',
  'catamaran': 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=1200&q=90',
  'car-rental': 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=1200&q=90',
  'golf': 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=1200&q=90',
  'helicopter': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=90',
};

// Image carousel inside service card / modal
function ImageSlider({ images, alt, className = '' }: { images: string[]; alt: string; className?: string }) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) return null;

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent(c => (c - 1 + images.length) % images.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent(c => (c + 1) % images.length);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="flex transition-transform duration-500 ease-out h-full"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${alt} ${i + 1}`}
            className="w-full h-full object-cover flex-shrink-0"
            style={{ minWidth: '100%' }}
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center transition-colors text-xs"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center transition-colors text-xs"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setCurrent(i); }}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: i === current ? 'white' : 'rgba(255,255,255,0.4)' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Fullscreen image preview
function FullscreenPreview({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(startIndex);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrent(c => (c - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl w-10 h-10 flex items-center justify-center"
      >
        ✕
      </button>
      <img
        src={images[current]}
        alt=""
        className="max-w-[90vw] max-h-[85vh] object-contain"
        onClick={e => e.stopPropagation()}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + images.length) % images.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors"
          >
            ‹
          </button>
          <button
            onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % images.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors"
          >
            ›
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            {current + 1} / {images.length}
          </p>
        </>
      )}
    </div>
  );
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [fullscreenImages, setFullscreenImages] = useState<string[] | null>(null);
  const [fullscreenStart, setFullscreenStart] = useState(0);

  useEffect(() => {
    if (!slug) return;
    Promise.all([getCategoryBySlug(slug), getSettings()])
      .then(([cat, sets]) => { setCategory(cat); setSettings(sets); })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!settings.primary_color && !settings.accent_color) return;
    const root = document.documentElement;
    if (settings.primary_color) root.style.setProperty('--brand-primary', settings.primary_color);
    if (settings.accent_color) root.style.setProperty('--brand-accent', settings.accent_color);
  }, [settings.primary_color, settings.accent_color]);

  // Scroll lock when modal open
  useEffect(() => {
    if (selectedService) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedService]);

  const accent = settings.accent_color || '#c9a96e';
  const primary = settings.primary_color || '#1a1a1a';

  const getServiceImages = (service: any): string[] => {
    if (!service?.images?.length) return [];
    return service.images.map((img: any) => `${API_BASE}${img.url}`);
  };

  const openFullscreen = (images: string[], idx: number = 0) => {
    setFullscreenImages(images);
    setFullscreenStart(idx);
  };

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-sm border-b border-charcoal-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="font-display text-lg font-light tracking-[0.15em]" style={{ color: primary }}>
            RAFFLES SEYCHELLES
          </Link>
          <span className="text-charcoal-300">/</span>
          <span className="text-xs tracking-widest uppercase text-charcoal-500">{category.name}</span>
        </div>
      </nav>

      {/* Header with category image */}
      <div className="relative pt-16 h-64 overflow-hidden">
        <img
          src={CATEGORY_BG[category.slug] || 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&q=90'}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))' }} />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <p className="text-3xl mb-3">{category.icon}</p>
          <h1 className="font-display text-3xl md:text-4xl font-light text-white mb-2" style={{ letterSpacing: '0.06em' }}>{category.name}</h1>
          <div className="w-12 h-px mx-auto mb-3" style={{ background: accent }} />
          <p className="text-white/70 text-sm max-w-xl mx-auto">{category.description}</p>
        </div>
      </div>

      {/* Services */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {category.services.map((service: any) => {
            const serviceImages = getServiceImages(service);
            return (
              <div
                key={service.id}
                className="card cursor-pointer group hover:shadow-xl transition-all duration-300 animate-slide-up bg-white"
                onClick={() => setSelectedService(service)}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-charcoal-100">
                  {serviceImages.length > 0 ? (
                    <ImageSlider
                      images={serviceImages}
                      alt={service.name}
                      className="w-full h-48"
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${CATEGORY_BG[category.slug] || 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=900&q=90'})` }}
                    >
                      <div className="w-full h-full flex items-end justify-start p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}>
                        <span className="text-white/60 text-xs">{category.name}</span>
                      </div>
                    </div>
                  )}
                  {serviceImages.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full pointer-events-none">
                      {serviceImages.length} photos
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
                    {service.priceInfo ? (
                      <p className="text-charcoal-900 font-medium text-sm">{service.priceInfo}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs tracking-widest uppercase transition-colors" style={{ color: accent }}>Details →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Detail Modal — NO contact info shown to guests */}
      {selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedService(null)}
        >
          <div
            className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Image slider in modal */}
            {(() => {
              const imgs = getServiceImages(selectedService);
              return imgs.length > 0 ? (
                <div className="relative">
                  <ImageSlider images={imgs} alt={selectedService.name} className="w-full h-64" />
                  {/* Click to fullscreen */}
                  <button
                    onClick={() => openFullscreen(imgs, 0)}
                    className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 text-white text-[10px] tracking-widest uppercase px-3 py-1.5 transition-colors"
                  >
                    ⛶ Full Screen
                  </button>
                </div>
              ) : (
                <div
                  className="h-48 bg-cover bg-center"
                  style={{ backgroundImage: `url(${CATEGORY_BG[category.slug] || 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=900&q=90'})` }}
                />
              );
            })()}

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
              </div>

              <div className="mt-6 p-4 rounded" style={{ background: `${accent}15`, border: `1px solid ${accent}33` }}>
                <p className="text-xs text-charcoal-600 text-center leading-relaxed">
                  Please contact the concierge desk to arrange this service.
                  <br />
                  <span className="font-medium" style={{ color: accent }}>We are available 24 hours a day.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen image preview */}
      {fullscreenImages && (
        <FullscreenPreview
          images={fullscreenImages}
          startIndex={fullscreenStart}
          onClose={() => setFullscreenImages(null)}
        />
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
