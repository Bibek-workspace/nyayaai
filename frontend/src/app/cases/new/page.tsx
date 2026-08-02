'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { caseApi } from '@/lib/api';
import type { CaseCategory } from '@/types';

const schema = z.object({
  title: z.string().min(5, 'At least 5 characters'),
  description: z.string().optional(),
  category: z.enum([
    'civil', 'criminal', 'family', 'constitutional',
    'commercial', 'labour', 'tax', 'other',
  ]),
  filed_on: z.string().min(1, 'Required'),
  court_name: z.string().min(2, 'Required'),
  jurisdiction: z.string().optional(),
});
type Form = z.infer<typeof schema>;

const CATEGORIES: CaseCategory[] = [
  'civil', 'criminal', 'family', 'constitutional',
  'commercial', 'labour', 'tax', 'other',
];

export default function NewCasePage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      filed_on: new Date().toISOString().split('T')[0],
      category: 'civil',
    },
  });

  async function onSubmit(values: Form) {
    try {
      const created = await caseApi.create(values as any);
      toast.success(`Case ${created.case_number} filed`);
      router.push(`/cases/${created.id}`);
    } catch (err) {
      toast.error(
        axios.isAxiosError(err) ? err.response?.data?.detail || 'Failed to create' : 'Network error',
      );
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto animate-fade-up">
        <div className="mb-6">
          <div className="text-xs font-mono tracking-widest text-gold/70 mb-2">NEW FILING</div>
          <h1 className="font-display text-4xl font-bold text-ivory">File a Case</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="nyaya-card p-7 space-y-5">
          <div>
            <label className="nyaya-label">Case Title</label>
            <input className="nyaya-input" placeholder="e.g. Sharma vs. State of Maharashtra" {...register('title')} />
            {errors.title && <p className="text-danger text-xs mt-1.5">{errors.title.message}</p>}
          </div>

          <div>
            <label className="nyaya-label">Description</label>
            <textarea
              className="nyaya-input min-h-[100px] resize-y"
              placeholder="Brief description of the matter…"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="nyaya-label">Category</label>
              <select className="nyaya-input" {...register('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="nyaya-label">Filed On</label>
              <input type="date" className="nyaya-input" {...register('filed_on')} />
              {errors.filed_on && <p className="text-danger text-xs mt-1.5">{errors.filed_on.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="nyaya-label">Court Name</label>
              <input className="nyaya-input" placeholder="e.g. Bombay High Court" {...register('court_name')} />
              {errors.court_name && <p className="text-danger text-xs mt-1.5">{errors.court_name.message}</p>}
            </div>
            <div>
              <label className="nyaya-label">Jurisdiction</label>
              <input className="nyaya-input" placeholder="e.g. Mumbai" {...register('jurisdiction')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => router.back()} className="nyaya-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="nyaya-btn-primary flex items-center gap-2">
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Filing…</> : 'File Case →'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
