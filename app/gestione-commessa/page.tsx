"use client";
import { useMemo, useState } from 'react';
import { useSWR, mutate } from '../../src/utils/swr';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Grid2 from '@mui/material/Grid2';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import axios from '../../src/utils/axios';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import MainCardDefault from '../../src/ui-component/cards/MainCard';
import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
// Popper custom rimosso
import Fade from '@mui/material/Fade';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import Collapse from '@mui/material/Collapse';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

type MainCardProps = { title?: React.ReactNode; children?: React.ReactNode; headerSX?: SxProps<Theme>; contentSX?: SxProps<Theme>; [key: string]: unknown };
const MainCard = MainCardDefault as unknown as React.ComponentType<MainCardProps>;

type CommessaOption = { id: string | number; codice?: string | null; nome?: string | null };

export default function GestioneCommessaPage() {
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedSide, setSelectedSide] = useState<'entrate' | 'uscite' | ''>('');
  const [usciteVersion, setUsciteVersion] = useState(0);
  const [openUscita, setOpenUscita] = useState(true);
  // Card form uscita senza collapse
  const { data, error, isLoading } = useSWR('/api/tenants/commesse');

  const options: CommessaOption[] = useMemo(() => (Array.isArray(data) ? (data as CommessaOption[]) : []), [data]);
  const selectedCommessaName = useMemo(() => {
    const found = options.find((o) => String(o.id) === selectedId);
    return found?.nome || '';
  }, [options, selectedId]);

  const filterOptions = createFilterOptions<CommessaOption>({
    matchFrom: 'any',
    stringify: (option) => `${option.codice ?? ''} ${option.nome ?? ''} ${option.id}`
  });

  const headerTitle = (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Seleziona Commessa</Typography>
      <Box sx={{ flex: 1, minWidth: 160 }}>
        {isLoading ? (
          <Skeleton width="100%" height={40} />
        ) : error ? (
          <Alert severity="error" sx={{ m: 0 }}>Errore nel caricamento</Alert>
        ) : (
          <Autocomplete
            fullWidth
            options={options}
            filterOptions={filterOptions}
            getOptionLabel={(o) => `${o.codice || '—'} - ${o.nome || '—'}`}
            isOptionEqualToValue={(o, v) => String(o.id) === String(v.id)}
            value={options.find((o) => String(o.id) === selectedId) || null}
            onChange={(_, val) => setSelectedId(val ? String(val.id) : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Cerca o seleziona"
                InputLabelProps={{ shrink: false }}
              />
            )}
            loading={isLoading}
            loadingText="Caricamento…"
            noOptionsText={error ? 'Errore caricamento' : 'Nessuna commessa trovata'}
            clearOnBlur={false}
            autoHighlight
            disablePortal
          />
        )}
      </Box>
    </Stack>
  );

  // Rimosso Popper personalizzato; uso Popper di default con slotProps

  return (
    <>
      {/* Card selezione commessa: dropdown affiancato al titolo in una sola riga */}
      <MainCard title={headerTitle} content={false} headerSX={{ '& .MuiCardHeader-content': { width: '100%' } }} />

      {/* Sezione Uscite / Entrate */}
      <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {/* Entrate */}
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <ArrowUpwardRoundedIcon fontSize="medium" sx={{ color: 'success.main' }} />
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, letterSpacing: 0.5 }}
              >
                Entrate
              </Typography>
            </Stack>
          }
          headerSX={{ '& .MuiCardHeader-content': { width: '100%', display: 'flex', justifyContent: 'center' } }}
          content={false}
           onClick={() => setSelectedSide('entrate')}
          sx={(theme: Theme) => ({
            position: 'relative',
            cursor: 'pointer',
            border: '1px solid',
             borderColor: selectedSide === 'entrate' ? theme.palette.success.main : theme.palette.divider,
            backgroundColor:
              selectedSide === 'entrate'
                ? alpha(theme.palette.success.main, 0.08)
                : theme.palette.background.paper,
            boxShadow: selectedSide === 'entrate' ? '0 4px 14px rgba(0,0,0,0.06)' : 'none',
            transition:
              'border-color 200ms ease, transform 180ms ease, opacity 180ms ease, background-color 200ms ease, box-shadow 200ms ease',
             transform: selectedSide === 'entrate' ? 'scale(1.01)' : 'scale(1)',
             opacity: selectedSide === 'entrate' || selectedSide === '' ? 1 : 0.7,
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: selectedSide === 'entrate' ? 3 : 0,
              backgroundColor: theme.palette.success.main,
              borderTopLeftRadius: theme.shape.borderRadius,
              borderTopRightRadius: theme.shape.borderRadius,
              transition: 'height 180ms ease'
            }
          })}
        />

        {/* Uscite */}
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <ArrowDownwardRoundedIcon fontSize="medium" sx={{ color: 'error.main' }} />
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, letterSpacing: 0.5 }}
              >
                Uscite
              </Typography>
            </Stack>
          }
          headerSX={{ '& .MuiCardHeader-content': { width: '100%', display: 'flex', justifyContent: 'center' } }}
          content={false}
           onClick={() => setSelectedSide('uscite')}
          sx={(theme: Theme) => ({
            position: 'relative',
            cursor: 'pointer',
            border: '1px solid',
             borderColor: selectedSide === 'uscite' ? theme.palette.error.main : theme.palette.divider,
            backgroundColor:
              selectedSide === 'uscite'
                ? alpha(theme.palette.error.main, 0.08)
                : theme.palette.background.paper,
            boxShadow: selectedSide === 'uscite' ? '0 4px 14px rgba(0,0,0,0.06)' : 'none',
            transition:
              'border-color 200ms ease, transform 180ms ease, opacity 180ms ease, background-color 200ms ease, box-shadow 200ms ease',
             transform: selectedSide === 'uscite' ? 'scale(1.01)' : 'scale(1)',
             opacity: selectedSide === 'uscite' || selectedSide === '' ? 1 : 0.7,
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: selectedSide === 'uscite' ? 3 : 0,
              backgroundColor: theme.palette.error.main,
              borderTopLeftRadius: theme.shape.borderRadius,
              borderTopRightRadius: theme.shape.borderRadius,
              transition: 'height 180ms ease'
            }
          })}
        />
      </Box>

      {/* Sezione inserimento + lista dinamica */}
      {selectedSide === 'uscite' && (
        <Box sx={{ mt: 2 }}>
          <MainCard
            title={
              <Stack direction="row" alignItems="center" spacing={1} onClick={() => setOpenUscita((o) => !o)} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, flex: 1 }}>Nuova Uscita{selectedCommessaName ? ` - ${selectedCommessaName}` : ''}</Typography>
                <ExpandMoreRoundedIcon sx={{ transform: openUscita ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }} />
              </Stack>
            }
            content={false}
          >
            <Collapse in={openUscita} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2 }}>
                {selectedId ? (
                  <UscitaForm commessaId={selectedId} onCreated={() => setUsciteVersion((v) => v + 1)} />
                ) : (
                  <Alert severity="info">Seleziona prima una commessa per inserire una nuova uscita.</Alert>
                )}
              </Box>
            </Collapse>
          </MainCard>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <MainCard sx={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }} contentSX={{ minHeight: 320 }}>
          {selectedSide === '' ? (
            <Fade in timeout={200}>
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Seleziona una sezione tra Entrate o Uscite per iniziare.</Typography>
              </Box>
            </Fade>
          ) : (
            <Fade in key={selectedSide + selectedId + usciteVersion} timeout={200}>
              <Box>
                {selectedSide === 'uscite' ? (
                  selectedId ? (
                    <UsciteTable commessaId={selectedId} version={usciteVersion} />
                  ) : (
                    <Alert severity="info">Seleziona una commessa per vedere le uscite.</Alert>
                  )
                ) : (
                  <Alert severity="info">La sezione Entrate verrà implementata a breve.</Alert>
                )}
              </Box>
            </Fade>
          )}
        </MainCard>
      </Box>
    </>
  );
}

type UscitaFormProps = { commessaId: string; onCreated?: () => void };
function UscitaForm({ commessaId, onCreated }: UscitaFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fornitore: '',
    tipologia: '',
    numero_fattura: '',
    emissione_fattura: '',
    importo_totale: '',
    aliquota_iva: '0',
    imponibile: '',
    iva: '',
    data_pagamento: '',
    modalita_pagamento: '',
    banca_emissione: '',
    numero_conto: '',
    stato_uscita: 'No Pagato'
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, commessa_id: commessaId } as Record<string, unknown>;
      await axios.post('/api/tenants/uscite', payload);
      setForm({
        fornitore: '',
        tipologia: '',
        numero_fattura: '',
        emissione_fattura: '',
        importo_totale: '',
        aliquota_iva: '0',
        imponibile: '',
        iva: '',
        data_pagamento: '',
        modalita_pagamento: '',
        banca_emissione: '',
        numero_conto: '',
        stato_uscita: 'No Pagato'
      });
      if (onCreated) onCreated();
    } catch {
      // noop
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Grid2 container spacing={2} sx={{ width: '100%', m: 0 }}>
        {/* Prima riga */}
        <Grid2 size={{ xs: 12, md: 2 }}>
          <TextField label="N. Fattura" InputLabelProps={{ shrink: true }} required fullWidth value={form.numero_fattura} onChange={handleChange('numero_fattura')} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <TextField label="Fornitore" InputLabelProps={{ shrink: true }} required fullWidth value={form.fornitore} onChange={handleChange('fornitore')} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <TextField label="Tipologia" InputLabelProps={{ shrink: true }} required fullWidth value={form.tipologia} onChange={handleChange('tipologia')} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 2 }}>
          <TextField type="date" InputLabelProps={{ shrink: true }} label="Emissione Fattura" required fullWidth value={form.emissione_fattura} onChange={handleChange('emissione_fattura')} />
        </Grid2>

        {/* Seconda riga: Data Pagamento spostata su */}
        <Grid2 size={{ xs: 12, md: 2 }}>
          <TextField type="date" InputLabelProps={{ shrink: true }} label="Data Pagamento" required fullWidth value={form.data_pagamento} onChange={handleChange('data_pagamento')} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 2 }}>
          <TextField type="number" label="Importo Totale" InputLabelProps={{ shrink: true }} required fullWidth value={form.importo_totale} onChange={handleChange('importo_totale')} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="aliquota-iva-label" shrink>Aliquota IVA</InputLabel>
            <Select labelId="aliquota-iva-label" label="Aliquota IVA" value={form.aliquota_iva}
              onChange={(e) => setForm((p) => ({ ...p, aliquota_iva: String(e.target.value) }))}>
              <MenuItem value="0">0%</MenuItem>
              <MenuItem value="4">4%</MenuItem>
              <MenuItem value="10">10%</MenuItem>
              <MenuItem value="22">22%</MenuItem>
            </Select>
          </FormControl>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 2 }}>
          <TextField type="number" label="Imponibile" InputLabelProps={{ shrink: true }} required fullWidth value={form.imponibile} onChange={handleChange('imponibile')} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 2 }}>
          <TextField type="number" label="IVA" InputLabelProps={{ shrink: true }} required fullWidth value={form.iva} onChange={handleChange('iva')} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 2 }}>
          <TextField label={"Modalità di pagamento"} InputLabelProps={{ shrink: true }} fullWidth value={form.modalita_pagamento} onChange={handleChange('modalita_pagamento')} />
        </Grid2>

        {/* Terza riga */}
        <Grid2 size={{ xs: 12, md: 6 }}>
          <TextField label="Banca di Emissione" InputLabelProps={{ shrink: true }} fullWidth value={form.banca_emissione} onChange={handleChange('banca_emissione')} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 3 }}>
          <TextField label="Numero di Conto" InputLabelProps={{ shrink: true }} fullWidth value={form.numero_conto} onChange={handleChange('numero_conto')} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 3 }}>
          <FormControl fullWidth required>
            <InputLabel id="stato-uscita-label" shrink>Stato uscita</InputLabel>
            <Select labelId="stato-uscita-label" label="Stato uscita" value={form.stato_uscita}
              onChange={(e) => setForm((p) => ({ ...p, stato_uscita: String(e.target.value) }))}>
              <MenuItem value="No Pagato">No Pagato</MenuItem>
              <MenuItem value="Pagato">Pagato</MenuItem>
            </Select>
          </FormControl>
        </Grid2>
      </Grid2>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Salvataggio…' : 'Salva Uscita'}
        </Button>
      </Box>
    </Box>
  );
}

type UscitaRow = {
  id?: number | string;
  fornitore?: string;
  tipologia?: string;
  numero_fattura?: string;
  emissione_fattura?: string;
  importo_totale?: number;
  aliquota_iva?: number;
  imponibile?: number;
  iva?: number;
  data_pagamento?: string;
  modalita_pagamento?: string;
  banca_emissione?: string;
  numero_conto?: string;
  stato_uscita?: string;
};

function UsciteTable({ commessaId, version }: { commessaId: string; version: number }) {
  const swrKey = commessaId ? `/api/tenants/uscite?commessa_id=${encodeURIComponent(commessaId)}&v=${version}` : null;
  const { data, error, isLoading } = useSWR(swrKey);
  // Eliminazione immediata: nessuna conferma richiesta
  const [banner, setBanner] = useState<{ text: string; severity: 'success' | 'error' | 'info' } | null>(null);
  const showBanner = (text: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setBanner({ text, severity });
    window.setTimeout(() => setBanner(null), 3000);
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<UscitaRow> & { id?: number | string }>({});
  const [savingEdit, setSavingEdit] = useState(false);

  if (!commessaId) return null;
  if (isLoading) return <Skeleton height={120} />;
  if (error) return <Alert severity="error">Errore nel caricamento uscite</Alert>;

  const rows: UscitaRow[] = Array.isArray(data) ? (data as UscitaRow[]) : [];
  const formatEuro = (value?: number) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    try {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value));
    } catch {
      return `${Number(value).toFixed(2)} €`;
    }
  };

  return (
    <Box>
      {banner && (
        <Box sx={{ mb: 1 }}>
          <Alert severity={banner.severity}>{banner.text}</Alert>
        </Box>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>N° Fattura</TableCell>
            <TableCell sx={{ width: { xs: 'auto', md: '40%' } }}>Fornitore</TableCell>
            <TableCell align="center">Importo Totale</TableCell>
            <TableCell>Data Pagamento</TableCell>
            <TableCell align="center" sx={{ width: { xs: 96, md: 120 } }}>Stato</TableCell>
            <TableCell align="right">Azioni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={idx} hover>
              <TableCell>{r.numero_fattura}</TableCell>
              <TableCell sx={{ width: { xs: 'auto', md: '40%' } }}>{r.fornitore}</TableCell>
              <TableCell align="center">{formatEuro(r.importo_totale)}</TableCell>
              <TableCell>{r.data_pagamento ? String(r.data_pagamento).slice(0, 10) : '—'}</TableCell>
              <TableCell align="center" sx={{ width: { xs: 96, md: 120 } }}>
                {(() => {
                  const raw = (r as unknown as { stato_uscita?: string }).stato_uscita ?? (r.data_pagamento ? 'Pagato' : 'No Pagato');
                  const normalized = String(raw || '').trim().toLowerCase();
                  const isPagato = /^pagat/.test(normalized) && !/^no\s*pagat/.test(normalized);
                  const label = isPagato ? 'Pagato' : 'Non pagato';
                  return (
                    <Box
                      sx={(theme: Theme) => ({
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 1.5,
                        height: 26,
                        minWidth: 110,
                        borderRadius: 10,
                        bgcolor: alpha(isPagato ? theme.palette.success.main : theme.palette.error.main, 0.14),
                        border: '1px solid',
                        borderColor: alpha(isPagato ? theme.palette.success.main : theme.palette.error.main, 0.45),
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        lineHeight: 1
                      })}
                    >
                      {label}
                    </Box>
                  );
                })()}
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title="Modifica Uscita" arrow>
                    <IconButton
                      size="small"
                      aria-label="Modifica Uscita"
                      sx={(theme: Theme) => ({
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'transparent',
                        color: 'text.secondary',
                        borderRadius: 2,
                        width: { xs: 32, sm: 36 },
                        height: { xs: 32, sm: 36 },
                        p: 0,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.grey[500], 0.12),
                          color: theme.palette.grey[700],
                          borderColor: theme.palette.grey[500]
                        }
                      })}
                      onClick={() => {
                        setEditData({ id: r.id, numero_fattura: r.numero_fattura, fornitore: r.fornitore, importo_totale: r.importo_totale, data_pagamento: r.data_pagamento });
                        setEditOpen(true);
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Elimina Uscita" arrow>
                    <IconButton
                      size="small"
                      aria-label="Elimina Uscita"
                      sx={(theme: Theme) => ({
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'transparent',
                        color: 'text.secondary',
                        borderRadius: 2,
                        width: { xs: 32, sm: 36 },
                        height: { xs: 32, sm: 36 },
                        p: 0,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.error.main, 0.12),
                          color: theme.palette.error.main,
                          borderColor: theme.palette.error.main
                        }
                      })}
                      onClick={async () => {
                        if (!r.id) return;
                        try {
                          await axios.delete(`/api/tenants/uscite/${r.id}`);
                          await mutate(swrKey);
                          showBanner('Uscita eliminata.','success');
                        } catch {
                          showBanner('Errore durante eliminazione.','error');
                        }
                      }}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>
                <Alert severity="info">Nessuna uscita presente per questa commessa.</Alert>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Dialog Modifica Uscita */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Modifica uscita</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="N. Fattura"
              fullWidth
              value={editData.numero_fattura || ''}
              onChange={(e) => setEditData((p) => ({ ...p, numero_fattura: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Fornitore"
              fullWidth
              value={editData.fornitore || ''}
              onChange={(e) => setEditData((p) => ({ ...p, fornitore: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="number"
              label="Importo Totale"
              fullWidth
              value={editData.importo_totale ?? ''}
              onChange={(e) => setEditData((p) => ({ ...p, importo_totale: e.target.value as unknown as number }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="Data Pagamento"
              fullWidth
              value={editData.data_pagamento ? String(editData.data_pagamento).slice(0,10) : ''}
              onChange={(e) => setEditData((p) => ({ ...p, data_pagamento: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Annulla</Button>
          <Button
            variant="contained"
            disabled={!editData.id || savingEdit}
            onClick={async () => {
              try {
                setSavingEdit(true);
                const payload: Record<string, unknown> = {};
                if (editData.numero_fattura !== undefined) payload.numero_fattura = editData.numero_fattura;
                if (editData.fornitore !== undefined) payload.fornitore = editData.fornitore;
                if (editData.importo_totale !== undefined && editData.importo_totale !== null) {
                  const numVal = Number(editData.importo_totale);
                  if (!Number.isNaN(numVal)) payload.importo_totale = numVal;
                }
                if (editData.data_pagamento !== undefined) payload.data_pagamento = editData.data_pagamento;
                await axios.put(`/api/tenants/uscite/${editData.id}`, payload);
                setEditOpen(false);
                await mutate(swrKey);
                showBanner('Uscita aggiornata con successo.','success');
              } finally {
                setSavingEdit(false);
              }
            }}
          >
            Salva modifiche
          </Button>
        </DialogActions>
      </Dialog>

      {/* Nessun dialog di conferma per eliminazione */}
    </Box>
  );
}