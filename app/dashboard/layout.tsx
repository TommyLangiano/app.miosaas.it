'use client';

import { Box } from '@mui/material';

// ==============================|| DASHBOARD LAYOUT SEMPLIFICATO ||============================== //

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', p: 3 }}>
      {children}
    </Box>
  );
}