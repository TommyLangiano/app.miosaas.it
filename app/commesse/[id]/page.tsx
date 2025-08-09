"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from '../../../src/utils/axios';
// Breadcrumb personalizzato rimosso: usiamo quello globale del MainLayout
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { IconBriefcase } from '@tabler/icons-react';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MainCardDefault from '../../../src/ui-component/cards/MainCard';
type MainCardProps = { title?: React.ReactNode; children?: React.ReactNode; [key: string]: unknown };
const MainCard = MainCardDefault as unknown as React.ComponentType<MainCardProps>;

type Commessa = {
  id: string;
  codice?: string | null;
  nome?: string | null;
  citta?: string | null;
};

export default function CommessaDettaglioPage() {
  const params = useParams() as { id: string };
  const id = params?.id as string;
  const [data, setData] = useState<Commessa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const companyId = localStorage.getItem('company_id');
    const headers: Record<string, string> = {};
    if (companyId) headers['X-Company-ID'] = companyId;
    axios
      .get(`/api/tenants/commesse/${id}`, { headers })
      .then((res) => setData(res.data?.data || null))
      .finally(() => setLoading(false));
  }, [id]);

  // Breadcrumb gestito dal layout globale

  return (
    <>
      {/* Contenuto principale in card con titolo in alto */}
      <MainCard title={loading ? 'Caricamento…' : data?.nome ? `Commessa ${data.nome}` : 'Commessa'}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0, mb: 1 }}>
          <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
            <IconBriefcase size={24} color="currentColor" />
          </Box>
          {loading ? (
            <Skeleton width={260} height={28} />
          ) : (
            <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {data?.codice || '—'}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <LocationOnOutlinedIcon fontSize="small" sx={{ color: 'secondary.main' }} />
                <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {data?.citta || '—'}
                </Typography>
              </Stack>
            </Stack>
          )}
        </Box>
        {/* TODO: dettaglio aggiuntivo */}
      </MainCard>
    </>
  );
}


