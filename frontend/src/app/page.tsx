'use client';
import { useEffect, useState } from 'react';
import { getCategories, getSettings } from '@/lib/api';
import Link from 'next/link';

const CATEGORY_BG: Record<string, string> = {
  'taxi-transfers': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=900&q=90',
  'boat-excursions': 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=900&q=90',
  'catamaran': 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=900&q=90',
  'car-rental': 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=900&q=90',
  'golf': 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=900&q=90',
  'helicopter': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=900&q=90',
};

const CATEGORY_LABEL: Record<string, string> = {
  'taxi-transfers': 'Island Transfers',
  'boat-excursions': 'Ocean Escapes',
  'catamaran': 'Private Charters',
  'car-rental': 'Self Discovery',
  'golf': 'Golf & Leisure',
  'helicopter': 'Aerial Journeys',
};

export default function HomePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    Promise.all([getCategories(), getSettings()])
      .then(([cats, sets]) => { setCategories(cats); setSettings(sets); })
      .finally(() => setLoading(false));

    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // FIX 5: Apply admin-configured brand colours to CSS custom properties so
  // they cascade into all inline styles that reference these variables.
  // Previously the settings were fetched and stored but never consumed.
  useEffect(() => {
    if (!settings.primary_color && !settings.accent_color) return;
    const root = document.documentElement;
    if (settings.primary_color) root.style.setProperty('--brand-primary', settings.primary_color);
    if (settings.accent_color) root.style.setProperty('--brand-accent', settings.accent_color);
  }, [settings.primary_color, settings.accent_color]);

  // Resolve colours: prefer settings value, fall back to design defaults
  const primary = settings.primary_color || '#1a1a1a';
  const accent = settings.accent_color || '#c9a96e';
  // Derive a lighter tint of accent for text on dark backgrounds
  const accentLight = settings.accent_color ? `${settings.accent_color}cc` : '#e8d5a3';

  return (
    <div className="min-h-screen" style={{ background: '#f2ede6' }}>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/98 shadow-sm backdrop-blur-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <p className={`font-display text-lg tracking-[0.22em] font-light transition-colors duration-300 ${scrolled ? 'text-[#1a1a1a]' : 'text-white'}`}>
              RAFFLES PRASLIN
            </p>
            {/* FIX 5: accent colour applied dynamically */}
            <p className="text-[9px] tracking-[0.45em] uppercase font-medium transition-colors duration-300"
              style={{ color: scrolled ? accent : accentLight }}>
              Seychelles
            </p>
          </div>
          <a
            href="#services"
            className={`text-[10px] tracking-[0.35em] uppercase transition-colors duration-300 ${scrolled ? 'hover:opacity-70' : 'text-white/80 hover:text-white'}`}
            style={scrolled ? { color: primary } : {}}
          >
            Our Services
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={settings.hero_image || 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1920&q=90'}
            alt="Raffles Praslin"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,8,5,0.28) 0%, rgba(10,8,5,0.10) 45%, rgba(10,8,5,0.48) 100%)' }} />
        </div>
        <div className="relative text-center text-white px-6 animate-fade-in">
          <p className="text-[10px] tracking-[0.65em] uppercase mb-8 font-light" style={{ color: accentLight, letterSpacing: '0.55em' }}>
            Concierge Services
          </p>
          <h1 className="font-display font-light mb-7" style={{ fontSize: 'clamp(3rem, 7.5vw, 6rem)', lineHeight: 1.05, letterSpacing: '0.06em' }}>
            {settings.site_title || 'Raffles Praslin'}
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
            className="inline-block text-[10px] tracking-[0.45em] uppercase transition-all duration-400 hover:bg-white"
            style={{ border: '1px solid rgba(255,255,255,0.5)', color: 'white', padding: '15px 50px', letterSpacing: '0.4em' }}
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
      <section id="services" className="py-24 px-6" style={{ background: '#f2ede6' }}>
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
                  <img
                    src={CATEGORY_BG[cat.slug] || 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=900&q=90'}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-107"
                  />
                  <div className="absolute inset-0 transition-opacity duration-500" style={{ background: 'linear-gradient(to top, rgba(8,6,3,0.82) 0%, rgba(8,6,3,0.05) 55%, transparent 100%)' }} />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'rgba(8,6,3,0.18)' }} />

                  {/* FIX 5: Gold top border uses dynamic accent colour */}
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

      {/* Concierge strip */}
      <section className="py-24 px-6 text-center" style={{ background: '#fff' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.55em] uppercase mb-5 font-medium" style={{ color: accent }}>Always Available</p>
          <h2 className="font-display font-light mb-7" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', color: primary, letterSpacing: '0.04em' }}>
            Your Personal Concierge
          </h2>
          <div className="flex items-center justify-center gap-5 mb-8">
            <div style={{ height: '1px', width: '40px', background: `linear-gradient(to right, transparent, ${accent})` }} />
            <div style={{ width: '4px', height: '4px', background: accent, transform: 'rotate(45deg)', flexShrink: 0 }} />
            <div style={{ height: '1px', width: '40px', background: `linear-gradient(to left, transparent, ${accent})` }} />
          </div>
          <p style={{ color: '#bbb', lineHeight: 2.1, fontSize: '0.875rem', marginBottom: '2.5rem' }}>
            Our team is available around the clock to arrange any experience, transfer or activity during your stay at Raffles Praslin.
          </p>
          <p className="text-[10px] tracking-[0.5em] uppercase" style={{ color: accent, opacity: 0.7 }}>
            Anse Takamaka · Praslin · Seychelles
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#16140f', borderTop: `1px solid ${accent}1f` }} className="py-10 text-center">
        <p className="font-display font-light tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>
          RAFFLES PRASLIN · SEYCHELLES
        </p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.1)', letterSpacing: '0.12em' }}>
          © {new Date().getFullYear()} Raffles Hotels & Resorts. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
