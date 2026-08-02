'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';

export default function HomePage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && user) router.replace('/dashboard');
  }, [hydrated, user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-3xl animate-fade-up">
        <div className="mb-6 text-xs font-mono tracking-[0.4em] text-gold/70">
          AI · JUDICIARY · INDIA
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-bold mb-6">
          <span className="text-gold">Nyaya</span>
          <span className="text-ivory">AI</span>
        </h1>
        <p className="text-ivory/70 text-lg md:text-xl mb-10 leading-relaxed">
          AI-powered case management for the Indian judicial system.
          Built to reduce the pendency of 5 crore cases — one judgment at a time.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/auth/login" className="nyaya-btn-primary">
            Sign In
          </Link>
          <Link href="/auth/register" className="nyaya-btn-secondary">
            Create Account →
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-4 text-sm font-mono">
          <div className="nyaya-card p-4">
            <div className="text-gold text-2xl font-bold">9</div>
            <div className="text-ivory/60 text-xs mt-1">Case States</div>
          </div>
          <div className="nyaya-card p-4">
            <div className="text-gold text-2xl font-bold">6</div>
            <div className="text-ivory/60 text-xs mt-1">User Roles</div>
          </div>
          <div className="nyaya-card p-4">
            <div className="text-gold text-2xl font-bold">RAG</div>
            <div className="text-ivory/60 text-xs mt-1">Precedent AI</div>
          </div>
        </div>
      </div>
    </div>
  );
}
