import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import { S3Client, PutObjectCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromInstanceMetadata } from '@aws-sdk/credential-providers';
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

async function getTableColumns(db: AuthedTenantRequest['db'], tableName: string): Promise<Set<string>> {
  const q = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
  `;
  const r = await db!.query(q, [tableName]);
  const cols = new Set<string>();
  for (const row of r.rows as Array<{ column_name: string }>) cols.add(row.column_name);
  return cols;
}

function buildCommesseSelect(columns: Set<string>, includeArchived: boolean): { sql: string; params: unknown[] } {
  const selected: string[] = [];
  // base fields with safe fallbacks
  selected.push('id');
  selected.push(columns.has('cliente') ? 'cliente' : 'NULL::varchar AS cliente');
  selected.push(columns.has('codice') ? 'codice' : 'NULL::varchar AS codice');
  selected.push(columns.has('nome') ? 'nome' : (columns.has('cliente') ? 'cliente AS nome' : 'NULL::varchar AS nome'));
  // localita: preferisce colonna moderna, fallback a luogo se esiste
  if (columns.has('localita')) selected.push('localita');
  else if (columns.has('luogo')) selected.push('luogo AS localita');
  else selected.push('NULL::varchar AS localita');
  selected.push(columns.has('descrizione') ? 'descrizione' : 'NULL::text AS descrizione');
  selected.push(columns.has('data_inizio') ? 'data_inizio' : 'NULL::date AS data_inizio');
  if (columns.has('data_fine_prevista')) selected.push('data_fine_prevista');
  else if (columns.has('data_fine')) selected.push('data_fine AS data_fine_prevista');
  else selected.push('NULL::date AS data_fine_prevista');
  selected.push(columns.has('cig') ? 'cig' : 'NULL::varchar AS cig');
  selected.push(columns.has('cup') ? 'cup' : 'NULL::varchar AS cup');
  selected.push(columns.has('imponibile_commessa') ? 'imponibile_commessa' : 'NULL::numeric AS imponibile_commessa');
  selected.push(columns.has('iva_commessa') ? 'iva_commessa' : 'NULL::numeric AS iva_commessa');
  selected.push(columns.has('importo_commessa') ? 'importo_commessa' : 'NULL::numeric AS importo_commessa');
  selected.push(columns.has('archiviata') ? 'archiviata' : 'false AS archiviata');
  selected.push(columns.has('stato') ? 'stato' : `('da_avviare')::varchar AS stato`);
  selected.push(columns.has('created_by') ? 'created_by' : 'NULL::uuid AS created_by');
  selected.push(columns.has('created_at') ? 'created_at' : 'NULL::timestamp AS created_at');
  selected.push(columns.has('updated_at') ? 'updated_at' : 'NULL::timestamp AS updated_at');

  let sql = `SELECT ${selected.join(', ')} FROM commesse WHERE 1=1`;
  const params: unknown[] = [];
  // company_id filter if exists
  if (columns.has('company_id')) {
    sql += ` AND company_id = $${params.length + 1}`;
    // company_id param verrà pushato dal chiamante
  }
  if (!includeArchived && columns.has('archiviata')) {
    sql += ' AND archiviata = false';
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  return { sql, params };
}

// GET /api/tenants/commesse → elenco commesse dell'azienda
router.get('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.tenant!.companyId;
    const includeArchived = String(req.query.includeArchived || 'false') === 'true';

    const columns = await getTableColumns(req.db!, 'commesse');
    const { sql } = buildCommesseSelect(columns, includeArchived);
    const params: unknown[] = [];
    if (columns.has('company_id')) params.push(companyId);
    const result = await req.db!.query(sql, params);
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

    const emptyToNull = (v: unknown): unknown => {
      if (v === undefined || v === null) return null;
      if (typeof v === 'string' && v.trim() === '') return null;
      return v;
    };

    if (!body['cliente']) {
      res.status(400).json({ status: 'error', message: 'Campo cliente richiesto' });
      return;
    }

    // Inserimento dinamico in base alle colonne esistenti
    const columns = await getTableColumns(req.db!, 'commesse');
    const dataMap: Record<string, unknown> = {
      cliente: emptyToNull(body['cliente']),
      codice: emptyToNull(body['codice']),
      nome: emptyToNull(body['nome']),
      descrizione: emptyToNull(body['descrizione']),
      localita: emptyToNull(body['localita'] ?? body['luogo']),
      data_inizio: emptyToNull(body['data_inizio']),
      data_fine_prevista: emptyToNull(body['data_fine_prevista'] ?? body['data_fine']),
      cig: emptyToNull(body['cig']),
      cup: emptyToNull(body['cup']),
      imponibile_commessa: body['imponibile_commessa'] ?? null,
      iva_commessa: body['iva_commessa'] ?? null,
      importo_commessa: body['importo_commessa'] ?? null,
      archiviata: (body['archiviata'] as boolean) ?? false,
      stato: (body['stato'] as string) ?? 'da_avviare',
      company_id: companyId,
      created_by: userId
    };

    // Validazione unicità codice per azienda se la colonna esiste ed è valorizzata
    if (columns.has('codice') && dataMap.codice) {
      const dup = await req.db!.query(
        'SELECT 1 FROM commesse WHERE company_id = $1 AND codice = $2 LIMIT 1',
        [companyId, dataMap.codice]
      );
      if (dup.rows.length > 0) {
        res.status(409).json({ status: 'error', message: 'Codice già esistente per questa azienda' });
        return;
      }
    }
    const insertKeys = Object.keys(dataMap).filter((k) => columns.has(k));
    const insertVals = insertKeys.map((k) => dataMap[k]);
    const placeholders = insertKeys.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `INSERT INTO commesse (${insertKeys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await req.db!.query(insertQuery, insertVals);
    const row = result.rows[0];
    res.status(201).json({ status: 'success', data: { id: row.id, commessa: row } });
  } catch (error) {
    const pgErr = error as { code?: string; constraint?: string };
    if (pgErr?.code === '23505' && (pgErr?.constraint || '').includes('commesse_codice_unique')) {
      res.status(409).json({ status: 'error', message: 'Codice già esistente per questa azienda' });
      return;
    }
    console.error('Errore POST commesse:', error);
    res.status(500).json({ status: 'error', message: 'Errore nella creazione commessa' });
  }
});

// GET /api/tenants/commesse/:id/files → lista file associati
router.get('/:id/files', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const commessaId = String(req.params.id || '').trim();
    if (!commessaId) {
      res.status(400).json({ status: 'error', message: 'ID commessa mancante' });
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
      SELECT id AS file_id, commessa_id, filename_original, s3_key, content_type, size_bytes, checksum_sha256, created_at
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
    const commessaId = String(req.params.id || '').trim();
    if (!commessaId) {
      res.status(400).json({ status: 'error', message: 'ID commessa mancante' });
      return;
    }
    const companyId = req.tenant!.companyId;

    // Verifica che la commessa appartenga alla company
    const check = await req.db!.query('SELECT id FROM commesse WHERE id = $1 AND company_id = $2', [commessaId, companyId]);
    if (check.rows.length === 0) {
      res.status(404).json({ status: 'error', message: 'Commessa non trovata' });
      return;
    }

    const bodyPresign = (req.body || {}) as { filename?: string; content_type?: string; contentType?: string };
    const filename = bodyPresign.filename;
    const resolvedContentType = bodyPresign.content_type || bodyPresign.contentType || 'application/octet-stream';
    if (!filename) {
      res.status(400).json({ status: 'error', message: 'filename richiesto' });
      return;
    }

    // Proxy presign verso EC2 se configurato (per usare ruolo IAM in dev locale)
    const proxyBase = process.env.PRESIGN_PROXY_URL;
    if (proxyBase && !process.env.DISABLE_PRESIGN_PROXY) {
      const proxyUrl = `${proxyBase.replace(/\/$/, '')}/api/tenants/commesse/${encodeURIComponent(commessaId)}/files/presign`;
      const r = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-company-id': companyId,
          ...(req.headers.authorization ? { authorization: String(req.headers.authorization) } : {})
        },
        body: JSON.stringify({ filename, content_type: resolvedContentType })
      });
      const text = await r.text();
      res.status(r.status).type('application/json').send(text);
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

    // Determina la regione del bucket (env override > lookup > env fallback)
    let detectedBucketRegion: string | undefined;
    try {
      const probeRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
      const s3Meta = new S3Client({ region: probeRegion });
      const loc = await s3Meta.send(new GetBucketLocationCommand({ Bucket: bucket }));
      const lc = (loc as { LocationConstraint?: string | null }).LocationConstraint ?? '';
      detectedBucketRegion = lc === '' ? 'us-east-1' : lc === 'EU' ? 'eu-west-1' : lc;
    } catch {
      // niente permesso GetBucketLocation: useremo override/env
    }

    const finalRegion = process.env.AWS_S3_BUCKET_REGION
      || detectedBucketRegion
      || process.env.AWS_REGION
      || process.env.AWS_DEFAULT_REGION
      || 'eu-north-1';

    // Forza provider da Instance Metadata se richiesto (utile su EC2)
    const forceEc2Provider = process.env.FORCE_EC2_ROLE_PROVIDER === 'true';
    const credentials = forceEc2Provider ? fromInstanceMetadata() : undefined;

    try {
      const sts = new STSClient({ region: finalRegion, credentials });
      const ident = await sts.send(new GetCallerIdentityCommand({}));
      console.log('[PRESIGN] caller:', ident?.Arn || ident);
    } catch {}
    console.log('[PRESIGN] bucket:', bucket, 'key:', s3Key, 'regionUsed:', finalRegion, 'detected:', detectedBucketRegion, 'env:', {
      AWS_S3_BUCKET_REGION: process.env.AWS_S3_BUCKET_REGION,
      AWS_REGION: process.env.AWS_REGION,
      AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION
    });

    const s3 = new S3Client({ region: finalRegion, credentials });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: resolvedContentType
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // 10 minuti

    res.status(200).json({ status: 'success', data: { presignedUrl, file_id: fileId, s3_key: s3Key, content_type: resolvedContentType } });
  } catch (error) {
    console.error('Errore PRESIGN file commessa:', error);
    res.status(500).json({ status: 'error', message: 'Errore nella generazione del presigned URL' });
  }
});

// POST /api/tenants/commesse/:id/files → salva metadati file nel DB
router.post('/:id/files', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const commessaId = String(req.params.id || '').trim();
    if (!commessaId) {
      res.status(400).json({ status: 'error', message: 'ID commessa mancante' });
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

    const bodyFile = (req.body || {}) as Record<string, unknown>;
    const file_id = bodyFile['file_id'];
    const filename_original = bodyFile['filename_original'];
    const s3_key = bodyFile['s3_key'];
    const content_type = (bodyFile['content_type'] ?? bodyFile['contentType']) as string | undefined;
    const size_bytes = (bodyFile['size_bytes'] ?? bodyFile['size']) as number | undefined;
    const checksum_sha256 = bodyFile['checksum_sha256'] as string | undefined;

    if (!file_id || !filename_original || !s3_key) {
      res.status(400).json({ status: 'error', message: 'Parametri file mancanti' });
      return;
    }

    const insert = `
      INSERT INTO commessa_files (
        id, commessa_id, company_id,
        filename_original, s3_key, content_type, size_bytes, checksum_sha256,
        uploaded_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id AS file_id
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

    const fields = [
      'cliente','codice','nome','descrizione','localita',
      'data_inizio','data_fine_prevista','cig','cup',
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


