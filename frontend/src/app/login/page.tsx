'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-charcoal-950 flex-col items-center justify-center p-12 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=80"
          alt="Seychelles"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative text-center text-white">
          <p className="text-xs tracking-[0.5em] uppercase text-gold-400 mb-6">Staff Portal</p>
          <h1 className="font-display text-5xl font-light tracking-wide mb-4">Raffles Praslin</h1>
          <div className="gold-divider mb-6" />
          <p className="text-white/60 text-sm tracking-wide">Concierge Management System</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#fafaf8]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <Link href="/" className="lg:hidden font-display text-2xl font-light text-charcoal-900 block mb-2">Raffles Praslin</Link>
            <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-3">Staff Login</p>
            <h2 className="font-display text-3xl font-light text-charcoal-900">Welcome Back</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-charcoal-100 text-center">
            <Link href="/" className="text-xs tracking-widest uppercase text-charcoal-400 hover:text-charcoal-900 transition-colors">
              ← Back to Guest Site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
