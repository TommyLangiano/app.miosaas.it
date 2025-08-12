'use client';

import Link from 'next/link';
import useSWR from 'swr';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { useMemo, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { fetcher } from '../../../utils/axios';
import { gridSpacing } from '../../../store/constant';

export default function Clienti() {
  const [query, setQuery] = useState('');
  const { data, isLoading } = useSWR(['api/tenants/clienti', { params: query ? { q: query } : undefined }], fetcher);
  const rows = useMemo(() => (data?.data || []).map((r, i) => ({ id: r.id ?? i, ...r })), [data]);

  const getDisplayName = (row) => {
    const name = (row?.ragione_sociale || '').trim();
    if (name) return name;
    const full = `${row?.nome || ''} ${row?.cognome || ''}`.trim();
    return full || '—';
  };

  const getInitials = (row) => {
    const label = getDisplayName(row);
    const parts = label.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getFormaLabel = (row) => {
    if ((row?.forma_giuridica || '').toUpperCase() === 'PF') return 'Privato';
    return row?.forma_giuridica_dettaglio || 'Azienda';
  };

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), undefined, { sensitivity: 'base' }));
    return arr;
  }, [rows]);

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            fullWidth
            sx={{ flex: 1, minWidth: 280 }}
            placeholder="Cerca clienti (nome, P.IVA, email...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button component={Link} href="/anagrafica/clienti/nuovo" variant="contained">Nuovo Cliente</Button>
        </Box>
        <Box sx={{ mt: 2, width: '100%' }}>
          {sorted.map((row, idx) => (
            <Card key={row.id ?? idx} sx={{ mb: 1.25 }} variant="outlined">
              <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 40, height: 40, fontWeight: 700 }}>
                      {getInitials(row)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                        {getDisplayName(row)}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ color: 'text.secondary' }}>
                        <Typography variant="caption" noWrap>{row?.citta || '—'}</Typography>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <Typography variant="caption" noWrap>{row?.email || '—'}</Typography>
                      </Stack>
                    </Box>
                  </Stack>
                  <Chip size="small" color="secondary" variant="outlined" label={getFormaLabel(row)} />
                </Stack>
              </CardContent>
            </Card>
          ))}
          {!isLoading && sorted.length === 0 && (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Nessun cliente trovato</Paper>
          )}
        </Box>
      </Grid>
    </Grid>
  );
}


