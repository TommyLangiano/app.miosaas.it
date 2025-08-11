"use client";
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSWR, defaultSWRConfig } from '../../src/utils/swr';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
 
import Skeleton from '@mui/material/Skeleton';
import { IconBriefcase } from '@tabler/icons-react';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
 

  type CommessaRow = {
    id: string | number;
    cliente: string;
    codice?: string | null;
    nome?: string | null;
    citta?: string | null;
    provincia?: string | null;
    via?: string | null;
    civico?: string | null;
    committente_commessa?: string | null;
    stato?: 'in_corso' | 'chiusa' | string;
    data_inizio?: string | null;
    data_fine_prevista?: string | null;
    importo_commessa?: number | string | null;
  };

export default function CommessePage() {
  const [rows, setRows] = useState<CommessaRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // layout semplificato: niente MainCard, solo righe full-width
  const searchParams = useSearchParams();
  const router = useRouter();

  const swrKey = '/api/tenants/commesse';
  const { data: swrRows, error: swrError, isLoading: swrLoading } = useSWR(swrKey, defaultSWRConfig);

  useEffect(() => {
    setLoading(swrLoading);
    if (swrError) setError(swrError as unknown as string);
    if (Array.isArray(swrRows)) setRows(swrRows as unknown as CommessaRow[]);
  }, [swrRows, swrError, swrLoading]);

  // Mostra messaggi e pulisci l'URL
  const [createdJustNow, setCreatedJustNow] = useState<boolean>(false);
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (params.get('created') === '1') {
      setCreatedJustNow(true);
      params.delete('created');
    }
    if (params.get('deleted') === '1') {
      setMessage('Commessa eliminata definitivamente.');
      params.delete('deleted');
    }
    if (params.get('error') === '1') {
      setError(params.get('msg') || 'Operazione non riuscita');
      params.delete('error');
      params.delete('msg');
    }
    if (params.toString() !== searchParams.toString()) {
      router.replace(`/commesse${params.toString() ? `?${params.toString()}` : ''}`);
    }
  }, [searchParams, router]);

  // vista lista compatta: nessuno stato/valuta visualizzato

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button component={Link} href="/commesse/nuova" variant="contained" color="primary">
          Aggiungi Commessa
        </Button>
      </Stack>

      {(createdJustNow || message) && (
        <Box sx={{ mb: 2 }}>
          {createdJustNow && <Alert severity="success">Commessa creata con successo.</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
        </Box>
      )}
      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 1,
                px: 2.5,
                py: 1.5,
                borderRadius: 1,
                bgcolor: 'background.paper',
                minHeight: 110
              }}
            >
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton width="75%" height={20} />
              <Skeleton width="50%" height={18} />
            </Box>
          ))}
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {rows.map((r) => {
            const codice = r.codice || '—';
            const nome = r.nome || '—';
            const citta = r.citta || '';
            const provincia = r.provincia || '';
            const via = r.via || '';
            const civico = r.civico || '';
            const indirizzo = [via, civico].filter(Boolean).join(' ').trim();
            const cityProvince = [citta, provincia].filter(Boolean).join(' ');
            const locationText = indirizzo && cityProvince ? `${indirizzo}, ${cityProvince}` : indirizzo || cityProvince || '—';
            return (
            <Box
                key={r.id}
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 1,
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  textDecoration: 'none',
                  color: 'inherit',
                  minHeight: 110,
                  ':hover': { bgcolor: 'action.hover' }
                }}
                component={Link}
                href={`/commesse/${r.id}`}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconBriefcase size={22} color="currentColor" />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.5rem' },
                      fontWeight: 400,
                      lineHeight: 1.2
                    }}
                  >
                    <Box component="span" sx={{ fontWeight: 700 }}>{codice}</Box>
                    {' - '}
                    <Box component="span" sx={{ fontWeight: 700 }}>{nome}</Box>
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: '100%' }}>
                  <LocationOnOutlinedIcon sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 22 } }} />
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ fontWeight: 400, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}
                  >
                    {locationText}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
          {rows.length === 0 && (
            <Box sx={{ width: '100%' }}>
              <Typography>Nessuna commessa trovata.</Typography>
            </Box>
          )}
        </Box>
      )}
    </>
  );
}

