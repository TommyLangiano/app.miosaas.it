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
// Chip rimosso: filtri sostituiti da barra di ricerca
import { alpha } from '@mui/material/styles';
import Pagination from '@mui/material/Pagination';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
 

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
    if (swrError) setError(swrError instanceof Error ? swrError.message : String(swrError));
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

  // Ricerca client-side sulle commesse
  const [query, setQuery] = useState('');
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const parts = [r.codice, r.nome, r.citta, r.provincia, r.committente_commessa]
        .map((x) => String(x || '').toLowerCase());
      return parts.some((p) => p.includes(q));
    });
  }, [rows, query]);
  const counts = useMemo(() => {
    const c = { all: rows.length } as Record<string, number>;
    c.all = rows.length;
    return c;
  }, [rows]);

  // statoChip rimosso: non mostriamo più lo stato nella card

  const accentColor = (s?: string) => {
    const stato = (s || 'in_corso');
    if (stato === 'chiusa') return '#9e9e9e';
    if (stato === 'da_avviare') return '#ed6c02'; // warning.main
    return '#2e7d32'; // success.dark-ish
  };

  const formatEuro = (value?: number) => {
    const n = Number(value || 0);
    try { return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n); } catch { return `${n.toFixed(2)} €`; }
  };

  // Paginazione client-side
  const pageSizeOptions = [10, 15, 20, 25, 30] as const;
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  useEffect(() => { setPage(1); }, [rowsPerPage]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
  const pageRows = filteredRows.slice(startIndex, endIndex);

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Cerca in ${counts.all} commesse...`}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon color="action" />
              </InputAdornment>
            )
          }}
          size="small"
          sx={{ width: { xs: '100%', sm: 420 } }}
        />
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr' }, gap: 1.5 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 3,
                py: 1.5,
                borderRadius: 1.25,
                bgcolor: 'background.paper',
                minHeight: 76
              }}
            >
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton width="56%" height={20} />
              <Skeleton width="26%" height={18} />
            </Box>
          ))}
        </Box>
      ) : error ? (
        <Typography color="error">{String(error)}</Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr' }, gap: 1.5 }}>
           {pageRows.map((r) => (
             <CommessaRowItem key={r.id} r={r} accentColor={accentColor} formatEuro={formatEuro} />
           ))}
          {filteredRows.length === 0 && (
            <Box sx={{ width: '100%' }}>
              <Typography>Nessuna commessa trovata.</Typography>
            </Box>
          )}
           {filteredRows.length > 0 && (
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, py: 1, px: 1, borderTop: '1px solid', borderColor: 'divider' }}>
               <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                 <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                   Mostrando {totalRows === 0 ? 0 : startIndex + 1}
                   –{endIndex} di {totalRows} commesse
                 </Typography>
                 <FormControl size="small" sx={{ minWidth: 160 }}>
                   <InputLabel id="rows-per-page-label" shrink>Commesse per pagina</InputLabel>
                   <Select
                     labelId="rows-per-page-label"
                     label="Commesse per pagina"
                     value={String(rowsPerPage)}
                     onChange={(e) => setRowsPerPage(Number(e.target.value))}
                   >
                     {pageSizeOptions.map((opt) => (
                       <MenuItem key={opt} value={String(opt)}>{opt}</MenuItem>
                     ))}
                   </Select>
                 </FormControl>
               </Stack>
               <Pagination
                 count={totalPages}
                 page={page}
                 onChange={(_, val) => setPage(val)}
                 color="primary"
                 variant="outlined"
                 shape="rounded"
               />
             </Box>
           )}
        </Box>
      )}
    </>
  );
}

type SumResponse = { status?: string; data?: { total?: number } } | { total?: number };

function CommessaRowItem({ r, accentColor, formatEuro }: { r: CommessaRow; accentColor: (s?: string) => string; formatEuro: (n?: number) => string }) {
  const acc = accentColor(r.stato);
  const { data: entrateSum } = useSWR(`/api/tenants/entrate/sum?commessa_id=${encodeURIComponent(String(r.id))}`, defaultSWRConfig);
  const { data: usciteSum } = useSWR(`/api/tenants/uscite/sum?commessa_id=${encodeURIComponent(String(r.id))}`, defaultSWRConfig);
  const getTotal = (d: unknown): number => {
    const res = d as SumResponse | null | undefined;
    if (!res) return 0;
    if ('data' in res && res.data) return Number(res.data.total || 0);
    return Number((res as { total?: number }).total || 0);
  };
  const totaleEntrate = getTotal(entrateSum);
  const totaleUscite = getTotal(usciteSum);
  const utileLordo = Number(totaleEntrate) - Number(totaleUscite);
  const [isHover, setIsHover] = useState<boolean>(false);
  const codice = r.codice || '—';
  const nome = r.nome || '—';
  const citta = r.citta || '—';
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 3,
        py: 1.5,
        borderRadius: 1.25,
        bgcolor: 'background.paper',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 1px rgba(0,0,0,0.06)',
        transition: 'background-color 140ms ease, box-shadow 180ms ease, transform 160ms ease',
        willChange: 'transform, box-shadow, background-color',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 3,
          backgroundColor: acc
        },
        '&:hover': {
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03),
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          transform: 'translateY(-2px)'
        },
        '&:hover::before': {
          width: 5
        },
        textDecoration: 'none',
        color: 'inherit',
        minHeight: 64
      }}
      component={Link}
      href={`/commesse/${r.id}`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <Box sx={{ color: acc, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 160ms ease' }}>
        <IconBriefcase size={24} color="currentColor" />
      </Box>
      <Typography
        variant="h5"
        sx={{
          fontSize: { xs: '1.2rem', sm: '1.3rem' },
          fontWeight: 800,
          lineHeight: 1.25,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        <Box component="span" sx={{ fontWeight: 800 }}>{codice}</Box>
        {' - '}
        <Box component="span" sx={{ fontWeight: 800 }}>{nome}</Box>
        <Stack component="span" direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
          <LocationOnOutlinedIcon sx={{ color: 'primary.main', fontSize: { xs: 18, sm: 20 } }} />
          <Typography component="span" variant="body1" color="text.secondary" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.05rem' } }}>{citta}</Typography>
        </Stack>
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto', whiteSpace: 'nowrap' }}>
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 700 }}>Utile Lordo:</Typography>
        <Typography variant="h6" sx={{ fontWeight: 900, color: utileLordo < 0 ? 'error.main' : 'success.main' }}>
          {isHover ? formatEuro(utileLordo) : '••••••'}
        </Typography>
      </Stack>
    </Box>
  );
}

