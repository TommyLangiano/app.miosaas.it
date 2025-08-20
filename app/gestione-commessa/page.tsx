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
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';

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
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    stato_uscita: currentDocType === 'scontrini' ? 'Pagato' : ''
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
    if (ali === 0) {
      return { imponibile: Number(importo).toFixed(2), iva: '0.00' };
    }
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
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const scrollToField = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { if ('focus' in el) (el as unknown as { focus: () => void }).focus(); }, 120);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Validazioni obbligatorie per fattura
      const newErrors: Record<string, string> = {};
      if (docType === 'fattura') {
        if (!form.numero_fattura?.trim()) newErrors['numero_fattura'] = 'Campo obbligatorio';
        if (form.numero_fattura?.trim() && !/^[A-Za-z0-9\-\/\.\s]+$/.test(form.numero_fattura.trim())) newErrors['numero_fattura'] = 'Formato non valido (solo lettere, numeri, trattini, barre, punti e spazi)';
        if (!form.fornitore?.trim()) newErrors['fornitore'] = 'Campo obbligatorio';
        if (!form.tipologia?.trim()) newErrors['tipologia'] = 'Campo obbligatorio';
        if (form.tipologia && form.tipologia.trim().length < 3) newErrors['tipologia'] = 'Minimo 3 caratteri';
        if (!form.emissione_fattura?.trim()) newErrors['emissione_fattura'] = 'Campo obbligatorio';
        if (!form.data_pagamento?.trim()) newErrors['data_pagamento'] = 'Campo obbligatorio';
        if (!String(form.importo_totale).trim()) newErrors['importo_totale'] = 'Campo obbligatorio';
        if (Number(String(form.importo_totale).replace(',', '.')) <= 0) newErrors['importo_totale'] = 'Deve essere ≥ 0,01';
        if (String(form.aliquota_iva) === '') newErrors['aliquota_iva'] = 'Campo obbligatorio';
        if (String(form.aliquota_iva) !== '' && ![0,4,10,22].includes(Number(form.aliquota_iva))) newErrors['aliquota_iva'] = 'Valore non valido';
        if (!form.stato_uscita?.trim()) newErrors['stato_uscita'] = 'Campo obbligatorio';
      } else {
        // scontrini: minimo richiesto importo e data + fornitore?
        if (!form.fornitore?.trim()) newErrors['fornitore'] = 'Campo obbligatorio';
        if (!form.tipologia?.trim()) newErrors['tipologia'] = 'Campo obbligatorio';
        if (form.tipologia && form.tipologia.trim().length < 3) newErrors['tipologia'] = 'Minimo 3 caratteri';
        if (!String(form.importo_totale).trim()) newErrors['importo_totale'] = 'Campo obbligatorio';
        if (Number(String(form.importo_totale).replace(',', '.')) <= 0) newErrors['importo_totale'] = 'Deve essere ≥ 0,01';
        if (!form.data_pagamento?.trim()) newErrors['data_pagamento'] = 'Campo obbligatorio';
      }

      // Consistenza selezione Autocomplete: consentiamo input manuale, nessun vincolo sulla selezione dalla lista

      // Coerenza date: pagamento ≥ emissione, range plausibile
      const toDate = (s: string | undefined) => (s ? new Date(s) : null);
      const dEm = toDate(form.emissione_fattura);
      const dPg = toDate(form.data_pagamento);
      const now = new Date();
      const tenYears = 10 * 365 * 24 * 60 * 60 * 1000;
      const minDate = new Date('2000-01-01');
      if (docType === 'fattura' && dEm && dPg && dPg < dEm) newErrors['data_pagamento'] = 'Pagamento prima dell\'emissione';
      if (dEm && (dEm.getTime() > now.getTime() + tenYears || dEm < minDate)) newErrors['emissione_fattura'] = 'Data non plausibile';
      if (dPg && (dPg.getTime() > now.getTime() + tenYears || dPg < minDate)) newErrors['data_pagamento'] = 'Data non plausibile';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const order = docType === 'fattura'
          ? ['numero_fattura','fornitore','tipologia','emissione_fattura','data_pagamento','importo_totale','aliquota_iva','stato_uscita']
          : ['fornitore','tipologia','data_pagamento','importo_totale'];
        const first = order.find((k) => newErrors[k]);
        const idMap: Record<string,string> = {
          numero_fattura: 'usc-numero-fattura',
          fornitore: 'usc-fornitore',
          tipologia: 'usc-tipologia',
          emissione_fattura: 'usc-emissione',
          data_pagamento: 'usc-data-pag',
          importo_totale: 'usc-importo',
          aliquota_iva: 'usc-aliquota',
          stato_uscita: 'usc-stato'
        };
        if (first && idMap[first]) scrollToField(idMap[first]);
        setSaving(false);
        return;
      }
      // Forza arrotondamenti/coerenza importi (fatture)
      const imp = Number(String(form.importo_totale || '').replace(',', '.'));
      const ali = Number(String(form.aliquota_iva || '').replace(',', '.')) || 0;
      let payload = { ...form, commessa_id: commessaId, tipologia_uscita: docType } as Record<string, unknown>;
      if (docType === 'fattura') {
        const impon = Number((imp / (1 + ali / 100)).toFixed(2));
        const iva = Number((imp - impon).toFixed(2));
        payload = { ...payload, importo_totale: Number(imp.toFixed(2)), imponibile: impon, iva };
      }
      if (docType === 'scontrini') {
        (payload as Record<string, unknown>).stato_uscita = 'Pagato';
      }
      await axios.post('/api/tenants/uscite', payload);
      setForm({
        ...getInitialForm(docType)
      });
      setFornitoreQuery('');
      setSelectedFornitore(null);
      if (onCreated) onCreated();
    } catch (error: unknown) {
      console.log('🔍 Errore completo dal backend:', error);
      
            // Gestione errori Axios - debug completo della struttura
      console.log('🔍 Tipo di errore:', typeof error);
      console.log('🔍 Proprietà dell\'errore:', Object.keys(error as object));
      console.log('🔍 Errore completo (JSON):', JSON.stringify(error, null, 2));
      
      let errorCode: string | undefined;
      let errorMessage: string | undefined;
      
      // Prova diversi modi per accedere ai dati
      if (error && typeof error === 'object') {
        // Metodo 1: error.response
        if ('response' in error) {
          const response = (error as { response?: { status?: number; data?: unknown } }).response;
          console.log('🔍 Metodo 1 - Response completa:', response);
          console.log('🔍 Metodo 1 - Response status:', response?.status);
          console.log('🔍 Metodo 1 - Response data:', response?.data);
          
          if (response?.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            errorCode = data.code as string | undefined;
            errorMessage = data.message as string | undefined;
          }
        }
        
        // Metodo 2: error.data (fallback)
        if (!errorCode && 'data' in error) {
          const data = (error as { data?: unknown }).data;
          console.log('🔍 Metodo 2 - Data diretta:', data);
          
          if (data && typeof data === 'object') {
            const dataObj = data as Record<string, unknown>;
            errorCode = dataObj.code as string | undefined;
            errorMessage = dataObj.message as string | undefined;
          }
        }
        
        // Metodo 3: error.message (fallback)
        if (!errorMessage && 'message' in error) {
          errorMessage = (error as { message?: string }).message;
          console.log('🔍 Metodo 3 - Message diretta:', errorMessage);
        }
      }
      
      console.log('🔍 Error code estratto:', errorCode);
      console.log('🔍 Error message estratto:', errorMessage);
      
      // Gestione errore numero fattura duplicato
      if (errorCode === 'DUPLICATE_INVOICE_NUMBER' || 
          (errorMessage && errorMessage.toLowerCase().includes('numero fattura già esistente'))) {
        console.log('🔍 Trovato errore numero fattura duplicato (via code o message)');
        setErrors({ numero_fattura: errorMessage || 'Numero fattura esistente' });
        scrollToField('usc-numero-fattura');
      } else {
        // Gestione errori generici del backend
        const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        const errorCode = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
        
        console.log('🔍 Error message generico:', errorMessage);
        console.log('🔍 Error code generico:', errorCode);
        
        if (errorMessage) {
          // Se il backend restituisce un messaggio, mostralo
          if (errorMessage.toLowerCase().includes('fattura') || errorMessage.toLowerCase().includes('numero') || errorMessage.toLowerCase().includes('duplicat')) {
            console.log('🔍 Imposto errore numero fattura:', errorMessage);
            setErrors({ numero_fattura: errorMessage });
            scrollToField('usc-numero-fattura');
          } else if (errorMessage.toLowerCase().includes('fornitore')) {
            console.log('🔍 Imposto errore fornitore:', errorMessage);
            setErrors({ fornitore: errorMessage });
            scrollToField('usc-fornitore');
          } else {
            // Errore generico
            console.log('🔍 Mostro errore generico:', errorMessage);
            enqueueSnackbar(`Errore: ${errorMessage}`, { 
              variant: 'error',
              anchorOrigin: { vertical: 'top', horizontal: 'right' },
              autoHideDuration: 5000
            });
          }
        } else {
          // Errore generico senza messaggio
          console.log('🔍 Nessun messaggio di errore, mostro errore generico');
          
          // Se abbiamo un messaggio di errore generico, proviamo a renderlo più specifico
          if (errorMessage && errorMessage.toLowerCase().includes('numero fattura già esistente')) {
            enqueueSnackbar('Errore, il N. Fattura esiste già. Riprova.', { 
              variant: 'error',
              anchorOrigin: { vertical: 'top', horizontal: 'right' },
              autoHideDuration: 5000
            });
          } else {
            enqueueSnackbar('Errore durante il salvataggio. Riprova.', { 
              variant: 'error',
              anchorOrigin: { vertical: 'top', horizontal: 'right' },
              autoHideDuration: 5000
            });
          }
        }
        console.error('Errore nella creazione uscita:', error);
      }
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
              <Autocomplete<FornitoreOption, false, false, true>
                fullWidth
                freeSolo
                options={fornitori}
                getOptionLabel={(o) => (typeof o === 'string' ? o : formatFornitoreLabel(o as FornitoreOption))}
                filterOptions={(x) => x as FornitoreOption[]}
                inputValue={fornitoreQuery}
                value={selectedFornitore}
                onInputChange={(_, val) => {
                  const text = val || '';
                  setFornitoreQuery(text);
                  setSelectedFornitore(text ? text : null);
                  setForm((p) => ({ ...p, fornitore: text }));
                  if (text) setErrors((prev) => ({ ...prev, fornitore: '' }));
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
                  <TextField {...params} id="usc-fornitore" label="Fornitore" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} required fullWidth error={Boolean(errors['fornitore'])} helperText={errors['fornitore'] || ''} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField id="usc-tipologia" label="Tipologia" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} required fullWidth value={form.tipologia} onChange={handleChange('tipologia')} error={Boolean(errors['tipologia'])} helperText={errors['tipologia'] || ''} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField id="usc-data-pag" type="date" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} label="Data" required fullWidth value={form.data_pagamento} onChange={handleChange('data_pagamento')} error={Boolean(errors['data_pagamento'])} helperText={errors['data_pagamento'] || ''} />
            </Grid>
          </>
        ) : (
          <>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField id="usc-numero-fattura" label="N. Fattura" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} required fullWidth value={form.numero_fattura} onChange={handleChange('numero_fattura')} error={Boolean(errors['numero_fattura'])} helperText={errors['numero_fattura'] || ''} />
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
              const text = val || '';
              setFornitoreQuery(text);
              setSelectedFornitore(text ? text : null);
              setForm((p) => ({ ...p, fornitore: text }));
              if (text) setErrors((prev) => ({ ...prev, fornitore: '' }));
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
              <TextField {...params} id="usc-fornitore" label="Fornitore" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} required fullWidth error={Boolean(errors['fornitore'])} helperText={errors['fornitore'] || ''} />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField id="usc-tipologia" label="Tipologia" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} required fullWidth value={form.tipologia} onChange={handleChange('tipologia')} error={Boolean(errors['tipologia'])} helperText={errors['tipologia'] || ''} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField id="usc-emissione" type="date" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} label="Emissione Fattura" required fullWidth value={form.emissione_fattura} onChange={handleChange('emissione_fattura')} error={Boolean(errors['emissione_fattura'])} helperText={errors['emissione_fattura'] || ''} />
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
            <Grid size={{ xs: 12, md: 12 }}>
              <Box
                sx={{
                  mt: 1,
                  p: 3,
                  border: '2px dashed',
                  borderColor: (theme: Theme) => alpha(theme.palette.grey[400], 0.6),
                  bgcolor: (theme: Theme) => alpha(theme.palette.grey[400], 0.12),
                  borderRadius: 2,
                  textAlign: 'center',
                  color: 'text.secondary',
                  cursor: 'not-allowed'
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 0.5 }}>
                  <UploadFileRoundedIcon color="action" />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Trascina qui il file oppure clicca per selezionarlo</Typography>
                </Stack>
                <Typography variant="caption">(Mock visivo - caricamento non attivo) • Puoi caricare un solo file JPG/PNG/PDF</Typography>
              </Box>
            </Grid>
          </>
        ) : (
          <>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField id="usc-data-pag" type="date" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} label="Data Pagamento" required fullWidth value={form.data_pagamento} onChange={handleChange('data_pagamento')} error={Boolean(errors['data_pagamento'])} helperText={errors['data_pagamento'] || ''} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField id="usc-importo" type="number" label="Importo Totale" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} required fullWidth value={form.importo_totale} onChange={handleChange('importo_totale')} error={Boolean(errors['importo_totale'])} helperText={errors['importo_totale'] || ''} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth required error={Boolean(errors['aliquota_iva'])}>
            <InputLabel id="aliquota-iva-label" shrink sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Aliquota IVA</InputLabel>
            <Select id="usc-aliquota" labelId="aliquota-iva-label" label="Aliquota IVA" value={form.aliquota_iva}
              onChange={(e) => setForm((p) => {
                const nextAli = String(e.target.value);
                const { imponibile, iva } = computeDerived(String(p.importo_totale), nextAli);
                return { ...p, aliquota_iva: nextAli, imponibile, iva };
              })}
              displayEmpty
            >
              <MenuItem value="" disabled>Seleziona Aliquota</MenuItem>
              <MenuItem value="0">0%</MenuItem>
              <MenuItem value="4">4%</MenuItem>
              <MenuItem value="10">10%</MenuItem>
              <MenuItem value="22">22%</MenuItem>
            </Select>
            {errors['aliquota_iva'] && <Typography variant="caption" color="error">{errors['aliquota_iva']}</Typography>}
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
          <FormControl fullWidth required error={Boolean(errors['stato_uscita'])}>
            <InputLabel id="stato-uscita-label" shrink sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Stato uscita</InputLabel>
            <Select id="usc-stato" labelId="stato-uscita-label" label="Stato uscita" value={form.stato_uscita}
              onChange={(e) => setForm((p) => ({ ...p, stato_uscita: String(e.target.value) }))}
              displayEmpty
            >
              <MenuItem value="" disabled>Seleziona Stato</MenuItem>
              <MenuItem value="No Pagato">No Pagato</MenuItem>
              <MenuItem value="Pagato">Pagato</MenuItem>
            </Select>
            {errors['stato_uscita'] && <Typography variant="caption" color="error">{errors['stato_uscita']}</Typography>}
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 12 }}>
          <Box
            sx={{
              mt: 1,
              p: 3,
              border: '2px dashed',
              borderColor: (theme: Theme) => alpha(theme.palette.grey[400], 0.6),
              bgcolor: (theme: Theme) => alpha(theme.palette.grey[400], 0.12),
              borderRadius: 2,
              textAlign: 'center',
              color: 'text.secondary',
              cursor: 'not-allowed'
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 0.5 }}>
              <UploadFileRoundedIcon color="action" />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Trascina qui il file oppure clicca per selezionarlo</Typography>
            </Stack>
            <Typography variant="caption">(Mock visivo - caricamento non attivo) • Puoi caricare un solo file JPG/PNG/PDF</Typography>
          </Box>
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
        {/* Pulsante di test temporaneo per verificare la gestione errori */}
        <Button 
          variant="outlined" 
          color="warning" 
          onClick={() => {
            console.log('🧪 Test: Imposto errore numero fattura');
            setErrors({ numero_fattura: 'Numero fattura già esistente - TEST' });
            scrollToField('usc-numero-fattura');
          }}
          sx={{ ml: 1 }}
        >
          Test Errore
        </Button>
      </Box>
    </Box>
  );
}

type EntrataFormProps = { commessaId: string; onCreated?: () => void };
function EntrataForm({ commessaId, onCreated }: EntrataFormProps) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    aliquota_iva: '',
    imponibile: '',
    iva: '',
    data_pagamento: '',
    modalita_pagamento: '',
    stato_entrata: '',
    tipologia_entrata: 'fattura'
  });
  const [form, setForm] = useState(getInitialForm());
  // Calcolo da Imponibile e Aliquota → IVA e Importo Totale
  const computeFromImponibile = (imponibileStr: string, aliquotaStr: string): { iva: string; importo_totale: string } => {
    const parseNum = (v: string): number | null => {
      if (v == null) return null;
      const n = Number(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const imp = parseNum(imponibileStr);
    const ali = parseNum(aliquotaStr);
    if (imp == null || ali == null) return { iva: '', importo_totale: '' };
    // Corretto: IVA = Imponibile * (Aliquota/100); Totale = Imponibile + IVA
    const ivaVal = imp * (ali / 100);
    const totaleVal = imp + ivaVal;
    return { iva: ivaVal.toFixed(2), importo_totale: totaleVal.toFixed(2) };
  };
  const handleReset = () => { setForm(getInitialForm()); setClienteQuery(''); setSelectedCliente(null); };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value } as typeof prev;
      if (field === 'imponibile') {
        const { iva, importo_totale } = computeFromImponibile(String(next.imponibile), String(next.aliquota_iva));
        next.iva = iva;
        next.importo_totale = importo_totale;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const scrollToField = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { if ('focus' in el) (el as unknown as { focus: () => void }).focus(); }, 120);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const newErrors: Record<string, string> = {};
      if (!form.numero_fattura?.trim()) newErrors['numero_fattura'] = 'Campo obbligatorio';
      if (!form.cliente?.trim()) newErrors['cliente'] = 'Campo obbligatorio';
      if (!form.tipologia?.trim()) newErrors['tipologia'] = 'Campo obbligatorio';
      if (!form.emissione_fattura?.trim()) newErrors['emissione_fattura'] = 'Campo obbligatorio';
      if (!form.data_pagamento?.trim()) newErrors['data_pagamento'] = 'Campo obbligatorio';
      if (!String(form.imponibile).trim()) newErrors['imponibile'] = 'Campo obbligatorio';
      if (form.aliquota_iva === '') newErrors['aliquota_iva'] = 'Campo obbligatorio';
      if (!form.stato_entrata?.trim()) newErrors['stato_entrata'] = 'Campo obbligatorio';
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const order = ['numero_fattura','cliente','tipologia','emissione_fattura','data_pagamento','imponibile','aliquota_iva','stato_entrata'];
        const first = order.find((k) => newErrors[k]);
        const idMap: Record<string,string> = {
          numero_fattura: 'entr-numero-fattura',
          cliente: 'entr-cliente',
          tipologia: 'entr-tipologia',
          emissione_fattura: 'entr-emissione',
          data_pagamento: 'entr-data-pag',
          imponibile: 'entr-imponibile',
          aliquota_iva: 'entr-aliquota',
          stato_entrata: 'entr-stato'
        };
        if (first && idMap[first]) scrollToField(idMap[first]);
        setSaving(false);
        return;
      }
      const payload = { ...form, commessa_id: commessaId } as Record<string, unknown>;
      await axios.post('/api/tenants/entrate', payload);
      setForm(getInitialForm());
      setClienteQuery('');
      setSelectedCliente(null);
      if (onCreated) onCreated();
    } catch (error: unknown) {
      console.log('🔍 Errore completo dal backend (entrate):', error);
      
      // Gestione errori Axios - debug completo della struttura (entrate)
      console.log('🔍 Tipo di errore (entrate):', typeof error);
      console.log('🔍 Proprietà dell\'errore (entrate):', Object.keys(error as object));
      console.log('🔍 Errore completo (JSON) (entrate):', JSON.stringify(error, null, 2));
      
      let errorCode: string | undefined;
      let errorMessage: string | undefined;
      
      // Prova diversi modi per accedere ai dati
      if (error && typeof error === 'object') {
        // Metodo 1: error.response
        if ('response' in error) {
          const response = (error as { response?: { status?: number; data?: unknown } }).response;
          console.log('🔍 Metodo 1 - Response completa (entrate):', response);
          console.log('🔍 Metodo 1 - Response status (entrate):', response?.status);
          console.log('🔍 Metodo 1 - Response data (entrate):', response?.data);
          
          if (response?.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;
            errorCode = data.code as string | undefined;
            errorMessage = data.message as string | undefined;
          }
        }
        
        // Metodo 2: error.data (fallback)
        if (!errorCode && 'data' in error) {
          const data = (error as { data?: unknown }).data;
          console.log('🔍 Metodo 2 - Data diretta (entrate):', data);
          
          if (data && typeof data === 'object') {
            const dataObj = data as Record<string, unknown>;
            errorCode = dataObj.code as string | undefined;
            errorMessage = dataObj.message as string | undefined;
          }
        }
        
        // Metodo 3: error.message (fallback)
        if (!errorMessage && 'message' in error) {
          errorMessage = (error as { message?: string }).message;
          console.log('🔍 Metodo 3 - Message diretta (entrate):', errorMessage);
        }
      }
      
      console.log('🔍 Error code estratto (entrate):', errorCode);
      console.log('🔍 Error message estratto (entrate):', errorMessage);
      
      // Gestione errore numero fattura duplicato
      if (errorCode === 'DUPLICATE_INVOICE_NUMBER' || 
          (errorMessage && errorMessage.toLowerCase().includes('numero fattura già esistente'))) {
        console.log('🔍 Trovato errore numero fattura duplicato (entrate) (via code o message)');
        setErrors({ numero_fattura: errorMessage || 'Numero fattura esistente' });
        scrollToField('entr-numero-fattura');
      } else {
        // Gestione errori generici del backend
        const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        
        if (errorMessage) {
          // Se il backend restituisce un messaggio, mostralo
          if (errorMessage.toLowerCase().includes('fattura') || errorMessage.toLowerCase().includes('numero')) {
            setErrors({ numero_fattura: errorMessage });
            scrollToField('entr-numero-fattura');
          } else if (errorMessage.toLowerCase().includes('cliente')) {
            setErrors({ cliente: errorMessage });
            scrollToField('entr-cliente');
          } else {
            // Errore generico
            enqueueSnackbar(`Errore: ${errorMessage}`, { 
              variant: 'error',
              anchorOrigin: { vertical: 'top', horizontal: 'right' },
              autoHideDuration: 5000
            });
          }
        } else {
          // Errore generico senza messaggio
          
          // Se abbiamo un messaggio di errore generico, proviamo a renderlo più specifico
          if (errorMessage && errorMessage.toLowerCase().includes('numero fattura già esistente')) {
            enqueueSnackbar('Errore, il N. Fattura esiste già. Riprova.', { 
              variant: 'error',
              anchorOrigin: { vertical: 'top', horizontal: 'right' },
              autoHideDuration: 5000
            });
          } else {
            enqueueSnackbar('Errore durante il salvataggio. Riprova.', { 
              variant: 'error',
              anchorOrigin: { vertical: 'top', horizontal: 'right' },
              autoHideDuration: 5000
            });
          }
        }
        console.error('Errore nella creazione entrata:', error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField id="entr-numero-fattura" label="N. Fattura" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} required fullWidth value={form.numero_fattura} onChange={handleChange('numero_fattura')} error={Boolean(errors['numero_fattura'])} helperText={errors['numero_fattura'] || ''} />
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
              const text = val || '';
              setClienteQuery(text);
              setSelectedCliente(text ? text : null);
              setForm((p) => ({ ...p, cliente: text }));
              if (text) setErrors((prev) => ({ ...prev, cliente: '' }));
            }}
            onChange={(_, val) => {
              if (!val) {
                setClienteQuery('');
                setSelectedCliente(null);
                setForm((p) => ({
                  ...p,
                  cliente: '',
                  tipologia: '',
                  modalita_pagamento: '',
                  aliquota_iva: '',
                  imponibile: '',
                  iva: '',
                  importo_totale: ''
                }));
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
                const { iva, importo_totale } = computeFromImponibile(String(p.imponibile), normalizedAli);
                return {
                  ...p,
                  cliente: formatClienteLabel(v),
                  tipologia: v.tipologia || p.tipologia,
                  modalita_pagamento: v.mod_pagamento_pref || p.modalita_pagamento,
                  aliquota_iva: normalizedAli,
                  iva,
                  importo_totale
                };
              });
              setClienteQuery(formatClienteLabel(v));
              setSelectedCliente(val);
            }}
            renderInput={(params) => (
              <TextField {...params} id="entr-cliente" label="Cliente" required fullWidth error={Boolean(errors['cliente'])} helperText={errors['cliente'] || ''} InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField id="entr-tipologia" label="Tipologia" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} required fullWidth value={form.tipologia} onChange={handleChange('tipologia')} error={Boolean(errors['tipologia'])} helperText={errors['tipologia'] || ''} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField id="entr-emissione" type="date" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} label="Emissione Fattura" required fullWidth value={form.emissione_fattura} onChange={handleChange('emissione_fattura')} error={Boolean(errors['emissione_fattura'])} helperText={errors['emissione_fattura'] || ''} />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <TextField id="entr-data-pag" type="date" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} label="Data Pagamento" required fullWidth value={form.data_pagamento} onChange={handleChange('data_pagamento')} error={Boolean(errors['data_pagamento'])} helperText={errors['data_pagamento'] || ''} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField id="entr-imponibile" type="number" label="Imponibile" InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} required fullWidth value={form.imponibile} onChange={handleChange('imponibile')} error={Boolean(errors['imponibile'])} helperText={errors['imponibile'] || ''} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth required error={Boolean(errors['aliquota_iva'])}>
            <InputLabel id="aliquota-iva-entrate-label" shrink sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Aliquota IVA</InputLabel>
            <Select id="entr-aliquota" labelId="aliquota-iva-entrate-label" label="Aliquota IVA" value={form.aliquota_iva}
              onChange={(e) => {
                const nextAli = String(e.target.value);
                setForm((p) => {
                  const { iva, importo_totale } = computeFromImponibile(String(p.imponibile), nextAli);
                  return { ...p, aliquota_iva: nextAli, iva, importo_totale };
                });
                setErrors((prev) => ({ ...prev, aliquota_iva: '' }));
              }}
              displayEmpty
            >
              <MenuItem value="" disabled>Seleziona Aliquota</MenuItem>
              <MenuItem value="0">0%</MenuItem>
              <MenuItem value="4">4%</MenuItem>
              <MenuItem value="10">10%</MenuItem>
              <MenuItem value="22">22%</MenuItem>
            </Select>
            {errors['aliquota_iva'] && <Typography variant="caption" color="error">{errors['aliquota_iva']}</Typography>}
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField type="number" label="IVA" InputLabelProps={{ shrink: true }} required fullWidth value={form.iva} InputProps={{ readOnly: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField id="entr-importo" type="number" label="Importo Totale" InputLabelProps={{ shrink: true }} required fullWidth value={form.importo_totale} InputProps={{ readOnly: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label={'Modalità di pagamento'} InputLabelProps={{ shrink: true }} fullWidth value={form.modalita_pagamento} onChange={handleChange('modalita_pagamento')} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth required error={Boolean(errors['stato_entrata'])}>
            <InputLabel id="stato-entrata-label" shrink sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Stato</InputLabel>
            <Select id="entr-stato" labelId="stato-entrata-label" label="Stato" value={form.stato_entrata}
              onChange={(e) => { setForm((p) => ({ ...p, stato_entrata: String(e.target.value) })); setErrors((prev) => ({ ...prev, stato_entrata: '' })); }}
              displayEmpty
            >
              <MenuItem value="" disabled>Seleziona Stato</MenuItem>
              <MenuItem value="No Pagato">No Pagato</MenuItem>
              <MenuItem value="Pagato">Pagato</MenuItem>
            </Select>
            {errors['stato_entrata'] && <Typography variant="caption" color="error">{errors['stato_entrata']}</Typography>}
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 12 }}>
          <Box
            sx={{
              mt: 1,
              p: 3,
              border: '2px dashed',
              borderColor: (theme: Theme) => alpha(theme.palette.grey[400], 0.6),
              bgcolor: (theme: Theme) => alpha(theme.palette.grey[400], 0.12),
              borderRadius: 2,
              textAlign: 'center',
              color: 'text.secondary',
              cursor: 'not-allowed'
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 0.5 }}>
              <UploadFileRoundedIcon color="action" />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Trascina qui il file oppure clicca per selezionarlo</Typography>
            </Stack>
            <Typography variant="caption">(Mock visivo - caricamento non attivo) • Puoi caricare un solo file JPG/PNG/PDF</Typography>
          </Box>
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={handleReset} disabled={saving}>Reset Campi</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Salvataggio…' : 'Salva Ricavo'}
        </Button>
        {/* Pulsante di test temporaneo per verificare la gestione errori */}
        <Button 
          variant="outlined" 
          color="warning" 
          onClick={() => {
            console.log('🧪 Test: Imposto errore numero fattura (entrate)');
            setErrors({ numero_fattura: 'Numero fattura già esistente - TEST' });
            scrollToField('entr-numero-fattura');
          }}
          sx={{ ml: 1 }}
        >
          Test Errore
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
      action: (key: string | number) => (
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
  // Dati fornitori per Autocomplete in modifica
  type FornitoreOption = {
    id?: string | number;
    ragione_sociale?: string;
    nome?: string;
    cognome?: string;
    tipologia?: string;
    aliquota_iva_predefinita?: number | string | null;
    mod_pagamento_pref?: string | null;
  };
  const { data: fornitoriData } = useSWR('/api/tenants/fornitori');
  const formatFornitoreLabel = (f: FornitoreOption): string =>
    (f.ragione_sociale && f.ragione_sociale.trim())
      ? f.ragione_sociale
      : `${f.nome || ''} ${f.cognome || ''}`.trim();
  const allFornitori: FornitoreOption[] = Array.isArray(fornitoriData) ? (fornitoriData as FornitoreOption[]) : [];
  const fornitori: FornitoreOption[] = [...allFornitori].sort((a, b) => (formatFornitoreLabel(a).localeCompare(formatFornitoreLabel(b), 'it', { sensitivity: 'base' })));
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const computeDerivedEdit = (importoStr: string | number | undefined, aliquotaStr: string | number | undefined): { imponibile: string; iva: string } => {
    const parseNum = (v: string | number | undefined): number | null => {
      if (v == null) return null;
      const n = Number(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const imp = parseNum(importoStr as string);
    const ali = parseNum(aliquotaStr as string);
    if (imp == null || ali == null) return { imponibile: '', iva: '' };
    if (ali === 0) return { imponibile: Number(imp).toFixed(2), iva: '0.00' };
    const imponibileVal = imp / (1 + ali / 100);
    const ivaVal = imp - imponibileVal;
    return { imponibile: imponibileVal.toFixed(2), iva: ivaVal.toFixed(2) };
  };
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
                <TextField 
                  label="N. Fattura" 
                  fullWidth 
                  value={editData.numero_fattura || ''} 
                  onChange={(e) => {
                    setEditData((p) => ({ ...p, numero_fattura: e.target.value }));
                    setEditErrors((prev) => ({ ...prev, numero_fattura: '' }));
                  }} 
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(editErrors['numero_fattura'])}
                  helperText={editErrors['numero_fattura'] || ''}
                />
              </Grid>
            )}
            <Grid size={{ xs: 12, md: docType === 'fattura' ? 5 : 6 }}>
              <Autocomplete
                fullWidth
                freeSolo
                options={fornitori}
                getOptionLabel={(o) => (typeof o === 'string' ? o : formatFornitoreLabel(o as FornitoreOption))}
                inputValue={String(editData.fornitore || '')}
                value={editData.fornitore || ''}
                onInputChange={(_, val) => {
                  const text = val || '';
                  setEditData((p) => ({ ...p, fornitore: text }));
                  if (text) setEditErrors((prev) => ({ ...prev, fornitore: '' }));
                }}
                onChange={(_, val) => {
                  if (!val) {
                    setEditData((p) => ({ ...p, fornitore: '' }));
                    return;
                  }
                  if (typeof val === 'string') {
                    setEditData((p) => ({ ...p, fornitore: val }));
                    return;
                  }
                  const v = val as FornitoreOption;
                  setEditData((p) => {
                    const rawAli = v.aliquota_iva_predefinita;
                    const normalizedAli = rawAli != null && String(rawAli) !== '' && !Number.isNaN(Number(rawAli)) ? Number(rawAli) : (p.aliquota_iva as number | undefined);
                    let next: typeof p = { ...p, fornitore: formatFornitoreLabel(v) };
                    if (normalizedAli != null) {
                      const { imponibile, iva } = computeDerivedEdit(p.importo_totale as number | string | undefined, normalizedAli);
                      next = { ...next, aliquota_iva: normalizedAli, imponibile: Number(imponibile) as unknown as number, iva: Number(iva) as unknown as number };
                    }
                    if (v.mod_pagamento_pref) next = { ...next, modalita_pagamento: v.mod_pagamento_pref };
                    if (v.tipologia) next = { ...next, tipologia: v.tipologia };
                    return next;
                  });
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Fornitore" fullWidth error={Boolean(editErrors['fornitore'])} helperText={editErrors['fornitore'] || ''} InputLabelProps={{ shrink: true }} />
                )}
              />
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
              <TextField type="number" label="Importo Totale" fullWidth value={editData.importo_totale ?? ''} onChange={(e) => {
                const val = e.target.value;
                setEditData((p) => {
                  const next = { ...p, importo_totale: val as unknown as number };
                  if (docType === 'fattura') {
                    const { imponibile, iva } = computeDerivedEdit(val, p.aliquota_iva as number | string | undefined);
                    return { ...next, imponibile: Number(imponibile) as unknown as number, iva: Number(iva) as unknown as number };
                  }
                  return next;
                });
              }} InputLabelProps={{ shrink: true }} />
            </Grid>
            {docType === 'scontrini' && (
              <>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Modalità di pagamento" fullWidth value={editData.modalita_pagamento || ''} onChange={(e) => setEditData((p) => ({ ...p, modalita_pagamento: e.target.value }))} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Stato" fullWidth value={'Pagato'} disabled InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid size={{ xs: 12, md: 12 }}>
                  <Box
                    sx={{
                      mt: 1,
                      p: 3,
                      border: '2px dashed',
                      borderColor: (theme: Theme) => alpha(theme.palette.grey[400], 0.6),
                      bgcolor: (theme: Theme) => alpha(theme.palette.grey[400], 0.12),
                      borderRadius: 2,
                      textAlign: 'center',
                      color: 'text.secondary',
                      cursor: 'not-allowed'
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 0.5 }}>
                      <UploadFileRoundedIcon color="action" />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Trascina qui il file oppure clicca per selezionarlo</Typography>
                    </Stack>
                    <Typography variant="caption">(Mock visivo - caricamento non attivo) • Puoi caricare un solo file JPG/PNG/PDF</Typography>
                  </Box>
                </Grid>
              </>
            )}
            {docType === 'fattura' && (
              <>
                <Grid size={{ xs: 12, md: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel id="aliquota-iva-uscite-edit" shrink>Aliquota IVA</InputLabel>
                    <Select labelId="aliquota-iva-uscite-edit" label="Aliquota IVA" value={String(editData.aliquota_iva ?? '')} onChange={(e) => setEditData((p) => {
                      const ali = Number(e.target.value);
                      const { imponibile, iva } = computeDerivedEdit(p.importo_totale as number | string | undefined, ali);
                      return { ...p, aliquota_iva: ali, imponibile: Number(imponibile) as unknown as number, iva: Number(iva) as unknown as number };
                    })}>
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
                <Grid size={{ xs: 12, md: 12 }}>
                  <Box
                    sx={{
                      mt: 1,
                      p: 3,
                      border: '2px dashed',
                      borderColor: (theme: Theme) => alpha(theme.palette.grey[400], 0.6),
                      bgcolor: (theme: Theme) => alpha(theme.palette.grey[400], 0.12),
                      borderRadius: 2,
                      textAlign: 'center',
                      color: 'text.secondary',
                      cursor: 'not-allowed'
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 0.5 }}>
                      <UploadFileRoundedIcon color="action" />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Trascina qui il file oppure clicca per selezionarlo</Typography>
                    </Stack>
                    <Typography variant="caption">(Mock visivo - caricamento non attivo) • Puoi caricare un solo file JPG/PNG/PDF</Typography>
                  </Box>
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
                const newErrors: Record<string, string> = {};
                if (docType === 'fattura') {
                  if (!String(editData.fornitore || '').trim()) newErrors['fornitore'] = 'Campo obbligatorio';
                  if (!String(editData.tipologia || '').trim()) newErrors['tipologia'] = 'Campo obbligatorio';
                  if (!String(editData.emissione_fattura || '').trim()) newErrors['emissione_fattura'] = 'Campo obbligatorio';
                  if (!String(editData.data_pagamento || '').trim()) newErrors['data_pagamento'] = 'Campo obbligatorio';
                  const imp = Number(String(editData.importo_totale ?? '').replace(',', '.'));
                  if (!String(editData.importo_totale ?? '').trim()) newErrors['importo_totale'] = 'Campo obbligatorio';
                  if (Number.isFinite(imp) && imp <= 0) newErrors['importo_totale'] = 'Deve essere ≥ 0,01';
                  if (String(editData.aliquota_iva ?? '') === '') newErrors['aliquota_iva'] = 'Campo obbligatorio';
                  if (String(editData.aliquota_iva ?? '') !== '' && ![0,4,10,22].includes(Number(editData.aliquota_iva))) newErrors['aliquota_iva'] = 'Valore non valido';
                } else {
                  if (!String(editData.fornitore || '').trim()) newErrors['fornitore'] = 'Campo obbligatorio';
                  if (!String(editData.tipologia || '').trim()) newErrors['tipologia'] = 'Campo obbligatorio';
                  const imp = Number(String(editData.importo_totale ?? '').replace(',', '.'));
                  if (!String(editData.importo_totale ?? '').trim()) newErrors['importo_totale'] = 'Campo obbligatorio';
                  if (Number.isFinite(imp) && imp <= 0) newErrors['importo_totale'] = 'Deve essere ≥ 0,01';
                  if (!String(editData.data_pagamento || '').trim()) newErrors['data_pagamento'] = 'Campo obbligatorio';
                }
                if (Object.keys(newErrors).length > 0) { setEditErrors(newErrors); return; }
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
              } catch (error: unknown) {
                console.log('🔍 Errore completo dal backend (modifica uscite):', error);
                
                // Gestione errore numero fattura duplicato
                if ((error as { response?: { data?: { code?: string; message?: string } } })?.response?.data?.code === 'DUPLICATE_INVOICE_NUMBER') {
                  setEditErrors({ numero_fattura: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Errore sconosciuto' });
                } else {
                  // Gestione errori generici del backend
                  const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  
                  if (errorMessage) {
                    // Se il backend restituisce un messaggio, mostralo
                    if (errorMessage.toLowerCase().includes('fattura') || errorMessage.toLowerCase().includes('numero')) {
                      setEditErrors({ numero_fattura: errorMessage });
                    } else {
                      // Errore generico
                      showBanner(`Errore: ${errorMessage}`, 'error');
                    }
                  } else {
                    // Errore generico senza messaggio
                    showBanner('Errore durante l\'aggiornamento.','error');
                  }
                  console.error('Errore nell\'aggiornamento uscita:', error);
                }
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
  // Autocomplete clienti e ricalcoli/validazioni per dialog modifica ricavo
  type ClienteEditOption = {
    id?: string | number;
    ragione_sociale?: string;
    nome?: string;
    cognome?: string;
    tipologia?: string;
    aliquota_iva_predefinita?: number | string | null;
    mod_pagamento_pref?: string | null;
  };
  const { data: clientiData } = useSWR('/api/tenants/clienti');
  const formatClienteEditLabel = (c: ClienteEditOption): string =>
    (c.ragione_sociale && c.ragione_sociale.trim())
      ? c.ragione_sociale
      : `${c.nome || ''} ${c.cognome || ''}`.trim();
  const allClientiEdit: ClienteEditOption[] = Array.isArray(clientiData) ? (clientiData as ClienteEditOption[]) : [];
  const clientiEdit: ClienteEditOption[] = [...allClientiEdit].sort((a, b) => (formatClienteEditLabel(a).localeCompare(formatClienteEditLabel(b), 'it', { sensitivity: 'base' })));
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const computeFromImponibileEdit = (imponibileStr: string | number | undefined, aliquotaStr: string | number | undefined): { iva: string; importo_totale: string } => {
    const parseNum = (v: string | number | undefined): number | null => {
      if (v == null) return null;
      const n = Number(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const imp = parseNum(imponibileStr);
    const ali = parseNum(aliquotaStr);
    if (imp == null || ali == null) return { iva: '', importo_totale: '' };
    const ivaVal = imp * (ali / 100);
    const totaleVal = imp + ivaVal;
    return { iva: ivaVal.toFixed(2), importo_totale: totaleVal.toFixed(2) };
  };

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
              <TextField 
                label="N. Fattura" 
                fullWidth 
                value={editData.numero_fattura || ''} 
                onChange={(e) => {
                  setEditData((p) => ({ ...p, numero_fattura: e.target.value }));
                  setEditErrors((prev) => ({ ...prev, numero_fattura: '' }));
                }} 
                InputLabelProps={{ shrink: true }}
                error={Boolean(editErrors['numero_fattura'])}
                helperText={editErrors['numero_fattura'] || ''}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Autocomplete<ClienteEditOption, false, false, true>
                fullWidth
                freeSolo
                options={clientiEdit}
                getOptionLabel={(o) => (typeof o === 'string' ? o : formatClienteEditLabel(o as ClienteEditOption))}
                filterOptions={(x) => x as ClienteEditOption[]}
                inputValue={String(editData.cliente || '')}
                value={editData.cliente || ''}
                onInputChange={(_, val) => {
                  const text = val || '';
                  setEditData((p) => ({ ...p, cliente: text }));
                  if (text) setEditErrors((prev) => ({ ...prev, cliente: '' }));
                }}
                onChange={(_, val) => {
                  if (!val) { setEditData((p) => ({ ...p, cliente: '' })); return; }
                  if (typeof val === 'string') { setEditData((p) => ({ ...p, cliente: val })); return; }
                  const v = val as ClienteEditOption;
                  setEditData((p) => {
                    const baseNext = { ...p, cliente: formatClienteEditLabel(v), tipologia: v.tipologia || p.tipologia, modalita_pagamento: v.mod_pagamento_pref || p.modalita_pagamento } as typeof p;
                    const rawAli = v.aliquota_iva_predefinita;
                    if (rawAli != null && String(rawAli) !== '' && !Number.isNaN(Number(rawAli))) {
                      const ali = Number(rawAli);
                      const { iva, importo_totale } = computeFromImponibileEdit(p.imponibile as number | string | undefined, ali);
                      return { ...baseNext, aliquota_iva: ali, iva: Number(iva) as unknown as number, importo_totale: Number(importo_totale) as unknown as number };
                    }
                    return baseNext;
                  });
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Cliente" fullWidth error={Boolean(editErrors['cliente'])} helperText={editErrors['cliente'] || ''} InputLabelProps={{ shrink: true }} />
                )}
              />
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
                <Select labelId="aliquota-iva-entrate-edit" label="Aliquota IVA" value={editData.aliquota_iva ?? ''} onChange={(e) => setEditData((p) => {
                  const ali = Number(e.target.value);
                  const { iva, importo_totale } = computeFromImponibileEdit(p.imponibile as number | string | undefined, ali);
                  return { ...p, aliquota_iva: ali, iva: Number(iva) as unknown as number, importo_totale: Number(importo_totale) as unknown as number };
                })}>
                  <MenuItem value={0}>0%</MenuItem>
                  <MenuItem value={4}>4%</MenuItem>
                  <MenuItem value={10}>10%</MenuItem>
                  <MenuItem value={22}>22%</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField type="number" label="Imponibile" fullWidth value={editData.imponibile ?? ''} onChange={(e) => {
                const val = e.target.value;
                setEditData((p) => {
                  const next = { ...p, imponibile: val as unknown as number };
                  const { iva, importo_totale } = computeFromImponibileEdit(val, p.aliquota_iva as number | string | undefined);
                  return { ...next, iva: Number(iva) as unknown as number, importo_totale: Number(importo_totale) as unknown as number };
                });
              }} InputLabelProps={{ shrink: true }} />
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
            <Grid size={{ xs: 12, md: 12 }}>
              <Box
                sx={{
                  mt: 1,
                  p: 3,
                  border: '2px dashed',
                  borderColor: (theme: Theme) => alpha(theme.palette.grey[400], 0.6),
                  bgcolor: (theme: Theme) => alpha(theme.palette.grey[400], 0.12),
                  borderRadius: 2,
                  textAlign: 'center',
                  color: 'text.secondary',
                  cursor: 'not-allowed'
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 0.5 }}>
                  <UploadFileRoundedIcon color="action" />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Trascina qui il file oppure clicca per selezionarlo</Typography>
                </Stack>
                <Typography variant="caption">(Mock visivo - caricamento non attivo) • Puoi caricare un solo file JPG/PNG/PDF</Typography>
              </Box>
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
                const newErrors: Record<string, string> = {};
                if (!String(editData.numero_fattura || '').trim()) newErrors['numero_fattura'] = 'Campo obbligatorio';
                if (!String(editData.cliente || '').trim()) newErrors['cliente'] = 'Campo obbligatorio';
                if (!String(editData.tipologia || '').trim()) newErrors['tipologia'] = 'Campo obbligatorio';
                if (!String(editData.emissione_fattura || '').trim()) newErrors['emissione_fattura'] = 'Campo obbligatorio';
                if (!String(editData.data_pagamento || '').trim()) newErrors['data_pagamento'] = 'Campo obbligatorio';
                if (!String(editData.imponibile ?? '').trim()) newErrors['imponibile'] = 'Campo obbligatorio';
                if (String(editData.aliquota_iva ?? '') === '') newErrors['aliquota_iva'] = 'Campo obbligatorio';
                if (Object.keys(newErrors).length > 0) { setEditErrors(newErrors); return; }
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
              } catch (error: unknown) {
                console.log('🔍 Errore completo dal backend (modifica entrate):', error);
                
                // Gestione errore numero fattura duplicato
                if ((error as { response?: { data?: { code?: string; message?: string } } })?.response?.data?.code === 'DUPLICATE_INVOICE_NUMBER') {
                  setEditErrors({ numero_fattura: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Errore sconosciuto' });
                } else {
                  // Gestione errori generici del backend
                  const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  
                  if (errorMessage) {
                    // Se il backend restituisce un messaggio, mostralo
                    if (errorMessage.toLowerCase().includes('fattura') || errorMessage.toLowerCase().includes('numero')) {
                      setEditErrors({ numero_fattura: errorMessage });
                    } else {
                      // Errore generico
                      showBanner(`Errore: ${errorMessage}`, 'error');
                    }
                  } else {
                    // Errore generico senza messaggio
                    showBanner('Errore durante l\'aggiornamento.','error');
                  }
                  console.error('Errore nell\'aggiornamento ricavo:', error);
                }
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