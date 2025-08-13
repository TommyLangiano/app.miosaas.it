"use client";
import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from '../../../../src/utils/axios';
import MainCard from '../../../../src/ui-component/cards/MainCard';
import SubCard from '../../../../src/ui-component/cards/SubCard';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';

export default function NuovoFornitorePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Forma giuridica
    forma_giuridica: 'PF' as 'PF' | 'PG',
    tipologia: '',
    aliquota_iva_predefinita: '',

    // PF
    nome: '',
    cognome: '',
    codice_fiscale: '',
    partita_iva: '',

    // PG
    ragione_sociale: '',
    forma_giuridica_dettaglio: '',
    ateco: '',
    rea: '',

    // Contatti
    telefono: '',
    email: '',
    fax: '',
    pec: '',
    website: '',

    // Indirizzo sede legale
    via: '',
    civico: '',
    cap: '',
    citta: '',
    provincia: '',
    nazione: '',

    // Sede Operativa
    so_diversa: false,
    via_so: '',
    civico_so: '',
    cap_so: '',
    citta_so: '',
    provincia_so: '',
    nazione_so: '',

    // Fiscale/pagamenti
    mod_pagamento_pref: '',
    iban: '',
    codice_sdi: '',
    note: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleSODiversa = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setForm((prev) => ({ ...prev, so_diversa: checked }));
  };

  // Nascondi/azzera sede operativa per PF
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
      if (form.forma_giuridica === 'PF') {
        if (!form.nome || !form.cognome || !form.codice_fiscale) {
          setError('Per Persona Fisica sono obbligatori Nome, Cognome e Codice Fiscale');
          setSaving(false);
          return;
        }
      }
      if (form.forma_giuridica === 'PG') {
        if (!form.ragione_sociale || !form.partita_iva) {
          setError('Per Persona Giuridica sono obbligatori Ragione Sociale e Partita IVA');
          setSaving(false);
          return;
        }
      }
      const companyId = localStorage.getItem('company_id');
      const headers: Record<string, string> = {};
      if (companyId) headers['X-Company-ID'] = companyId;
      await axios.post('/api/tenants/fornitori', form, { headers });
      router.replace('/anagrafica?tab=fornitori');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const MC = MainCard as unknown as ComponentType<Record<string, unknown>>;
  const SC = SubCard as unknown as ComponentType<Record<string, unknown>>;
  const isPF = form.forma_giuridica === 'PF';
  const isPG = form.forma_giuridica === 'PG';
  return (
    <MC title="Nuovo Fornitore">
      <form onSubmit={handleSubmit} noValidate autoComplete="off">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <SC title="Sezione 1 – Dati generali">
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                <TextField
                  select
                  name="forma_giuridica"
                  label="Forma giuridica"
                  value={form.forma_giuridica}
                  onChange={handleChange}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  <MenuItem value="PF">Persona Fisica</MenuItem>
                  <MenuItem value="PG">Persona Giuridica</MenuItem>
                </TextField>
                <TextField name="tipologia" label="Tipologia (settore)" value={form.tipologia} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                {isPF && (
                  <>
                    <TextField name="nome" label="Nome" value={form.nome} onChange={handleChange} required slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField name="cognome" label="Cognome" value={form.cognome} onChange={handleChange} required slotProps={{ inputLabel: { shrink: true } }} />
                  </>
                )}
                {isPG && (
                  <>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <TextField name="ragione_sociale" label="Ragione sociale" value={form.ragione_sociale} onChange={handleChange} required fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                    </Box>
                    <TextField name="forma_giuridica_dettaglio" label="Forma giuridica dettaglio" value={form.forma_giuridica_dettaglio} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                  </>
                )}
              </Box>
            </SC>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <SC title="Sezione 2 – Identificativi fiscali">
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' } }}>
                <TextField name="codice_fiscale" label="Codice Fiscale" value={form.codice_fiscale} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="partita_iva" label="Partita IVA" value={form.partita_iva} onChange={handleChange} required slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="ateco" label="ATECO" value={form.ateco} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="rea" label="REA" value={form.rea} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
              </Box>
            </SC>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <SC title="Sezione 3 – Contatti">
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
                <TextField name="telefono" label="Telefono" value={form.telefono} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="fax" label="Fax" value={form.fax} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="pec" label="PEC" value={form.pec} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="email" type="email" label="Email" value={form.email} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="website" label="Website" value={form.website} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
              </Box>
            </SC>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <SC title="Sezione 4 – Indirizzo sede legale">
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 1fr 1fr' } }}>
                <TextField name="via" label="Via" value={form.via} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="civico" label="Civico" value={form.civico} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="cap" label="CAP" value={form.cap} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="citta" label="Città" value={form.citta} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="provincia" label="Provincia" value={form.provincia} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="nazione" label="Nazione" value={form.nazione} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
              </Box>
            </SC>
          </Grid>

          {isPG && (
            <Grid size={{ xs: 12 }}>
              <SC title="Sezione 5 – Indirizzo sede operativa (solo se diverso)">
                <FormControlLabel control={<Checkbox checked={!!form.so_diversa} onChange={handleToggleSODiversa} />} label="La sede operativa è diversa" />
                {form.so_diversa && (
                  <Box sx={{ mt: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 1fr 1fr' } }}>
                    <TextField name="via_so" label="Via SO" value={form.via_so} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField name="civico_so" label="Civico SO" value={form.civico_so} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField name="cap_so" label="CAP SO" value={form.cap_so} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField name="citta_so" label="Città SO" value={form.citta_so} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField name="provincia_so" label="Provincia SO" value={form.provincia_so} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField name="nazione_so" label="Nazione SO" value={form.nazione_so} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                  </Box>
                )}
              </SC>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <SC title={`Sezione ${isPF ? '5' : '6'} – Dati amministrativi`}>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
                <TextField name="mod_pagamento_pref" label="Modalità di pagamento preferita" value={form.mod_pagamento_pref} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="iban" label="IBAN" value={form.iban} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField select name="aliquota_iva_predefinita" label="Aliquota IVA predefinita" value={form.aliquota_iva_predefinita} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }}>
                  <MenuItem value={0}>0%</MenuItem>
                  <MenuItem value={4}>4%</MenuItem>
                  <MenuItem value={10}>10%</MenuItem>
                  <MenuItem value={22}>22%</MenuItem>
                </TextField>
                <TextField name="codice_sdi" label="Codice SDI" value={form.codice_sdi} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
              </Box>
            </SC>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <SC title={`Sezione ${isPF ? '6' : '7'} – Note e gestione interna`}>
              <TextField name="note" label="Note" value={form.note} onChange={handleChange} fullWidth multiline minRows={3} slotProps={{ inputLabel: { shrink: true } }} />
            </SC>
          </Grid>
        </Grid>
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" disabled={saving}>Salva</Button>
          <Button component={Link} href="/anagrafica" variant="outlined">Annulla</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </form>
    </MC>
  );
}


