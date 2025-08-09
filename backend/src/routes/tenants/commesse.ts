import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';
import { S3Client, PutObjectCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromInstanceMetadata } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import FormData from 'form-data';

type AuthedTenantRequest = Request & {
  user?: { sub: string; dbUserId?: string };
  tenant?: { companyId: string };
  db?: { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> };
};

const router = Router();

// Multer per gestione multipart (file in memoria)
const upload = multer({ storage: multer.memoryStorage() });

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
    { name: 'localita', fallback: "NULL::text AS localita" },
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
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('Errore GET commesse:', error);
    res.status(500).json({ status: 'error', message: 'Errore nel recupero commesse' });
  }
});

// POST /api/tenants/commesse → crea una nuova commessa
router.post('/', upload.array('files', 20), async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.dbUserId || req.user!.sub; // preferisci UUID DB
    const companyId = req.tenant!.companyId;

    const body = (req.body || {}) as Record<string, unknown>;
    // Se configurato, proxyiamo l'intera richiesta multipart verso il backend su EC2
    const uploadProxy = process.env.UPLOAD_PROXY_URL;
    if (uploadProxy && process.env.DISABLE_UPLOAD_PROXY !== 'true') {
      const proxyUrl = `${uploadProxy.replace(/\/$/, '')}/api/tenants/commesse`;
      const form = new FormData();
      for (const [k, v] of Object.entries(body)) {
        if (v !== undefined && v !== null) form.append(k, String(v));
      }
      const files = (req.files as unknown as Array<Express.Multer.File>) || [];
      for (const f of files) {
        form.append('files', f.buffer, { filename: f.originalname, contentType: f.mimetype });
      }
      const headers: Record<string, string> = {
        ...form.getHeaders(),
        'x-company-id': companyId
      };
      if (req.headers.authorization) headers['authorization'] = String(req.headers.authorization);
      type MinimalFetchResponse = { text: () => Promise<string>; status: number };
      const fetchFn = fetch as unknown as (input: string, init?: unknown) => Promise<MinimalFetchResponse>;
      const r = await fetchFn(proxyUrl, { method: 'POST', headers, body: form as unknown });
      const text = await r.text();
      res.status(r.status).type('application/json').send(text);
      return;
    }


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
      localita: emptyToNull(body['localita'] ?? body['luogo']),
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
    // Iniziamo transazione per inserimento commessa + metadati file
    await req.db!.query('BEGIN');
    const insertKeys = Object.keys(dataMap);
    const insertVals = insertKeys.map((k) => dataMap[k]);
    const placeholders = insertKeys.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `INSERT INTO commesse (${insertKeys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await req.db!.query(insertQuery, insertVals);
    const row = result.rows[0] as { id: string };

    // Se ci sono file, caricali su S3 e salva in commessa_files
    const files = (req.files as unknown as Array<Express.Multer.File>) || [];
    const uploadedKeys: Array<{ bucket: string; key: string }> = [];

    if (files.length > 0) {
      // Recupera bucket azienda
      const bucketRes = await req.db!.query('SELECT s3_bucket_name FROM companies WHERE id = $1 LIMIT 1', [companyId]);
      const bucketRow = bucketRes.rows[0] as { s3_bucket_name?: string } | undefined;
      const bucket: string | undefined = bucketRow?.s3_bucket_name;
      if (!bucket) {
        await req.db!.query('ROLLBACK');
        res.status(500).json({ status: 'error', message: 'Bucket S3 non configurato per l’azienda' });
        return;
      }

      const region = process.env.AWS_S3_BUCKET_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-north-1';
      const s3 = new S3Client({ region });

      for (const f of files) {
        const fileId = uuidv4();
        const safeName = slugify(f.originalname, { lower: true, strict: true });
        const s3Key = `commesse/${row.id}/${fileId}-${safeName}`;

        // Upload su S3
        const put = new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: f.buffer,
          ContentType: f.mimetype || 'application/octet-stream'
        });
        await s3.send(put);
        uploadedKeys.push({ bucket, key: s3Key });

        // Salva metadati nel DB
        await req.db!.query(
          `INSERT INTO commessa_files (
            id, commessa_id, company_id,
            filename_original, s3_key, content_type, size_bytes, checksum_sha256,
            uploaded_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            fileId,
            row.id,
            companyId,
            f.originalname,
            s3Key,
            f.mimetype || null,
            f.size ?? null,
            null,
            userId
          ]
        );
      }
    }

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
    res.status(500).json({ status: 'error', message: 'Errore nella creazione commessa con file' });
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

    const existing = await getExistingColumns(req.db);
    const fieldsBase = [
      'cliente','codice','nome','descrizione','localita',
      'data_inizio','data_fine_prevista','cig','cup',
      'importo_commessa'
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


