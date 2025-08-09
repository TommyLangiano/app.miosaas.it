import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

type AuthedTenantRequest = Request & {
  user?: { sub: string; dbUserId?: string };
  tenant?: { companyId: string };
  db?: { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> };
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
      RETURNING *
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
    const row = result.rows[0];
    res.status(201).json({ status: 'success', data: { id: row.id, commessa: row } });
  } catch (error) {
    console.error('Errore POST commesse:', error);
    res.status(500).json({ status: 'error', message: 'Errore nella creazione commessa' });
  }
});

// GET /api/tenants/commesse/:id/files → lista file associati
router.get('/:id/files', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const commessaId = Number(req.params.id);
    if (!Number.isFinite(commessaId)) {
      res.status(400).json({ status: 'error', message: 'ID commessa non valido' });
      return;
    }
    const companyId = req.tenant!.companyId;

    // Verifica che la commessa appartenga alla company
    const check = await req.db!.query('SELECT id FROM commesse WHERE id = $1 AND company_id = $2', [commessaId, companyId]);
    if (check.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Commessa non trovata' });
      return;
    }

    const q = `
      SELECT file_id, commessa_id, filename_original, s3_key, content_type, size_bytes, checksum_sha256, created_at
      FROM commessa_files
      WHERE commessa_id = $1 AND company_id = $2
      ORDER BY created_at DESC
    `;
    const result = await req.db!.query(q, [commessaId, companyId]);
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('Errore GET files commessa:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero dei file' });
  }
});

// POST /api/tenants/commesse/:id/files/presign → genera URL presigned per upload diretto
router.post('/:id/files/presign', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const commessaId = Number(req.params.id);
    if (!Number.isFinite(commessaId)) {
      res.status(400).json({ status: 'error', message: 'ID commessa non valido' });
      return;
    }
    const companyId = req.tenant!.companyId;

    // Verifica che la commessa appartenga alla company
    const check = await req.db!.query('SELECT id FROM commesse WHERE id = $1 AND company_id = $2', [commessaId, companyId]);
    if (check.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Commessa non trovata' });
      return;
    }

    const { filename, content_type } = (req.body || {}) as { filename?: string; content_type?: string };
    if (!filename) {
      res.status(400).json({ status: 'error', message: 'filename richiesto' });
      return;
    }

    // Recupera bucket S3 dall'azienda
    const bucketRes = await req.db!.query('SELECT s3_bucket_name FROM companies WHERE id = $1 LIMIT 1', [companyId]);
    const bucketRow = bucketRes.rows[0] as { s3_bucket_name?: string } | undefined;
    const bucket: string | undefined = bucketRow?.s3_bucket_name;
    if (!bucket) {
      res.status(500).json({ status: 'error', message: 'Bucket S3 non configurato per l’azienda' });
      return;
    }

    // Prepara chiavi
    const fileId = uuidv4();
    const safeName = slugify(filename, { lower: true, strict: true });
    const s3Key = `commesse/${commessaId}/${fileId}-${safeName}`;

    // Client S3 (usa ruolo IAM dell'istanza)
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
    const s3 = new S3Client({ region });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: content_type || 'application/octet-stream'
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // 10 minuti

    res.status(200).json({ status: 'success', data: { presignedUrl, file_id: fileId, s3_key: s3Key } });
  } catch (error) {
    console.error('Errore PRESIGN file commessa:', error);
    res.status(500).json({ status: 'error', message: 'Errore nella generazione del presigned URL' });
  }
});

// POST /api/tenants/commesse/:id/files → salva metadati file nel DB
router.post('/:id/files', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const commessaId = Number(req.params.id);
    if (!Number.isFinite(commessaId)) {
      res.status(400).json({ status: 'error', message: 'ID commessa non valido' });
      return;
    }
    const companyId = req.tenant!.companyId;
    const uploadedBy = req.user?.dbUserId || req.user?.sub || null;

    // Verifica che la commessa appartenga alla company
    const check = await req.db!.query('SELECT id FROM commesse WHERE id = $1 AND company_id = $2', [commessaId, companyId]);
    if (check.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Commessa non trovata' });
      return;
    }

    const {
      file_id,
      filename_original,
      s3_key,
      content_type,
      size_bytes,
      checksum_sha256
    } = (req.body || {}) as Record<string, unknown>;

    if (!file_id || !filename_original || !s3_key) {
      res.status(400).json({ status: 'error', message: 'Parametri file mancanti' });
      return;
    }

    const insert = `
      INSERT INTO commessa_files (
        file_id, commessa_id, company_id,
        filename_original, s3_key, content_type, size_bytes, checksum_sha256,
        uploaded_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING file_id
    `;
    const params = [
      file_id,
      commessaId,
      companyId,
      filename_original,
      s3_key,
      content_type || null,
      size_bytes ?? null,
      checksum_sha256 || null,
      uploadedBy
    ];
    await req.db!.query(insert, params);
    res.status(201).json({ status: 'success', data: { file_id } });
  } catch (error) {
    console.error('Errore SAVE file commessa:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel salvataggio del file' });
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


