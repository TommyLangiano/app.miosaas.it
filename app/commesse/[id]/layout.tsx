'use client';

import AuthGuard from '../../../src/utils/route-guard/AuthGuard';
import type { FC, ReactNode } from 'react';

export default function CommessaDettaglioLayout({ children }: { children: ReactNode }) {
  const Guard = AuthGuard as unknown as FC<{ children: ReactNode }>;
  return <Guard>{children}</Guard>;
}


