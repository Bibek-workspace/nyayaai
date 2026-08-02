import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-8 py-6 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-bold">
          <span className="text-gold">Nyaya</span>
          <span className="text-ivory">AI</span>
        </Link>
        <Link
          href="/"
          className="text-xs font-mono tracking-widest text-ivory/50 hover:text-gold transition-colors"
        >
          ← BACK
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        {children}
      </main>
      <footer className="px-8 py-6 text-center text-xs text-ivory/40 font-mono tracking-wider">
        © 2026 NyayaAI · Built for the Indian Judiciary
      </footer>
    </div>
  );
}
