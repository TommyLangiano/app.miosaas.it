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

export default function NuovaCommessaPage() {
  const [form, setForm] = useState({
    cliente: '',
    codice: '',
    nome: '',
    luogo: '',
    localita: '',
    data_inizio: '',
    data_fine: '',
    data_fine_prevista: '',
    descrizione: '',
    cig: '',
    cup: '',
    imponibile_commessa: '',
    iva_commessa: '',
    importo_commessa: '',
    stato: 'da_avviare'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdCommessaId, setCreatedCommessaId] = useState<number | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [filesList, setFilesList] = useState<Array<{
    file_id: string;
    filename_original: string;
    s3_key: string;
    content_type?: string | null;
    size_bytes?: number | null;
    checksum_sha256?: string | null;
    created_at?: string;
  }>>([]);

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
        // mapping retrocompatibile: se localita non valorizzata, usa luogo; se data_fine_prevista non valorizzata, usa data_fine
        localita: form.localita || form.luogo || '',
        data_fine_prevista: form.data_fine_prevista || form.data_fine || '',
        // rimuovi chiavi legacy lato invio
        luogo: undefined,
        data_fine: undefined,
        imponibile_commessa: form.imponibile_commessa ? Number(form.imponibile_commessa) : null,
        iva_commessa: form.iva_commessa ? Number(form.iva_commessa) : null,
        importo_commessa: form.importo_commessa ? Number(form.importo_commessa) : null
      };
      const res = await axios.post('/api/tenants/commesse', body, { headers });
      const newId = res?.data?.data?.id;
      setCreatedCommessaId(newId ?? null);
      setSuccess('Commessa creata con successo. Ora puoi caricare i file.');
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
              <TextField name="codice" label="Codice" value={form.codice} onChange={handleChange} fullWidth />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField name="nome" label="Nome commessa" value={form.nome} onChange={handleChange} fullWidth />
            </Box>
            <Box>
              <TextField name="localita" label="Località" value={form.localita} onChange={handleChange} fullWidth />
            </Box>
            <Box>
              <TextField name="data_inizio" label="Data Inizio" type="date" value={form.data_inizio} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
            </Box>
            <Box>
              <TextField name="data_fine_prevista" label="Data Fine prevista" type="date" value={form.data_fine_prevista} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField name="descrizione" label="Descrizione" value={form.descrizione} onChange={handleChange} fullWidth multiline minRows={3} />
            </Box>
            <Box>
              <TextField name="cig" label="CIG" value={form.cig || ''} onChange={handleChange} fullWidth />
            </Box>
            <Box>
              <TextField name="cup" label="CUP" value={form.cup || ''} onChange={handleChange} fullWidth />
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

      {createdCommessaId && (
        (() => {
          const MC = MainCard as unknown as ComponentType<Record<string, unknown>>;
          return (
            <MC title={`Upload file per commessa #${createdCommessaId}`}>
              <Stack spacing={2}>
                <input
                  type="file"
                  multiple
                  onChange={async (ev) => {
                    const input = ev.currentTarget;
                    if (!input.files || input.files.length === 0) return;
                    const files = Array.from(input.files);
                    setUploading(true);
                    setError(null);
                    try {
                      const companyId = localStorage.getItem('company_id');
                      const headers: Record<string, string> = {};
                      if (companyId) headers['X-Company-ID'] = companyId;

                      const computeSha256 = async (file: File): Promise<string> => {
                        const buf = await file.arrayBuffer();
                        const digest = await crypto.subtle.digest('SHA-256', buf);
                        const bytes = new Uint8Array(digest);
                        return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
                      };

                      for (const f of files) {
                        // 1) presign
                        const presignRes = await axios.post(
                          `/api/tenants/commesse/${createdCommessaId}/files/presign`,
                          { filename: f.name, contentType: f.type || 'application/octet-stream' },
                          { headers }
                        );
                        const { presignedUrl, file_id, s3_key, content_type } = presignRes.data?.data || {};

                        // 2) PUT su S3 (usa esattamente lo stesso Content-Type del presign)
                        const putRes = await fetch(presignedUrl, {
                          method: 'PUT',
                          headers: { 'Content-Type': content_type || f.type || 'application/octet-stream' },
                          body: f
                        });
                        if (!putRes.ok) {
                          const text = await putRes.text().catch(() => '');
                          console.error('PUT S3 failed', putRes.status, text);
                          setError(`Upload su S3 fallito (${putRes.status}).`);
                          continue; // non salvare nel DB se upload fallisce
                        }

                        // 3) checksum + salva metadati
                        const checksum = await computeSha256(f).catch(() => undefined);
                        await axios.post(
                          `/api/tenants/commesse/${createdCommessaId}/files`,
                          {
                            file_id,
                            filename_original: f.name,
                            s3_key,
                            content_type: content_type || f.type || null,
                            size_bytes: f.size,
                            checksum_sha256: checksum || null
                          },
                          { headers }
                        );

                        setFilesList((prev) => [
                          {
                            file_id,
                            filename_original: f.name,
                            s3_key,
                            content_type: content_type || f.type || null,
                            size_bytes: f.size,
                            checksum_sha256: checksum || null
                          },
                          ...prev
                        ]);
                      }
                    } catch (err: unknown) {
                      const message = err instanceof Error ? err.message : 'Errore durante upload';
                      setError(message);
                    } finally {
                      setUploading(false);
                      // reset input per poter ri-caricare gli stessi file
                      try { if (ev?.currentTarget) ev.currentTarget.value = ''; } catch {}
                    }
                  }}
                />

                {uploading && <Alert severity="info">Caricamento in corso...</Alert>}
                {error && <Alert severity="error">{error}</Alert>}

                <Box>
                  <Typography variant="h6" sx={{ mb: 1 }}>File caricati</Typography>
                  {filesList.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Nessun file caricato.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {filesList.map((f) => (
                        <Box key={f.file_id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.filename_original}</Typography>
                          <Typography variant="caption" color="text.secondary">{f.size_bytes ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB` : ''}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </MC>
          );
        })()
      )}
    </>
  );
}

