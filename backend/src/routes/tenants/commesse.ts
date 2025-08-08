import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';

type AuthedTenantRequest = Request & {
  user?: { sub: string; dbUserId?: string };
  tenant?: { companyId: string };
  db?: { query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> };
};

const router = Router();

router.use(authenticateToken);
router.use(tenantMiddleware);

// GET /api/tenants/commesse → elenco commesse dell'azienda
router.get('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const includeArchived = String(req.query.includeArchived || 'false') === 'true';

    const query = `
      SELECT id, cliente, luogo, data_inizio, data_fine, descrizione,
             imponibile_commessa, iva_commessa, importo_commessa, archiviata, stato,
             created_by, created_at, updated_at
      FROM commesse
      WHERE company_id = $1 ${includeArchived ? '' : 'AND archiviata = false'}
      ORDER BY created_at DESC
      LIMIT 200
    `;
    const result = await req.db!.query(query, [companyId]);

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

    const {
      cliente,
      luogo,
      data_inizio,
      data_fine,
      descrizione,
      imponibile_commessa,
      iva_commessa,
      importo_commessa,
      archiviata = false,
      stato = 'da_avviare'
    } = req.body || {};

    if (!cliente) {
      res.status(400).json({ status: 'error', message: 'Campo cliente richiesto' });
      return;
    }

    const insertQuery = `
      INSERT INTO commesse (
        cliente, luogo, data_inizio, data_fine, descrizione,
        imponibile_commessa, iva_commessa, importo_commessa,
        archiviata, stato, company_id, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id
    `;
    const params = [
      cliente || null,
      luogo || null,
      data_inizio || null,
      data_fine || null,
      descrizione || null,
      imponibile_commessa ?? null,
      iva_commessa ?? null,
      importo_commessa ?? null,
      !!archiviata,
      stato,
      companyId,
      userId
    ];

    const result = await req.db!.query(insertQuery, params);
    res.status(201).json({ status: 'success', data: { id: result.rows[0].id } });
  } catch (error) {
    console.error('Errore POST commesse:', error);
    res.status(500).json({ status: 'error', message: 'Errore nella creazione commessa' });
  }
});

// GET /api/tenants/commesse/:id → dettaglio
router.get('/:id', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const companyId = req.tenant!.companyId;
    const query = `SELECT * FROM commesse WHERE id = $1 AND company_id = $2 LIMIT 1`;
    const result = await req.db!.query(query, [id, companyId]);
    if (result.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Commessa non trovata' });
      return;
    }
    res.status(200).json({ status: 'success', data: result.rows[0] });
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

    const fields = [
      'cliente','luogo','data_inizio','data_fine','descrizione',
      'imponibile_commessa','iva_commessa','importo_commessa','archiviata','stato'
    ];
    const updates: string[] = [];
    const params: any[] = [];
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
      `UPDATE commesse SET archiviata = true, stato = 'chiusa', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING id`,
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


