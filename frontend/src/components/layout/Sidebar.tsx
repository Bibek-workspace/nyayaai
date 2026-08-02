'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Search,
  FileText,
  Users,
  ChevronLeft,
  Scale,
} from 'lucide-react';

import { useAuthStore } from '@/lib/auth-store';
import type { UserRole } from '@/types';
import { cn, roleLabels } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[]; // omit = all
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cases', label: 'Cases', icon: Briefcase },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/ai-search', label: 'AI Search', icon: Search },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/admin', label: 'Admin', icon: Users, roles: ['admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const visible = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen flex flex-col border-r border-gold/15 bg-navy-2/40 backdrop-blur-md transition-all',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="h-16 flex items-center justify-between px-5 border-b border-gold/10">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <Scale className="text-gold flex-shrink-0" size={22} />
          {!collapsed && (
            <span className="font-display text-xl font-bold whitespace-nowrap">
              <span className="text-gold">Nyaya</span>
              <span className="text-ivory">AI</span>
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-ivory/40 hover:text-gold transition-colors p-1"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            size={18}
            className={cn('transition-transform', collapsed && 'rotate-180')}
          />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {visible.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all relative group',
                isActive
                  ? 'bg-gold/10 text-gold'
                  : 'text-ivory/60 hover:text-ivory hover:bg-navy/40',
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gold rounded-r" />
              )}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-5 py-4 border-t border-gold/10">
          <div className="text-[10px] font-mono tracking-widest text-ivory/40 mb-1">
            SIGNED IN AS
          </div>
          <div className="text-sm font-medium text-ivory truncate">{user.full_name}</div>
          <div className="text-xs text-gold/80 mt-0.5">{roleLabels[user.role]}</div>
        </div>
      )}
    </aside>
  );
}
