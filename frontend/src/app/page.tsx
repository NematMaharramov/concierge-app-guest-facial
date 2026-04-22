'use client';
import { useEffect, useState } from 'react';
import { getCategories, getSettings } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

const CATEGORY_BG: Record<string, string> = {
  'taxi-transfers': 'https://images.unsplash.com/photo-1549294413-26f195200c16?w=800&q=80',
  'boat-excursions': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
  'catamaran': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
  'car-rental': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
  'golf': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80',
  'helicopter': 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80',
};

export default function HomePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCategories(), getSettings()])
      .then(([cats, sets]) => { setCategories(cats); setSettings(sets); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-charcoal-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-display text-xl font-light tracking-[0.15em] text-charcoal-900">RAFFLES PRASLIN</p>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold-500 font-medium">Concierge Services</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="#services" className="text-xs tracking-widest uppercase text-charcoal-600 hover:text-charcoal-900 transition-colors">Services</a>
            <Link href="/login" className="text-xs tracking-widest uppercase text-charcoal-600 hover:text-charcoal-900 transition-colors">Staff Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-charcoal-950">
          {settings.hero_image ? (
            <img src={settings.hero_image} alt="Hero" className="w-full h-full object-cover opacity-50" />
          ) : (
            <img
              src="https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=1920&q=85"
              alt="Seychelles"
              className="w-full h-full object-cover opacity-45"
            />
          )}
        </div>
        <div className="relative text-center text-white px-6 animate-fade-in">
          <p className="text-xs tracking-[0.5em] uppercase text-gold-400 mb-6 font-medium">Welcome to</p>
          <h1 className="font-display text-5xl md:text-7xl font-light tracking-wide mb-4">
            {settings.site_title || 'Raffles Praslin'}
          </h1>
          <div className="gold-divider mb-6" />
          <p className="text-lg md:text-xl font-light tracking-wide text-white/80 max-w-xl mx-auto">
            {settings.site_subtitle || 'Curated experiences for every moment in Seychelles'}
          </p>
          <a href="#services" className="mt-10 inline-block border border-white/60 text-white px-10 py-3 text-xs tracking-[0.3em] uppercase hover:bg-white hover:text-charcoal-900 transition-all duration-300">
            Explore Services
          </a>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Intro */}
      <section className="py-20 px-6 text-center bg-white">
        <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-4 font-medium">Our Services</p>
        <h2 className="font-display text-4xl font-light text-charcoal-900 mb-4">Extraordinary Experiences</h2>
        <div className="gold-divider mb-6" />
        <p className="text-charcoal-500 max-w-xl mx-auto text-sm leading-relaxed">
          From private island excursions to seamless helicopter transfers, our concierge team curates every detail of your Seychelles stay.
        </p>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-16 px-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 bg-charcoal-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className={`grid gap-6 ${settings.layout_style === 'list' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {categories.map((cat) => (
              <Link key={cat.id} href={`/services/${cat.slug}`} className="group block overflow-hidden card animate-slide-up">
                <div className="relative h-52 overflow-hidden bg-charcoal-100">
                  <img
                    src={CATEGORY_BG[cat.slug] || 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800&q=80'}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <p className="text-2xl mb-1">{cat.icon}</p>
                    <h3 className="font-display text-2xl font-light tracking-wide">{cat.name}</h3>
                  </div>
                </div>
                <div className="p-5 flex items-center justify-between">
                  <p className="text-charcoal-500 text-sm leading-relaxed line-clamp-2">{cat.description}</p>
                  <svg className="w-5 h-5 text-gold-500 flex-shrink-0 ml-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-charcoal-950 text-white/60 py-12 text-center">
        <p className="font-display text-2xl font-light text-white mb-2 tracking-wide">Raffles Praslin</p>
        <div className="gold-divider mb-4" />
        <p className="text-xs tracking-widest uppercase">Anse Takamaka, Praslin, Seychelles</p>
        <p className="text-xs mt-6 text-white/30">© {new Date().getFullYear()} Raffles Hotels & Resorts. All rights reserved.</p>
      </footer>
    </div>
  );
}
