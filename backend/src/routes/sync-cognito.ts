import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import UserManagementService from '../services/user-management.service';
import { ListUsersCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

const router = Router();

/**
 * 🔄 SINCRONIZZAZIONE MANUALE COGNITO ↔ DATABASE
 * Per gestire eliminazioni manuali da Cognito Console
 */

// Configurazione AWS Cognito
const COGNITO_CONFIG = {
  userPoolId: 'eu-north-1_MVwkbI87K',
  clientId: '18b21rcmp9f1sl3q7v0pcrircf',
  region: 'eu-north-1'
};

const cognitoClient = new CognitoIdentityProviderClient({ 
  region: COGNITO_CONFIG.region 
});

/**
 * 🔍 SCAN COGNITO USERS
 * GET /api/sync-cognito/scan
 * Scansiona tutti gli utenti in Cognito e confronta con il DB
 */
router.get('/scan', 
  authenticateToken, 
  requireRole(['company_owner', 'admin']), 
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔍 Inizio scan Cognito ↔ Database...');
      
      // 1. Ottieni tutti gli utenti da Cognito
      const listCommand = new ListUsersCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId
      });
      
      const cognitoResponse = await cognitoClient.send(listCommand);
      const cognitoUsers = cognitoResponse.Users || [];
      
      console.log(`☁️ Utenti trovati in Cognito: ${cognitoUsers.length}`);
      
      // 2. Ottieni tutti gli utenti dal DB
      const { db } = await import('../config/db');
      const dbResult = await db.query(`
        SELECT id, email, cognito_sub, status, created_at
        FROM users 
        WHERE status != 'deleted'
      `);
      const dbUsers = dbResult.rows;
      
      console.log(`🗄️ Utenti trovati nel DB: ${dbUsers.length}`);
      
      // 3. Confronta e trova discrepanze
      const cognitoSubs = cognitoUsers.map(u => u.Username).filter(Boolean);
      const dbCognitoSubs = dbUsers.map(u => u.cognito_sub).filter(Boolean);
      
      // Utenti in DB ma non in Cognito (da eliminare dal DB)
      const orphanedInDB = dbUsers.filter(dbUser => 
        dbUser.cognito_sub && !cognitoSubs.includes(dbUser.cognito_sub)
      );
      
      // Utenti in Cognito ma non in DB (da creare nel DB)
      const orphanedInCognito = cognitoUsers.filter(cognitoUser => {
        const email = cognitoUser.Attributes?.find(attr => attr.Name === 'email')?.Value;
        return email && !dbUsers.find(dbUser => dbUser.email === email);
      });
      
      const scanResult = {
        cognitoUsersCount: cognitoUsers.length,
        dbUsersCount: dbUsers.length,
        orphanedInDB: orphanedInDB.map(u => ({
          id: u.id,
          email: u.email,
          cognito_sub: u.cognito_sub,
          status: u.status
        })),
        orphanedInCognito: orphanedInCognito.map(u => ({
          username: u.Username,
          email: u.Attributes?.find(attr => attr.Name === 'email')?.Value,
          status: u.UserStatus
        })),
        syncNeeded: orphanedInDB.length > 0 || orphanedInCognito.length > 0
      };
      
      console.log(`🔍 Scan completato:`, {
        orphanedInDB: orphanedInDB.length,
        orphanedInCognito: orphanedInCognito.length
      });
      
      res.json({
        status: 'success',
        message: 'Scan Cognito ↔ Database completato',
        scanResult
      });
      
    } catch (error: any) {
      console.error('❌ Errore scan Cognito:', error);
      res.status(500).json({
        status: 'error',
        message: 'Errore durante lo scan',
        code: 'SCAN_ERROR'
      });
    }
  }
);

/**
 * 🧹 SYNC ORPHANED USERS
 * POST /api/sync-cognito/fix-orphaned
 * Elimina utenti orfani dal DB (quelli eliminati da Cognito)
 */
router.post('/fix-orphaned',
  authenticateToken,
  requireRole(['company_owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { confirmSync = false } = req.body;
      
      if (!confirmSync) {
        res.status(400).json({
          status: 'error',
          message: 'Conferma richiesta. Imposta confirmSync: true per procedere.',
          code: 'CONFIRMATION_REQUIRED'
        });
        return;
      }
      
      console.log('🧹 Inizio fix utenti orfani...');
      
      // 1. Ottieni utenti Cognito
      const listCommand = new ListUsersCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId
      });
      
      const cognitoResponse = await cognitoClient.send(listCommand);
      const cognitoUsers = cognitoResponse.Users || [];
      const cognitoSubs = cognitoUsers.map(u => u.Username).filter(Boolean);
      
      // 2. Trova utenti orfani nel DB
      const { db } = await import('../config/db');
      const orphanedResult = await db.query(`
        SELECT id, email, cognito_sub, status
        FROM users 
        WHERE cognito_sub IS NOT NULL 
          AND cognito_sub NOT IN (${cognitoSubs.map((_, i) => `$${i + 1}`).join(',')})
          AND status != 'deleted'
      `, cognitoSubs);
      
      const orphanedUsers = orphanedResult.rows;
      console.log(`🧹 Utenti orfani trovati: ${orphanedUsers.length}`);
      
      // 3. Elimina utenti orfani
      const deletionResults = [];
      
      for (const orphanedUser of orphanedUsers) {
        try {
          console.log(`🗑️ Eliminazione orfano: ${orphanedUser.email}`);
          
          const result = await UserManagementService.deleteUser(orphanedUser.cognito_sub, {
            deleteFromCognito: false,  // ❌ Non toccare Cognito (già eliminato)
            deleteFromDatabase: true,  // ✅ Elimina dal DB
            cascadeDelete: true,       // ✅ Pulisci dipendenze
            softDelete: false          // ✅ Hard delete
          });
          
          deletionResults.push({
            user: orphanedUser.email,
            success: result.success,
            message: result.message
          });
          
        } catch (error: any) {
          console.error(`❌ Errore eliminazione ${orphanedUser.email}:`, error);
          deletionResults.push({
            user: orphanedUser.email,
            success: false,
            message: error.message
          });
        }
      }
      
      const successCount = deletionResults.filter(r => r.success).length;
      const errorCount = deletionResults.length - successCount;
      
      console.log(`✅ Fix completato: ${successCount} successi, ${errorCount} errori`);
      
      res.json({
        status: 'success',
        message: `Sincronizzazione completata: ${successCount} utenti eliminati, ${errorCount} errori`,
        results: deletionResults,
        summary: {
          total: orphanedUsers.length,
          success: successCount,
          errors: errorCount
        }
      });
      
    } catch (error: any) {
      console.error('❌ Errore fix orfani:', error);
      res.status(500).json({
        status: 'error',
        message: 'Errore durante la sincronizzazione',
        code: 'SYNC_ERROR'
      });
    }
  }
);

/**
 * 🔍 CHECK SPECIFIC USER
 * GET /api/sync-cognito/check/:identifier
 * Verifica se un utente specifico è sincronizzato
 */
router.get('/check/:identifier',
  authenticateToken,
  requireRole(['company_owner', 'admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { identifier } = req.params;
      
      console.log(`🔍 Verifica utente: ${identifier}`);
      
      // 1. Trova nel DB
      const { db } = await import('../config/db');
      const dbUser = await db.query(`
        SELECT id, email, cognito_sub, status, created_at
        FROM users 
        WHERE email = $1 OR cognito_sub = $1 OR id = $1
      `, [identifier]);
      
      const userInDB = dbUser.rows[0];
      
      // 2. Verifica in Cognito (se ha cognito_sub)
      let userInCognito = null;
      if (userInDB?.cognito_sub) {
        try {
          const listCommand = new ListUsersCommand({
            UserPoolId: COGNITO_CONFIG.userPoolId,
            Filter: `sub = "${userInDB.cognito_sub}"`
          });
          
          const cognitoResponse = await cognitoClient.send(listCommand);
          userInCognito = cognitoResponse.Users?.[0] || null;
        } catch (error) {
          console.error('Errore verifica Cognito:', error);
        }
      }
      
      const checkResult = {
        user: userInDB ? {
          id: userInDB.id,
          email: userInDB.email,
          cognito_sub: userInDB.cognito_sub,
          status: userInDB.status,
          inDB: true
        } : null,
        inCognito: !!userInDB?.cognito_sub && !!userInCognito,
        syncStatus: userInDB && userInDB.cognito_sub && userInCognito ? 'SYNCED' :
                   userInDB && !userInCognito ? 'ORPHANED_IN_DB' :
                   !userInDB && userInCognito ? 'ORPHANED_IN_COGNITO' : 'NOT_FOUND',
        needsSync: userInDB && userInDB.cognito_sub && !userInCognito
      };
      
      res.json({
        status: 'success',
        message: 'Verifica utente completata',
        checkResult
      });
      
    } catch (error: any) {
      console.error('❌ Errore verifica utente:', error);
      res.status(500).json({
        status: 'error',
        message: 'Errore durante la verifica',
        code: 'CHECK_ERROR'
      });
    }
  }
);

export default router; 