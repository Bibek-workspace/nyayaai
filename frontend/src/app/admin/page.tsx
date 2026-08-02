'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Briefcase, Calendar, FileText, Shield, ShieldCheck, Power } from 'lucide-react';
import toast from 'react-hot-toast';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { adminApi } from '@/lib/api';
import { roleIcons, roleLabels, cn, formatDate } from '@/lib/utils';
import type { UserRole } from '@/types';

export default function AdminPage() {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');

  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminApi.analytics,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => adminApi.listUsers((roleFilter || undefined) as UserRole | undefined),
  });

  const toggleActive = useMutation({
    mutationFn: adminApi.toggleActive,
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const verify = useMutation({
    mutationFn: adminApi.verify,
    onSuccess: () => {
      toast.success('User verified');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        <div>
          <div className="text-xs font-mono tracking-widest text-gold/70 mb-2">SYSTEM ADMIN</div>
          <h1 className="font-display text-4xl font-bold text-ivory">Admin Panel</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={analytics?.users?.total ?? '—'} icon={Users} tone="gold" />
          <StatCard label="Total Cases" value={analytics?.cases?.total ?? '—'} icon={Briefcase} tone="info" />
          <StatCard label="Pending" value={analytics?.cases?.pending ?? '—'} icon={Calendar} tone="accent" />
          <StatCard label="Documents" value={analytics?.documents?.total ?? '—'} icon={FileText} tone="success" />
        </div>

        {analytics?.users?.by_role && (
          <div className="nyaya-card p-5">
            <div className="text-xs font-mono tracking-widest text-gold mb-4">USERS BY ROLE</div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {(Object.entries(analytics.users.by_role) as [UserRole, number][]).map(([role, count]) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={cn(
                    'p-3 rounded border text-center transition-all',
                    roleFilter === role
                      ? 'border-gold bg-gold/10'
                      : 'border-gold/15 hover:border-gold/40',
                  )}
                >
                  <div className="text-xl">{roleIcons[role]}</div>
                  <div className="text-sm font-medium text-ivory mt-1">{count}</div>
                  <div className="text-[10px] font-mono text-ivory/40 uppercase">{roleLabels[role]}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="nyaya-card overflow-hidden">
          <div className="px-5 py-3 border-b border-gold/15 flex items-center justify-between">
            <div className="text-xs font-mono tracking-widest text-gold">
              USERS {roleFilter && `· ${roleLabels[roleFilter as UserRole]}`}
            </div>
            {roleFilter && (
              <button onClick={() => setRoleFilter('')} className="text-xs text-ivory/60 hover:text-gold">
                Clear filter
              </button>
            )}
          </div>
          <table className="w-full">
            <thead className="bg-navy/40">
              <tr>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-gold/80">USER</th>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-gold/80">ROLE</th>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-gold/80">STATUS</th>
                <th className="text-left px-5 py-3 text-[10px] font-mono tracking-widest text-gold/80">JOINED</th>
                <th className="text-right px-5 py-3 text-[10px] font-mono tracking-widest text-gold/80">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-ivory/40">No users</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gold/5">
                    <td className="px-5 py-3">
                      <div className="text-sm text-ivory">{u.full_name}</div>
                      <div className="text-xs text-ivory/50">{u.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs uppercase tracking-wider text-ivory/70">
                        {roleIcons[u.role]} {roleLabels[u.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'badge border',
                          u.is_active ? 'border-success/30 text-success' : 'border-danger/30 text-danger',
                        )}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                        {u.is_verified && (
                          <span className="badge border border-gold/30 text-gold">Verified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-ivory/50">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!u.is_verified && (
                          <button
                            onClick={() => verify.mutate(u.id)}
                            className="text-xs px-2 py-1 rounded border border-gold/30 text-gold hover:bg-gold/10 flex items-center gap-1"
                          >
                            <ShieldCheck size={12} /> Verify
                          </button>
                        )}
                        <button
                          onClick={() => toggleActive.mutate(u.id)}
                          className={cn(
                            'text-xs px-2 py-1 rounded border flex items-center gap-1',
                            u.is_active
                              ? 'border-danger/30 text-danger hover:bg-danger/10'
                              : 'border-success/30 text-success hover:bg-success/10',
                          )}
                        >
                          <Power size={12} /> {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
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
