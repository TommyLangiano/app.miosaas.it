'use client';

import MainLayout from '../../src/layout/MainLayout';
import AuthGuard from '../../src/utils/route-guard/AuthGuard';
import type { FC, ReactNode } from 'react';

export default function CommesseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const Guard = AuthGuard as unknown as FC<{ children: ReactNode }>; // tipizza il componente JS
  return (
    <Guard>
      <MainLayout>{children}</MainLayout>
    </Guard>
  );
}

