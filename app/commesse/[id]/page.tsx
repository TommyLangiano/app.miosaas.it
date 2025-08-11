"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import axios from '../../../src/utils/axios';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
// import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import MainCardDefault from '../../../src/ui-component/cards/MainCard';
import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
type MainCardProps = { title?: React.ReactNode; children?: React.ReactNode; headerSX?: SxProps<Theme>; contentSX?: SxProps<Theme>; [key: string]: unknown };
const MainCard = MainCardDefault as unknown as React.ComponentType<MainCardProps>;
// Accordion per descrizione a tendina
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// icons
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { getCommessaCache, setCommessaCache } from '../../../src/utils/commesseCache';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

type Commessa = {
  id: string;
  codice?: string | null;
  nome?: string | null;
  cliente_tipo?: string | null;
  cliente?: string | null;
  committente_commessa?: string | null;
  tipologia_commessa?: string | null;
  importo_commessa?: number | string | null;
  cig?: string | null;
  cup?: string | null;
  citta?: string | null;
  provincia?: string | null;
  via?: string | null;
  civico?: string | null;
  data_inizio?: string | null;
  data_fine_prevista?: string | null;
  descrizione?: string | null;
};

export default function CommessaDettaglioPage() {
  const params = useParams() as { id: string };
  const id = params?.id as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<Commessa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatedJustNow, setUpdatedJustNow] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const companyId = localStorage.getItem('company_id');
    const headers: Record<string, string> = {};
    if (companyId) headers['X-Company-ID'] = companyId;
    // Prime UI from cache if available
    const cached = getCommessaCache(id);
    if (cached) setData((prev) => ({ ...(prev || {}), ...(cached as unknown as Commessa) }));
    axios
      .get(`/api/tenants/commesse/${id}`, { headers })
      .then((res) => {
        const payload = res.data?.data || null;
        if (payload?.id) setCommessaCache(payload);
        setData(payload);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const flag = searchParams.get('updated') === '1';
    if (flag) {
      setUpdatedJustNow(true);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete('updated');
      router.replace(`/commesse/${id}${params.toString() ? `?${params.toString()}` : ''}`);
    }
  }, [searchParams, router, id]);

  const headerTitle = useMemo(() => {
    if (loading) return 'Caricamento…';
    const codice = data?.codice || '—';
    const nome = data?.nome || '—';
    const start = formatDate(data?.data_inizio);
    const end = formatDate(data?.data_fine_prevista);
    return (
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ gap: { xs: 0.5, sm: 1 } }}
      >
        <Typography
          component="div"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.25rem', sm: '1.8rem', md: '2rem' },
            lineHeight: 1.2,
            whiteSpace: 'normal',
            wordBreak: 'break-word'
          }}
        >
          {codice} - {nome}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          sx={{ color: 'text.secondary', flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, rowGap: 1 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <CalendarMonthOutlinedIcon fontSize="small" />
            <Typography component="span" sx={{ fontSize: { xs: '1rem', sm: '1.1rem', md: '1.15rem' }, fontWeight: 400 }}>
              {start}
            </Typography>
            <ArrowRightAltIcon fontSize="small" />
            <Typography component="span" sx={{ fontSize: { xs: '1rem', sm: '1.1rem', md: '1.15rem' }, fontWeight: 400 }}>
              {end}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Modifica Commessa" arrow>
              <IconButton
                size="small"
                aria-label="Modifica Commessa"
                sx={(theme) => ({
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  borderRadius: 2,
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  p: 0,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.grey[500], 0.12),
                    color: theme.palette.grey[700],
                    borderColor: theme.palette.grey[500]
                  }
                })}
                onClick={() => {
                  router.push(`/commesse/${id}/modifica`);
                }}
              >
                <EditOutlinedIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Archivia Commessa" arrow>
              <IconButton
                size="small"
                aria-label="Archivia Commessa"
                sx={(theme) => ({
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  borderRadius: 2,
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  p: 0,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.warning.main, 0.12),
                    color: theme.palette.warning.main,
                    borderColor: theme.palette.warning.main
                  }
                })}
              >
                <ArchiveOutlinedIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Elimina Commessa" arrow>
              <IconButton
                size="small"
                aria-label="Elimina Commessa"
                sx={(theme) => ({
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  borderRadius: 2,
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  p: 0,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.error.main, 0.12),
                    color: theme.palette.error.main,
                    borderColor: theme.palette.error.main
                  }
                })}
                onClick={() => setDeleteOpen(true)}
              >
                <DeleteOutlineOutlinedIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>
    );
  }, [loading, id, router, data?.codice, data?.nome, data?.data_inizio, data?.data_fine_prevista]);

  const formatCurrency = (value?: number | string | null) => {
    if (value === null || value === undefined || value === '') return '—';
    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num as number)) return String(value);
    try {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(num as number);
    } catch {
      return String(value);
    }
  };

  function formatDate(value?: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value as string;
    return d.toLocaleDateString('it-IT');
  }

  // Breadcrumb gestito dal layout globale

  return (
    <>
      {updatedJustNow && (
        <Stack sx={{ mb: 1.5 }}>
          <Alert severity="success">Commessa aggiornata con successo.</Alert>
        </Stack>
      )}
      <MainCard
        title={headerTitle}
        headerSX={{ '& .MuiCardHeader-title': { fontWeight: 800 } }}
        contentSX={{ pt: 2 }}
      >
      {loading ? (
        <Stack spacing={1}>
          <Skeleton height={24} width="60%" />
          <Skeleton height={20} width="80%" />
          <Skeleton height={120} />
        </Stack>
      ) : (
        <>
          {/* Dettagli: griglia responsiva 2-col su xs, full span ultimo se dispari */}
          {(() => {
            const items: Array<{ label: string; value: string }> = [];
            items.push({ label: 'Committente', value: data?.committente_commessa || '—' });
            items.push({ label: 'Cliente tipo', value: data?.cliente_tipo || '—' });
            items.push({ label: 'Tipologia commessa', value: data?.tipologia_commessa || '—' });
            items.push({ label: 'Importo commessa', value: formatCurrency(data?.importo_commessa) });
            if (data?.cig) items.push({ label: 'CIG', value: String(data.cig) });
            if (data?.cup) items.push({ label: 'CUP', value: String(data.cup) });
            const line1 = [data?.via, data?.civico].filter(Boolean).join(' ');
            const line2 = [data?.citta, data?.provincia].filter(Boolean).join(' ');
            const fullAddress = line1 && line2 ? `${line1}, ${line2}` : line1 || line2 || '—';
            items.push({ label: 'Indirizzo', value: fullAddress });

            const isOdd = items.length % 2 === 1;

            return (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: `repeat(${items.length}, minmax(0, 1fr))` }, columnGap: { xs: 2, md: 3 }, rowGap: { xs: 1.5, md: 2 }, mb: 1 }}>
                {items.map((it, idx) => (
                  <Box
                    key={`${it.label}-${idx}`}
                    sx={{
                      gridColumn: { xs: isOdd && idx === items.length - 1 ? '1 / -1' : 'auto', md: 'auto' },
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      height: '100%'
                    }}
                  >
                    <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4, width: '100%' }}>
                      {it.label}
                    </Typography>
                    <Typography
                      sx={{ fontSize: { xs: '0.98rem', sm: '1.12rem' }, fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}
                      title={it.value}
                    >
                      {it.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            );
          })()}

          <Accordion sx={{ mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }} disableGutters>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="descrizione-content"
              id="descrizione-header"
              sx={(theme) => ({
                px: 1,
                bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : 'grey.50',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : 'grey.100'
                },
                '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 }
              })}
            >
              <DescriptionOutlinedIcon color="action" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Descrizione</Typography>
            </AccordionSummary>
            <AccordionDetails id="descrizione-content" sx={{ pt: 0.5 }}>
              <Typography
                variant="body1"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              >
                {data?.descrizione || '—'}
              </Typography>
            </AccordionDetails>
          </Accordion>
          {/* Dialog eliminazione definitiva */}
          <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Elimina commessa</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Typography>
                  Stai andando ad eliminare la commessa <strong>{data?.nome || '—'}</strong> in modo definitivo. I dati saranno cancellati e non sarà più possibile recuperarli.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Per confermare, inserisci esattamente il nome della commessa.
                </Typography>
                <TextField
                  autoFocus
                  fullWidth
                  label="Nome commessa"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                />
                {deleteError && <Alert severity="error">{deleteError}</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteOpen(false)}>Annulla</Button>
              <Button
                color="error"
                variant="contained"
                disabled={!data?.nome || confirmName !== (data?.nome || '')}
                onClick={async () => {
                  try {
                    setDeleteError(null);
                    const companyId = localStorage.getItem('company_id');
                    const headers: Record<string, string> = {};
                    if (companyId) headers['X-Company-ID'] = companyId;
                    await axios.delete(`/api/tenants/commesse/${id}`, { headers });
                    router.replace('/commesse?deleted=1');
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Errore eliminazione';
                    setDeleteError(msg);
                  }
                }}
              >
                Elimina definitivamente
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
      </MainCard>
    </>
  );
}


