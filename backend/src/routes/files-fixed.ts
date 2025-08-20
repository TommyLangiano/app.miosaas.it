import { Router, Request, Response } from 'express';
import { fileService } from '../services/file.service';
import { uploadService } from '../services/upload.service';
import { downloadService } from '../services/download.service';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// Middleware per tutte le route
router.use(authenticateToken);
router.use(tenantMiddleware);

// Interfacce per i tipi
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    companyId: string;
  };
  companyId?: string;
}

// ============================================================================
// ROUTE UPLOAD FILE
// ============================================================================

/**
 * POST /api/files/upload/prepare
 * Prepara upload file generando presigned URL
 */
router.post('/upload/prepare', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const uploadData = req.body;
    
    // Validazione dati richiesta
    if (!uploadData.originalFilename || !uploadData.mimeType || !uploadData.fileSize) {
      return res.status(400).json({ 
        error: 'Dati mancanti',
        required: ['originalFilename', 'mimeType', 'fileSize', 'section', 'category', 'entityType']
      });
    }

    // Prepara upload
    const uploadResponse = await uploadService.prepareFileUpload(
      uploadData,
      companyId,
      user.id
    );

    return res.status(200).json({
      success: true,
      data: uploadResponse,
      message: 'Upload preparato con successo'
    });

  } catch (error) {
    console.error('Errore nella preparazione upload:', error);
    return res.status(400).json({
      error: 'Errore nella preparazione upload',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * POST /api/files/upload/confirm
 * Conferma upload completato
 */
router.post('/upload/confirm', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { fileId, fileHash } = req.body;
    
    if (!fileId || !fileHash) {
      return res.status(400).json({ 
        error: 'Dati mancanti',
        required: ['fileId', 'fileHash']
      });
    }

    // Conferma upload
    await uploadService.confirmUpload(fileId, companyId, fileHash);

    return res.status(200).json({
      success: true,
      message: 'Upload confermato con successo'
    });

  } catch (error) {
    console.error('Errore nella conferma upload:', error);
    return res.status(400).json({
      error: 'Errore nella conferma upload',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * POST /api/files/upload/multiple
 * Prepara upload multipli
 */
router.post('/upload/multiple', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { files } = req.body;
    
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ 
        error: 'Array files richiesto e non vuoto'
      });
    }

    // Prepara upload multipli
    const uploadResponses = await uploadService.prepareMultipleUploads(
      files,
      companyId,
      user.id
    );

    return res.status(200).json({
      success: true,
      data: uploadResponses,
      message: `${uploadResponses.length} upload preparati con successo`
    });

  } catch (error) {
    console.error('Errore nella preparazione upload multipli:', error);
    return res.status(400).json({
      error: 'Errore nella preparazione upload multipli',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// ============================================================================
// ROUTE DOWNLOAD FILE
// ============================================================================

/**
 * POST /api/files/download/generate
 * Genera presigned URL per download
 */
router.post('/download/generate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ 
        error: 'File ID richiesto'
      });
    }

    // Genera URL download
    const downloadResponse = await downloadService.generateDownloadUrl(
      fileId,
      user.id,
      companyId
    );

    return res.status(200).json({
      success: true,
      data: downloadResponse,
      message: 'URL download generato con successo'
    });

  } catch (error) {
    console.error('Errore nella generazione URL download:', error);
    return res.status(400).json({
      error: 'Errore nella generazione URL download',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * POST /api/files/download/multiple
 * Genera URL download multipli
 */
router.post('/download/multiple', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { fileIds } = req.body;
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ 
        error: 'Array fileIds richiesto e non vuoto'
      });
    }

    // Genera URL download multipli
    const downloadResponses = await downloadService.generateMultipleDownloadUrls(
      fileIds,
      user.id,
      companyId
    );

    return res.status(200).json({
      success: true,
      data: downloadResponses,
      message: `${downloadResponses.length} URL download generati con successo`
    });

  } catch (error) {
    console.error('Errore nella generazione URL download multipli:', error);
    return res.status(400).json({
      error: 'Errore nella generazione URL download multipli',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// ============================================================================
// ROUTE GESTIONE FILE
// ============================================================================

/**
 * GET /api/files/:fileId
 * Ottiene informazioni file
 */
router.get('/:fileId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { fileId } = req.params;
    
    // Ottieni informazioni file
    const file = await fileService.getFileById(fileId, companyId);
    if (!file) {
      return res.status(404).json({ error: 'File non trovato' });
    }

    return res.status(200).json({
      success: true,
      data: file,
      message: 'File recuperato con successo'
    });

  } catch (error) {
    console.error('Errore nel recupero file:', error);
    return res.status(500).json({
      error: 'Errore nel recupero file',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * GET /api/files/:fileId/preview
 * Ottiene preview file (senza URL download)
 */
router.get('/:fileId/preview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { fileId } = req.params;
    
    // Ottieni preview file
    const preview = await downloadService.getFilePreview(fileId, user.id, companyId);

    return res.status(200).json({
      success: true,
      data: preview,
      message: 'Preview file recuperato con successo'
    });

  } catch (error) {
    console.error('Errore nel recupero preview file:', error);
    return res.status(400).json({
      error: 'Errore nel recupero preview file',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * PUT /api/files/:fileId
 * Aggiorna metadati file
 */
router.put('/:fileId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { fileId } = req.params;
    const updateData = req.body;
    
    // Aggiorna file
    const updatedFile = await fileService.updateFile(fileId, companyId, updateData);

    return res.status(200).json({
      success: true,
      data: updatedFile,
      message: 'File aggiornato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento file:', error);
    return res.status(400).json({
      error: 'Errore nell\'aggiornamento file',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * DELETE /api/files/:fileId
 * Elimina file
 */
router.delete('/:fileId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { fileId } = req.params;
    
    // Elimina file
    await fileService.deleteFile(fileId, companyId);

    return res.status(200).json({
      success: true,
      message: 'File eliminato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione file:', error);
    return res.status(400).json({
      error: 'Errore nell\'eliminazione file',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// ============================================================================
// ROUTE RICERCA E LISTING
// ============================================================================

/**
 * GET /api/files/search
 * Cerca file con filtri
 */
router.get('/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const searchParams = {
      companyId,
      section: req.query.section as string,
      category: req.query.category as string,
      entityType: req.query.entityType as string,
      entityId: req.query.entityId as string,
      status: req.query.status as string,
      visibility: req.query.visibility as string,
      searchTerm: req.query.searchTerm as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      orderBy: req.query.orderBy as string || 'created_at',
      orderDirection: (req.query.orderDirection as 'ASC' | 'DESC') || 'DESC',
    };

    // Cerca file
    const result = await fileService.searchFiles(searchParams);

    return res.status(200).json({
      success: true,
      data: result,
      message: `${result.files.length} file trovati`
    });

  } catch (error) {
    console.error('Errore nella ricerca file:', error);
    return res.status(500).json({
      error: 'Errore nella ricerca file',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * GET /api/files/entity/:entityType/:entityId
 * Ottiene file per entità specifica
 */
router.get('/entity/:entityType/:entityId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { entityType, entityId } = req.params;
    
    // Ottieni file per entità
    const files = await downloadService.getEntityFiles(entityType, entityId, user.id, companyId);

    return res.status(200).json({
      success: true,
      data: files,
      message: `${files.length} file trovati per entità`
    });

  } catch (error) {
    console.error('Errore nel recupero file entità:', error);
    return res.status(500).json({
      error: 'Errore nel recupero file entità',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * GET /api/files/recent
 * Ottiene file recenti per utente
 */
router.get('/recent', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    // Ottieni file recenti
    const files = await downloadService.getRecentFiles(user.id, companyId, limit);

    return res.status(200).json({
      success: true,
      data: files,
      message: `${files.length} file recenti trovati`
    });

  } catch (error) {
    console.error('Errore nel recupero file recenti:', error);
    return res.status(500).json({
      error: 'Errore nel recupero file recenti',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * GET /api/files/shared
 * Ottiene file condivi con utente
 */
router.get('/shared', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    // Ottieni file condivisi
    const files = await downloadService.getSharedFiles(user.id, companyId, limit);

    return res.status(200).json({
      success: true,
      data: files,
      message: `${files.length} file condivisi trovati`
    });

  } catch (error) {
    console.error('Errore nel recupero file condivisi:', error);
    return res.status(500).json({
      error: 'Errore nel recupero file condivisi',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// ============================================================================
// ROUTE STATISTICHE
// ============================================================================

/**
 * GET /api/files/stats/upload
 * Ottiene statistiche upload per tenant
 */
router.get('/stats/upload', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req;
    if (!companyId) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    // Ottieni statistiche upload
    const stats = await uploadService.getUploadStats(companyId);

    return res.status(200).json({
      success: true,
      data: stats,
      message: 'Statistiche upload recuperate con successo'
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche upload:', error);
    return res.status(500).json({
      error: 'Errore nel recupero statistiche upload',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * GET /api/files/stats/download
 * Ottiene statistiche download per tenant
 */
router.get('/stats/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req;
    if (!companyId) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    // Ottieni statistiche download
    const stats = await downloadService.getDownloadStats(companyId);

    return res.status(200).json({
      success: true,
      data: stats,
      message: 'Statistiche download recuperate con successo'
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche download:', error);
    return res.status(500).json({
      error: 'Errore nel recupero statistiche download',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * GET /api/files/stats/general
 * Ottiene statistiche generali file per tenant
 */
router.get('/stats/general', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req;
    if (!companyId) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    // Ottieni statistiche generali
    const stats = await fileService.getFileStats(companyId);

    return res.status(200).json({
      success: true,
      data: stats,
      message: 'Statistiche generali recuperate con successo'
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche generali:', error);
    return res.status(500).json({
      error: 'Errore nel recupero statistiche generali',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

// ============================================================================
// ROUTE UTILITY
// ============================================================================

/**
 * POST /api/files/verify/:fileId
 * Verifica integrità file
 */
router.post('/verify/:fileId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req;
    if (!companyId) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { fileId } = req.params;
    
    // Verifica integrità file
    const isIntegrityValid = await downloadService.verifyFileIntegrity(fileId, companyId);

    return res.status(200).json({
      success: true,
      data: { fileId, isIntegrityValid },
      message: isIntegrityValid ? 'File integro' : 'File non integro'
    });

  } catch (error) {
    console.error('Errore nella verifica integrità file:', error);
    return res.status(500).json({
      error: 'Errore nella verifica integrità file',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

/**
 * POST /api/files/cleanup
 * Pulisce file orfani (admin only)
 */
router.post('/cleanup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, user } = req;
    if (!companyId || !user) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    // TODO: Verifica che l'utente sia admin
    
    // Pulisce file orfani
    const cleanedCount = await uploadService.cleanupOrphanedFiles(companyId);

    return res.status(200).json({
      success: true,
      data: { cleanedCount },
      message: `${cleanedCount} file orfani puliti`
    });

  } catch (error) {
    console.error('Errore nella pulizia file orfani:', error);
    return res.status(500).json({
      error: 'Errore nella pulizia file orfani',
      message: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
  }
});

export default router;
