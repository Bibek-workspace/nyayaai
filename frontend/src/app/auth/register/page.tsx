'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

import { useAuthStore } from '@/lib/auth-store';
import { RoleSelector } from '@/components/ui/RoleSelector';
import type { UserRole } from '@/types';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\+?[0-9\s-]{10,15}$/, 'Invalid phone').optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a digit'),
  confirm: z.string(),
  bar_council_id: z.string().optional(),
  court_id: z.string().optional(),
  designation: z.string().optional(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const [role, setRole] = useState<UserRole>('lawyer');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterForm) {
    try {
      const user = await registerUser({
        full_name: values.full_name,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
        role,
        bar_council_id: values.bar_council_id || undefined,
        court_id: values.court_id || undefined,
        designation: values.designation || undefined,
      });
      toast.success(`Welcome aboard, ${user.full_name}`);
      router.push('/dashboard');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.detail || 'Registration failed'
        : 'Network error';
      toast.error(msg);
    }
  }

  return (
    <div className="w-full max-w-lg animate-fade-up">
      <div className="text-center mb-6">
        <div className="text-xs font-mono tracking-[0.4em] text-gold/70 mb-3">
          JOIN NYAYAAI
        </div>
        <h1 className="font-display text-4xl font-bold text-ivory mb-2">Create Account</h1>
        <p className="text-ivory/60 text-sm">Select your role to begin</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="nyaya-card p-7 space-y-5">
        <div>
          <label className="nyaya-label">Your Role</label>
          <RoleSelector value={role} onChange={setRole} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="nyaya-label">Full Name</label>
            <input className="nyaya-input" placeholder="Your full name" {...register('full_name')} />
            {errors.full_name && <p className="text-danger text-xs mt-1.5">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="nyaya-label">Phone</label>
            <input className="nyaya-input" placeholder="+91 XXXXX XXXXX" {...register('phone')} />
            {errors.phone && <p className="text-danger text-xs mt-1.5">{errors.phone.message}</p>}
          </div>
        </div>

        <div>
          <label className="nyaya-label">Email</label>
          <input className="nyaya-input" placeholder="you@example.in" type="email" {...register('email')} />
          {errors.email && <p className="text-danger text-xs mt-1.5">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="nyaya-label">Password</label>
            <input className="nyaya-input" type="password" placeholder="Min 8 chars" {...register('password')} />
            {errors.password && <p className="text-danger text-xs mt-1.5">{errors.password.message}</p>}
          </div>
          <div>
            <label className="nyaya-label">Confirm Password</label>
            <input className="nyaya-input" type="password" placeholder="Re-enter" {...register('confirm')} />
            {errors.confirm && <p className="text-danger text-xs mt-1.5">{errors.confirm.message}</p>}
          </div>
        </div>

        {/* Role-specific fields */}
        {role === 'lawyer' && (
          <div>
            <label className="nyaya-label">Bar Council ID</label>
            <input className="nyaya-input" placeholder="e.g. MH/12345/2019" {...register('bar_council_id')} />
          </div>
        )}
        {(role === 'judge' || role === 'clerk') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="nyaya-label">Court ID</label>
              <input className="nyaya-input" placeholder="e.g. DEL-HC-04" {...register('court_id')} />
            </div>
            <div>
              <label className="nyaya-label">Designation</label>
              <input className="nyaya-input" placeholder="e.g. Senior Judge" {...register('designation')} />
            </div>
          </div>
        )}
        {role === 'prosecutor' && (
          <div>
            <label className="nyaya-label">Designation</label>
            <input className="nyaya-input" placeholder="e.g. Public Prosecutor" {...register('designation')} />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="nyaya-btn-primary w-full flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Creating account…
            </>
          ) : (
            'Create Account →'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-ivory/60 mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-gold hover:text-gold-2 transition-colors">
          Sign in →
        </Link>
      </p>
    </div>
  );
}
