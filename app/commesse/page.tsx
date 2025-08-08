"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from '../../src/utils/axios';
import MainCard from '../../src/ui-component/cards/MainCard';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { IconBriefcase } from '@tabler/icons-react';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import dayjs from 'dayjs';

export default function CommessePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button component={Link} href="/commesse/nuova" variant="contained" color="primary">
          Aggiungi Commessa
        </Button>
      </Stack>

      {loading ? (
        <Typography>Caricamento...</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Grid container spacing={2}>
          {rows.map((r) => (
            <Grid item key={r.id} xs={12} sm={6} md={4} lg={3}>
              <MainCard
                title={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ bgcolor: 'primary.light', color: 'primary.dark', p: 0.5, borderRadius: 1, display: 'flex', alignItems: 'center' }}>
                      <IconBriefcase size={16} />
                    </Box>
                    <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
                      {r.cliente}
                    </Typography>
                  </Stack>
                }
                secondary={<Chip size="small" label={r.stato} color={r.stato === 'in_corso' ? 'warning' : r.stato === 'chiusa' ? 'success' : 'default'} />}
                contentSX={{ pt: 1.25 }}
                border
                boxShadow
                sx={(theme) => ({ bgcolor: 'background.paper' })}
              >
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <LocationOnOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {r.luogo || '—'}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Inizio: {r.data_inizio ? dayjs(r.data_inizio).format('DD/MM/YYYY') : '—'}
                </Typography>
                <Typography variant="body2">
                  Fine: {r.data_fine ? dayjs(r.data_fine).format('DD/MM/YYYY') : '—'}
                </Typography>
                <Typography variant="subtitle2" sx={{ mt: 1.5 }}>
                  Importo: {r.importo_commessa != null ? `${Number(r.importo_commessa).toFixed(2)} €` : '—'}
                </Typography>
              </MainCard>
            </Grid>
          ))}
          {rows.length === 0 && (
            <Grid item xs={12}>
              <Typography>Nessuna commessa trovata.</Typography>
            </Grid>
          )}
        </Grid>
      )}
    </>
  );
}

