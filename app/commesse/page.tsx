"use client";
import { useEffect, useMemo, useState } from 'react';
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
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
 

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_corso' | 'chiusa' | 'da_avviare'>('all');
  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((r) => (r.stato || 'in_corso') === statusFilter);
  }, [rows, statusFilter]);
  const counts = useMemo(() => {
    const c = { all: rows.length, in_corso: 0, chiusa: 0, da_avviare: 0 } as Record<string, number>;
    rows.forEach((r) => { c[r.stato || 'in_corso'] = (c[r.stato || 'in_corso'] || 0) + 1; });
    return c;
  }, [rows]);

  const statoChip = (s?: string) => {
    const stato = (s || 'in_corso') as 'in_corso' | 'chiusa' | 'da_avviare';
    const map = {
      in_corso: { label: 'In corso', color: 'success' as const },
      chiusa: { label: 'Chiusa', color: 'default' as const },
      da_avviare: { label: 'Da avviare', color: 'warning' as const }
    };
    const cfg = map[stato] || map.in_corso;
    return <Chip size="small" color={cfg.color} variant="outlined" label={cfg.label} sx={{ fontWeight: 600 }} />;
  };

  const accentColor = (s?: string) => {
    const stato = (s || 'in_corso');
    if (stato === 'chiusa') return '#9e9e9e';
    if (stato === 'da_avviare') return '#ed6c02'; // warning.main
    return '#2e7d32'; // success.dark-ish
  };

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`Tutte (${counts.all})`}
            color={statusFilter === 'all' ? 'primary' : 'default'}
            variant={statusFilter === 'all' ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter('all')}
          />
          <Chip
            label={`In corso (${counts.in_corso || 0})`}
            color={statusFilter === 'in_corso' ? 'success' : 'default'}
            variant={statusFilter === 'in_corso' ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter('in_corso')}
          />
          <Chip
            label={`Da avviare (${counts.da_avviare || 0})`}
            color={statusFilter === 'da_avviare' ? 'warning' : 'default'}
            variant={statusFilter === 'da_avviare' ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter('da_avviare')}
          />
          <Chip
            label={`Chiuse (${counts.chiusa || 0})`}
            color={statusFilter === 'chiusa' ? 'default' : 'default'}
            variant={statusFilter === 'chiusa' ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter('chiusa')}
          />
        </Stack>
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
          {filteredRows.map((r) => {
            const codice = r.codice || '—';
            const nome = r.nome || '—';
            const citta = r.citta || '';
            const provincia = r.provincia || '';
            const via = r.via || '';
            const civico = r.civico || '';
            const indirizzo = [via, civico].filter(Boolean).join(' ').trim();
            const cityProvince = [citta, provincia].filter(Boolean).join(' ');
            const locationText = indirizzo && cityProvince ? `${indirizzo}, ${cityProvince}` : indirizzo || cityProvince || '—';
            const acc = accentColor(r.stato);
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
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: 4,
                    backgroundColor: acc
                  },
                  textDecoration: 'none',
                  color: 'inherit',
                  minHeight: 110,
                  ':hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02), transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }
                }}
                component={Link}
                href={`/commesse/${r.id}`}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Box sx={{ color: acc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconBriefcase size={22} color="currentColor" />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.5rem' },
                      fontWeight: 500,
                      lineHeight: 1.2
                    }}
                  >
                    <Box component="span" sx={{ fontWeight: 700 }}>{codice}</Box>
                    {' - '}
                    <Box component="span" sx={{ fontWeight: 700 }}>{nome}</Box>
                  </Typography>
                  <Box sx={{ ml: 'auto' }}>{statoChip(r.stato)}</Box>
                </Box>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: '100%', color: 'text.secondary' }}>
                  <LocationOnOutlinedIcon sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 22 } }} />
                  <Typography
                    variant="body1"
                    color="inherit"
                    sx={{ fontWeight: 400, fontSize: { xs: '0.95rem', sm: '1.05rem' } }}
                  >
                    {locationText}
                  </Typography>
                </Stack>
                {/* Meta info rimossa su richiesta: inizio, fine prevista, importo */}
              </Box>
            );
          })}
          {filteredRows.length === 0 && (
            <Box sx={{ width: '100%' }}>
              <Typography>Nessuna commessa trovata.</Typography>
            </Box>
          )}
        </Box>
      )}
    </>
  );
}

