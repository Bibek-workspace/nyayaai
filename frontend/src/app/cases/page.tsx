'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { caseApi } from '@/lib/api';
import { formatDate, statusLabels } from '@/lib/utils';
import type { CaseStatus } from '@/types';

const STATUSES: CaseStatus[] = [
  'filed', 'registered', 'notice_issued', 'pleadings', 'evidence',
  'arguments', 'judgment_reserved', 'disposed', 'appealed',
];

export default function CasesPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<CaseStatus | ''>('');

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases', { q, status }],
    queryFn: () =>
      caseApi.list({
        q: q || undefined,
        status: (status || undefined) as CaseStatus | undefined,
      }),
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-4xl font-bold text-ivory">Cases</h1>
            <p className="text-ivory/60 text-sm mt-1">
              {cases.length} {cases.length === 1 ? 'case' : 'cases'} found
            </p>
          </div>
          <Link href="/cases/new" className="nyaya-btn-primary flex items-center gap-2">
            <Plus size={16} />
            File New Case
          </Link>
        </div>

        <div className="nyaya-card p-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory/40"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or case number…"
              className="nyaya-input pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CaseStatus | '')}
            className="nyaya-input w-auto min-w-[180px]"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="nyaya-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gold/15 bg-navy/40">
              <tr>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-gold/80">
                  CASE NUMBER
                </th>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-gold/80">
                  TITLE
                </th>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-gold/80">
                  CATEGORY
                </th>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-gold/80">
                  FILED
                </th>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-gold/80">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-16 text-center text-ivory/40">Loading cases…</td></tr>
              ) : cases.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-ivory/40">No cases found</td></tr>
              ) : (
                cases.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gold/5 hover:bg-navy/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <Link href={`/cases/${c.id}`} className="font-mono text-xs text-gold">
                        {c.case_number}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/cases/${c.id}`} className="text-sm text-ivory">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs uppercase tracking-wider text-ivory/60">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-ivory/60">
                      {formatDate(c.filed_on)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
