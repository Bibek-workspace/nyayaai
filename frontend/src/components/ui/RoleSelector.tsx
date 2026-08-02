'use client';

import type { UserRole } from '@/types';
import { roleIcons, roleLabels, cn } from '@/lib/utils';

const ROLES: UserRole[] = ['judge', 'lawyer', 'litigant', 'clerk', 'prosecutor', 'admin'];

interface Props {
  value: UserRole;
  onChange: (r: UserRole) => void;
}

export function RoleSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ROLES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            'flex flex-col items-center gap-1 py-3 rounded-md border transition-all',
            value === r
              ? 'border-gold bg-gold/10 text-gold shadow-gold'
              : 'border-gold/15 bg-navy/40 text-ivory/70 hover:border-gold/40 hover:text-ivory',
          )}
        >
          <span className="text-2xl leading-none">{roleIcons[r]}</span>
          <span className="text-[10px] font-mono tracking-wider uppercase">{roleLabels[r]}</span>
        </button>
      ))}
    </div>
  );
}
