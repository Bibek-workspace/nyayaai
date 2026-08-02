'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Calendar, Bell, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { dashboardApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate, formatDateTime, statusLabels } from '@/lib/utils';
import type { CaseStatus } from '@/types';

const STATUS_COLORS = [
  '#2980b9', '#2980b9', '#c9a84c', '#c9a84c',
  '#e8c96a', '#1abc9c', '#1abc9c', '#27ae60', '#c0392b',
];

const CATEGORY_COLORS = ['#c9a84c', '#1abc9c', '#2980b9', '#e8c96a', '#27ae60', '#c0392b', '#f5e0a0', '#7f8c8d'];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.fetch,
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-4xl font-bold">
              Welcome, <span className="text-gold">{user?.full_name.split(' ')[0]}</span>
            </h1>
            <p className="text-ivory/60 text-sm mt-1">
              Here's what's happening in your case portfolio.
            </p>
          </div>
          <Link href="/cases/new" className="nyaya-btn-primary">
            + File New Case
          </Link>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Cases"
            value={isLoading ? '—' : data?.total_cases ?? 0}
            icon={Briefcase}
            tone="gold"
          />
          <StatCard
            label="Upcoming Hearings"
            value={isLoading ? '—' : data?.upcoming_hearings_count ?? 0}
            icon={Calendar}
            tone="accent"
            hint="Next 30 days"
          />
          <StatCard
            label="Disposed"
            value={isLoading ? '—' : data?.cases_by_status?.disposed ?? 0}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="Unread Notifications"
            value={isLoading ? '—' : data?.unread_notifications ?? 0}
            icon={Bell}
            tone="info"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="nyaya-card p-5">
            <div className="text-xs font-mono tracking-widest text-gold mb-4">CASES BY STATUS</div>
            {isLoading || !data?.cases_by_status ? (
              <div className="h-64 flex items-center justify-center text-ivory/40">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={Object.entries(data.cases_by_status).map(([k, v]) => ({
                    name: statusLabels[k as CaseStatus] ?? k,
                    count: v,
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 50 }}
                >
                  <XAxis
                    dataKey="name"
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    tick={{ fill: '#f5f0e8', fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: '#f5f0e8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f1729',
                      border: '1px solid rgba(201,168,76,0.3)',
                      borderRadius: 4,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {Object.keys(data.cases_by_status).map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="nyaya-card p-5">
            <div className="text-xs font-mono tracking-widest text-gold mb-4">CASES BY CATEGORY</div>
            {isLoading || !data?.cases_by_category ? (
              <div className="h-64 flex items-center justify-center text-ivory/40">Loading…</div>
            ) : Object.keys(data.cases_by_category).length === 0 ? (
              <div className="h-64 flex items-center justify-center text-ivory/40">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={Object.entries(data.cases_by_category).map(([k, v]) => ({
                      name: k,
                      value: v,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {Object.keys(data.cases_by_category).map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0f1729',
                      border: '1px solid rgba(201,168,76,0.3)',
                      borderRadius: 4,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent cases + hearings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="nyaya-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono tracking-widest text-gold">RECENT CASES</div>
              <Link href="/cases" className="text-xs text-ivory/60 hover:text-gold">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gold/5">
              {data?.recent_cases.length ? (
                data.recent_cases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-start justify-between py-3 hover:bg-navy/40 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ivory truncate">{c.title}</div>
                      <div className="text-xs font-mono text-ivory/40 mt-0.5">
                        {c.case_number} · {formatDate(c.filed_on)}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                ))
              ) : (
                <div className="py-10 text-center text-sm text-ivory/40">No cases yet</div>
              )}
            </div>
          </div>

          <div className="nyaya-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono tracking-widest text-gold">UPCOMING HEARINGS</div>
              <Link href="/schedule" className="text-xs text-ivory/60 hover:text-gold">
                Calendar →
              </Link>
            </div>
            <div className="divide-y divide-gold/5">
              {data?.upcoming_hearings.length ? (
                data.upcoming_hearings.map((h) => (
                  <div key={h.id} className="py-3">
                    <div className="text-sm font-medium text-ivory">{h.purpose}</div>
                    <div className="text-xs text-ivory/60 mt-0.5">
                      {formatDateTime(h.scheduled_at)}
                      {h.courtroom && ` · ${h.courtroom}`}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm text-ivory/40">
                  Nothing scheduled in the next 30 days
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
