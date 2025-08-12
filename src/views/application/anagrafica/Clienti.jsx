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
// import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
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

  const grouped = useMemo(() => {
    const map = new Map();
    sorted.forEach((row) => {
      const name = getDisplayName(row);
      const first = (name?.[0] || '#').toUpperCase();
      const key = /[A-Z]/.test(first) ? first : '#';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sorted]);

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
          {grouped.map(([letter, items]) => (
            <Box key={letter} sx={{ mb: 2 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', pl: 0.5 }}>{letter}</Typography>
              {items.map((row, idx) => (
                <Card key={row.id ?? `${letter}-${idx}`} sx={{ mb: 1.25 }} variant="outlined">
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 40, height: 40, fontWeight: 700 }}>
                          {getInitials(row)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h3" noWrap sx={{ fontWeight: 900 }}>
                            {getDisplayName(row)}
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', alignItems: 'center' }}>
                            <Typography variant="caption" noWrap>
                              Città: {row?.citta || '—'}
                            </Typography>
                            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                            <Typography variant="caption" noWrap>
                              Email: {row?.email || '—'}
                            </Typography>
                            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                            <Typography variant="caption" noWrap>
                              Telefono: {row?.telefono || '—'}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title="Info" arrow>
                          <IconButton size="small" aria-label="Info cliente" sx={{
                            border: '1px solid', borderColor: 'divider', borderRadius: '10px'
                          }}
                            onClick={() => {/* TODO: open details */}}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Modifica" arrow>
                          <IconButton size="small" aria-label="Modifica cliente" sx={{
                            border: '1px solid', borderColor: 'divider', borderRadius: '10px'
                          }}
                            onClick={() => { window.location.href = `/anagrafica/clienti/${row.id}/modifica`; }}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Elimina" arrow>
                          <IconButton size="small" aria-label="Elimina cliente" sx={{
                            border: '1px solid', borderColor: 'divider', borderRadius: '10px'
                          }}
                            onClick={() => {/* TODO: delete */}}
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ))}
          {!isLoading && sorted.length === 0 && (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Nessun cliente trovato</Paper>
          )}
        </Box>
      </Grid>
    </Grid>
  );
}


