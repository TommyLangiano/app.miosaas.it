'use client';

import MainLayout from '../../src/layout/MainLayout';
import AuthGuard from '../../src/utils/route-guard/AuthGuard';

// ==============================|| DASHBOARD LAYOUT SEMPLIFICATO ||============================== //

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <MainLayout>{children}</MainLayout>
    </AuthGuard>
  );
}