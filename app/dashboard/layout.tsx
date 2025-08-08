'use client';

import MainLayout from '../../src/layout/MainLayout';
import AuthGuard from '../../src/utils/route-guard/AuthGuard';
import type { FC, ReactNode } from 'react';

// ==============================|| DASHBOARD LAYOUT SEMPLIFICATO ||============================== //

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const Guard = AuthGuard as unknown as FC<{ children: ReactNode }>;
  return (
    <Guard>
      <MainLayout>{children}</MainLayout>
    </Guard>
  );
}