import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';

type AuthedTenantRequest = Request & {
  user?: { sub: string; dbUserId?: string };
  tenant?: { companyId: string };
  db?: { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> };
};

const router = Router();

router.use(authenticateToken);
router.use(tenantMiddleware);

router.get('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const q = String((req.query.q || '') as string).trim();
    let sql = `SELECT * FROM fornitori WHERE company_id = $1`;
    const params: unknown[] = [companyId];
    if (q) {
      sql += ` AND (ragione_sociale ILIKE $2 OR email ILIKE $2 OR pec ILIKE $2 OR partita_iva ILIKE $2 OR codice_fiscale ILIKE $2 OR CONCAT_WS(' ', nome, cognome) ILIKE $2)`;
      params.push(`%${q}%`);
    }
    sql += ` ORDER BY COALESCE(ragione_sociale, CONCAT_WS(' ', nome, cognome)) ASC NULLS LAST LIMIT 200`;
    const result = await req.db!.query(sql, params);
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('Errore GET fornitori:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero fornitori' });
  }
});

// Dettaglio fornitore
router.get('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'ID non valido' });
      return;
    }
    const sql = `SELECT * FROM fornitori WHERE company_id = $1 AND id = $2`;
    const result = await req.db!.query(sql, [companyId, id]);
    if (!result.rows.length) {
      res.status(404).json({ status: 'error', message: 'Fornitore non trovato' });
      return;
    }
    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    console.error('Errore GET fornitore by id:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero fornitore' });
  }
});

// Update fornitore
router.put('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.dbUserId || req.user!.sub;
    const companyId = req.tenant!.companyId;
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'ID non valido' });
      return;
    }

    const b = (req.body || {}) as Record<string, unknown>;
    const emptyToNull = (v: unknown): unknown => {
      if (v === undefined || v === null) return null;
      if (typeof v === 'string' && v.trim() === '') return null;
      return v;
    };

    const forma = String((b['forma_giuridica'] || '').toString().toUpperCase());
    if (!['PF', 'PG'].includes(forma)) {
      res.status(400).json({ status: 'error', message: "'forma_giuridica' deve essere PF o PG" });
      return;
    }

    const soDiversa = Boolean(b['so_diversa']);
    const payload: Record<string, unknown> = {
      forma_giuridica: forma,
      ragione_sociale: emptyToNull(b['ragione_sociale']),
      nome: emptyToNull(b['nome']),
      cognome: emptyToNull(b['cognome']),
      forma_giuridica_dettaglio: emptyToNull(b['forma_giuridica_dettaglio']),
      partita_iva: emptyToNull(b['partita_iva']),
      codice_fiscale: emptyToNull(b['codice_fiscale']),
      telefono: emptyToNull(b['telefono']),
      email: emptyToNull(b['email']),
      fax: emptyToNull(b['fax']),
      pec: emptyToNull(b['pec']),
      website: emptyToNull(b['website']),
      via: emptyToNull(b['via']),
      civico: emptyToNull(b['civico']),
      cap: emptyToNull(b['cap']),
      citta: emptyToNull(b['citta']),
      provincia: emptyToNull(b['provincia']),
      nazione: emptyToNull(b['nazione']),
      via_so: soDiversa ? emptyToNull(b['via_so']) : emptyToNull(b['via']),
      civico_so: soDiversa ? emptyToNull(b['civico_so']) : emptyToNull(b['civico']),
      cap_so: soDiversa ? emptyToNull(b['cap_so']) : emptyToNull(b['cap']),
      citta_so: soDiversa ? emptyToNull(b['citta_so']) : emptyToNull(b['citta']),
      provincia_so: soDiversa ? emptyToNull(b['provincia_so']) : emptyToNull(b['provincia']),
      nazione_so: soDiversa ? emptyToNull(b['nazione_so']) : emptyToNull(b['nazione']),
      mod_pagamento_pref: emptyToNull(b['mod_pagamento_pref']),
      iban: emptyToNull(b['iban']),
      codice_sdi: emptyToNull(b['codice_sdi']),
      note: emptyToNull(b['note']),
      aliquota_iva_predefinita: emptyToNull(b['aliquota_iva_predefinita']),
      updated_by: userId
    };

    const setClauses = Object.keys(payload)
      .map((k, i) => `${k} = $${i + 1}`)
      .join(', ');
    const values = Object.values(payload);
    values.push(companyId, id);
    const sql = `UPDATE fornitori SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE company_id = $${values.length - 1} AND id = $${values.length} RETURNING id`;
    const result = await req.db!.query(sql, values);
    if (!result.rows.length) {
      res.status(404).json({ status: 'error', message: 'Fornitore non trovato' });
      return;
    }
    res.status(200).json({ status: 'success', data: { id } });
  } catch (error) {
    console.error('Errore PUT fornitore:', error);
    res.status(500).json({ status: 'error', message: 'Errore aggiornamento fornitore' });
  }
});
router.post('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.dbUserId || req.user!.sub;
    const companyId = req.tenant!.companyId;
    const b = (req.body || {}) as Record<string, unknown>;

    const emptyToNull = (v: unknown): unknown => {
      if (v === undefined || v === null) return null;
      if (typeof v === 'string' && v.trim() === '') return null;
      return v;
    };

    const forma = String((b['forma_giuridica'] || '').toString().toUpperCase());
    if (!['PF', 'PG'].includes(forma)) {
      res.status(400).json({ status: 'error', message: "'forma_giuridica' deve essere PF o PG" });
      return;
    }

    const soDiversa = Boolean(b['so_diversa']);

    const data: Record<string, unknown> = {
      company_id: companyId,
      forma_giuridica: forma,
      ragione_sociale: emptyToNull(b['ragione_sociale']),
      aliquota_iva_predefinita: emptyToNull(b['aliquota_iva_predefinita']),
      tipologia: emptyToNull(b['tipologia']),
      nome: emptyToNull(b['nome']),
      cognome: emptyToNull(b['cognome']),
      forma_giuridica_dettaglio: emptyToNull(b['forma_giuridica_dettaglio']),
      ateco: emptyToNull(b['ateco']),
      rea: emptyToNull(b['rea']),
      partita_iva: emptyToNull(b['partita_iva']),
      codice_fiscale: emptyToNull(b['codice_fiscale']),
      telefono: emptyToNull(b['telefono']),
      email: emptyToNull(b['email']),
      fax: emptyToNull(b['fax']),
      pec: emptyToNull(b['pec']),
      website: emptyToNull(b['website']),
      via: emptyToNull(b['via']),
      civico: emptyToNull(b['civico']),
      cap: emptyToNull(b['cap']),
      citta: emptyToNull(b['citta']),
      provincia: emptyToNull(b['provincia']),
      nazione: emptyToNull(b['nazione']),
      via_so: soDiversa ? emptyToNull(b['via_so']) : emptyToNull(b['via']),
      civico_so: soDiversa ? emptyToNull(b['civico_so']) : emptyToNull(b['civico']),
      cap_so: soDiversa ? emptyToNull(b['cap_so']) : emptyToNull(b['cap']),
      citta_so: soDiversa ? emptyToNull(b['citta_so']) : emptyToNull(b['citta']),
      provincia_so: soDiversa ? emptyToNull(b['provincia_so']) : emptyToNull(b['provincia']),
      nazione_so: soDiversa ? emptyToNull(b['nazione_so']) : emptyToNull(b['nazione']),
      mod_pagamento_pref: emptyToNull(b['mod_pagamento_pref']),
      iban: emptyToNull(b['iban']),
      codice_sdi: emptyToNull(b['codice_sdi']),
      note: emptyToNull(b['note']),
      created_by: userId
    };

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const insert = `INSERT INTO fornitori (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`;
    const result = await req.db!.query(insert, values);
    res.status(201).json({ status: 'success', data: { id: (result.rows[0] as { id: number }).id } });
  } catch (error) {
    console.error('Errore POST fornitori:', error);
    res.status(500).json({ status: 'error', message: 'Errore nella creazione fornitore' });
  }
});

// GET /api/tenants/fornitori/:id → dettaglio
router.get('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const id = req.params.id;
    const result = await req.db!.query('SELECT * FROM fornitori WHERE id = $1 AND company_id = $2 LIMIT 1', [id, companyId]);
    if ((result.rowCount || 0) === 0) {
      res.status(404).json({ status: 'error', message: 'Fornitore non trovato' });
      return;
    }
    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    console.error('Errore GET fornitore by id:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero fornitore' });
  }
});

// PUT /api/tenants/fornitori/:id → aggiorna
router.put('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const id = req.params.id;
    const allowed: string[] = [
      'forma_giuridica','tipologia',
      'nome','cognome','codice_fiscale',
      'ragione_sociale','forma_giuridica_dettaglio','partita_iva','ateco','rea',
      'telefono','email','fax','pec','website',
      'via','civico','cap','citta','provincia','nazione',
      'via_so','civico_so','cap_so','citta_so','provincia_so','nazione_so',
      'mod_pagamento_pref','iban','codice_sdi','note','aliquota_iva_predefinita'
    ];
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates.push(`${key} = $${idx}`);
        params.push((req.body as Record<string, unknown>)[key]);
        idx++;
      }
    }
    if (updates.length === 0) {
      res.status(400).json({ status: 'error', message: 'Nessun campo da aggiornare' });
      return;
    }
    const sql = `UPDATE fornitori SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} AND company_id = $${idx + 1}`;
    params.push(id, companyId);
    const result = await req.db!.query(sql, params);
    if ((result.rowCount || 0) === 0) {
      res.status(404).json({ status: 'error', message: 'Fornitore non trovato' });
      return;
    }
    res.status(200).json({ status: 'success', data: { id } });
  } catch (error) {
    console.error('Errore PUT fornitore:', error);
    res.status(500).json({ status: 'error', message: "Errore nell'aggiornamento fornitore" });
  }
});

export default router;


