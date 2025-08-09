"use client";
import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import axios from '../../src/utils/axios';
import MainCard from '../../src/ui-component/cards/MainCard';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import { IconBriefcase } from '@tabler/icons-react';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EuroOutlinedIcon from '@mui/icons-material/EuroOutlined';
import dayjs from 'dayjs';
import type { Theme } from '@mui/material/styles';
import type { ChipProps } from '@mui/material/Chip';

  type CommessaRow = {
    id: string | number;
    cliente: string;
    codice?: string | null;
    nome?: string | null;
    localita?: string | null;
    stato?: 'in_corso' | 'chiusa' | string;
    data_inizio?: string | null;
    data_fine_prevista?: string | null;
    importo_commessa?: number | string | null;
  };

export default function CommessePage() {
  const [rows, setRows] = useState<CommessaRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const MC = MainCard as unknown as ComponentType<Record<string, unknown>>;

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

  const currency = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  const statusColor = (stato?: string): ChipProps['color'] =>
    stato === 'in_corso' ? 'success' : stato === 'chiusa' ? 'error' : 'info';

  const statusLabel = (stato?: string) => (stato === 'in_corso' ? 'In corso' : stato === 'chiusa' ? 'Finita' : 'Da avviare');

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button component={Link} href="/commesse/nuova" variant="contained" color="primary">
          Aggiungi Commessa
        </Button>
      </Stack>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={i} sx={{ width: { xs: '100%', sm: '50%', md: '33.333%', lg: '33.333%' } }}>
              <MC border boxShadow title="" secondary={null} shadow="">
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  <Skeleton variant="circular" width={36} height={36} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="80%" height={20} />
                    <Skeleton width="40%" height={14} />
                  </Box>
                  <Skeleton variant="rounded" width={72} height={22} />
                </Stack>
                <Skeleton width="60%" height={16} />
                <Skeleton width="50%" height={16} />
                <Divider sx={{ my: 1.25 }} />
                <Skeleton width="40%" height={18} />
              </MC>
            </Box>
          ))}
        </Grid>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Grid container spacing={2}>
          {rows.map((r) => (
            <Box key={r.id} sx={{ width: { xs: '100%', sm: '50%', md: '33.333%', lg: '33.333%' } }}>
              <MC
                title={
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                      <IconBriefcase size={18} color="white" />
                    </Avatar>
                    <Box sx={{ overflow: 'hidden' }}>
                      <Tooltip title={r.cliente} placement="top" arrow>
                        <Typography variant="h4" sx={{ lineHeight: 1.2, fontWeight: 700 }} noWrap>
                          {r.cliente}
                        </Typography>
                      </Tooltip>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <LocationOnOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }} noWrap>
                          {r.localita || '—'}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                }
                secondary={
                  <Chip
                    size="small"
                    label={statusLabel(r.stato)}
                    sx={(theme: Theme) => ({
                      bgcolor:
                        statusColor(r.stato) === 'success'
                          ? theme.palette.success.main
                          : statusColor(r.stato) === 'error'
                          ? theme.palette.error.main
                          : theme.palette.info.main,
                      color: theme.palette.common.white,
                      fontWeight: 700
                    })}
                  />
                }
                headerSX={{ '& .MuiCardHeader-action': { alignSelf: 'center' } }}
                contentSX={{ pt: 1.25 }}
                border
                boxShadow
                shadow=""
                sx={{
                  bgcolor: 'background.paper',
                  ':hover': { transform: 'translateY(-2px)', transition: 'all .15s ease-in-out' }
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
                  <CalendarMonthOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {r.data_inizio ? dayjs(r.data_inizio).format('DD/MM/YYYY') : '—'}
                    {r.data_fine_prevista ? ` → ${dayjs(r.data_fine_prevista).format('DD/MM/YYYY')}` : ''}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 1.25 }} />
                <Stack direction="row" spacing={1} alignItems="center">
                  <EuroOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {r.importo_commessa != null ? currency.format(Number(r.importo_commessa)) : '—'}
                  </Typography>
                </Stack>
              </MC>
            </Box>
          ))}
            {rows.length === 0 && (
            <Box sx={{ width: '100%' }}>
              <Typography>Nessuna commessa trovata.</Typography>
            </Box>
          )}
        </Grid>
      )}
    </>
  );
}

