'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getCategories, getSettings } from '@/lib/api';
import Link from 'next/link';

const CATEGORY_BG: Record<string, string> = {
  'taxi-transfers': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=90',
  'boat-excursions': 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=1200&q=90',
  'catamaran': 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=1200&q=90',
  'car-rental': 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=1200&q=90',
  'golf': 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=1200&q=90',
  'helicopter': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=90',
};

const CATEGORY_EXTRA_IMAGES: Record<string, string[]> = {
  'taxi-transfers': [
    'https://images.unsplash.com/photo-1590556409324-aa1d726e5c3c?w=1200&q=90',
    'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=1200&q=90',
  ],
  'boat-excursions': [
    'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200&q=90',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=90',
  ],
  'catamaran': [
    'https://images.unsplash.com/photo-1599640842225-85d111c60e6b?w=1200&q=90',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=90',
  ],
  'car-rental': [
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&q=90',
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1200&q=90',
  ],
  'golf': [
    'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&q=90',
    'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=1200&q=90',
  ],
  'helicopter': [
    'https://images.unsplash.com/photo-1608236415053-8c3e0a1cb1e9?w=1200&q=90',
    'https://images.unsplash.com/photo-1557800634-7d5f1e5e0af4?w=1200&q=90',
  ],
};

const CATEGORY_LABEL: Record<string, string> = {
  'taxi-transfers': 'Island Transfers',
  'boat-excursions': 'Ocean Escapes',
  'catamaran': 'Private Charters',
  'car-rental': 'Self Discovery',
  'golf': 'Golf & Leisure',
  'helicopter': 'Aerial Journeys',
};

// Carousel component for category cards
function CategoryCarousel({ slug, categoryName }: { slug: string; categoryName: string }) {
  const images = [CATEGORY_BG[slug] || 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&q=90', ...(CATEGORY_EXTRA_IMAGES[slug] || [])];
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % images.length);
    }, 3500 + Math.random() * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [images.length]);

  return (
    <div className="absolute inset-0">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={categoryName}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Header hide/show on scroll
  const [headerVisible, setHeaderVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const servicesRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    Promise.all([getCategories(), getSettings()])
      .then(([cats, sets]) => { setCategories(cats); setSettings(sets); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!settings.primary_color && !settings.accent_color) return;
    const root = document.documentElement;
    if (settings.primary_color) root.style.setProperty('--brand-primary', settings.primary_color);
    if (settings.accent_color) root.style.setProperty('--brand-accent', settings.accent_color);
  }, [settings.primary_color, settings.accent_color]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const servicesTop = servicesRef.current?.offsetTop ?? 9999;

      // Header invisible until leaving hero, reappears when scrolling up
      // But NOT when in the services section
      const inServicesSection = scrollY >= servicesTop - 100;

      if (inServicesSection) {
        setHeaderVisible(false);
      } else if (scrollY < 80) {
        setHeaderVisible(false);
      } else if (scrollY < lastScrollY) {
        // Scrolling up
        setHeaderVisible(true);
      } else {
        // Scrolling down
        setHeaderVisible(false);
      }

      setLastScrollY(scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const primary = settings.primary_color || '#1a1a1a';
  const accent = settings.accent_color || '#c9a96e';
  const accentLight = settings.accent_color ? `${settings.accent_color}cc` : '#e8d5a3';

  return (
    <div className="min-h-screen" style={{ background: '#f2ede6' }}>

      {/* Navigation - hide/show on scroll, not visible in services */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 1px 20px rgba(0,0,0,0.08)',
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: headerVisible ? 'auto' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div>
            <p className="font-display text-lg tracking-[0.22em] font-light" style={{ color: primary }}>
              RAFFLES SEYCHELLES
            </p>
            <p className="text-[9px] tracking-[0.45em] uppercase font-medium" style={{ color: accent }}>
              Praslin
            </p>
          </div>
          <a
            href="#services"
            className="text-[10px] tracking-[0.35em] uppercase transition-colors hover:opacity-70"
            style={{ color: primary }}
          >
            Our Services
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={settings.hero_image || 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1920&q=90'}
            alt="Raffles Seychelles"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,8,5,0.3) 0%, rgba(10,8,5,0.08) 40%, rgba(10,8,5,0.55) 100%)' }} />
        </div>
        <div className="relative text-center text-white px-6 animate-fade-in">
          <p className="text-[10px] tracking-[0.65em] uppercase mb-8 font-light" style={{ color: accentLight }}>
            Concierge Services
          </p>
          <h1 className="font-display font-light mb-7" style={{ fontSize: 'clamp(3rem, 7.5vw, 6rem)', lineHeight: 1.05, letterSpacing: '0.06em' }}>
            {settings.site_title || 'Raffles Seychelles'}
          </h1>
          <div className="flex items-center justify-center gap-5 mb-8">
            <div style={{ height: '1px', width: '50px', background: `linear-gradient(to right, transparent, ${accent})` }} />
            <div style={{ width: '5px', height: '5px', background: accent, transform: 'rotate(45deg)', flexShrink: 0 }} />
            <div style={{ height: '1px', width: '50px', background: `linear-gradient(to left, transparent, ${accent})` }} />
          </div>
          <p className="font-light tracking-wider text-white/70" style={{ fontSize: '1.05rem', maxWidth: '460px', margin: '0 auto 3.5rem', lineHeight: 1.9 }}>
            {settings.site_subtitle || 'Every experience, thoughtfully arranged for you'}
          </p>
          <a
            href="#services"
            className="inline-block text-[10px] tracking-[0.45em] uppercase transition-all duration-300 hover:bg-white hover:text-charcoal-900"
            style={{ border: '1px solid rgba(255,255,255,0.5)', color: 'white', padding: '15px 50px' }}
          >
            Discover
          </a>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <p className="text-white/30 text-[9px] tracking-[0.5em] uppercase">Scroll</p>
          <div className="w-px h-14 bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </section>

      {/* Intro band */}
      <section className="py-28 px-6 text-center bg-white">
        <p className="text-[10px] tracking-[0.55em] uppercase mb-6 font-medium" style={{ color: accent }}>Curated For You</p>
        <h2 className="font-display font-light mb-7" style={{ fontSize: 'clamp(2.1rem, 4vw, 3rem)', color: primary, letterSpacing: '0.04em' }}>
          Extraordinary Experiences
        </h2>
        <div className="flex items-center justify-center gap-5 mb-9">
          <div style={{ height: '1px', width: '40px', background: `linear-gradient(to right, transparent, ${accent})` }} />
          <div style={{ width: '4px', height: '4px', background: accent, transform: 'rotate(45deg)', flexShrink: 0 }} />
          <div style={{ height: '1px', width: '40px', background: `linear-gradient(to left, transparent, ${accent})` }} />
        </div>
        <p className="mx-auto" style={{ color: '#aaa', maxWidth: '520px', lineHeight: 2.1, fontSize: '0.875rem' }}>
          From private island excursions to seamless helicopter transfers and championship golf,
          our concierge team curates every detail of your Seychelles stay with quiet precision.
        </p>
      </section>

      {/* Services Grid */}
      <section ref={servicesRef} id="services" className="py-24 px-6" style={{ background: '#f2ede6' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.55em] uppercase mb-4 font-medium" style={{ color: accent }}>Explore</p>
            <h2 className="font-display font-light" style={{ fontSize: '2.1rem', color: primary, letterSpacing: '0.04em' }}>Our Services</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5">
              {[...Array(6)].map((_, i) => <div key={i} className="h-80 animate-pulse" style={{ background: '#e0d8cc' }} />)}
            </div>
          ) : (
            <div className={`grid gap-0.5 ${settings.layout_style === 'list' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {categories.map((cat, idx) => (
                <Link
                  key={cat.id}
                  href={`/services/${cat.slug}`}
                  className="group relative overflow-hidden block"
                  style={{ height: idx === 0 ? '420px' : '340px' }}
                >
                  {/* Carousel of category images */}
                  <CategoryCarousel slug={cat.slug} categoryName={cat.name} />

                  <div className="absolute inset-0 transition-opacity duration-500" style={{ background: 'linear-gradient(to top, rgba(8,6,3,0.85) 0%, rgba(8,6,3,0.05) 55%, transparent 100%)' }} />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'rgba(8,6,3,0.2)' }} />
                  <div className="absolute top-0 left-0 right-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" style={{ background: accent }} />

                  <div className="absolute inset-0 flex flex-col justify-end p-8 pb-9">
                    <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-400 ease-out">
                      <p className="text-[9px] tracking-[0.5em] uppercase mb-2.5 font-medium" style={{ color: accent }}>
                        {CATEGORY_LABEL[cat.slug] || 'Experience'}
                      </p>
                      <h3 className="font-display font-light text-white mb-5" style={{ fontSize: '1.6rem', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                        {cat.name}
                      </h3>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                        <div style={{ height: '1px', width: '22px', background: accent }} />
                        <span className="text-[9px] tracking-[0.45em] uppercase" style={{ color: accent }}>Explore</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Concierge strip - improved readability */}
      <section className="relative py-28 px-6 text-center overflow-hidden">
        {/* Background with blur overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1439130490301-25e322d88054?w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'rgba(10, 8, 5, 0.72)', backdropFilter: 'blur(2px)' }} />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.55em] uppercase mb-5 font-medium" style={{ color: accent }}>Always Available</p>
          <h2 className="font-display font-light mb-7 text-white" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', letterSpacing: '0.04em' }}>
            Your Personal Concierge
          </h2>
          <div className="flex items-center justify-center gap-5 mb-8">
            <div style={{ height: '1px', width: '40px', background: `linear-gradient(to right, transparent, ${accent})` }} />
            <div style={{ width: '4px', height: '4px', background: accent, transform: 'rotate(45deg)', flexShrink: 0 }} />
            <div style={{ height: '1px', width: '40px', background: `linear-gradient(to left, transparent, ${accent})` }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 2.1, fontSize: '0.9rem', marginBottom: '2.5rem' }}>
            Our team is available around the clock to arrange any experience, transfer or activity during your stay at Raffles Praslin Seychelles.
          </p>
          <p className="text-[10px] tracking-[0.5em] uppercase" style={{ color: accent, opacity: 0.8 }}>
            Anse Takamaka · Praslin · Seychelles
          </p>
        </div>
      </section>

      {/* Footer - brighter */}
      <footer style={{ background: '#2c2820', borderTop: `1px solid ${accent}33` }} className="py-12 text-center">
        <p className="font-display font-light tracking-[0.3em] mb-3" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
          RAFFLES SEYCHELLES · PRASLIN
        </p>
        <div className="flex items-center justify-center gap-5 mb-5">
          <div style={{ height: '1px', width: '30px', background: `linear-gradient(to right, transparent, ${accent}88)` }} />
          <div style={{ width: '3px', height: '3px', background: accent, transform: 'rotate(45deg)', opacity: 0.6 }} />
          <div style={{ height: '1px', width: '30px', background: `linear-gradient(to left, transparent, ${accent}88)` }} />
        </div>
        <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
          Anse Takamaka, Praslin Island, Seychelles
        </p>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}>
          © {new Date().getFullYear()} Raffles Hotels & Resorts. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
