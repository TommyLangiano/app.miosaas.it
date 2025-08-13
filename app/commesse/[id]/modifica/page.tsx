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
import Autocomplete from '@mui/material/Autocomplete';

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
    cliente_tipo: '',
    tipologia_commessa: '',
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clienti, setClienti] = useState<Array<Record<string, unknown>>>([]);
  const [clientiLoading, setClientiLoading] = useState<boolean>(false);
  const [committenteInput, setCommittenteInput] = useState<string>('');
  const [selectedCliente, setSelectedCliente] = useState<Record<string, unknown> | null>(null);

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
          cliente_tipo: d.cliente_tipo || '',
          tipologia_commessa: d.tipologia_commessa || '',
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
        setCommittenteInput(d.committente_commessa || '');
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
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const scrollToField = (fieldId: string) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        if ('focus' in el) (el as unknown as { focus: () => void }).focus();
      }, 150);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const newErrors: Record<string, string> = {};
    if (!form.cliente_tipo) newErrors['cliente_tipo'] = 'Campo obbligatorio';
    if (!form.tipologia_commessa) newErrors['tipologia_commessa'] = 'Campo obbligatorio';
    if (!form.nome || form.nome.trim() === '') newErrors['nome'] = 'Campo obbligatorio';
    if (!form.committente_commessa || form.committente_commessa.trim() === '') newErrors['committente_commessa'] = 'Campo obbligatorio';
    if (form.cliente_tipo === 'pubblico') {
      if (!form.cig || form.cig.trim() === '') newErrors['cig'] = 'Campo obbligatorio';
      if (!form.cup || form.cup.trim() === '') newErrors['cup'] = 'Campo obbligatorio';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstKey = Object.keys(newErrors)[0];
      const mapId: Record<string, string> = {
        cliente_tipo: 'field-cliente-tipo',
        tipologia_commessa: 'field-tipologia-commessa',
        nome: 'field-nome',
        committente_commessa: 'field-committente',
        cig: 'field-cig',
        cup: 'field-cup'
      };
      const firstId = mapId[firstKey] || '';
      if (firstId) scrollToField(firstId);
      setSaving(false);
      return;
    }
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

  // Carica elenco clienti per dropdown/autocomplete Cliente Commessa
  useEffect(() => {
    (async () => {
      try {
        setClientiLoading(true);
        const companyId = localStorage.getItem('company_id');
        const headers: Record<string, string> = {};
        if (companyId) headers['X-Company-ID'] = companyId;
        const res = await axios.get('/api/tenants/clienti', { headers });
        setClienti(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch {
        // ignore
      } finally {
        setClientiLoading(false);
      }
    })();
  }, []);

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
              error={Boolean(errors['cliente_tipo'])}
              helperText={errors['cliente_tipo'] || 'Privato o Pubblico'}
              id="field-cliente-tipo"
              InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected) return 'Seleziona Tipologia Cliente';
                  const map: Record<string, string> = { privato: 'Privato', pubblico: 'Pubblico' };
                  return map[String(selected)] || String(selected);
                }
              }}
            >
              <MenuItem value="" disabled>Seleziona Tipologia Cliente</MenuItem>
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
              error={Boolean(errors['tipologia_commessa'])}
              helperText={errors['tipologia_commessa'] || 'Appalto, ATI, Sub Appalto, Sub Affidamento'}
              id="field-tipologia-commessa"
              InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected) return 'Seleziona Tipologia Commessa';
                  const map: Record<string, string> = { appalto: 'Appalto', ati: 'Ati', sub_appalto: 'Sub Appalto', sub_affidamento: 'Sub Affidamento' };
                  return map[String(selected)] || String(selected);
                }
              }}
            >
              <MenuItem value="" disabled>Seleziona Tipologia Commessa</MenuItem>
              <MenuItem value="appalto">Appalto</MenuItem>
              <MenuItem value="ati">Ati</MenuItem>
              <MenuItem value="sub_appalto">Sub Appalto</MenuItem>
              <MenuItem value="sub_affidamento">Sub Affidamento</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField
              name="nome"
              label="Nome Commessa"
              value={form.nome}
              onChange={handleChange}
              fullWidth
              required
              error={Boolean(errors['nome'])}
              helperText={errors['nome'] || ''}
              id="field-nome"
              InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
            />
          </Box>
          <Box>
            <Autocomplete
              freeSolo
              options={clienti.map((c) => {
                const rc = c as Record<string, unknown>;
                const idc = String(rc['id'] as unknown as string);
                const label = (rc['ragione_sociale'] as string) || [rc['nome'], rc['cognome']].filter(Boolean).join(' ') || (rc['email'] as string) || `ID ${idc}`;
                return { id: idc, label, rc };
              })}
              getOptionLabel={(option) => typeof option === 'string' ? option : (option.label || '')}
              value={selectedCliente ? { id: String((selectedCliente as Record<string, unknown>)['id'] || ''), label: (selectedCliente['ragione_sociale'] as string) || [selectedCliente['nome'], selectedCliente['cognome']].filter(Boolean).join(' ') || (selectedCliente['email'] as string) || '' , rc: selectedCliente } : null}
              onChange={(event, newValue) => {
                if (newValue && typeof newValue === 'object') {
                  const val = newValue as unknown as { id: string; label: string; rc: Record<string, unknown> };
                  setSelectedCliente(val.rc);
                  const cl = val.rc as Record<string, unknown>;
                  const displayName = val.label || '';
                  setForm((prev) => ({
                    ...prev,
                    committente_commessa: displayName,
                    citta: (cl['citta'] as string) || prev.citta,
                    provincia: (cl['provincia'] as string) || prev.provincia,
                    via: (cl['via'] as string) || prev.via,
                    civico: (cl['civico'] as string) || prev.civico
                  }));
                  setCommittenteInput(displayName);
                  setErrors((prev) => ({ ...prev, committente_commessa: '' }));
                } else {
                  setSelectedCliente(null);
                }
              }}
              inputValue={committenteInput}
              onInputChange={(event, newInputValue) => {
                setCommittenteInput(newInputValue);
                setForm((prev) => ({ ...prev, committente_commessa: newInputValue }));
                if (newInputValue) setErrors((prev) => ({ ...prev, committente_commessa: '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente Commessa"
                  required
                  fullWidth
                  error={Boolean(errors['committente_commessa'])}
                  helperText={errors['committente_commessa'] || (clientiLoading ? 'Caricamento clienti…' : 'Scrivi o seleziona dall\'anagrafica')}
                  id="field-committente"
                  InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
                />
              )}
              fullWidth
            />
          </Box>
          <Box>
            <TextField name="codice" label="Codice Commessa" value={form.codice} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField name="importo_commessa" label="Importo Commessa" type="number" value={form.importo_commessa} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
          {form.cliente_tipo === 'pubblico' && (
            <>
              <Box>
                <TextField name="cig" label="CIG" value={form.cig || ''} onChange={handleChange} fullWidth required={form.cliente_tipo === 'pubblico'} error={Boolean(errors['cig'])} helperText={errors['cig'] || ''} id="field-cig" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} />
              </Box>
              <Box>
                <TextField name="cup" label="CUP" value={form.cup || ''} onChange={handleChange} fullWidth required={form.cliente_tipo === 'pubblico'} error={Boolean(errors['cup'])} helperText={errors['cup'] || ''} id="field-cup" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} />
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
            <TextField name="citta" label="Città" value={form.citta} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField name="provincia" label="Prov." value={form.provincia} onChange={handleChange} inputProps={{ maxLength: 2 }} sx={{ width: { xs: '100%', md: '7ch' } }} InputLabelProps={{ shrink: true }} />
            <TextField name="via" label="Via" value={form.via} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField name="civico" label="N. Civico" value={form.civico} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
          <Box>
            <TextField name="data_inizio" label="Data Inizio" type="date" value={form.data_inizio} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
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


