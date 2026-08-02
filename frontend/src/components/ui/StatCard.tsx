import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'gold' | 'accent' | 'info' | 'success';
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, tone = 'gold', hint }: Props) {
  const toneClass = {
    gold: 'text-gold border-gold/20',
    accent: 'text-accent border-accent/30',
    info: 'text-info border-info/30',
    success: 'text-success border-success/30',
  }[tone];

  return (
    <div className={cn('nyaya-card p-5 transition-all hover:border-opacity-50', toneClass)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-ivory/50 uppercase mb-2">
            {label}
          </div>
          <div className={cn('font-display text-3xl font-bold', `text-${tone}`)}>{value}</div>
          {hint && <div className="text-xs text-ivory/50 mt-1.5">{hint}</div>}
        </div>
        <Icon size={20} className="opacity-50" />
      </div>
    </div>
  );
}
