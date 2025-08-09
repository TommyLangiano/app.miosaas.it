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
import Paper from '@mui/material/Paper';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

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

  const MAX_FILE_MB = 20;
  const ACCEPTED_MIME = new Set([
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]);

  function validateFiles(files: File[]): { ok: File[]; errors: string[] } {
    const errors: string[] = [];
    const ok: File[] = [];
    for (const f of files) {
      const sizeMb = f.size / 1024 / 1024;
      if (sizeMb > MAX_FILE_MB) {
        errors.push(`${f.name}: supera ${MAX_FILE_MB} MB`);
        continue;
      }
      if (f.type && !ACCEPTED_MIME.has(f.type)) {
        errors.push(`${f.name}: tipo non consentito (${f.type || 'sconosciuto'})`);
        continue;
      }
      ok.push(f);
    }
    return { ok, errors };
  }

  function handleAddFiles(files: File[]) {
    const { ok, errors } = validateFiles(files);
    if (errors.length > 0) setFileErrors((prev) => [...prev, ...errors]);
    if (ok.length > 0) setSelectedFiles((prev) => [...prev, ...ok]);
  }

  function removeFileAt(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

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

      const fd = new FormData();
      fd.append('cliente', form.cliente);
      fd.append('cliente_tipo', form.cliente_tipo);
      fd.append('tipologia_commessa', form.tipologia_commessa);
      fd.append('codice', form.codice);
      fd.append('nome', form.nome);
      if (form.descrizione) fd.append('descrizione', form.descrizione);
      fd.append('localita', form.localita);
      if (form.data_inizio) fd.append('data_inizio', form.data_inizio);
      if (form.data_fine_prevista) fd.append('data_fine_prevista', form.data_fine_prevista);
      if (form.cig) fd.append('cig', form.cig);
      if (form.cup) fd.append('cup', form.cup);
      if (form.importo_commessa) fd.append('importo_commessa', String(Number(form.importo_commessa)));
      selectedFiles.forEach((f) => fd.append('files', f));

      const res = await axios.post('/api/tenants/commesse', fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Commessa creata con successo con file allegati.');
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
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Paper
                variant="outlined"
                sx={{ p: 3, textAlign: 'center', borderStyle: 'dashed', borderColor: dragOver ? 'primary.main' : 'divider', bgcolor: dragOver ? 'action.hover' : 'transparent' }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = Array.from(e.dataTransfer.files || []);
                  handleAddFiles(files);
                }}
              >
                <Stack spacing={1} alignItems="center">
                  <CloudUploadIcon color={dragOver ? 'primary' : 'action'} />
                  <Typography variant="subtitle2">Trascina qui i file o clicca per selezionare</Typography>
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => {
                      if (!e.target.files) return;
                      handleAddFiles(Array.from(e.target.files));
                      // reset per poter riselezionare stessi file
                      try { e.target.value = ''; } catch {}
                    }}
                    style={{ display: 'none' }}
                  />
                  <Button variant="outlined" onClick={() => document.getElementById('file-input')?.click()}>Scegli file</Button>
                  {selectedFiles.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {selectedFiles.length} file selezionati
                    </Typography>
                  )}
                </Stack>
              </Paper>
              {/* Lista file selezionati */}
              {selectedFiles.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {selectedFiles.map((f, idx) => (
                    <Box key={`${f.name}-${f.lastModified}-${idx}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">{f.name} — {(f.size / 1024 / 1024).toFixed(2)} MB</Typography>
                      <IconButton size="small" aria-label="rimuovi" onClick={() => removeFileAt(idx)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
              {/* Errori file */}
              {fileErrors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {fileErrors.map((msg, i) => (
                    <Alert key={i} severity="warning" sx={{ my: 0.5 }}>{msg}</Alert>
                  ))}
                </Box>
              )}
            </Box>
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

      {/* Upload separato rimosso: ora i file vengono inviati insieme al form */}
    </>
  );
}

