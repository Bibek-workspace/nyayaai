'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

import { useAuthStore } from '@/lib/auth-store';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});
type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: 'Judge', email: 'judge@nyayaai.in' },
  { label: 'Lawyer', email: 'lawyer@nyayaai.in' },
  { label: 'Admin', email: 'admin@nyayaai.in' },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginForm) {
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome, ${user.full_name}`);
      router.push('/dashboard');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.detail || 'Login failed'
        : 'Network error';
      toast.error(msg);
    }
  }

  function fillDemo(email: string) {
    setValue('email', email);
    setValue('password', 'Demo@1234');
  }

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="text-center mb-8">
        <div className="text-xs font-mono tracking-[0.4em] text-gold/70 mb-3">
          SECURE ACCESS
        </div>
        <h1 className="font-display text-4xl font-bold text-ivory mb-2">Sign In</h1>
        <p className="text-ivory/60 text-sm">Access your NyayaAI dashboard</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="nyaya-card p-8 space-y-5">
        <div>
          <label className="nyaya-label">Email Address</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="official@court.gov.in"
            className="nyaya-input"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-danger text-xs mt-1.5">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="nyaya-label">Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="nyaya-input pr-12"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ivory/50 hover:text-gold p-1"
              tabIndex={-1}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-danger text-xs mt-1.5">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="nyaya-btn-primary w-full flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign In to NyayaAI →'
          )}
        </button>

        <div className="pt-4 border-t border-gold/10">
          <p className="text-[10px] font-mono tracking-widest text-ivory/40 mb-2">
            DEMO ACCOUNTS
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fillDemo(a.email)}
                className="text-xs px-2.5 py-1 rounded border border-gold/20 text-gold/80 hover:border-gold hover:text-gold transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      <p className="text-center text-sm text-ivory/60 mt-6">
        New to NyayaAI?{' '}
        <Link href="/auth/register" className="text-gold hover:text-gold-2 transition-colors">
          Create an account →
        </Link>
      </p>
    </div>
  );
}
