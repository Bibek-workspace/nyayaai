import { cn, statusColors, statusLabels } from '@/lib/utils';
import type { CaseStatus } from '@/types';

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={cn('badge border', statusColors[status])}>
      {statusLabels[status]}
    </span>
  );
}
