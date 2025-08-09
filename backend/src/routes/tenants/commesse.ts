import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
// S3/Bucket rimosso

type AuthedTenantRequest = Request & {
  user?: { sub: string; dbUserId?: string };
  tenant?: { companyId: string };
  db?: { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> };
};

const router = Router();

// Upload file rimosso

router.use(authenticateToken);
router.use(tenantMiddleware);

// Helpers dinamici per compatibilità schema
async function getExistingColumns(db: AuthedTenantRequest['db']): Promise<Set<string>> {
  const res = await db!.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'commesse'`
  );
  return new Set(res.rows.map((r) => String(r.column_name)));
}

function buildSelectList(existing: Set<string>): string {
  const want: Array<{ name: string; fallback: string }> = [
    { name: 'id', fallback: 'NULL::uuid AS id' },
    { name: 'company_id', fallback: 'NULL::uuid AS company_id' },
    { name: 'cliente', fallback: "NULL::text AS cliente" },
    { name: 'cliente_tipo', fallback: "NULL::text AS cliente_tipo" },
    { name: 'tipologia_commessa', fallback: "NULL::text AS tipologia_commessa" },
    { name: 'codice', fallback: "NULL::text AS codice" },
    { name: 'nome', fallback: "NULL::text AS nome" },
    { name: 'descrizione', fallback: "NULL::text AS descrizione" },
    // Compat: se non c'è citta, tenta localita
    { name: 'citta', fallback: existing.has('localita') ? 'localita AS citta' : "NULL::text AS citta" },
    { name: 'via', fallback: "NULL::text AS via" },
    { name: 'civico', fallback: "NULL::text AS civico" },
    { name: 'committente_commessa', fallback: "NULL::text AS committente_commessa" },
    { name: 'data_inizio', fallback: 'NULL::date AS data_inizio' },
    { name: 'data_fine_prevista', fallback: 'NULL::date AS data_fine_prevista' },
    { name: 'cig', fallback: "NULL::text AS cig" },
    { name: 'cup', fallback: "NULL::text AS cup" },
    { name: 'importo_commessa', fallback: 'NULL::numeric AS importo_commessa' },
    { name: 'created_by', fallback: "NULL::text AS created_by" },
    { name: 'updated_by', fallback: "NULL::text AS updated_by" },
    { name: 'created_at', fallback: 'NULL::timestamp AS created_at' },
    { name: 'updated_at', fallback: 'NULL::timestamp AS updated_at' }
  ];
  return want
    .map((w) => (existing.has(w.name) ? w.name : w.fallback))
    .join(', ');
}

// Query fissa con soli campi definitivi

// GET /api/tenants/commesse → elenco commesse dell'azienda
router.get('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const existing = await getExistingColumns(req.db);
    const selectList = buildSelectList(existing);
    const sql = `SELECT ${selectList} FROM commesse WHERE company_id = $1 ORDER BY created_at DESC NULLS LAST LIMIT 200`;
    const result = await req.db!.query(sql, [companyId]);
    console.log(`[COMMESSE][GET] rows: ${(result.rows || []).length}`);
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('Errore GET commesse:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero commesse' });
  }
});

// POST /api/tenants/commesse → crea una nuova commessa
router.post('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.dbUserId || req.user!.sub; // preferisci UUID DB
    const companyId = req.tenant!.companyId;

    const body = (req.body || {}) as Record<string, unknown>;
    // Niente proxy/upload: creazione semplice
    const emptyToNull = (v: unknown): unknown => {
      if (v === undefined || v === null) return null;
      if (typeof v === 'string' && v.trim() === '') return null;
      return v;
    };

    // Il campo cliente non è più obbligatorio: se assente useremo eventuale fallback o NULL

    // Prepara valori con fallback robusti (stringhe vuote considerate assenti)
    const rawCliente = typeof body['cliente'] === 'string' ? (body['cliente'] as string).trim() : '';
    const clienteTipoValue = String((body['cliente_tipo'] ?? body['clienteTipo'] ?? 'privato') as string);
    const tipologiaCommessaValue = String((body['tipologia_commessa'] ?? body['tipologiaCommessa'] ?? 'appalto') as string);

    // Costruiamo i valori da inserire
    const fullDataMap: Record<string, unknown> = {
      // Se cliente è vuoto, usa cliente_tipo per rispettare il NOT NULL a schema
      cliente: rawCliente !== '' ? rawCliente : clienteTipoValue,
      cliente_tipo: emptyToNull(body['cliente_tipo'] ?? body['clienteTipo'] ?? 'privato'),
      tipologia_commessa: emptyToNull(tipologiaCommessaValue),
      codice: emptyToNull(body['codice']),
      nome: emptyToNull(body['nome']),
      descrizione: emptyToNull(body['descrizione']),
      // Inserisci su citta se esiste, altrimenti fallback su localita
      citta: emptyToNull(body['citta'] ?? body['localita'] ?? body['luogo']),
      via: emptyToNull(body['via']),
      civico: emptyToNull(body['civico']),
      committente_commessa: emptyToNull(body['committente_commessa']),
      data_inizio: emptyToNull(body['data_inizio']),
      data_fine_prevista: emptyToNull(body['data_fine_prevista'] ?? body['data_fine']),
      cig: emptyToNull(body['cig']),
      cup: emptyToNull(body['cup']),
      importo_commessa: body['importo_commessa'] ?? null,
      company_id: companyId,
      created_by: userId
    };

    // Inserimento dinamico in base alle colonne esistenti
    const existing = await getExistingColumns(req.db);
    const dataMap: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fullDataMap)) {
      if (existing.has(k)) dataMap[k] = v;
    }

    // Validazione unicità codice per azienda
    if (dataMap.codice) {
      const dup = await req.db!.query(
        'SELECT 1 FROM commesse WHERE company_id = $1 AND codice = $2 LIMIT 1',
        [companyId, dataMap.codice]
      );
      if (dup.rows.length > 0) {
        res.status(409).json({ status: 'error', message: 'Codice già esistente per questa azienda' });
        return;
      }
    }
    // Iniziamo transazione per inserimento commessa
    await req.db!.query('BEGIN');
    const insertKeys = Object.keys(dataMap);
    const insertVals = insertKeys.map((k) => dataMap[k]);
    const placeholders = insertKeys.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `INSERT INTO commesse (${insertKeys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await req.db!.query(insertQuery, insertVals);
    const row = result.rows[0] as { id: string };

    // Nessun upload file gestito qui

    await req.db!.query('COMMIT');
    res.status(201).json({ status: 'success', data: { id: row.id, commessa: row } });
  } catch (error) {
    const pgErr = error as { code?: string; constraint?: string };
    if (pgErr?.code === '23505' && (pgErr?.constraint || '').includes('commesse_codice_unique')) {
      res.status(409).json({ status: 'error', message: 'Codice già esistente per questa azienda' });
      return;
    }
    console.error('Errore POST commesse:', error);
    try {
      await req.db!.query('ROLLBACK');
    } catch {}
    res.status(500).json({ status: 'error', message: 'Errore nella creazione commessa' });
  }
});

// Tutte le route file/S3 rimosse

// GET /api/tenants/commesse/:id → dettaglio
router.get('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const companyId = req.tenant!.companyId;
    try {
    const query = `SELECT * FROM commesse WHERE id = $1 AND company_id = $2 LIMIT 1`;
    const result = await req.db!.query(query, [id, companyId]);
    if (result.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Commessa non trovata' });
      return;
    }
    res.status(200).json({ status: 'success', data: result.rows[0] });
    } catch (e: unknown) {
      const errMsg = (e as Error)?.message || '';
      const isUndefinedColumn = errMsg.includes('column') && errMsg.includes('does not exist');
      if (!isUndefinedColumn) throw e;
      // In caso di schema legacy, il SELECT * non dovrebbe fallire; lasciamo il comportamento standard
      throw e;
    }
  } catch (error) {
    console.error('Errore GET commessa:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero commessa' });
  }
});

// PUT /api/tenants/commesse/:id → aggiorna
router.put('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const companyId = req.tenant!.companyId;

    const existing = await getExistingColumns(req.db);
    const fieldsBase = [
      'cliente','codice','nome','descrizione','citta','via','civico','committente_commessa',
      'data_inizio','data_fine_prevista','cig','cup','importo_commessa'
    ];
    const fields = fieldsBase.filter((f) => existing.has(f));
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const f of fields) {
      if (req.body.hasOwnProperty(f)) {
        updates.push(`${f} = $${idx}`);
        params.push(req.body[f]);
        idx++;
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ status: 'error', message: 'Nessun campo da aggiornare' });
      return;
    }

    const query = `
      UPDATE commesse SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${idx} AND company_id = $${idx + 1}
      RETURNING id
    `;
    params.push(id, companyId);

    const result = await req.db!.query(query, params);
    if ((result.rowCount || 0) === 0) {
      res.status(404).json({ status: 'error', message: 'Commessa non trovata' });
      return;
    }
    res.status(200).json({ status: 'success', data: { id } });
  } catch (error) {
    console.error('Errore PUT commessa:', error);
    res.status(500).json({ status: 'error', message: 'Errore nell\'aggiornamento commessa' });
  }
});

// DELETE /api/tenants/commesse/:id → soft delete (archivia)
router.delete('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const companyId = req.tenant!.companyId;
    const result = await req.db!.query(
      `UPDATE commesse SET archiviata = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING id`,
      [id, companyId]
    );
    if ((result.rowCount || 0) === 0) {
      res.status(404).json({ status: 'error', message: 'Commessa non trovata' });
      return;
    }
    res.status(200).json({ status: 'success', data: { id } });
  } catch (error) {
    console.error('Errore DELETE commessa:', error);
    res.status(500).json({ status: 'error', message: 'Errore nell\'eliminazione commessa' });
  }
});

export default router;


