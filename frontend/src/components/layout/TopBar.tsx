'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, LogOut, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth-store';
import { notificationApi } from '@/lib/api';
import { roleIcons, relativeTime, cn } from '@/lib/utils';

function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  return (
    <nav className="flex items-center gap-1.5 text-xs font-mono tracking-wider text-ivory/50">
      {parts.map((part, i) => {
        const href = '/' + parts.slice(0, i + 1).join('/');
        const last = i === parts.length - 1;
        return (
          <span key={href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} />}
            <Link
              href={href}
              className={cn(
                'uppercase transition-colors',
                last ? 'text-gold' : 'hover:text-ivory',
              )}
            >
              {decodeURIComponent(part).replace(/-/g, ' ')}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

function NotificationsDropdown() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list(),
    refetchInterval: 60_000,
  });

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function markAllRead() {
    await notificationApi.markAllRead();
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-md hover:bg-gold/10 text-ivory/70 hover:text-gold transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 nyaya-card shadow-premium z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gold/10 flex items-center justify-between">
            <span className="text-xs font-mono tracking-widest text-gold">NOTIFICATIONS</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-ivory/50 hover:text-gold">
                Mark all read
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ivory/40">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'px-4 py-3 border-b border-gold/5 hover:bg-navy/40 transition-colors',
                    !n.read && 'bg-gold/5',
                  )}
                >
                  <div className="text-sm font-medium text-ivory">{n.title}</div>
                  <div className="text-xs text-ivory/60 mt-0.5 line-clamp-2">{n.body}</div>
                  <div className="text-[10px] font-mono text-ivory/40 mt-1">
                    {relativeTime(n.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gold/20 hover:border-gold/50 transition-colors"
      >
        <span className="text-lg leading-none">{roleIcons[user.role]}</span>
        <span className="text-sm font-medium text-ivory hidden sm:inline">
          {user.full_name.split(' ')[0]}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 nyaya-card shadow-premium z-50">
          <div className="px-4 py-3 border-b border-gold/10">
            <div className="text-sm font-medium text-ivory truncate">{user.full_name}</div>
            <div className="text-xs text-ivory/50 truncate">{user.email}</div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 h-16 bg-navy-2/60 backdrop-blur-md border-b border-gold/10 px-6 flex items-center justify-between">
      <Breadcrumbs />
      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        <UserMenu />
      </div>
    </header>
  );
}
