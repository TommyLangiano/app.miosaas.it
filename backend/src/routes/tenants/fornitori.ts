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
      sql += ` AND (ragione_sociale ILIKE $2 OR email ILIKE $2 OR pec ILIKE $2 OR partita_iva ILIKE $2 OR codice_fiscale ILIKE $2)`;
      params.push(`%${q}%`);
    }
    sql += ` ORDER BY created_at DESC NULLS LAST LIMIT 200`;
    const result = await req.db!.query(sql, params);
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('Errore GET fornitori:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero fornitori' });
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

export default router;


