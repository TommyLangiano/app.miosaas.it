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

// GET /api/tenants/uscite?commessa_id=123&tipologia_uscita=fattura|scontrini
router.get('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const commessaId = req.query.commessa_id ? String(req.query.commessa_id) : undefined;
    const tipologiaUscita = req.query.tipologia_uscita ? String(req.query.tipologia_uscita) : undefined;

    let sql = `SELECT * FROM uscite WHERE company_id = $1`;
    const params: unknown[] = [companyId];
    if (commessaId) {
      // Confronta come testo per supportare UUID o integer in modo trasparente
      sql += ` AND commessa_id::text = $${params.length + 1}`;
      params.push(String(commessaId));
    }
    if (tipologiaUscita) {
      sql += ` AND tipologia_uscita = $${params.length + 1}`;
      params.push(tipologiaUscita);
    }
    sql += ` ORDER BY emissione_fattura DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 500`;
    const result = await req.db!.query(sql, params);
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('Errore GET uscite:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero uscite' });
  }
});

// GET /api/tenants/uscite/sum?commessa_id=123
router.get('/sum', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const commessaId = req.query.commessa_id ? String(req.query.commessa_id) : undefined;
    if (!commessaId) {
      res.status(400).json({ status: 'error', message: 'commessa_id mancante' });
      return;
    }
    const sql = `SELECT 
                   COALESCE(SUM(importo_totale), 0) AS total,
                   COALESCE(SUM(imponibile), 0) AS imponibile,
                   COALESCE(SUM(iva), 0) AS iva
                 FROM uscite
                 WHERE company_id = $1 AND commessa_id::text = $2`;
    const result = await req.db!.query(sql, [companyId, String(commessaId)]);
    const row = result.rows[0] || {};
    const total = Number(row.total || 0);
    const imponibile = Number(row.imponibile || 0);
    const iva = Number(row.iva || 0);
    res.status(200).json({ status: 'success', data: { total, imponibile, iva } });
  } catch (error) {
    console.error('Errore GET uscite sum:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel calcolo totale uscite' });
  }
});

// POST /api/tenants/uscite
router.post('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.dbUserId || req.user!.sub;
    const companyId = req.tenant!.companyId;
    const b = (req.body || {}) as Record<string, unknown>;

    const docType = (b['tipologia_uscita'] as string) || 'fattura';
    const required =
      docType === 'scontrini'
        ? ['fornitore', 'importo_totale', 'data_pagamento', 'stato_uscita', 'commessa_id', 'tipologia_uscita']
        : ['fornitore','tipologia','numero_fattura','emissione_fattura','importo_totale','aliquota_iva','imponibile','iva','data_pagamento','stato_uscita','commessa_id','tipologia_uscita'];
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

    // Validazione overflow per DECIMAL(12,2)
    const MAX_AMOUNT = 9999999999.99; // 10 cifre intere + 2 decimali
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

    const strOrNull = (v: unknown): string | null => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s === '' ? null : s;
    };

    const dataMap: Record<string, unknown> = {
      company_id: companyId,
      commessa_id: String(b['commessa_id']),
      fornitore: String(b['fornitore']).trim(),
      tipologia: docType === 'scontrini' ? (strOrNull(b['tipologia']) || 'Scontrino') : String(b['tipologia']).trim(),
      numero_fattura: docType === 'scontrini' ? null : strOrNull(b['numero_fattura']),
      emissione_fattura: docType === 'scontrini' ? null : b['emissione_fattura'],
      importo_totale: importo,
      aliquota_iva: docType === 'scontrini' ? null : parseNum(b['aliquota_iva']),
      imponibile: docType === 'scontrini' ? null : impon,
      iva: docType === 'scontrini' ? null : ivaNum,
      data_pagamento: b['data_pagamento'],
      modalita_pagamento: (b['modalita_pagamento'] as string) || null,
      stato_uscita: (b['stato_uscita'] as string) || 'No Pagato',
      tipologia_uscita: docType,
      banca_emissione: (b['banca_emissione'] as string) || null,
      numero_conto: (b['numero_conto'] as string) || null,
      created_by: userId
    };

    const keys = Object.keys(dataMap);
    const values = Object.values(dataMap);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO uscite (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await req.db!.query(sql, values);
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    console.error('Errore POST uscite:', error);
    res.status(500).json({ status: 'error', message: 'Errore nella creazione uscita' });
  }
});

// GET /api/tenants/uscite/:id
router.get('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const companyId = req.tenant!.companyId;
    const sql = `SELECT * FROM uscite WHERE id = $1 AND company_id = $2 LIMIT 1`;
    const result = await req.db!.query(sql, [id, companyId]);
    if (result.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Uscita non trovata' });
      return;
    }
    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    console.error('Errore GET uscita:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero uscita' });
  }
});

// PUT /api/tenants/uscite/:id
router.put('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const companyId = req.tenant!.companyId;
    const b = (req.body || {}) as Record<string, unknown>;

    const allowed = [
      'fornitore','tipologia','numero_fattura','emissione_fattura','importo_totale','aliquota_iva','imponibile','iva','data_pagamento','modalita_pagamento','banca_emissione','numero_conto','stato_uscita','commessa_id','updated_by','tipologia_uscita'
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
    const sql = `UPDATE uscite SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} AND company_id = $${idx + 1} RETURNING id`;
    params.push(id, companyId);
    const result = await req.db!.query(sql, params);
    if ((result.rowCount || 0) === 0) {
      res.status(404).json({ status: 'error', message: 'Uscita non trovata' });
      return;
    }
    res.status(200).json({ status: 'success', data: { id } });
  } catch (error) {
    console.error('Errore PUT uscita:', error);
    res.status(500).json({ status: 'error', message: 'Errore nell\'aggiornamento uscita' });
  }
});

// DELETE /api/tenants/uscite/:id
router.delete('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const companyId = req.tenant!.companyId;
    const sql = `DELETE FROM uscite WHERE id = $1 AND company_id = $2 RETURNING id`;
    const result = await req.db!.query(sql, [id, companyId]);
    if ((result.rowCount || 0) === 0) {
      res.status(404).json({ status: 'error', message: 'Uscita non trovata' });
      return;
    }
    res.status(200).json({ status: 'success', data: { id } });
  } catch (error) {
    console.error('Errore DELETE uscita:', error);
    res.status(500).json({ status: 'error', message: 'Errore nell\'eliminazione uscita' });
  }
});

export default router;


