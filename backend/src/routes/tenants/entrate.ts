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

// GET /api/tenants/entrate?commessa_id=123
router.get('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const commessaId = req.query.commessa_id ? String(req.query.commessa_id) : undefined;

    let sql = `SELECT * FROM entrate WHERE company_id = $1`;
    const params: unknown[] = [companyId];
    if (commessaId) {
      sql += ` AND commessa_id::text = $${params.length + 1}`;
      params.push(String(commessaId));
    }
    sql += ` ORDER BY emissione_fattura DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 500`;
    const result = await req.db!.query(sql, params);
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('Errore GET entrate:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero entrate' });
  }
});

// GET /api/tenants/entrate/check-numero-fattura?numero=...&commessa_id=UUID&exclude_id=ID
router.get('/check-numero-fattura', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const numero = String((req.query.numero || '') as string).trim();
    const commessaId = String((req.query.commessa_id || '') as string).trim();
    const excludeIdRaw = String((req.query.exclude_id || '') as string).trim();
    if (!numero) {
      res.status(400).json({ status: 'error', message: "Parametro 'numero' mancante" });
      return;
    }
    const params: unknown[] = [companyId, numero];
    let idx = params.length + 1;
    let sql = `SELECT 1 FROM entrate WHERE company_id = $1 AND numero_fattura = $2`;
    if (commessaId) {
      sql += ` AND commessa_id::text = $${idx}`;
      params.push(commessaId);
      idx++;
    }
    if (excludeIdRaw) {
      sql += ` AND id::text <> $${idx}`;
      params.push(excludeIdRaw);
      idx++;
    }
    sql += ` LIMIT 1`;
    const result = await req.db!.query(sql, params);
    res.status(200).json({ status: 'success', data: { exists: (result.rowCount || 0) > 0 } });
  } catch (error) {
    console.error('Errore GET entrate check-numero-fattura:', error);
    res.status(500).json({ status: 'error', message: 'Errore verifica numero fattura' });
  }
});

// POST /api/tenants/entrate
router.post('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.dbUserId || req.user!.sub;
    const companyId = req.tenant!.companyId;
    const b = (req.body || {}) as Record<string, unknown>;

    const required = ['cliente','tipologia','numero_fattura','emissione_fattura','importo_totale','aliquota_iva','imponibile','iva','data_pagamento','stato_entrata','commessa_id','tipologia_entrata'];
    const missing = required.filter((k) => !(k in b) || b[k] === '' || b[k] == null);
    if (missing.length > 0) {
      res.status(400).json({ status: 'error', message: `Campi obbligatori mancanti: ${missing.join(', ')}` });
      return;
    }

    const parseNum = (v: unknown): number | null => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const MAX_AMOUNT = 9999999999.99;
    const importo = parseNum(b['importo_totale']);
    const impon = parseNum(b['imponibile']);
    const ivaNum = parseNum(b['iva']);
    const overflowFields: string[] = [];
    if (importo !== null && Math.abs(importo) > MAX_AMOUNT) overflowFields.push('importo_totale');
    if (impon !== null && Math.abs(impon) > MAX_AMOUNT) overflowFields.push('imponibile');
    if (ivaNum !== null && Math.abs(ivaNum) > MAX_AMOUNT) overflowFields.push('iva');
    if (overflowFields.length > 0) {
      res.status(400).json({ status: 'error', message: `Valori troppo grandi per: ${overflowFields.join(', ')}. Massimo consentito 9.999.999.999,99` });
      return;
    }

    const dataMap: Record<string, unknown> = {
      company_id: companyId,
      commessa_id: String(b['commessa_id']),
      cliente: String(b['cliente']).trim(),
      tipologia: String(b['tipologia']).trim(),
      numero_fattura: String(b['numero_fattura']).trim(),
      emissione_fattura: b['emissione_fattura'],
      importo_totale: importo,
      aliquota_iva: parseNum(b['aliquota_iva']),
      imponibile: impon,
      iva: ivaNum,
      data_pagamento: b['data_pagamento'],
      modalita_pagamento: (b['modalita_pagamento'] as string) || null,
      stato_entrata: (b['stato_entrata'] as string) || 'No Pagato',
      tipologia_entrata: (b['tipologia_entrata'] as string) || 'fattura',
      created_by: userId
    };

    const keys = Object.keys(dataMap);
    const values = Object.values(dataMap);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO entrate (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await req.db!.query(sql, values);
    res.status(201).json({ status: 'success', data: result.rows[0] });
    return; // Esplicito return per sicurezza
  } catch (error) {
    console.error('Errore POST entrate:', error);
    
    // Gestione specifica per numero fattura duplicato
    if (error instanceof Error) {
      const errorMessage = error.message;
      if (errorMessage.includes('uniq_entrate_company_invoice') || errorMessage.includes('duplicate key value violates unique constraint')) {
        console.log('🔍 Backend: Rilevato numero fattura duplicato (entrate), restituisco errore 400');
        res.status(400).json({ 
          status: 'error', 
          message: 'Numero fattura esistente',
          code: 'DUPLICATE_INVOICE_NUMBER'
        });
        return;
      }
    }
    
    // Se arriviamo qui, è un errore generico
    console.log('🔍 Backend: Errore generico (entrate), restituisco 500');
    res.status(500).json({ status: 'error', message: 'Errore nella creazione entrata' });
  }
});

// PUT /api/tenants/entrate/:id
router.put('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const companyId = req.tenant!.companyId;
    const b = (req.body || {}) as Record<string, unknown>;

    const allowed = [
      'cliente','tipologia','numero_fattura','emissione_fattura','importo_totale','aliquota_iva','imponibile','iva','data_pagamento','modalita_pagamento','stato_entrata','commessa_id','updated_by','tipologia_entrata'
    ];
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const k of allowed) {
      if (b.hasOwnProperty(k)) {
        updates.push(`${k} = $${idx}`);
        params.push(k === 'commessa_id' ? String(b[k]) : b[k]);
        idx++;
      }
    }
    if (updates.length === 0) {
      res.status(400).json({ status: 'error', message: 'Nessun campo da aggiornare' });
      return;
    }
    const sql = `UPDATE entrate SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} AND company_id = $${idx + 1} RETURNING id`;
    params.push(id, companyId);
    const result = await req.db!.query(sql, params);
    if ((result.rowCount || 0) === 0) {
      res.status(404).json({ status: 'error', message: 'Entrata non trovata' });
      return;
    }
    res.status(200).json({ status: 'success', data: { id } });
  } catch (error) {
    console.error('Errore PUT entrate:', error);
    res.status(500).json({ status: 'error', message: 'Errore nell\'aggiornamento entrata' });
  }
});

// DELETE /api/tenants/entrate/:id
router.delete('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const companyId = req.tenant!.companyId;
    const sql = `DELETE FROM entrate WHERE id = $1 AND company_id = $2 RETURNING id`;
    const result = await req.db!.query(sql, [id, companyId]);
    if ((result.rowCount || 0) === 0) {
      res.status(404).json({ status: 'error', message: 'Entrata non trovata' });
      return;
    }
    res.status(200).json({ status: 'success', data: { id } });
  } catch (error) {
    console.error('Errore DELETE entrate:', error);
    res.status(500).json({ status: 'error', message: 'Errore nell\'eliminazione entrata' });
  }
});

export default router;
/**
 * SUM endpoint: totale, imponibile, iva per una commessa
 * GET /api/tenants/entrate/sum?commessa_id=UUID
 */
router.get('/sum', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const commessaId = req.query.commessa_id ? String(req.query.commessa_id) : undefined;
    const params: unknown[] = [companyId];
    let where = `company_id = $1`;
    if (commessaId) {
      params.push(String(commessaId));
      where += ` AND commessa_id::text = $2`;
    }
    const sql = `
      SELECT 
        COALESCE(SUM(importo_totale), 0) AS total,
        COALESCE(SUM(imponibile), 0) AS imponibile,
        COALESCE(SUM(iva), 0) AS iva
      FROM entrate
      WHERE ${where}
    `;
    const result = await req.db!.query(sql, params);
    const row = result.rows?.[0] || { total: 0, imponibile: 0, iva: 0 };
    res.status(200).json({ status: 'success', data: row });
  } catch (error) {
    console.error('Errore GET entrate/sum:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel calcolo dei ricavi' });
  }
});


