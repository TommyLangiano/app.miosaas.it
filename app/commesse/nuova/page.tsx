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
import Typography from '@mui/material/Typography';
// Upload file UI rimosso

export default function NuovaCommessaPage() {
  const [form, setForm] = useState({
    cliente: '',
    cliente_tipo: 'privato',
    tipologia_commessa: 'appalto',
    codice: '',
    nome: '',
    localita: '',
    data_inizio: '',
    data_fine_prevista: '',
    descrizione: '',
    cig: '',
    cup: '',
    importo_commessa: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Stato file rimosso

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

  // Helpers upload rimossi

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Nessun obbligo per cliente: il backend userà cliente_tipo come fallback per rispettare NOT NULL
      const companyId = localStorage.getItem('company_id');
      const headers: Record<string, string> = {};
      if (companyId) headers['X-Company-ID'] = companyId;

      const body = {
        cliente: form.cliente,
        cliente_tipo: form.cliente_tipo,
        tipologia_commessa: form.tipologia_commessa,
        codice: form.codice,
        nome: form.nome,
        descrizione: form.descrizione || null,
        localita: form.localita,
        data_inizio: form.data_inizio || null,
        data_fine_prevista: form.data_fine_prevista || null,
        cig: form.cig || null,
        cup: form.cup || null,
        importo_commessa: form.importo_commessa ? Number(form.importo_commessa) : null
      } as const;
      await axios.post('/api/tenants/commesse', body, { headers });
      setSuccess('Commessa creata con successo.');
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
            {/* Campo Cliente rimosso: non richiesto nel form. Il backend usa cliente_tipo come fallback per NOT NULL. */}
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                select
                name="cliente_tipo"
                label="Tipologia Cliente"
                value={form.cliente_tipo}
                onChange={handleChange}
                fullWidth
                required
                helperText="Privato o Pubblico"
              >
                <MenuItem value="privato">Privato</MenuItem>
                <MenuItem value="pubblico">Pubblico</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                select
                name="tipologia_commessa"
                label="Tipologia Commessa"
                value={form.tipologia_commessa}
                onChange={handleChange}
                fullWidth
                required
                helperText="Appalto, ATI, Sub Appalto, Sub Affidamento"
              >
                <MenuItem value="appalto">Appalto</MenuItem>
                <MenuItem value="ati">Ati</MenuItem>
                <MenuItem value="sub_appalto">Sub Appalto</MenuItem>
                <MenuItem value="sub_affidamento">Sub Affidamento</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField name="nome" label="Nome Commessa" value={form.nome} onChange={handleChange} fullWidth required />
            </Box>
            <Box>
              <TextField name="codice" label="Codice Commessa" value={form.codice} onChange={handleChange} fullWidth required />
            </Box>
            <Box>
              <TextField name="localita" label="Località Commessa" value={form.localita} onChange={handleChange} fullWidth required />
            </Box>
            <Box>
              <TextField name="data_inizio" label="Data Inizio" type="date" value={form.data_inizio} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} required />
            </Box>
            <Box>
              <TextField name="data_fine_prevista" label="Data Fine prevista" type="date" value={form.data_fine_prevista} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField name="descrizione" label="Descrizione" value={form.descrizione} onChange={handleChange} fullWidth multiline minRows={3} />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField name="importo_commessa" label="Importo Commessa" type="number" value={form.importo_commessa} onChange={handleChange} fullWidth required />
            </Box>
            {/* Sezione upload rimossa */}
            {form.cliente_tipo === 'pubblico' && (
              <>
                <Box>
                  <TextField name="cig" label="CIG" value={form.cig || ''} onChange={handleChange} fullWidth required />
                </Box>
                <Box>
                  <TextField name="cup" label="CUP" value={form.cup || ''} onChange={handleChange} fullWidth required />
                </Box>
              </>
            )}
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

      {/* Upload file rimosso */}
    </>
  );
}

