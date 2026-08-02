'use client';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ProtectedRoute } from './ProtectedRoute';
import type { UserRole } from '@/types';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function DashboardLayout({ children, allowedRoles }: Props) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
