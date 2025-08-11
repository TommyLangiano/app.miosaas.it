"use client";
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MainCardDefault from '../../src/ui-component/cards/MainCard';
import type { SxProps, Theme } from '@mui/material/styles';

// Tipizzazione per MainCard compatibile con TS
type MainCardProps = { title?: React.ReactNode; children?: React.ReactNode; headerSX?: SxProps<Theme>; contentSX?: SxProps<Theme>; [key: string]: unknown };
const MainCard = MainCardDefault as unknown as React.ComponentType<MainCardProps>;

export default function GestioneCommessaPage() {
  return (
    <MainCard title="Gestione Commessa" contentSX={{ pt: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="body1" color="text.secondary">
          Pagina in costruzione. Usa i breadcrumbs in alto per tornare indietro.
        </Typography>
      </Stack>
    </MainCard>
  );
}


