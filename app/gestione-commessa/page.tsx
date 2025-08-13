"use client";
import { useMemo, useState, useEffect, Fragment } from 'react';
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
import CloseIcon from '@mui/icons-material/Close';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Grid from '@mui/material/Grid';
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
import { enqueueSnackbar, closeSnackbar } from 'notistack';

type MainCardProps = { title?: React.ReactNode; children?: React.ReactNode; headerSX?: SxProps<Theme>; contentSX?: SxProps<Theme>; [key: string]: unknown };
const MainCard = MainCardDefault as unknown as React.ComponentType<MainCardProps>;

type CommessaOption = { id: string | number; codice?: string | null; nome?: string | null };

export default function GestioneCommessaPage() {
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedSide, setSelectedSide] = useState<'entrate' | 'uscite' | ''>('');
  const [usciteVersion, setUsciteVersion] = useState(0);
  const [entrateVersion, setEntrateVersion] = useState(0);
  const [openUscita, setOpenUscita] = useState(true);
  const [selectedDocType, setSelectedDocType] = useState<'fattura' | 'scontrini' | ''>('');
  // Card form uscita senza collapse
  const { data, error, isLoading } = useSWR('/api/tenants/commesse');
  // rimosso utilizzo di initializedFromQuery (non serve più)

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
  // Rimosso: nessuna inizializzazione automatica da query string

  return (
    <>
      {/* Card selezione commessa: dropdown affiancato al titolo in una sola riga */}
      <MainCard title={headerTitle} content={false} headerSX={{ '& .MuiCardHeader-content': { width: '100%' } }} />

      {/* Sezione Uscite / Entrate: visibile solo se è selezionata una commessa */}
      {selectedId && (
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
                Ricavi
              </Typography>
            </Stack>
          }
          headerSX={{ '& .MuiCardHeader-content': { width: '100%', display: 'flex', justifyContent: 'center' } }}
          content={false}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            setSelectedSide('entrate');
            setSelectedDocType('fattura');
          }}
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
                Costi
              </Typography>
            </Stack>
          }
          headerSX={{ '& .MuiCardHeader-content': { width: '100%', display: 'flex', justifyContent: 'center' } }}
          content={false}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            setSelectedSide('uscite');
            setSelectedDocType(selectedDocType || 'fattura');
          }}
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
      )}

      {/* Toggle secondario: Fattura / Scontrini (rettangolari sottili). Visibile solo dopo aver scelto Entrate/Costi */}
      {selectedId && selectedSide && (
      <Box
        sx={{
          mt: 1.5,
          display: 'grid',
          gridTemplateColumns: {
            xs: selectedSide === 'entrate' ? '1fr' : '1fr 1fr',
            md: selectedSide === 'entrate' ? '1fr' : '1fr 1fr'
          },
          gap: 1
        }}
      >
        <MainCard
          title={<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Fattura</Typography>}
          headerSX={{ '& .MuiCardHeader-content': { width: '100%', display: 'flex', justifyContent: 'center' }, p: 1 }}
          content={false}
          onClick={() => {
            if (selectedSide === 'uscite') setSelectedDocType('fattura');
          }}
          sx={(theme: Theme) => ({
            cursor: selectedSide === 'uscite' ? 'pointer' : 'default',
            pointerEvents: selectedSide === 'uscite' ? 'auto' : 'none',
            border: '1px solid',
            borderColor: theme.palette.divider,
            backgroundColor: selectedDocType === 'fattura' ? theme.palette.grey[100] : theme.palette.background.paper,
            color: theme.palette.text.primary,
            transition: 'background-color 160ms ease, transform 140ms ease, border-color 140ms ease',
            minHeight: 40,
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: selectedDocType === 'fattura' ? 4 : 0,
              backgroundColor: theme.palette.grey[500],
              borderTopLeftRadius: theme.shape.borderRadius,
              borderTopRightRadius: theme.shape.borderRadius,
              transition: 'height 160ms ease'
            },
            '&:hover': {
              backgroundColor: selectedSide === 'uscite'
                ? (selectedDocType === 'fattura' ? theme.palette.grey[200] : alpha(theme.palette.grey[700], 0.04))
                : (selectedDocType === 'fattura' ? theme.palette.grey[100] : theme.palette.background.paper)
            }
          })}
        />
        {selectedSide === 'uscite' && (
          <MainCard
            title={<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Scontrini</Typography>}
            headerSX={{ '& .MuiCardHeader-content': { width: '100%', display: 'flex', justifyContent: 'center' }, p: 1 }}
            content={false}
            onClick={() => { setSelectedDocType('scontrini'); }}
            sx={(theme: Theme) => ({
              cursor: 'pointer',
              border: '1px solid',
              borderColor: theme.palette.divider,
              backgroundColor: selectedDocType === 'scontrini' ? theme.palette.grey[100] : theme.palette.background.paper,
              color: theme.palette.text.primary,
              transition: 'background-color 160ms ease, transform 140ms ease, border-color 140ms ease',
              minHeight: 40,
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: selectedDocType === 'scontrini' ? 4 : 0,
                backgroundColor: theme.palette.grey[500],
                borderTopLeftRadius: theme.shape.borderRadius,
                borderTopRightRadius: theme.shape.borderRadius,
                transition: 'height 160ms ease'
              },
              '&:hover': {
                backgroundColor: selectedDocType === 'scontrini' ? theme.palette.grey[200] : alpha(theme.palette.grey[700], 0.04)
              }
            })}
          />
        )}
      </Box>
      )}

      {/* Sezione inserimento + lista dinamica: COSTI */}
      {selectedSide === 'uscite' && (
        <Box sx={{ mt: 2 }}>
          <MainCard
            title={
              <Stack direction="row" alignItems="center" spacing={1} onClick={() => setOpenUscita((o) => !o)} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, flex: 1 }}>Nuovo Costo{selectedCommessaName ? ` - ${selectedCommessaName}` : ''}</Typography>
                <ExpandMoreRoundedIcon sx={{ transform: openUscita ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }} />
              </Stack>
            }
            content={false}
          >
            <Collapse in={openUscita} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2 }}>
                {selectedId ? (
                  <UscitaForm
                    key={`${selectedSide}-${selectedId}-${selectedDocType || 'fattura'}`}
                    docType={(selectedDocType || 'fattura') as 'fattura' | 'scontrini'}
                    commessaId={selectedId}
                    onCreated={() => setUsciteVersion((v) => v + 1)}
                  />
                ) : (
                  <Alert severity="info">Seleziona prima una commessa per inserire una nuova uscita.</Alert>
              )}
              </Box>
            </Collapse>
          </MainCard>
        </Box>
      )}

      {/* Sezione inserimento + lista dinamica: RICAVI */}
      {selectedSide === 'entrate' && (
        <Box sx={{ mt: 2 }}>
          <MainCard
            title={
              <Stack direction="row" alignItems="center" spacing={1} onClick={() => setOpenUscita((o) => !o)} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, flex: 1 }}>Nuovo Ricavo{selectedCommessaName ? ` - ${selectedCommessaName}` : ''}</Typography>
                <ExpandMoreRoundedIcon sx={{ transform: openUscita ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }} />
              </Stack>
            }
            content={false}
          >
            <Collapse in={openUscita} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2 }}>
                {selectedId ? (
                  <EntrataForm commessaId={selectedId} onCreated={() => setEntrateVersion((v) => v + 1)} />
                ) : (
                 <Alert severity="info">Seleziona prima una commessa per inserire un nuovo ricavo.</Alert>
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
                {selectedSide === 'uscite'
                  ? (
                  selectedId ? (
                        <UsciteTable commessaId={selectedId} version={usciteVersion} docType={(selectedDocType || 'fattura') as 'fattura' | 'scontrini'} />
                  ) : (
                    <Alert severity="info">Seleziona una commessa per vedere le uscite.</Alert>
                  )
                    )
                  : (
                      selectedId ? (
                        <EntrateTable commessaId={selectedId} version={entrateVersion} />
                ) : (
                        <Alert severity="info">Seleziona una commessa per vedere le entrate.</Alert>
                      )
                )}
              </Box>
            </Fade>
          )}
        </MainCard>
      </Box>
    </>
  );
}

type UscitaFormProps = { commessaId: string; docType: 'fattura' | 'scontrini'; onCreated?: () => void };
function UscitaForm({ commessaId, docType, onCreated }: UscitaFormProps) {
  const [saving, setSaving] = useState(false);
  type FornitoreOption = {
    id?: number | string;
    ragione_sociale?: string;
    nome?: string;
    cognome?: string;
    tipologia?: string;
    aliquota_iva_predefinita?: number | string | null;
    mod_pagamento_pref?: string | null;
  };
  const [fornitoreQuery, setFornitoreQuery] = useState('');
  const [selectedFornitore, setSelectedFornitore] = useState<FornitoreOption | string | null>(null);
  const { data: fornitoriData } = useSWR('/api/tenants/fornitori');
  const formatFornitoreLabel = (f: FornitoreOption): string =>
    (f.ragione_sociale && f.ragione_sociale.trim())
      ? f.ragione_sociale
      : `${f.nome || ''} ${f.cognome || ''}`.trim();
  const allFornitori: FornitoreOption[] = Array.isArray(fornitoriData) ? (fornitoriData as FornitoreOption[]) : [];
  const fornitori: FornitoreOption[] = (fornitoreQuery || '').trim() === ''
    ? [...allFornitori].sort((a, b) => (formatFornitoreLabel(a).localeCompare(formatFornitoreLabel(b), 'it', { sensitivity: 'base' })))
    : allFornitori
        .filter((f) => formatFornitoreLabel(f).toLowerCase().includes(fornitoreQuery.toLowerCase()))
        .sort((a, b) => (formatFornitoreLabel(a).localeCompare(formatFornitoreLabel(b), 'it', { sensitivity: 'base' })));
  const getInitialForm = (currentDocType: 'fattura' | 'scontrini') => ({
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
    stato_uscita: currentDocType === 'scontrini' ? 'Pagato' : 'No Pagato'
  });
  const [form, setForm] = useState(getInitialForm(docType));
  const computeDerived = (importoStr: string, aliquotaStr: string): { imponibile: string; iva: string } => {
    const parseNum = (v: string): number | null => {
      if (v == null) return null;
      const n = Number(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const importo = parseNum(importoStr);
    const ali = parseNum(aliquotaStr);
    if (docType !== 'fattura' || importo == null || ali == null) return { imponibile: '', iva: '' };
    const imponibileVal = importo / (1 + ali / 100);
    const ivaVal = importo - imponibileVal;
    return { imponibile: imponibileVal.toFixed(2), iva: ivaVal.toFixed(2) };
  };
  useEffect(() => {
    // reset form quando cambia commessa o tipo documento
    setForm(getInitialForm(docType));
  }, [commessaId, docType]);
  const handleReset = () => { setForm(getInitialForm(docType)); setFornitoreQuery(''); setSelectedFornitore(null); };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value } as typeof prev;
      if (docType === 'fattura' && (field === 'importo_totale')) {
        const { imponibile, iva } = computeDerived(String(next.importo_totale), String(next.aliquota_iva));
        next.imponibile = imponibile;
        next.iva = iva;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, commessa_id: commessaId, tipologia_uscita: docType } as Record<string, unknown>;
      if (docType === 'scontrini') {
        (payload as Record<string, unknown>).stato_uscita = 'Pagato';
      }
      await axios.post('/api/tenants/uscite', payload);
      setForm({
        ...getInitialForm(docType)
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
      {/* Reset automatico su cambio commessa o tipo documento */}
      {/**/}
      <Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
        {/* Prima riga */}
        {docType === 'scontrini' ? (
          <>
            <Grid size={{ xs: 12, md: 5 }}>
              <Autocomplete
                fullWidth
                freeSolo
                options={fornitori}
                getOptionLabel={(o) => (typeof o === 'string' ? o : formatFornitoreLabel(o as FornitoreOption))}
                filterOptions={(x) => x as FornitoreOption[]}
                inputValue={fornitoreQuery}
                value={selectedFornitore}
                onInputChange={(_, val) => {
                  setFornitoreQuery(val || '');
                }}
                onChange={(_, val) => {
                  if (!val) {
                    // clear fornitore and related prefilled fields
                    setFornitoreQuery('');
                    setSelectedFornitore(null);
                    setForm((p) => {
                      const normalizedAli = '0';
                      const { imponibile, iva } = computeDerived(String(p.importo_totale), normalizedAli);
                      return {
                        ...p,
                        fornitore: '',
                        tipologia: '',
                        modalita_pagamento: '',
                        aliquota_iva: normalizedAli,
                        imponibile,
                        iva
                      };
                    });
                    return;
                  }
                  if (typeof val === 'string') {
                    setFornitoreQuery(val);
                    setSelectedFornitore(val);
                    setForm((p) => ({ ...p, fornitore: val }));
                    return;
                  }
                  const v = val as FornitoreOption;
                  setForm((p) => {
                    const rawAli = v.aliquota_iva_predefinita;
                    const normalizedAli = rawAli != null && String(rawAli) !== '' && !Number.isNaN(Number(rawAli))
                      ? String(Number(rawAli))
                      : p.aliquota_iva;
                    const { imponibile, iva } = computeDerived(String(p.importo_totale), normalizedAli);
                    return {
                      ...p,
                      fornitore: formatFornitoreLabel(v),
                      tipologia: v.tipologia || p.tipologia,
                      modalita_pagamento: v.mod_pagamento_pref || p.modalita_pagamento,
                      aliquota_iva: normalizedAli,
                      imponibile,
                      iva
                    };
                  });
                  setFornitoreQuery(formatFornitoreLabel(v));
                  setSelectedFornitore(val);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Fornitore" InputLabelProps={{ shrink: true }} required />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField label="Tipologia" InputLabelProps={{ shrink: true }} required fullWidth value={form.tipologia} onChange={handleChange('tipologia')} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField type="date" InputLabelProps={{ shrink: true }} label="Data" required fullWidth value={form.data_pagamento} onChange={handleChange('data_pagamento')} />
            </Grid>
          </>
        ) : (
          <>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField label="N. Fattura" InputLabelProps={{ shrink: true }} required fullWidth value={form.numero_fattura} onChange={handleChange('numero_fattura')} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Autocomplete
            fullWidth
            freeSolo
            options={fornitori}
            getOptionLabel={(o) => (typeof o === 'string' ? o : formatFornitoreLabel(o as FornitoreOption))}
            filterOptions={(x) => x as FornitoreOption[]}
            inputValue={fornitoreQuery}
            value={selectedFornitore}
            onInputChange={(_, val) => {
              setFornitoreQuery(val || '');
            }}
            onChange={(_, val) => {
              if (!val) {
                setFornitoreQuery('');
                setSelectedFornitore(null);
                setForm((p) => {
                  const normalizedAli = '0';
                  const { imponibile, iva } = computeDerived(String(p.importo_totale), normalizedAli);
                  return {
                    ...p,
                    fornitore: '',
                    tipologia: '',
                    modalita_pagamento: '',
                    aliquota_iva: normalizedAli,
                    imponibile,
                    iva
                  };
                });
                return;
              }
              if (typeof val === 'string') {
                setFornitoreQuery(val);
                setSelectedFornitore(val);
                setForm((p) => ({ ...p, fornitore: val }));
                return;
              }
              const v = val as FornitoreOption;
              setForm((p) => {
                const rawAli = v.aliquota_iva_predefinita;
                const normalizedAli = rawAli != null && String(rawAli) !== '' && !Number.isNaN(Number(rawAli))
                  ? String(Number(rawAli))
                  : p.aliquota_iva;
                const { imponibile, iva } = computeDerived(String(p.importo_totale), normalizedAli);
                return {
                  ...p,
                  fornitore: formatFornitoreLabel(v),
                  tipologia: v.tipologia || p.tipologia,
                  modalita_pagamento: v.mod_pagamento_pref || p.modalita_pagamento,
                  aliquota_iva: normalizedAli,
                  imponibile,
                  iva
                };
              });
              setFornitoreQuery(formatFornitoreLabel(v));
              setSelectedFornitore(val);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Fornitore" InputLabelProps={{ shrink: true }} required />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField label="Tipologia" InputLabelProps={{ shrink: true }} required fullWidth value={form.tipologia} onChange={handleChange('tipologia')} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField type="date" InputLabelProps={{ shrink: true }} label="Emissione Fattura" required fullWidth value={form.emissione_fattura} onChange={handleChange('emissione_fattura')} />
        </Grid>
          </>
        )}

        {/* Seconda riga: Data Pagamento spostata su */}
        {docType === 'scontrini' ? (
          <>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField type="number" label="Importo" InputLabelProps={{ shrink: true }} required fullWidth value={form.importo_totale} onChange={handleChange('importo_totale')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Metodo di Pagamento" InputLabelProps={{ shrink: true }} fullWidth value={form.modalita_pagamento} onChange={handleChange('modalita_pagamento')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Stato" InputLabelProps={{ shrink: true }} fullWidth value={'Pagato'} disabled />
            </Grid>
          </>
        ) : (
          <>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField type="date" InputLabelProps={{ shrink: true }} label="Data Pagamento" required fullWidth value={form.data_pagamento} onChange={handleChange('data_pagamento')} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField type="number" label="Importo Totale" InputLabelProps={{ shrink: true }} required fullWidth value={form.importo_totale} onChange={handleChange('importo_totale')} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="aliquota-iva-label" shrink>Aliquota IVA</InputLabel>
            <Select labelId="aliquota-iva-label" label="Aliquota IVA" value={form.aliquota_iva}
              onChange={(e) => setForm((p) => {
                const nextAli = String(e.target.value);
                const { imponibile, iva } = computeDerived(String(p.importo_totale), nextAli);
                return { ...p, aliquota_iva: nextAli, imponibile, iva };
              })}>
              <MenuItem value="0">0%</MenuItem>
              <MenuItem value="4">4%</MenuItem>
              <MenuItem value="10">10%</MenuItem>
              <MenuItem value="22">22%</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField type="number" label="Imponibile" InputLabelProps={{ shrink: true }} required fullWidth value={form.imponibile} InputProps={{ readOnly: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField type="number" label="IVA" InputLabelProps={{ shrink: true }} required fullWidth value={form.iva} InputProps={{ readOnly: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField label={"Modalità di pagamento"} InputLabelProps={{ shrink: true }} fullWidth value={form.modalita_pagamento} onChange={handleChange('modalita_pagamento')} />
        </Grid>
          </>
        )}

        {/* Terza riga */}
        {docType === 'scontrini' ? null : (
          <>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label="Banca di Emissione" InputLabelProps={{ shrink: true }} fullWidth value={form.banca_emissione} onChange={handleChange('banca_emissione')} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField label="Numero di Conto" InputLabelProps={{ shrink: true }} fullWidth value={form.numero_conto} onChange={handleChange('numero_conto')} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <FormControl fullWidth required>
            <InputLabel id="stato-uscita-label" shrink>Stato uscita</InputLabel>
            <Select labelId="stato-uscita-label" label="Stato uscita" value={form.stato_uscita}
              onChange={(e) => setForm((p) => ({ ...p, stato_uscita: String(e.target.value) }))}>
              <MenuItem value="No Pagato">No Pagato</MenuItem>
              <MenuItem value="Pagato">Pagato</MenuItem>
            </Select>
          </FormControl>
        </Grid>
          </>
        )}
      </Grid>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={handleReset} disabled={saving}>Reset Campi</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Salvataggio…' : 'Salva Costo'}
        </Button>
      </Box>
    </Box>
  );
}

type EntrataFormProps = { commessaId: string; onCreated?: () => void };
function EntrataForm({ commessaId, onCreated }: EntrataFormProps) {
  const [saving, setSaving] = useState(false);
  type ClienteOption = {
    id?: number | string;
    ragione_sociale?: string;
    nome?: string;
    cognome?: string;
    tipologia?: string;
    aliquota_iva_predefinita?: number | string | null;
    mod_pagamento_pref?: string | null;
  };
  const [clienteQuery, setClienteQuery] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<ClienteOption | string | null>(null);
  const { data: clientiData } = useSWR('/api/tenants/clienti');
  const formatClienteLabel = (c: ClienteOption): string =>
    (c.ragione_sociale && c.ragione_sociale.trim())
      ? c.ragione_sociale
      : `${c.nome || ''} ${c.cognome || ''}`.trim();
  const allClienti: ClienteOption[] = Array.isArray(clientiData) ? (clientiData as ClienteOption[]) : [];
  const clienti: ClienteOption[] = (clienteQuery || '').trim() === ''
    ? [...allClienti].sort((a, b) => (formatClienteLabel(a).localeCompare(formatClienteLabel(b), 'it', { sensitivity: 'base' })))
    : allClienti
        .filter((c) => formatClienteLabel(c).toLowerCase().includes(clienteQuery.toLowerCase()))
        .sort((a, b) => (formatClienteLabel(a).localeCompare(formatClienteLabel(b), 'it', { sensitivity: 'base' })));
  const getInitialForm = () => ({
    cliente: '',
    tipologia: '',
    numero_fattura: '',
    emissione_fattura: '',
    importo_totale: '',
    aliquota_iva: '0',
    imponibile: '',
    iva: '',
    data_pagamento: '',
    modalita_pagamento: '',
    stato_entrata: 'No Pagato',
    tipologia_entrata: 'fattura'
  });
  const [form, setForm] = useState(getInitialForm());
  const computeDerived = (importoStr: string, aliquotaStr: string): { imponibile: string; iva: string } => {
    const parseNum = (v: string): number | null => {
      if (v == null) return null;
      const n = Number(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const importo = parseNum(importoStr);
    const ali = parseNum(aliquotaStr);
    if (importo == null || ali == null) return { imponibile: '', iva: '' };
    const imponibileVal = importo / (1 + ali / 100);
    const ivaVal = importo - imponibileVal;
    return { imponibile: imponibileVal.toFixed(2), iva: ivaVal.toFixed(2) };
  };
  const handleReset = () => { setForm(getInitialForm()); setClienteQuery(''); setSelectedCliente(null); };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value } as typeof prev;
      if (field === 'importo_totale') {
        const { imponibile, iva } = computeDerived(String(next.importo_totale), String(next.aliquota_iva));
        next.imponibile = imponibile;
        next.iva = iva;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, commessa_id: commessaId } as Record<string, unknown>;
      await axios.post('/api/tenants/entrate', payload);
      setForm(getInitialForm());
      if (onCreated) onCreated();
    } catch {
      // noop
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField label="N. Fattura" InputLabelProps={{ shrink: true }} required fullWidth value={form.numero_fattura} onChange={handleChange('numero_fattura')} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Autocomplete
            fullWidth
            freeSolo
            options={clienti}
            getOptionLabel={(o) => (typeof o === 'string' ? o : formatClienteLabel(o as ClienteOption))}
            filterOptions={(x) => x as ClienteOption[]}
            inputValue={clienteQuery}
            value={selectedCliente}
            onInputChange={(_, val) => {
              setClienteQuery(val || '');
            }}
            onChange={(_, val) => {
              if (!val) {
                setClienteQuery('');
                setSelectedCliente(null);
                setForm((p) => {
                  const normalizedAli = '0';
                  const { imponibile, iva } = computeDerived(String(p.importo_totale), normalizedAli);
                  return {
                    ...p,
                    cliente: '',
                    tipologia: '',
                    modalita_pagamento: '',
                    aliquota_iva: normalizedAli,
                    imponibile,
                    iva
                  };
                });
                return;
              }
              if (typeof val === 'string') {
                setClienteQuery(val);
                setSelectedCliente(val);
                setForm((p) => ({ ...p, cliente: val }));
                return;
              }
              const v = val as ClienteOption;
              setForm((p) => {
                const rawAli = v.aliquota_iva_predefinita;
                const normalizedAli = rawAli != null && String(rawAli) !== '' && !Number.isNaN(Number(rawAli))
                  ? String(Number(rawAli))
                  : p.aliquota_iva;
                const { imponibile, iva } = computeDerived(String(p.importo_totale), normalizedAli);
                return {
                  ...p,
                  cliente: formatClienteLabel(v),
                  tipologia: v.tipologia || p.tipologia,
                  modalita_pagamento: v.mod_pagamento_pref || p.modalita_pagamento,
                  aliquota_iva: normalizedAli,
                  imponibile,
                  iva
                };
              });
              setClienteQuery(formatClienteLabel(v));
              setSelectedCliente(val);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Cliente" InputLabelProps={{ shrink: true }} required />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField label="Tipologia" InputLabelProps={{ shrink: true }} required fullWidth value={form.tipologia} onChange={handleChange('tipologia')} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField type="date" InputLabelProps={{ shrink: true }} label="Emissione Fattura" required fullWidth value={form.emissione_fattura} onChange={handleChange('emissione_fattura')} />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <TextField type="date" InputLabelProps={{ shrink: true }} label="Data Pagamento" required fullWidth value={form.data_pagamento} onChange={handleChange('data_pagamento')} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField type="number" label="Importo Totale" InputLabelProps={{ shrink: true }} required fullWidth value={form.importo_totale} onChange={handleChange('importo_totale')} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="aliquota-iva-entrate-label" shrink>Aliquota IVA</InputLabel>
            <Select labelId="aliquota-iva-entrate-label" label="Aliquota IVA" value={form.aliquota_iva}
              onChange={(e) => setForm((p) => {
                const nextAli = String(e.target.value);
                const { imponibile, iva } = computeDerived(String(p.importo_totale), nextAli);
                return { ...p, aliquota_iva: nextAli, imponibile, iva };
              })}>
              <MenuItem value="0">0%</MenuItem>
              <MenuItem value="4">4%</MenuItem>
              <MenuItem value="10">10%</MenuItem>
              <MenuItem value="22">22%</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField type="number" label="Imponibile" InputLabelProps={{ shrink: true }} required fullWidth value={form.imponibile} InputProps={{ readOnly: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField type="number" label="IVA" InputLabelProps={{ shrink: true }} required fullWidth value={form.iva} InputProps={{ readOnly: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label={'Modalità di pagamento'} InputLabelProps={{ shrink: true }} fullWidth value={form.modalita_pagamento} onChange={handleChange('modalita_pagamento')} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth required>
            <InputLabel id="stato-entrata-label" shrink>Stato</InputLabel>
            <Select labelId="stato-entrata-label" label="Stato" value={form.stato_entrata}
              onChange={(e) => setForm((p) => ({ ...p, stato_entrata: String(e.target.value) }))}>
              <MenuItem value="No Pagato">No Pagato</MenuItem>
              <MenuItem value="Pagato">Pagato</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={handleReset} disabled={saving}>Reset Campi</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Salvataggio…' : 'Salva Ricavo'}
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
  tipologia_uscita?: 'fattura' | 'scontrini';
};

function UsciteTable({ commessaId, version, docType }: { commessaId: string; version: number; docType: 'fattura' | 'scontrini' }) {
  const swrKey = commessaId ? `/api/tenants/uscite?commessa_id=${encodeURIComponent(commessaId)}&tipologia_uscita=${encodeURIComponent(docType)}&v=${version}` : null;
  const { data, error, isLoading } = useSWR(swrKey);
  // Eliminazione immediata: nessuna conferma richiesta
  const showBanner = (text: string, severity: 'success' | 'error' | 'info' = 'success') => {
    enqueueSnackbar(text, {
      variant: severity,
      autoHideDuration: 3000,
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      action: (key) => (
        <IconButton size="small" aria-label="Chiudi" onClick={() => closeSnackbar(key)} sx={{ color: 'inherit' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      )
    });
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<UscitaRow> & { id?: number | string }>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingStatoId, setSavingStatoId] = useState<string | number | null>(null);
  const [statoAnchorEl, setStatoAnchorEl] = useState<HTMLElement | null>(null);
  const [statoRowId, setStatoRowId] = useState<string | number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<string>('');
  // const [statoMenuAnchorEl, setStatoMenuAnchorEl] = useState<null | HTMLElement>(null);
  // const [statoMenuRowId, setStatoMenuRowId] = useState<string | number | null>(null);

  const allRows: UscitaRow[] = Array.isArray(data) ? (data as UscitaRow[]) : [];
  const rows: UscitaRow[] = allRows.filter((r) => {
    const t = (r as unknown as { tipologia_uscita?: 'fattura' | 'scontrini' }).tipologia_uscita;
    if (!t) return docType === 'fattura';
    return t === docType;
  });
  const formatEuro = (value?: number) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    try {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value));
    } catch {
      return `${Number(value).toFixed(2)} €`;
    }
  };

  // Espansione dettagli riga (Uscite)
  const [expandedUscite, setExpandedUscite] = useState<Record<string | number, boolean>>({});
  const toggleExpandUscita = (rowId?: string | number) => {
    if (rowId == null) return;
    setExpandedUscite((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };
  if (!commessaId) return null;
  if (isLoading) return <Skeleton height={120} />;
  if (error) return <Alert severity="error">Errore nel caricamento uscite</Alert>;

  const renderUscitaDetails = (r: UscitaRow) => (
    <Box sx={{ p: 1.5, bgcolor: (theme: Theme) => alpha(theme.palette.grey[500], 0.06), borderRadius: 2 }}>
      <Grid container spacing={1.5} columns={12}>
        {r.emissione_fattura && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Emissione Fattura</Typography>
            <Typography variant="body2">{String(r.emissione_fattura).slice(0,10)}</Typography>
          </Grid>
        )}
        {((r as { aliquota_iva?: number }).aliquota_iva ?? null) !== null && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Aliquota IVA</Typography>
            <Typography variant="body2">{String((r as { aliquota_iva?: number }).aliquota_iva)}%</Typography>
          </Grid>
        )}
        {((r as { imponibile?: number }).imponibile ?? null) !== null && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Imponibile</Typography>
            <Typography variant="body2">{formatEuro((r as { imponibile?: number }).imponibile)}</Typography>
          </Grid>
        )}
        {((r as { iva?: number }).iva ?? null) !== null && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">IVA</Typography>
            <Typography variant="body2">{formatEuro((r as { iva?: number }).iva)}</Typography>
          </Grid>
        )}
        {((r as { banca_emissione?: string }).banca_emissione || '').trim() !== '' && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Banca di Emissione</Typography>
            <Typography variant="body2">{(r as { banca_emissione?: string }).banca_emissione}</Typography>
          </Grid>
        )}
        {((r as { numero_conto?: string }).numero_conto || '').trim() !== '' && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Numero di Conto</Typography>
            <Typography variant="body2">{(r as { numero_conto?: string }).numero_conto}</Typography>
          </Grid>
        )}
        {((r as { modalita_pagamento?: string }).modalita_pagamento || '').trim() !== '' && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Modalità di pagamento</Typography>
            <Typography variant="body2">{(r as { modalita_pagamento?: string }).modalita_pagamento}</Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const updateStatoAndSave = async (rowId: string | number, newValue: 'Pagato' | 'No Pagato') => {
    try {
      setSavingStatoId(rowId);
      await axios.put(`/api/tenants/uscite/${rowId}` , { stato_uscita: newValue });
      await mutate(swrKey);
      showBanner('Stato aggiornato.','success');
    } catch {
      showBanner('Errore durante aggiornamento stato.','error');
    } finally {
      setSavingStatoId(null);
    }
  };

  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            {docType === 'fattura' && (
              <TableCell sx={{ width: { md: '14%' } }}>N° Fattura</TableCell>
            )}
            <TableCell sx={{ width: { xs: 'auto', md: docType === 'fattura' ? '22%' : '30%' } }}>Fornitore</TableCell>
            <TableCell sx={{ width: { md: '18%' } }}>Tipologia</TableCell>
            <TableCell align="center" sx={{ width: { md: '14%' } }}>Importo Totale</TableCell>
            <TableCell sx={{ width: { md: '16%' } }}>Data Pagamento</TableCell>
            <TableCell align="center" sx={{ width: { xs: 96, md: 120 } }}>Stato</TableCell>
            <TableCell align="right" sx={{ width: { md: 'auto' }, pr: 0.5, pl: 0.5 }}>Azioni</TableCell>
            <TableCell align="center" sx={{ width: 36, p: 0 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, idx) => (
            <Fragment key={r.id ?? idx}>
            <TableRow hover>
              {docType === 'fattura' && (
                <TableCell sx={{ width: { md: '14%' } }}>{r.numero_fattura}</TableCell>
              )}
              <TableCell sx={{ width: { xs: 'auto', md: docType === 'fattura' ? '22%' : '30%' } }}>{r.fornitore}</TableCell>
              <TableCell sx={{ width: { md: '18%' } }}>{(r as { tipologia?: string }).tipologia || '—'}</TableCell>
              <TableCell align="center" sx={{ width: { md: '14%' } }}>{formatEuro(r.importo_totale)}</TableCell>
              <TableCell sx={{ width: { md: '16%' } }}>{r.data_pagamento ? String(r.data_pagamento).slice(0, 10) : '—'}</TableCell>
              <TableCell align="center" sx={{ width: { xs: 96, md: 120 } }}>
                {(() => {
                  const raw = (r as unknown as { stato_uscita?: string }).stato_uscita ?? (r.data_pagamento ? 'Pagato' : 'No Pagato');
                  const normalized = String(raw || '').trim().toLowerCase();
                  const isPagato = /^pagat/.test(normalized) && !/^no\s*pagat/.test(normalized);
                  const label = isPagato ? 'Pagato' : 'Non pagato';
                  const canToggle = docType !== 'scontrini';
                  return (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!canToggle || savingStatoId === r.id}
                        onClick={(e) => {
                          if (!canToggle) return;
                          setStatoAnchorEl(e.currentTarget);
                          setStatoRowId(r.id ?? null);
                        }}
                        sx={(theme: Theme) => ({
                          textTransform: 'none',
                          px: 1.25,
                          height: 26,
                          minWidth: 128,
                          borderRadius: 10,
                          bgcolor: alpha(isPagato ? theme.palette.success.main : theme.palette.error.main, 0.12),
                          borderColor: alpha(isPagato ? theme.palette.success.main : theme.palette.error.main, 0.45),
                          color: theme.palette.text.primary,
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          lineHeight: 1,
                          display: 'inline-flex',
                          gap: 0.75,
                          '&:hover': { bgcolor: alpha(isPagato ? theme.palette.success.main : theme.palette.error.main, 0.18) }
                        })}
                        endIcon={<ExpandMoreRoundedIcon fontSize="small" />}
                      >
                        {savingStatoId === r.id ? '...' : label}
                      </Button>
                      <Menu
                        anchorEl={statoAnchorEl}
                        open={Boolean(statoAnchorEl) && statoRowId === r.id}
                        onClose={() => { setStatoAnchorEl(null); setStatoRowId(null); }}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                      >
                        <MenuItem
                          onClick={async () => {
                            setStatoAnchorEl(null);
                            if (r.id) await updateStatoAndSave(r.id, 'Pagato');
                          }}
                        >
                          Pagato
                        </MenuItem>
                        <MenuItem
                          onClick={async () => {
                            setStatoAnchorEl(null);
                            if (r.id) await updateStatoAndSave(r.id, 'No Pagato');
                          }}
                        >
                          No Pagato
                        </MenuItem>
                      </Menu>
                    </>
                  );
                })()}
              </TableCell>
              <TableCell align="right" sx={{ pr: 0.5, pl: 0.5 }}>
                <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                  <Tooltip title="Modifica Costo" arrow>
                    <IconButton
                      size="small"
                      aria-label="Modifica Costo"
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
                        setEditData({
                          id: r.id,
                          numero_fattura: r.numero_fattura,
                          fornitore: r.fornitore,
                          tipologia: (r as { tipologia?: string }).tipologia,
                          emissione_fattura: r.emissione_fattura,
                          data_pagamento: r.data_pagamento,
                          importo_totale: r.importo_totale,
                          aliquota_iva: r.aliquota_iva,
                          imponibile: r.imponibile,
                          iva: r.iva,
                          modalita_pagamento: r.modalita_pagamento,
                          banca_emissione: r.banca_emissione,
                          numero_conto: r.numero_conto,
                          stato_uscita: r.stato_uscita
                        });
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
                      onClick={() => {
                        setConfirmDeleteId(r.id ?? null);
                        const numero = r.numero_fattura ? `Fattura ${r.numero_fattura}` : (r.tipologia || '').toString();
                        const fornitore = r.fornitore ? ` - ${r.fornitore}` : '';
                        setConfirmDeleteLabel(`${numero || 'Uscita'}${fornitore}`);
                        setConfirmDeleteOpen(true);
                      }}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
              <TableCell align="center" sx={{ p: 0 }}>
                <IconButton size="small" onClick={() => toggleExpandUscita(r.id as string | number)} aria-label="Espandi dettagli" sx={{ m: 0 }}>
                  <ExpandMoreRoundedIcon sx={{ transform: expandedUscite[r.id as string | number] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }} />
                </IconButton>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={docType === 'fattura' ? 8 : 7} sx={{ p: 0, border: 0 }}>
                <Collapse in={Boolean(expandedUscite[r.id as string | number])} timeout="auto" unmountOnExit>
                  {renderUscitaDetails(r)}
                </Collapse>
              </TableCell>
            </TableRow>
            </Fragment>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={docType === 'fattura' ? 8 : 7}>
                <Alert severity="info">Nessuna uscita presente per questa commessa.</Alert>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Dialog conferma eliminazione Uscita */}
      <Dialog open={confirmDeleteOpen} onClose={() => (!confirmDeleting && setConfirmDeleteOpen(false)) || undefined}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Vuoi eliminare questa uscita{confirmDeleteLabel ? `: ${confirmDeleteLabel}` : ''}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="error"
            disabled={!confirmDeleteId || confirmDeleting}
            onClick={async () => {
              if (!confirmDeleteId) return;
              try {
                setConfirmDeleting(true);
                const idToDelete = confirmDeleteId;
                setConfirmDeleteOpen(false);
                setConfirmDeleteId(null);
                await axios.delete(`/api/tenants/uscite/${idToDelete}`);
                await mutate(swrKey);
                showBanner('Uscita eliminata.','success');
              } catch {
                showBanner('Errore durante eliminazione.','error');
              } finally {
                setConfirmDeleting(false);
              }
            }}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
      {/* Dialog Modifica Uscita */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Modifica costo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {docType === 'fattura' && (
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="N. Fattura" fullWidth value={editData.numero_fattura || ''} onChange={(e) => setEditData((p) => ({ ...p, numero_fattura: e.target.value }))} InputLabelProps={{ shrink: true }} />
              </Grid>
            )}
            <Grid size={{ xs: 12, md: docType === 'fattura' ? 5 : 6 }}>
              <TextField label="Fornitore" fullWidth value={editData.fornitore || ''} onChange={(e) => setEditData((p) => ({ ...p, fornitore: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: docType === 'fattura' ? 4 : 6 }}>
              <TextField label="Tipologia" fullWidth value={editData.tipologia || ''} onChange={(e) => setEditData((p) => ({ ...p, tipologia: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            {docType === 'fattura' && (
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField type="date" label="Emissione Fattura" fullWidth value={editData.emissione_fattura ? String(editData.emissione_fattura).slice(0,10) : ''} onChange={(e) => setEditData((p) => ({ ...p, emissione_fattura: e.target.value }))} InputLabelProps={{ shrink: true }} />
              </Grid>
            )}
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField type="date" label="Data Pagamento" fullWidth value={editData.data_pagamento ? String(editData.data_pagamento).slice(0,10) : ''} onChange={(e) => setEditData((p) => ({ ...p, data_pagamento: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField type="number" label="Importo Totale" fullWidth value={editData.importo_totale ?? ''} onChange={(e) => setEditData((p) => ({ ...p, importo_totale: e.target.value as unknown as number }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            {docType === 'fattura' && (
              <>
                <Grid size={{ xs: 12, md: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel id="aliquota-iva-uscite-edit" shrink>Aliquota IVA</InputLabel>
                    <Select labelId="aliquota-iva-uscite-edit" label="Aliquota IVA" value={String(editData.aliquota_iva ?? '')} onChange={(e) => setEditData((p) => ({ ...p, aliquota_iva: Number(e.target.value) }))}>
                      <MenuItem value="0">0%</MenuItem>
                      <MenuItem value="4">4%</MenuItem>
                      <MenuItem value="10">10%</MenuItem>
                      <MenuItem value="22">22%</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField type="number" label="Imponibile" fullWidth value={editData.imponibile ?? ''} onChange={(e) => setEditData((p) => ({ ...p, imponibile: e.target.value as unknown as number }))} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField type="number" label="IVA" fullWidth value={editData.iva ?? ''} onChange={(e) => setEditData((p) => ({ ...p, iva: e.target.value as unknown as number }))} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField label="Modalità di pagamento" fullWidth value={editData.modalita_pagamento || ''} onChange={(e) => setEditData((p) => ({ ...p, modalita_pagamento: e.target.value }))} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField label="Banca di Emissione" fullWidth value={(editData as Record<string, unknown>).banca_emissione as string || ''} onChange={(e) => setEditData((p) => ({ ...p, banca_emissione: e.target.value }))} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField label="Numero di Conto" fullWidth value={(editData as Record<string, unknown>).numero_conto as string || ''} onChange={(e) => setEditData((p) => ({ ...p, numero_conto: e.target.value }))} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel id="stato-uscita-edit" shrink>Stato uscita</InputLabel>
                    <Select labelId="stato-uscita-edit" label="Stato uscita" value={String(editData.stato_uscita ?? '')} onChange={(e) => setEditData((p) => ({ ...p, stato_uscita: String(e.target.value) }))}>
                      <MenuItem value="No Pagato">No Pagato</MenuItem>
                      <MenuItem value="Pagato">Pagato</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            {docType === 'scontrini' && (
              <>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Modalità di pagamento" fullWidth value={editData.modalita_pagamento || ''} onChange={(e) => setEditData((p) => ({ ...p, modalita_pagamento: e.target.value }))} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Stato" fullWidth value={'Pagato'} disabled InputLabelProps={{ shrink: true }} />
                </Grid>
              </>
            )}
          </Grid>
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
                if (editData.tipologia !== undefined) payload.tipologia = editData.tipologia;
                if (editData.emissione_fattura !== undefined) payload.emissione_fattura = editData.emissione_fattura;
                if (editData.data_pagamento !== undefined) payload.data_pagamento = editData.data_pagamento;
                if (editData.importo_totale !== undefined && editData.importo_totale !== null && String(editData.importo_totale) !== '') payload.importo_totale = Number(editData.importo_totale);
                if (editData.aliquota_iva !== undefined && editData.aliquota_iva !== null && String(editData.aliquota_iva) !== '') payload.aliquota_iva = Number(editData.aliquota_iva);
                if (editData.imponibile !== undefined && editData.imponibile !== null && String(editData.imponibile) !== '') payload.imponibile = Number(editData.imponibile);
                if (editData.iva !== undefined && editData.iva !== null && String(editData.iva) !== '') payload.iva = Number(editData.iva);
                if (editData.modalita_pagamento !== undefined) payload.modalita_pagamento = editData.modalita_pagamento;
                if ((editData as Record<string, unknown>).banca_emissione !== undefined) payload.banca_emissione = (editData as Record<string, unknown>).banca_emissione as string;
                if ((editData as Record<string, unknown>).numero_conto !== undefined) payload.numero_conto = (editData as Record<string, unknown>).numero_conto as string;
                if (docType === 'fattura' && editData.stato_uscita !== undefined) payload.stato_uscita = editData.stato_uscita;
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

type EntrataRow = {
  id?: number | string;
  cliente?: string;
  tipologia?: string;
  numero_fattura?: string;
  emissione_fattura?: string;
  importo_totale?: number;
  aliquota_iva?: number;
  imponibile?: number;
  iva?: number;
  data_pagamento?: string;
  modalita_pagamento?: string;
  stato_entrata?: string;
  tipologia_entrata?: 'fattura';
};

function EntrateTable({ commessaId, version }: { commessaId: string; version: number }) {
  const swrKey = commessaId ? `/api/tenants/entrate?commessa_id=${encodeURIComponent(commessaId)}&v=${version}` : null;
  const { data, error, isLoading } = useSWR(swrKey);
  const showBanner = (text: string, severity: 'success' | 'error' | 'info' = 'success') => {
    enqueueSnackbar(text, {
      variant: severity,
      autoHideDuration: 3000,
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      action: (key) => (
        <IconButton size="small" aria-label="Chiudi" onClick={() => closeSnackbar(key)} sx={{ color: 'inherit' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      )
    });
  };

  // Stato per cambio stato con dropdown (sempre disponibile su Ricavi/Fattura)
  const [savingStatoId, setSavingStatoId] = useState<string | number | null>(null);
  const [statoAnchorEl, setStatoAnchorEl] = useState<HTMLElement | null>(null);
  const [statoRowId, setStatoRowId] = useState<string | number | null>(null);

  // Stato dialog modifica ricavo
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<EntrataRow> & { id?: number | string }>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<string>('');

  const rows: EntrataRow[] = Array.isArray(data) ? (data as EntrataRow[]) : [];
  const formatEuro = (value?: number) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    try {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value));
    } catch {
      return `${Number(value).toFixed(2)} €`;
    }
  };
  // espansione dettagli (Entrate)
  const [expandedEntrate, setExpandedEntrate] = useState<Record<string | number, boolean>>({});
  const toggleExpandEntrata = (rowId?: string | number) => {
    if (rowId == null) return;
    setExpandedEntrate((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const renderEntrataDetails = (r: EntrataRow) => (
    <Box sx={{ p: 1.5, bgcolor: (theme: Theme) => alpha(theme.palette.grey[500], 0.06), borderRadius: 2 }}>
      <Grid container spacing={1.5} columns={12}>
        {r.emissione_fattura && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Emissione Fattura</Typography>
            <Typography variant="body2">{String(r.emissione_fattura).slice(0,10)}</Typography>
          </Grid>
        )}
        {((r.aliquota_iva as number | undefined) ?? null) !== null && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Aliquota IVA</Typography>
            <Typography variant="body2">{String(r.aliquota_iva)}%</Typography>
          </Grid>
        )}
        {((r.imponibile as number | undefined) ?? null) !== null && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Imponibile</Typography>
            <Typography variant="body2">{formatEuro(r.imponibile)}</Typography>
          </Grid>
        )}
        {((r.iva as number | undefined) ?? null) !== null && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">IVA</Typography>
            <Typography variant="body2">{formatEuro(r.iva)}</Typography>
          </Grid>
        )}
        {((r.modalita_pagamento || '').trim() !== '') && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="caption" color="text.secondary">Modalità di pagamento</Typography>
            <Typography variant="body2">{r.modalita_pagamento}</Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  if (!commessaId) return null;
  if (isLoading) return <Skeleton height={120} />;
  if (error) return <Alert severity="error">Errore nel caricamento entrate</Alert>;
  const updateStatoEntrata = async (rowId: string | number, newValue: 'Pagato' | 'No Pagato') => {
    try {
      setSavingStatoId(rowId);
      await axios.put(`/api/tenants/entrate/${rowId}` , { stato_entrata: newValue });
      await mutate(swrKey);
      showBanner('Stato aggiornato.','success');
    } catch {
      showBanner('Errore durante aggiornamento stato.','error');
    } finally {
      setSavingStatoId(null);
    }
  };

  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: { md: '14%' } }}>N° Fattura</TableCell>
            <TableCell sx={{ width: { xs: 'auto', md: '26%' } }}>Cliente</TableCell>
            <TableCell sx={{ width: { md: '18%' } }}>Tipologia</TableCell>
            <TableCell align="center" sx={{ width: { md: '14%' } }}>Importo Totale</TableCell>
            <TableCell sx={{ width: { md: '16%' } }}>Data Pagamento</TableCell>
            <TableCell align="center" sx={{ width: { xs: 96, md: 120 } }}>Stato</TableCell>
            <TableCell align="right" sx={{ width: { md: 'auto' }, pr: 0.5, pl: 0.5 }}>Azioni</TableCell>
            <TableCell align="center" sx={{ width: 36, p: 0 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, idx) => (
            <>
            <TableRow key={`ent-${idx}`} hover>
              <TableCell sx={{ width: { md: '14%' } }}>{r.numero_fattura}</TableCell>
              <TableCell sx={{ width: { xs: 'auto', md: '26%' } }}>{r.cliente}</TableCell>
              <TableCell sx={{ width: { md: '18%' } }}>{r.tipologia || '—'}</TableCell>
              <TableCell align="center" sx={{ width: { md: '14%' } }}>{formatEuro(r.importo_totale)}</TableCell>
              <TableCell sx={{ width: { md: '16%' } }}>{r.data_pagamento ? String(r.data_pagamento).slice(0, 10) : '—'}</TableCell>
              <TableCell align="center" sx={{ width: { xs: 96, md: 140 } }}>
                {(() => {
                  const raw = r.stato_entrata ?? (r.data_pagamento ? 'Pagato' : 'No Pagato');
                  const normalized = String(raw || '').trim().toLowerCase();
                  const isPagato = /^pagat/.test(normalized) && !/^no\s*pagat/.test(normalized);
                  const label = isPagato ? 'Pagato' : 'Non pagato';
                  return (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={savingStatoId === r.id}
                        onClick={(e) => { setStatoAnchorEl(e.currentTarget); setStatoRowId(r.id ?? null); }}
                        sx={(theme: Theme) => ({
                          textTransform: 'none',
                          px: 1.25,
                          height: 26,
                          minWidth: 128,
                          borderRadius: 10,
                          bgcolor: alpha(isPagato ? theme.palette.success.main : theme.palette.error.main, 0.12),
                          borderColor: alpha(isPagato ? theme.palette.success.main : theme.palette.error.main, 0.45),
                          color: theme.palette.text.primary,
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          lineHeight: 1,
                          display: 'inline-flex',
                          gap: 0.75,
                          '&:hover': { bgcolor: alpha(isPagato ? theme.palette.success.main : theme.palette.error.main, 0.18) }
                        })}
                        endIcon={<ExpandMoreRoundedIcon fontSize="small" />}
                      >
                        {savingStatoId === r.id ? '...' : label}
                      </Button>
                      <Menu
                        anchorEl={statoAnchorEl}
                        open={Boolean(statoAnchorEl) && statoRowId === r.id}
                        onClose={() => { setStatoAnchorEl(null); setStatoRowId(null); }}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                      >
                        <MenuItem onClick={async () => { setStatoAnchorEl(null); if (r.id) await updateStatoEntrata(r.id, 'Pagato'); }}>Pagato</MenuItem>
                        <MenuItem onClick={async () => { setStatoAnchorEl(null); if (r.id) await updateStatoEntrata(r.id, 'No Pagato'); }}>No Pagato</MenuItem>
                      </Menu>
                    </>
                  );
                })()}
              </TableCell>
              <TableCell align="right" sx={{ pr: 0.5, pl: 0.5 }}>
                <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                  <Tooltip title="Modifica Ricavo" arrow>
                    <IconButton
                      size="small"
                      aria-label="Modifica Ricavo"
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
                        setEditData({
                          id: r.id,
                          cliente: r.cliente,
                          tipologia: r.tipologia,
                          numero_fattura: r.numero_fattura,
                          emissione_fattura: r.emissione_fattura,
                          data_pagamento: r.data_pagamento,
                          importo_totale: r.importo_totale,
                          aliquota_iva: r.aliquota_iva,
                          imponibile: r.imponibile,
                          iva: r.iva,
                          modalita_pagamento: r.modalita_pagamento,
                          stato_entrata: r.stato_entrata
                        });
                        setEditOpen(true);
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Elimina Entrata" arrow>
                    <IconButton
                      size="small"
                      aria-label="Elimina Entrata"
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
                      onClick={() => {
                        setConfirmDeleteId(r.id ?? null);
                        const numero = r.numero_fattura ? `Fattura ${r.numero_fattura}` : (r.tipologia || '').toString();
                        const cliente = r.cliente ? ` - ${r.cliente}` : '';
                        setConfirmDeleteLabel(`${numero || 'Entrata'}${cliente}`);
                        setConfirmDeleteOpen(true);
                      }}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
              <TableCell align="center" sx={{ p: 0 }}>
                <IconButton size="small" onClick={() => toggleExpandEntrata(r.id as string | number)} aria-label="Espandi dettagli" sx={{ m: 0 }}>
                  <ExpandMoreRoundedIcon sx={{ transform: expandedEntrate[r.id as string | number] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }} />
                </IconButton>
              </TableCell>
            </TableRow>
            <TableRow key={`ent-ex-${idx}`}>
              <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                <Collapse in={Boolean(expandedEntrate[r.id as string | number])} timeout="auto" unmountOnExit>
                  {renderEntrataDetails(r)}
                </Collapse>
              </TableCell>
            </TableRow>
            </>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7}>
                <Alert severity="info">Nessuna entrata presente per questa commessa.</Alert>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Dialog conferma eliminazione Entrata */}
      <Dialog open={confirmDeleteOpen} onClose={() => (!confirmDeleting && setConfirmDeleteOpen(false)) || undefined}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Vuoi eliminare questa entrata{confirmDeleteLabel ? `: ${confirmDeleteLabel}` : ''}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="error"
            disabled={!confirmDeleteId || confirmDeleting}
            onClick={async () => {
              if (!confirmDeleteId) return;
              try {
                setConfirmDeleting(true);
                const idToDelete = confirmDeleteId;
                setConfirmDeleteOpen(false);
                setConfirmDeleteId(null);
                await axios.delete(`/api/tenants/entrate/${idToDelete}`);
                await mutate(swrKey);
                showBanner('Entrata eliminata.','success');
              } catch {
                showBanner('Errore durante eliminazione.','error');
              } finally {
                setConfirmDeleting(false);
              }
            }}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Modifica Ricavo */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Modifica ricavo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField label="N. Fattura" fullWidth value={editData.numero_fattura || ''} onChange={(e) => setEditData((p) => ({ ...p, numero_fattura: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField label="Cliente" fullWidth value={editData.cliente || ''} onChange={(e) => setEditData((p) => ({ ...p, cliente: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Tipologia" fullWidth value={editData.tipologia || ''} onChange={(e) => setEditData((p) => ({ ...p, tipologia: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            {/* Riga 2: Emissione, Data pagamento, Importo Totale */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField type="date" label="Emissione Fattura" fullWidth value={editData.emissione_fattura ? String(editData.emissione_fattura).slice(0,10) : ''} onChange={(e) => setEditData((p) => ({ ...p, emissione_fattura: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField type="date" label="Data Pagamento" fullWidth value={editData.data_pagamento ? String(editData.data_pagamento).slice(0,10) : ''} onChange={(e) => setEditData((p) => ({ ...p, data_pagamento: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField type="number" label="Importo Totale" fullWidth value={editData.importo_totale ?? ''} onChange={(e) => setEditData((p) => ({ ...p, importo_totale: e.target.value as unknown as number }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            {/* Riga 3: Aliquota IVA, Imponibile, IVA, Modalità di pagamento */}
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="aliquota-iva-entrate-edit" shrink>Aliquota IVA</InputLabel>
                <Select labelId="aliquota-iva-entrate-edit" label="Aliquota IVA" value={String(editData.aliquota_iva ?? '')} onChange={(e) => setEditData((p) => ({ ...p, aliquota_iva: Number(e.target.value) }))}>
                  <MenuItem value="0">0%</MenuItem>
                  <MenuItem value="4">4%</MenuItem>
                  <MenuItem value="10">10%</MenuItem>
                  <MenuItem value="22">22%</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField type="number" label="Imponibile" fullWidth value={editData.imponibile ?? ''} onChange={(e) => setEditData((p) => ({ ...p, imponibile: e.target.value as unknown as number }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField type="number" label="IVA" fullWidth value={editData.iva ?? ''} onChange={(e) => setEditData((p) => ({ ...p, iva: e.target.value as unknown as number }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField label="Modalità di pagamento" fullWidth value={editData.modalita_pagamento || ''} onChange={(e) => setEditData((p) => ({ ...p, modalita_pagamento: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            {/* Riga 4: Stato a tutta larghezza */}
            <Grid size={{ xs: 12, md: 12 }}>
              <FormControl fullWidth>
                <InputLabel id="stato-entrata-edit" shrink>Stato</InputLabel>
                <Select labelId="stato-entrata-edit" label="Stato" value={String(editData.stato_entrata ?? '')} onChange={(e) => setEditData((p) => ({ ...p, stato_entrata: String(e.target.value) }))}>
                  <MenuItem value="No Pagato">No Pagato</MenuItem>
                  <MenuItem value="Pagato">Pagato</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
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
                if (editData.cliente !== undefined) payload.cliente = editData.cliente;
                if (editData.tipologia !== undefined) payload.tipologia = editData.tipologia;
                if (editData.numero_fattura !== undefined) payload.numero_fattura = editData.numero_fattura;
                if (editData.emissione_fattura !== undefined) payload.emissione_fattura = editData.emissione_fattura;
                if (editData.data_pagamento !== undefined) payload.data_pagamento = editData.data_pagamento;
                if (editData.importo_totale !== undefined && editData.importo_totale !== null && String(editData.importo_totale) !== '') payload.importo_totale = Number(editData.importo_totale);
                if (editData.aliquota_iva !== undefined && editData.aliquota_iva !== null && String(editData.aliquota_iva) !== '') payload.aliquota_iva = Number(editData.aliquota_iva);
                if (editData.imponibile !== undefined && editData.imponibile !== null && String(editData.imponibile) !== '') payload.imponibile = Number(editData.imponibile);
                if (editData.iva !== undefined && editData.iva !== null && String(editData.iva) !== '') payload.iva = Number(editData.iva);
                if (editData.modalita_pagamento !== undefined) payload.modalita_pagamento = editData.modalita_pagamento;
                if (editData.stato_entrata !== undefined) payload.stato_entrata = editData.stato_entrata;
                await axios.put(`/api/tenants/entrate/${editData.id}`, payload);
                setEditOpen(false);
                await mutate(swrKey);
                showBanner('Ricavo aggiornato con successo.','success');
              } finally {
                setSavingEdit(false);
              }
            }}
          >
            Salva modifiche
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}