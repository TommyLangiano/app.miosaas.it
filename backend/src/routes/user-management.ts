import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import UserManagementService from '../services/user-management.service';

const router = Router();

/**
 * 🗑️ GESTIONE ELIMINAZIONE UTENTI
 * API per eliminare utenti con sincronizzazione DB ↔ Cognito
 */

/**
 * 📊 PREVIEW ELIMINAZIONE UTENTE
 * GET /api/users/:identifier/deletion-preview
 * Mostra cosa verrebbe eliminato prima di procedere
 */
router.get('/:identifier/deletion-preview', 
  authenticateToken, 
  requireRole(['company_owner', 'admin']), 
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { identifier } = req.params;
      
      console.log(`📊 Preview eliminazione per: ${identifier}`);
      
      const preview = await UserManagementService.getUserDeletionPreview(identifier);
      
      res.json({
        status: 'success',
        message: 'Preview eliminazione generata',
        preview
      });
      
    } catch (error: any) {
      console.error('❌ Errore preview eliminazione:', error);
      res.status(400).json({
        status: 'error',
        message: error.message,
        code: 'PREVIEW_ERROR'
      });
    }
  }
);

/**
 * 🗑️ ELIMINA UTENTE COMPLETO
 * DELETE /api/users/:identifier
 * Elimina utente da DB + Cognito + dipendenze
 */
router.delete('/:identifier', 
  authenticateToken, 
  requireRole(['company_owner', 'admin']), 
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { identifier } = req.params;
      const { 
        deleteFromCognito = true,
        deleteFromDatabase = true,
        cascadeDelete = true,
        softDelete = false,
        confirmDeletion = false
      } = req.body;
      
      // Sicurezza: richiede conferma esplicita
      if (!confirmDeletion) {
        res.status(400).json({
          status: 'error',
          message: 'Eliminazione non confermata. Imposta confirmDeletion: true per procedere.',
          code: 'CONFIRMATION_REQUIRED'
        });
        return;
      }
      
      console.log(`🗑️ Eliminazione utente: ${identifier}`);
      console.log(`⚙️ Opzioni:`, { deleteFromCognito, deleteFromDatabase, cascadeDelete, softDelete });
      
      const result = await UserManagementService.deleteUser(identifier, {
        deleteFromCognito,
        deleteFromDatabase,
        cascadeDelete,
        softDelete
      });
      
      if (result.success) {
        res.json({
          status: 'success',
          message: result.message,
          deletionResult: result.deletedData
        });
      } else {
        res.status(400).json({
          status: 'error',
          message: result.message,
          code: 'DELETION_FAILED'
        });
      }
      
    } catch (error: any) {
      console.error('❌ Errore eliminazione utente:', error);
      res.status(500).json({
        status: 'error',
        message: 'Errore interno durante l\'eliminazione',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * 🔄 WEBHOOK COGNITO - ELIMINAZIONE UTENTE
 * POST /api/users/cognito-webhook/user-deleted
 * Chiamato quando un utente viene eliminato da Cognito
 */
router.post('/cognito-webhook/user-deleted', async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoSub, userPoolId, eventType } = req.body;
    
    console.log(`🔄 Webhook Cognito ricevuto:`, { cognitoSub, userPoolId, eventType });
    
    // Verifica che sia il nostro User Pool
    if (userPoolId !== 'eu-north-1_MVwkbI87K') {
      res.status(400).json({
        status: 'error',
        message: 'User Pool non riconosciuto',
        code: 'INVALID_USER_POOL'
      });
      return;
    }
    
    // Verifica tipo evento
    if (eventType !== 'USER_DELETED') {
      res.status(400).json({
        status: 'error',
        message: 'Tipo evento non supportato',
        code: 'UNSUPPORTED_EVENT'
      });
      return;
    }
    
    if (!cognitoSub) {
      res.status(400).json({
        status: 'error',
        message: 'cognito_sub mancante',
        code: 'MISSING_COGNITO_SUB'
      });
      return;
    }
    
    // Sincronizza eliminazione da Cognito → Database
    const result = await UserManagementService.handleCognitoUserDeletion(cognitoSub);
    
    res.json({
      status: 'success',
      message: 'Sincronizzazione Cognito → DB completata',
      result
    });
    
  } catch (error: any) {
    console.error('❌ Errore webhook Cognito:', error);
    res.status(500).json({
      status: 'error',
      message: 'Errore elaborazione webhook',
      code: 'WEBHOOK_ERROR'
    });
  }
});

/**
 * 🔄 SINCRONIZZAZIONE MANUALE
 * POST /api/users/:cognitoSub/sync-from-cognito
 * Per sincronizzare manualmente quando un utente è stato eliminato da Cognito
 */
router.post('/:cognitoSub/sync-from-cognito',
  authenticateToken,
  requireRole(['company_owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { cognitoSub } = req.params;
      
      console.log(`🔄 Sincronizzazione manuale da Cognito: ${cognitoSub}`);
      
      const result = await UserManagementService.handleCognitoUserDeletion(cognitoSub);
      
      res.json({
        status: 'success',
        message: 'Sincronizzazione manuale completata',
        result
      });
      
    } catch (error: any) {
      console.error('❌ Errore sincronizzazione manuale:', error);
      res.status(500).json({
        status: 'error',
        message: 'Errore durante la sincronizzazione',
        code: 'SYNC_ERROR'
      });
    }
  }
);

/**
 * 📊 STATISTICHE ELIMINAZIONI
 * GET /api/users/deletion-stats
 * Mostra statistiche sulle eliminazioni (utenti soft-deleted, ecc.)
 */
router.get('/deletion-stats',
  authenticateToken,
  requireRole(['company_owner', 'admin']),
  tenantMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = req.db!;
      
      const stats = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active_users,
          COUNT(*) FILTER (WHERE status = 'deleted') as deleted_users,
          COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as soft_deleted_total,
          COUNT(*) FILTER (WHERE deleted_at > CURRENT_DATE - INTERVAL '30 days') as deleted_last_30_days,
          COUNT(*) FILTER (WHERE deleted_at > CURRENT_DATE - INTERVAL '7 days') as deleted_last_7_days
        FROM users 
        WHERE company_id = $1
      `, [db.companyId]);
      
      res.json({
        status: 'success',
        message: 'Statistiche eliminazioni',
        stats: stats.rows[0]
      });
      
    } catch (error: any) {
      console.error('❌ Errore statistiche eliminazioni:', error);
      res.status(500).json({
        status: 'error',
        message: 'Errore caricamento statistiche',
        code: 'STATS_ERROR'
      });
    }
  }
);

export default router;