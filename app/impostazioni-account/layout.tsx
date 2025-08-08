'use client';

import MainLayout from '../../src/layout/MainLayout';
import AuthGuard from '../../src/utils/route-guard/AuthGuard';

export default function ImpostazioniAccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <MainLayout>{children}</MainLayout>
    </AuthGuard>
  );
}

