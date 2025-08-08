import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';

// Le interfacce Request sono già definite nei middleware auth.ts e tenant.ts

const router = Router();

// Tipi locali per evitare errori sul campo `user` (ed altri) su Request
type AuthedTenantRequest = Request & {
  user?: { sub: string; email?: string; role?: string };
  tenant?: { companyId: string };
  db?: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };
};

// Applica i middleware di autenticazione e tenant a tutte le rotte
router.use(authenticateToken);
router.use(tenantMiddleware);
// ensureTenantTables rimosso - ora usiamo tabelle condivise

/**
 * GET /api/tenants/documents
 * Ottiene tutti i documenti del tenant corrente
 */
router.get('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    if (!req.db || !req.tenant) {
      res.status(500).json({
        status: 'error',
        message: 'Configurazione tenant non valida',
        code: 'INVALID_TENANT_CONFIG'
      });
      return;
    }

    const documentsTable = 'documents';
    const companyId = req.tenant.companyId;

    // Query per ottenere tutti i documenti del tenant
    const query = `
      SELECT 
        id,
        name,
        description,
        file_path,
        file_size,
        mime_type,
        created_by,
        created_at,
        updated_at,
        status,
        tags,
        metadata
      FROM ${documentsTable}
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await req.db.query(query);

    res.status(200).json({
      status: 'success',
      message: `Documenti del tenant ${companyId}`,
      data: {
        tenant: companyId,
        documentsTable: documentsTable,
        totalDocuments: result.rows.length,
        documents: result.rows,
        userInfo: req.user ? { sub: req.user.sub, email: req.user.email, role: req.user.role } : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Errore nel recupero dei documenti',
      code: 'DOCUMENTS_FETCH_ERROR'
    });
  }
});

/**
 * GET /api/tenants/documents/:documentId
 * Ottiene un documento specifico del tenant
 */
router.get('/:documentId', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const documentId = req.params.documentId;
    const documentsTable = 'documents';
    const companyId = req.tenant!.companyId;

    const query = `
      SELECT 
        id,
        name,
        description,
        file_path,
        file_size,
        mime_type,
        created_by,
        created_at,
        updated_at,
        status,
        tags,
        metadata
      FROM ${documentsTable}
      WHERE id = $1 AND status = 'active'
    `;

    const result = await req.db!.query(query, [documentId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: `Documento ${documentId} non trovato nel tenant ${companyId}`,
        code: 'DOCUMENT_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Documento ${documentId} del tenant ${companyId}`,
      data: {
        tenant: companyId,
        document: result.rows[0]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore nel recupero documento:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Errore nel recupero del documento',
      code: 'DOCUMENT_FETCH_ERROR'
    });
  }
});

/**
 * POST /api/tenants/documents
 * Crea un nuovo documento per il tenant
 */
router.post('/', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const { name, description, file_path, file_size, mime_type, tags, metadata } = req.body;
    
    if (!name) {
      res.status(400).json({
        status: 'error',
        message: 'Nome documento richiesto',
        code: 'DOCUMENT_NAME_REQUIRED'
      });
      return;
    }

    const documentsTable = 'documents';
    const companyId = req.tenant!.companyId;
    const createdBy = req.user!.sub;

    const insertQuery = `
      INSERT INTO ${documentsTable} (
        name, description, file_path, file_size, mime_type, 
        created_by, tags, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, created_at
    `;

    const values = [
      name,
      description || null,
      file_path || null,
      file_size || null,
      mime_type || null,
      createdBy,
      tags ? JSON.stringify(tags) : null,
      metadata ? JSON.stringify(metadata) : null
    ];

    const result = await req.db!.query(insertQuery, values);
    const newDocument = result.rows[0];

    res.status(201).json({
      status: 'success',
      message: `Documento creato nel tenant ${companyId}`,
      data: {
        tenant: companyId,
        document: newDocument
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore nella creazione documento:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Errore nella creazione del documento',
      code: 'DOCUMENT_CREATE_ERROR'
    });
  }
});

/**
 * PUT /api/tenants/documents/:documentId
 * Aggiorna un documento del tenant
 */
router.put('/:documentId', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const documentId = req.params.documentId;
    const { name, description, tags, metadata } = req.body;
    
    const documentsTable = 'documents';
    const companyId = req.tenant!.companyId;

    const updateQuery = `
      UPDATE ${documentsTable}
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        tags = COALESCE($3, tags),
        metadata = COALESCE($4, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND status = 'active'
      RETURNING id, name, updated_at
    `;

    const values = [
      name || null,
      description || null,
      tags ? JSON.stringify(tags) : null,
      metadata ? JSON.stringify(metadata) : null,
      documentId
    ];

    const result = await req.db!.query(updateQuery, values);

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: `Documento ${documentId} non trovato nel tenant ${companyId}`,
        code: 'DOCUMENT_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Documento ${documentId} aggiornato nel tenant ${companyId}`,
      data: {
        tenant: companyId,
        document: result.rows[0]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento documento:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Errore nell\'aggiornamento del documento',
      code: 'DOCUMENT_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /api/tenants/documents/:documentId
 * Elimina (soft delete) un documento del tenant
 */
router.delete('/:documentId', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const documentId = req.params.documentId;
    const documentsTable = 'documents';
    const companyId = req.tenant!.companyId;

    const deleteQuery = `
      UPDATE ${documentsTable}
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'active'
      RETURNING id, name
    `;

    const result = await req.db!.query(deleteQuery, [documentId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: `Documento ${documentId} non trovato nel tenant ${companyId}`,
        code: 'DOCUMENT_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Documento ${documentId} eliminato dal tenant ${companyId}`,
      data: {
        tenant: companyId,
        document: result.rows[0]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione documento:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Errore nell\'eliminazione del documento',
      code: 'DOCUMENT_DELETE_ERROR'
    });
  }
});

/**
 * GET /api/tenants/documents/stats/summary
 * Ottiene statistiche sui documenti del tenant
 */
router.get('/stats/summary', async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const documentsTable = 'documents';
    const companyId = req.tenant!.companyId;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_documents,
        COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted_documents,
        SUM(file_size) as total_size,
        AVG(file_size) as average_size
      FROM ${documentsTable}
    `;

    const result = await req.db!.query(statsQuery);
    const stats = result.rows[0];

    res.status(200).json({
      status: 'success',
      message: `Statistiche documenti del tenant ${companyId}`,
      data: {
        tenant: companyId,
        stats: {
          totalDocuments: parseInt(stats.total_documents),
          activeDocuments: parseInt(stats.active_documents),
          deletedDocuments: parseInt(stats.deleted_documents),
          totalSize: parseInt(stats.total_size) || 0,
          averageSize: Math.round(parseFloat(stats.average_size)) || 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Errore nel recupero delle statistiche',
      code: 'STATS_FETCH_ERROR'
    });
  }
});

export default router;