"use client";
import { useEffect, useState, type ComponentType } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '../../../../../src/utils/axios';
import MainCard from '../../../../../src/ui-component/cards/MainCard';
import SubCard from '../../../../../src/ui-component/cards/SubCard';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import { enqueueSnackbar } from 'notistack';

export default function ModificaClientePage() {
  const params = useParams();
  const id = String(params?.id || '');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type FormaGiuridica = 'PF' | 'PG';
  interface ClienteForm {
    id?: number | string;
    forma_giuridica: FormaGiuridica;
    so_diversa: boolean;
    tipologia?: string;
    // PF
    nome?: string;
    cognome?: string;
    codice_fiscale?: string;
    // PG
    ragione_sociale?: string;
    forma_giuridica_dettaglio?: string;
    partita_iva?: string;
    ateco?: string;
    rea?: string;
    // Contatti
    telefono?: string;
    fax?: string;
    pec?: string;
    email?: string;
    website?: string;
    // Indirizzo legale
    via?: string;
    civico?: string;
    cap?: string;
    citta?: string;
    provincia?: string;
    nazione?: string;
    // Sede operativa
    via_so?: string;
    civico_so?: string;
    cap_so?: string;
    citta_so?: string;
    provincia_so?: string;
    nazione_so?: string;
    // Amministrativi
    mod_pagamento_pref?: string;
    iban?: string;
    codice_sdi?: string;
    note?: string;
    aliquota_iva_predefinita?: number | string;
  }

  const [form, setForm] = useState<ClienteForm>({ forma_giuridica: 'PF', so_diversa: false });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const companyId = localStorage.getItem('company_id');
        const headers: Record<string, string> = {};
        if (companyId) headers['X-Company-ID'] = companyId;
        const { data } = await axios.get(`/api/tenants/clienti/${id}`, { headers });
        if (!active) return;
        const record = { ...(data.data as ClienteForm) };
        if (record.aliquota_iva_predefinita != null && String(record.aliquota_iva_predefinita) !== '') {
          const n = Number(record.aliquota_iva_predefinita as number | string);
          if (!Number.isNaN(n)) record.aliquota_iva_predefinita = n;
        }
        setForm(record);
      } catch {
        setError('Impossibile caricare il cliente');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name as keyof ClienteForm]: value } as ClienteForm));
  };

  const handleToggleSODiversa = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setForm((prev) => ({ ...prev, so_diversa: checked }));
  };

  // Nascondi/azzera sede operativa per Persona Fisica
  useEffect(() => {
    if (form.forma_giuridica === 'PF' && form.so_diversa) {
      setForm((prev) => ({
        ...prev,
        so_diversa: false,
        via_so: '',
        civico_so: '',
        cap_so: '',
        citta_so: '',
        provincia_so: '',
        nazione_so: ''
      }));
    }
  }, [form.forma_giuridica, form.so_diversa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const companyId = localStorage.getItem('company_id');
      const headers: Record<string, string> = {};
      if (companyId) headers['X-Company-ID'] = companyId;
      await axios.put(`/api/tenants/clienti/${id}`, form, { headers });
      enqueueSnackbar('Cliente aggiornato con successo', { variant: 'success' });
      router.replace('/anagrafica?tab=clienti');
    } catch {
      setError('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const MC = MainCard as unknown as ComponentType<Record<string, unknown>>;
  const SC = SubCard as unknown as ComponentType<Record<string, unknown>>;
  const isPF = form.forma_giuridica === 'PF';
  const isPG = form.forma_giuridica === 'PG';

  return (
    <MC title={`Modifica Cliente #${id}`}>
      {loading ? (
        <Alert severity="info">Caricamento…</Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <SC title="Dati generali">
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                  <TextField select name="forma_giuridica" label="Forma giuridica" value={form.forma_giuridica} onChange={handleChange} required InputLabelProps={{ shrink: true }}>
                    <MenuItem value="PF">Persona Fisica</MenuItem>
                    <MenuItem value="PG">Persona Giuridica</MenuItem>
                  </TextField>
                  <TextField name="tipologia" label="Tipologia (settore)" value={form.tipologia || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  {isPF && (
                    <>
                      <TextField name="nome" label="Nome" value={form.nome || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                      <TextField name="cognome" label="Cognome" value={form.cognome || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </>
                  )}
                  {isPG && (
                    <>
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <TextField name="ragione_sociale" label="Ragione sociale" value={form.ragione_sociale || ''} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
                      </Box>
                      <TextField name="forma_giuridica_dettaglio" label="Forma giuridica dettaglio" value={form.forma_giuridica_dettaglio || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </>
                  )}
                </Box>
              </SC>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <SC title="Identificativi fiscali">
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' } }}>
                  <TextField name="codice_fiscale" label="Codice Fiscale" value={form.codice_fiscale || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="partita_iva" label="Partita IVA" value={form.partita_iva || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  {isPG && <TextField name="ateco" label="ATECO" value={form.ateco || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />}
                  {isPG && <TextField name="rea" label="REA" value={form.rea || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />}
                </Box>
              </SC>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <SC title="Contatti">
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
                  <TextField name="telefono" label="Telefono" value={form.telefono || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="fax" label="Fax" value={form.fax || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="pec" label="PEC" value={form.pec || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="email" type="email" label="Email" value={form.email || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="website" label="Website" value={form.website || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                </Box>
              </SC>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <SC title="Indirizzo sede legale / residenza">
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 1fr 1fr' } }}>
                  <TextField name="via" label="Via" value={form.via || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="civico" label="Civico" value={form.civico || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="cap" label="CAP" value={form.cap || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="citta" label="Città" value={form.citta || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="provincia" label="Provincia" value={form.provincia || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="nazione" label="Nazione" value={form.nazione || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                </Box>
              </SC>
            </Grid>

            {isPG && (
              <Grid size={{ xs: 12 }}>
                <SC title="Indirizzo sede operativa (se diverso)">
                  <FormControlLabel control={<Checkbox checked={!!form.so_diversa} onChange={handleToggleSODiversa} />} label="La sede operativa è diversa" />
                  {form.so_diversa && (
                    <Box sx={{ mt: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 1fr 1fr' } }}>
                      <TextField name="via_so" label="Via_SO" value={form.via_so || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                      <TextField name="civico_so" label="Civico_SO" value={form.civico_so || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                      <TextField name="cap_so" label="CAP_SO" value={form.cap_so || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                      <TextField name="citta_so" label="Città_SO" value={form.citta_so || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                      <TextField name="provincia_so" label="Provincia_SO" value={form.provincia_so || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                      <TextField name="nazione_so" label="Nazione_SO" value={form.nazione_so || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </Box>
                  )}
                </SC>
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <SC title="Dati amministrativi">
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
                  <TextField name="mod_pagamento_pref" label="Modalità di pagamento preferita" value={form.mod_pagamento_pref || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <TextField name="iban" label="IBAN" value={form.iban || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                  <FormControl fullWidth>
                    <InputLabel id="aliquota-iva-clienti-label" shrink>Aliquota IVA predefinita</InputLabel>
                    <Select
                      labelId="aliquota-iva-clienti-label"
                      label="Aliquota IVA predefinita"
                      value={form.aliquota_iva_predefinita ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, aliquota_iva_predefinita: Number(e.target.value as string) }))}
                    >
                      <MenuItem value={0}>0%</MenuItem>
                      <MenuItem value={4}>4%</MenuItem>
                      <MenuItem value={10}>10%</MenuItem>
                      <MenuItem value={22}>22%</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField name="codice_sdi" label="Codice SDI" value={form.codice_sdi || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                </Box>
              </SC>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <SC title="Note e gestione interna">
                <TextField name="note" label="Note" value={form.note || ''} onChange={handleChange} fullWidth multiline minRows={3} InputLabelProps={{ shrink: true }} />
              </SC>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={saving}>Salva</Button>
            <Button onClick={() => router.back()} variant="outlined">Annulla</Button>
          </Stack>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </form>
      )}
    </MC>
  );
}


