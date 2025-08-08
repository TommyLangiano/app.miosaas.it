"use client";
import React, { useMemo, useState, type ComponentType } from 'react';
import Link from 'next/link';
import axios from '../../../src/utils/axios';
import Breadcrumbs from '../../../src/ui-component/extended/Breadcrumbs';
import MainCard from '../../../src/ui-component/cards/MainCard';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';

export default function NuovaCommessaPage() {
  const [form, setForm] = useState({
    cliente: '',
    luogo: '',
    data_inizio: '',
    data_fine: '',
    descrizione: '',
    imponibile_commessa: '',
    iva_commessa: '',
    importo_commessa: '',
    stato: 'da_avviare'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const breadcrumbLinks = useMemo(
    () => [
      { title: 'Dashboard', to: '/' },
      { title: 'Commesse', to: '/commesse' },
      { title: 'Nuova Commessa' }
    ],
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const companyId = localStorage.getItem('company_id');
      const headers: Record<string, string> = {};
      if (companyId) headers['X-Company-ID'] = companyId;
      const body = {
        ...form,
        imponibile_commessa: form.imponibile_commessa ? Number(form.imponibile_commessa) : null,
        iva_commessa: form.iva_commessa ? Number(form.iva_commessa) : null,
        importo_commessa: form.importo_commessa ? Number(form.importo_commessa) : null
      };
      const res = await axios.post('/api/tenants/commesse', body, { headers });
      setSuccess('Commessa creata con successo');
      setForm({
        cliente: '', luogo: '', data_inizio: '', data_fine: '', descrizione: '',
        imponibile_commessa: '', iva_commessa: '', importo_commessa: '', stato: 'da_avviare'
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Errore nella creazione';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Breadcrumbs custom heading="Nuova Commessa" links={breadcrumbLinks} card icons={false} maxItems={8} titleBottom={false} sx={{}} />
      {(() => {
        const MC = MainCard as unknown as ComponentType<Record<string, unknown>>;
        return (
          <MC title="Crea nuova commessa">
        <form onSubmit={handleSubmit} noValidate>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Box>
              <TextField name="cliente" label="Cliente" value={form.cliente} onChange={handleChange} fullWidth required />
            </Box>
            <Box>
              <TextField name="luogo" label="Luogo" value={form.luogo} onChange={handleChange} fullWidth />
            </Box>
            <Box>
              <TextField name="data_inizio" label="Data Inizio" type="date" value={form.data_inizio} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
            </Box>
            <Box>
              <TextField name="data_fine" label="Data Fine" type="date" value={form.data_fine} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField name="descrizione" label="Descrizione" value={form.descrizione} onChange={handleChange} fullWidth multiline minRows={3} />
            </Box>
            <Box>
              <TextField name="imponibile_commessa" label="Imponibile" type="number" value={form.imponibile_commessa} onChange={handleChange} fullWidth />
            </Box>
            <Box>
              <TextField name="iva_commessa" label="IVA" type="number" value={form.iva_commessa} onChange={handleChange} fullWidth />
            </Box>
            <Box>
              <TextField name="importo_commessa" label="Importo" type="number" value={form.importo_commessa} onChange={handleChange} fullWidth />
            </Box>
            <Box>
              <TextField select name="stato" label="Stato" value={form.stato} onChange={handleChange} fullWidth>
                <MenuItem value="da_avviare">Da avviare</MenuItem>
                <MenuItem value="in_corso">In corso</MenuItem>
                <MenuItem value="chiusa">Chiusa</MenuItem>
              </TextField>
            </Box>
          </Box>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={saving}>Salva</Button>
            <Button component={Link} href="/commesse" variant="outlined">Annulla</Button>
          </Stack>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
        </form>
          </MC>
        );
      })()}
    </>
  );
}

