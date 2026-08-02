'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import type { UserRole } from '@/types';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [hydrated, user, allowedRoles, router]);

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }
  return <>{children}</>;
}
