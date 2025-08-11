"use client";
import { useEffect, useState } from 'react';
import { useSWR } from '../../src/utils/swr';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';

export default function RapportiniPage() {
  const { data, error, isLoading } = useSWR('/api/tenants/rapportini');
  type Rapportino = { id: string | number; title?: string };
  const [rows, setRows] = useState<Rapportino[]>([]);

  useEffect(() => {
    if (Array.isArray(data)) setRows(data);
  }, [data]);

  return (
    <>
      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={36} />
          ))}
        </Stack>
      ) : error ? (
        <Alert severity="error">Errore nel caricamento dei rapportini</Alert>
      ) : (
        <Stack spacing={1}>
          {rows.map((r) => (
            <Box key={r.id} component={Link} href={`#`} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, textDecoration: 'none', color: 'inherit' }}>
              <Typography variant="body1" noWrap>{r.title || `Rapportino ${r.id}`}</Typography>
            </Box>
          ))}
        </Stack>
      )}
    </>
  );
}

