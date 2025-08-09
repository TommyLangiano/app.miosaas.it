"use client";
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from '../../src/utils/axios';
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
  // layout semplificato: niente MainCard, solo righe full-width
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const companyId = localStorage.getItem('company_id');
    const headers: Record<string, string> = {};
    if (companyId) headers['X-Company-ID'] = companyId;
    axios
      .get('/api/tenants/commesse', { headers })
      .then((res) => setRows(res.data?.data || []))
      .catch((e) => setError(typeof e === 'string' ? e : e?.message || 'Errore'))
      .finally(() => setLoading(false));
  }, []);

  // Mostra messaggio di creazione e pulisci l'URL
  const [createdJustNow, setCreatedJustNow] = useState<boolean>(false);
  useEffect(() => {
    if (searchParams.get('created') === '1') {
      setCreatedJustNow(true);
      const newParams = new URLSearchParams(Array.from(searchParams.entries()));
      newParams.delete('created');
      router.replace(`/commesse${newParams.toString() ? `?${newParams.toString()}` : ''}`);
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

      {createdJustNow && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="success">Commessa creata con successo.</Alert>
        </Box>
      )}
      {loading ? (
        <Stack spacing={1}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2.5,
                py: 1.5,
                borderRadius: 1,
                bgcolor: 'background.paper'
              }}
            >
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton width="60%" height={24} />
            </Box>
          ))}
        </Stack>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Stack spacing={1}>
          {rows.map((r) => {
            const codice = r.codice || '—';
            const nome = r.nome || '—';
            const citta = r.citta || '—';
            return (
              <Box
                key={r.id}
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  ':hover': { bgcolor: 'action.hover' }
                }}
                component={Link}
                href={`/commesse/${r.id}`}
              >
                <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconBriefcase size={22} color="currentColor" />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontSize: '1.2rem', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    <Box component="span" sx={{ fontWeight: 700 }}>{codice}</Box>
                    {' - '}
                    <Box component="span" sx={{ fontWeight: 700 }}>{nome}</Box>
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                    <LocationOnOutlinedIcon fontSize="small" sx={{ color: 'secondary.main' }} />
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }} noWrap>
                      {citta}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            );
          })}
          {rows.length === 0 && (
            <Box sx={{ width: '100%' }}>
              <Typography>Nessuna commessa trovata.</Typography>
            </Box>
          )}
        </Stack>
      )}
    </>
  );
}

