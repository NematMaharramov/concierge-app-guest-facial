'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getCategories, getSettings } from '@/lib/api';
import Link from 'next/link';

// ── Per-category image sets (3 images each, no broken URLs) ─────────────────
const CATEGORY_IMAGES: Record<string, string[]> = {
  'taxi-transfers': [
    'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=90',
    'https://images.unsplash.com/photo-1590556409324-aa1d726e5c3c?w=1200&q=90',
    'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=1200&q=90',
  ],
  'boat-excursions': [
    'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=1200&q=90',
    'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200&q=90',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=90',
  ],
  'catamaran': [
    'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=1200&q=90',
    'https://images.unsplash.com/photo-1599640842225-85d111c60e6b?w=1200&q=90',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=90',
  ],
  'car-rental': [
    'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=1200&q=90',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&q=90',
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1200&q=90',
  ],
  'golf': [
    'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=1200&q=90',
    'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&q=90',
    'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=1200&q=90',
  ],
  'helicopter': [
    'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=90',
    'https://images.unsplash.com/photo-1608236415053-8c3e0a1cb1e9?w=1200&q=90',
    'https://images.unsplash.com/photo-1557800634-7d5f1e5e0af4?w=1200&q=90',
  ],
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&q=90',
];

const CATEGORY_LABEL: Record<string, string> = {
  'taxi-transfers': 'Island Transfers',
  'boat-excursions': 'Ocean Escapes',
  'catamaran': 'Private Charters',
  'car-rental': 'Self Discovery',
  'golf': 'Golf & Leisure',
  'helicopter': 'Aerial Journeys',
};

// ── Category card carousel ───────────────────────────────────────────────────
// Uses useRef for the interval so the component is stable across renders.
function CategoryCarousel({ slug, categoryName }: { slug: string; categoryName: string }) {
  const images = CATEGORY_IMAGES[slug] ?? FALLBACK_IMAGES;
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Stagger start time per slug so cards don't all flip simultaneously
    const stagger = (slug.length * 317) % 1200;
    const timer = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setCurrent(c => (c + 1) % images.length);
      }, 4000);
    }, stagger);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images.length, slug]);

  return (
    <div className="absolute inset-0">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={categoryName}
          loading={i === 0 ? 'eager' : 'lazy'}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0, willChange: 'opacity' }}
        />
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // ── Header scroll state ──────────────────────────────────────────────────
  // headerVisible drives the CSS transform. We keep lastScrollY in a ref
  // (not state) so scroll events don't trigger extra renders.
  const [headerVisible, setHeaderVisible] = useState(false);
  const lastScrollYRef = useRef(0);
  const servicesRef = useRef<HTMLElement>(null);

  useEffect(() => {
    Promise.all([getCategories(), getSettings()])
      .then(([cats, sets]) => { setCategories(cats); setSettings(sets); })
      .finally(() => setLoading(false));
  }, []);

  // Apply settings-driven CSS variables for theming
  useEffect(() => {
    if (!settings.primary_color && !settings.accent_color) return;
    const root = document.documentElement;
    if (settings.primary_color) root.style.setProperty('--brand-primary', settings.primary_color);
    if (settings.accent_color) root.style.setProperty('--brand-accent', settings.accent_color);
  }, [settings.primary_color, settings.accent_color]);

  // ── Scroll handler ───────────────────────────────────────────────────────
  // Rules:
  //   • scrollY < 80            → hide (in hero)
  //   • in services section     → hide (never show over the grid)
  //   • scrolling UP, not hero  → show
  //   • scrolling DOWN          → hide
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const prev = lastScrollYRef.current;
    lastScrollYRef.current = scrollY;

    // Determine if viewport has reached the services section
    const servicesTop = servicesRef.current
      ? servicesRef.current.getBoundingClientRect().top + scrollY
      : Infinity;
    const inServicesSection = scrollY >= servicesTop - 80;

    if (scrollY < 80 || inServicesSection) {
      setHeaderVisible(false);
      return;
    }

    // Scrolling up → show; scrolling down → hide
    if (scrollY < prev) {
      setHeaderVisible(true);
    } else {
      setHeaderVisible(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const primary = settings.primary_color || '#1a1a1a';
  const accent  = settings.accent_color  || '#c9a96e';
  const accentLight = `${accent}cc`;

  // Title displayed in hero — fall back gracefully if settings not yet loaded
  const heroTitle = settings.site_title || 'Raffles Seychelles';
  const heroSubtitle = settings.site_subtitle || 'Every experience, thoughtfully arranged for you';

  return (
    <div className="min-h-screen" style={{ background: '#f2ede6' }}>

      {/* ── Fixed navigation ──────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-transform duration-500 ease-in-out"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 1px 24px rgba(0,0,0,0.07)',
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          // Keep it out of pointer events when invisible so clicks pass through
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
            className="text-[10px] tracking-[0.35em] uppercase transition-opacity hover:opacity-60"
            style={{ color: primary }}
          >
            Our Services
          </a>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={settings.hero_image || 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1920&q=90'}
            alt="Raffles Seychelles"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(10,8,5,0.35) 0%, rgba(10,8,5,0.08) 40%, rgba(10,8,5,0.60) 100%)' }}
          />
        </div>

        <div className="relative text-center text-white px-6 animate-fade-in">
          <p className="text-[10px] tracking-[0.65em] uppercase mb-8 font-light" style={{ color: accentLight }}>
            Concierge Services
          </p>
          <h1
            className="font-display font-light mb-7"
            style={{ fontSize: 'clamp(3rem, 7.5vw, 6rem)', lineHeight: 1.05, letterSpacing: '0.06em' }}
          >
            {heroTitle}
          </h1>
          <div className="flex items-center justify-center gap-5 mb-8">
            <div style={{ height: '1px', width: '50px', background: `linear-gradient(to right, transparent, ${accent})` }} />
            <div style={{ width: '5px', height: '5px', background: accent, transform: 'rotate(45deg)', flexShrink: 0 }} />
            <div style={{ height: '1px', width: '50px', background: `linear-gradient(to left, transparent, ${accent})` }} />
          </div>
          <p
            className="font-light tracking-wider text-white/75"
            style={{ fontSize: '1.05rem', maxWidth: '460px', margin: '0 auto 3.5rem', lineHeight: 1.9 }}
          >
            {heroSubtitle}
          </p>
          <a
            href="#services"
            className="inline-block text-[10px] tracking-[0.45em] uppercase transition-all duration-300 hover:bg-white hover:text-charcoal-900"
            style={{ border: '1px solid rgba(255,255,255,0.5)', color: 'white', padding: '15px 50px' }}
          >
            Discover
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
          <p className="text-white/30 text-[9px] tracking-[0.5em] uppercase">Scroll</p>
          <div className="w-px h-14 bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </section>

      {/* ── Intro band ────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 text-center bg-white">
        <p className="text-[10px] tracking-[0.55em] uppercase mb-6 font-medium" style={{ color: accent }}>
          Curated For You
        </p>
        <h2
          className="font-display font-light mb-7"
          style={{ fontSize: 'clamp(2.1rem, 4vw, 3rem)', color: primary, letterSpacing: '0.04em' }}
        >
          Extraordinary Experiences
        </h2>
        <div className="flex items-center justify-center gap-5 mb-9">
          <div style={{ height: '1px', width: '40px', background: `linear-gradient(to right, transparent, ${accent})` }} />
          <div style={{ width: '4px', height: '4px', background: accent, transform: 'rotate(45deg)', flexShrink: 0 }} />
          <div style={{ height: '1px', width: '40px', background: `linear-gradient(to left, transparent, ${accent})` }} />
        </div>
        <p className="mx-auto text-charcoal-500" style={{ maxWidth: '520px', lineHeight: 2.1, fontSize: '0.9rem' }}>
          From private island excursions to seamless helicopter transfers and championship golf,
          our concierge team curates every detail of your Seychelles stay with quiet precision.
        </p>
      </section>

      {/* ── Services grid ─────────────────────────────────────────────────── */}
      {/*
        ref={servicesRef} is what the scroll handler uses to detect when the
        user has reached this section so the header is suppressed.
      */}
      <section ref={servicesRef} id="services" className="py-24 px-6" style={{ background: '#f2ede6' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.55em] uppercase mb-4 font-medium" style={{ color: accent }}>
              Explore
            </p>
            <h2
              className="font-display font-light"
              style={{ fontSize: '2.1rem', color: primary, letterSpacing: '0.04em' }}
            >
              Our Services
            </h2>
          </div>

          {loading ? (
            // Skeleton grid — same proportions as real cards
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{ height: '360px', background: '#e0d8cc' }}
                />
              ))}
            </div>
          ) : (
            /*
              Layout: always a uniform 3-column grid with equal-height cards.
              Previously the first card was 420px and others 340px which caused
              the grid row to overflow and cards to misalign on some viewports.
              Now all cards share one height (380px on desktop, 300px on mobile)
              via CSS min-height so the grid is consistent regardless of count.
            */
            <div
              className={
                settings.layout_style === 'list'
                  ? 'grid grid-cols-1 gap-1'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1'
              }
            >
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/services/${cat.slug}`}
                  className="group relative overflow-hidden block"
                  style={{
                    minHeight: '360px',
                    // On list layout make cards shorter
                    height: settings.layout_style === 'list' ? '220px' : '360px',
                  }}
                >
                  {/* Category carousel — category images only, no service photos */}
                  <CategoryCarousel slug={cat.slug} categoryName={cat.name} />

                  {/* Base gradient for text legibility */}
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(8,6,3,0.88) 0%, rgba(8,6,3,0.05) 55%, transparent 100%)' }}
                  />
                  {/* Hover darkening overlay */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: 'rgba(8,6,3,0.18)' }}
                  />
                  {/* Accent line on top edge, reveals on hover */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                    style={{ background: accent }}
                  />

                  {/* Text content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-7 pb-8">
                    <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 ease-out">
                      <p
                        className="text-[9px] tracking-[0.5em] uppercase mb-2 font-medium"
                        style={{ color: accent }}
                      >
                        {CATEGORY_LABEL[cat.slug] || 'Experience'}
                      </p>
                      <h3
                        className="font-display font-light text-white mb-4"
                        style={{ fontSize: '1.55rem', letterSpacing: '0.04em', lineHeight: 1.2 }}
                      >
                        {cat.name}
                      </h3>
                      <div
                        className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ transitionDelay: '60ms' }}
                      >
                        <div style={{ height: '1px', width: '22px', background: accent }} />
                        <span className="text-[9px] tracking-[0.45em] uppercase" style={{ color: accent }}>
                          Explore
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Concierge strip ───────────────────────────────────────────────── */}
      {/*
        Improved readability:
        - Stronger overlay (0.78 opacity vs previous 0.72)
        - backdrop-filter blur kept
        - Text colors bumped to higher opacity
        - Subtext line-height and size improved
      */}
      <section className="relative py-28 px-6 text-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1439130490301-25e322d88054?w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Two-layer overlay for better text contrast without killing the photo */}
          <div className="absolute inset-0" style={{ background: 'rgba(8,6,3,0.62)' }} />
          <div
            className="absolute inset-0"
            style={{ backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(8,6,3,0.22)' }}
          />
        </div>

        {/* Content */}
        <div className="relative max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.55em] uppercase mb-5 font-medium" style={{ color: accent }}>
            Always Available
          </p>
          <h2
            className="font-display font-light mb-7 text-white"
            style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.6rem)', letterSpacing: '0.04em' }}
          >
            Your Personal Concierge
          </h2>
          <div className="flex items-center justify-center gap-5 mb-8">
            <div style={{ height: '1px', width: '40px', background: `linear-gradient(to right, transparent, ${accent})` }} />
            <div style={{ width: '4px', height: '4px', background: accent, transform: 'rotate(45deg)', flexShrink: 0 }} />
            <div style={{ height: '1px', width: '40px', background: `linear-gradient(to left, transparent, ${accent})` }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.88)', lineHeight: 2.0, fontSize: '0.92rem', marginBottom: '2.5rem' }}>
            Our team is available around the clock to arrange any experience,
            transfer or activity during your stay at Raffles Praslin, Seychelles.
          </p>
          <p className="text-[10px] tracking-[0.5em] uppercase" style={{ color: `${accent}cc` }}>
            Anse Takamaka · Praslin · Seychelles
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      {/*
        Was: background '#2c2820' — very dark, near-black.
        Now: '#4a4035' — warm dark brown that's noticeably brighter and more
        readable, while staying in the same warm-brown family as the brand.
        Text opacities also bumped up for legibility.
      */}
      <footer
        style={{ background: '#3d3228', borderTop: `1px solid ${accent}44` }}
        className="py-14 text-center"
      >
        <p
          className="font-display font-light tracking-[0.3em] mb-3"
          style={{ color: 'rgba(255,255,255,0.80)', fontSize: '0.95rem' }}
        >
          RAFFLES SEYCHELLES · PRASLIN
        </p>
        <div className="flex items-center justify-center gap-5 mb-5">
          <div style={{ height: '1px', width: '30px', background: `linear-gradient(to right, transparent, ${accent}99)` }} />
          <div style={{ width: '3px', height: '3px', background: accent, transform: 'rotate(45deg)', opacity: 0.75 }} />
          <div style={{ height: '1px', width: '30px', background: `linear-gradient(to left, transparent, ${accent}99)` }} />
        </div>
        <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.58)', letterSpacing: '0.08em' }}>
          Anse Takamaka, Praslin Island, Seychelles
        </p>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)', letterSpacing: '0.12em' }}>
          © {new Date().getFullYear()} Raffles Hotels & Resorts. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
