"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '../../../../src/utils/axios';
import MainCardDefault from '../../../../src/ui-component/cards/MainCard';
import type { SxProps, Theme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';

type FormState = {
  cliente_tipo: string;
  tipologia_commessa: string;
  codice: string;
  committente_commessa: string;
  nome: string;
  citta: string;
  provincia: string;
  via: string;
  civico: string;
  data_inizio: string;
  data_fine_prevista: string;
  descrizione: string;
  cig: string;
  cup: string;
  importo_commessa: string;
};

export default function ModificaCommessaPage() {
  const router = useRouter();
  const params = useParams() as { id: string };
  const id = params?.id as string;

  const [form, setForm] = useState<FormState>({
    cliente_tipo: 'privato',
    tipologia_commessa: 'appalto',
    codice: '',
    committente_commessa: '',
    nome: '',
    citta: '',
    provincia: '',
    via: '',
    civico: '',
    data_inizio: '',
    data_fine_prevista: '',
    descrizione: '',
    cig: '',
    cup: '',
    importo_commessa: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const companyId = localStorage.getItem('company_id');
    const headers: Record<string, string> = {};
    if (companyId) headers['X-Company-ID'] = companyId;
    axios
      .get(`/api/tenants/commesse/${id}`, { headers })
      .then((res) => {
        const d = res.data?.data || {};
        setForm((prev) => ({
          ...prev,
          cliente_tipo: d.cliente_tipo || 'privato',
          tipologia_commessa: d.tipologia_commessa || 'appalto',
          codice: d.codice || '',
          committente_commessa: d.committente_commessa || '',
          nome: d.nome || '',
          citta: d.citta || '',
          provincia: d.provincia || '',
          via: d.via || '',
          civico: d.civico || '',
          data_inizio: d.data_inizio || '',
          data_fine_prevista: d.data_fine_prevista || '',
          descrizione: d.descrizione || '',
          cig: d.cig || '',
          cup: d.cup || '',
          importo_commessa: d.importo_commessa ? String(d.importo_commessa) : ''
        }));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'provincia') {
      const up = value.toUpperCase().slice(0, 2);
      setForm((prev) => ({ ...prev, [name]: up }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const companyId = localStorage.getItem('company_id');
      const headers: Record<string, string> = {};
      if (companyId) headers['X-Company-ID'] = companyId;

      const body = {
        cliente_tipo: form.cliente_tipo,
        tipologia_commessa: form.tipologia_commessa,
        codice: form.codice,
        committente_commessa: form.committente_commessa || null,
        nome: form.nome,
        descrizione: form.descrizione || null,
        citta: form.citta,
        provincia: form.provincia || null,
        via: form.via || null,
        civico: form.civico || null,
        data_inizio: form.data_inizio || null,
        data_fine_prevista: form.data_fine_prevista || null,
        cig: form.cig || null,
        cup: form.cup || null,
        importo_commessa: form.importo_commessa ? Number(form.importo_commessa) : null
      } as const;

      await axios.put(`/api/tenants/commesse/${id}`, body, { headers });
      router.replace(`/commesse/${id}?updated=1`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Errore aggiornamento';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Cast tipizzato per evitare errori di props opzionali
  const MainCard = MainCardDefault as unknown as React.ComponentType<{
    title?: React.ReactNode;
    children?: React.ReactNode;
    headerSX?: SxProps<Theme>;
    contentSX?: SxProps<Theme>;
    [key: string]: unknown;
  }>;

  return (
    <MainCard title={loading ? 'Caricamento…' : `Modifica commessa`}>
      <form onSubmit={handleSubmit} noValidate autoComplete="off">
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
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
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="appalto">Appalto</MenuItem>
              <MenuItem value="ati">Ati</MenuItem>
              <MenuItem value="sub_appalto">Sub Appalto</MenuItem>
              <MenuItem value="sub_affidamento">Sub Affidamento</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField name="nome" label="Nome Commessa" value={form.nome} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
          </Box>
          <Box>
            <TextField name="committente_commessa" label="Committente Commessa" value={form.committente_commessa} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
          <Box>
            <TextField name="codice" label="Codice Commessa" value={form.codice} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField name="importo_commessa" label="Importo Commessa" type="number" value={form.importo_commessa} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
          </Box>
          {form.cliente_tipo === 'pubblico' && (
            <>
              <Box>
                <TextField name="cig" label="CIG" value={form.cig || ''} onChange={handleChange} fullWidth required={form.cliente_tipo === 'pubblico'} InputLabelProps={{ shrink: true }} />
              </Box>
              <Box>
                <TextField name="cup" label="CUP" value={form.cup || ''} onChange={handleChange} fullWidth required={form.cliente_tipo === 'pubblico'} InputLabelProps={{ shrink: true }} />
              </Box>
            </>
          )}
          <Box
            sx={{
              gridColumn: '1 / -1',
              display: 'grid',
              gap: 2,
              alignItems: 'start',
              gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr 0.5fr' }
            }}
          >
            <TextField name="citta" label="Città" value={form.citta} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            <TextField name="provincia" label="Prov." value={form.provincia} onChange={handleChange} inputProps={{ maxLength: 2 }} sx={{ width: { xs: '100%', md: '7ch' } }} required InputLabelProps={{ shrink: true }} />
            <TextField name="via" label="Via" value={form.via} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            <TextField name="civico" label="N. Civico" value={form.civico} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
          </Box>
          <Box>
            <TextField name="data_inizio" label="Data Inizio" type="date" value={form.data_inizio} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} required />
          </Box>
          <Box>
            <TextField name="data_fine_prevista" label="Data Fine prevista" type="date" value={form.data_fine_prevista} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField name="descrizione" label="Descrizione" value={form.descrizione} onChange={handleChange} fullWidth multiline minRows={3} InputLabelProps={{ shrink: true }} />
          </Box>
        </Box>
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" disabled={saving}>Salva modifiche</Button>
          <Button onClick={() => router.replace(`/commesse/${id}`)} variant="outlined">Annulla</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </form>
    </MainCard>
  );
}


