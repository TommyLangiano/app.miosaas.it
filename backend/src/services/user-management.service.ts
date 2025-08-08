import { AdminDeleteUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { PoolClient } from 'pg';
import { db } from '../config/db';
import { GlobalUsersService } from './global-database.service';

/**
 * 🗑️ SERVIZIO GESTIONE ELIMINAZIONE UTENTI
 * Sincronizzazione bidirezionale Database ↔ Cognito
 * Pulizia completa delle dipendenze
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

export interface UserDeletionOptions {
  deleteFromCognito?: boolean;
  deleteFromDatabase?: boolean;
  cascadeDelete?: boolean; // Elimina anche i dati correlati
  softDelete?: boolean;    // Marca come eliminato invece di cancellare
}

export class UserManagementService {
  
  /**
   * 🎯 ELIMINAZIONE COMPLETA UTENTE (DB + COGNITO)
   * Punto di ingresso principale per eliminare un utente
   */
  static async deleteUser(
    userIdentifier: string, // Email, cognito_sub, o user_id
    options: UserDeletionOptions = {
      deleteFromCognito: true,
      deleteFromDatabase: true,
      cascadeDelete: true,
      softDelete: false
    }
  ): Promise<{ success: boolean; message: string; deletedData?: any }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      console.log(`🗑️ Inizio eliminazione utente: ${userIdentifier}`);
      
      // 1. Trova l'utente nel database
      const dbUser = await this.findUser(userIdentifier);
      if (!dbUser) {
        throw new Error(`Utente non trovato: ${userIdentifier}`);
      }
      
      console.log(`👤 Utente trovato: ${dbUser.email} (ID: ${dbUser.id})`);
      
      const deletionResult = {
        userId: dbUser.id,
        email: dbUser.email,
        cognitoSub: dbUser.cognito_sub,
        companyId: dbUser.company_id,
        deletedFromCognito: false,
        deletedFromDatabase: false,
        cascadeData: {} as any,
        errors: [] as string[]
      };
      
      // 2. Elimina dipendenze (se richiesto)
      if (options.cascadeDelete) {
        console.log(`🧹 Pulizia dipendenze per utente ${dbUser.id}...`);
        const cascadeResult = await this.cleanupUserDependencies(dbUser.id, dbUser.company_id, client, options.softDelete);
        deletionResult.cascadeData = cascadeResult;
      }
      
      // 3. Elimina da Cognito (se richiesto)
      if (options.deleteFromCognito && dbUser.cognito_sub) {
        try {
          console.log(`☁️ Eliminazione da Cognito: ${dbUser.cognito_sub}`);
          await this.deleteFromCognito(dbUser.cognito_sub);
          deletionResult.deletedFromCognito = true;
          console.log(`✅ Utente eliminato da Cognito`);
        } catch (cognitoError: any) {
          console.error(`❌ Errore eliminazione Cognito:`, cognitoError);
          deletionResult.errors.push(`Cognito: ${cognitoError.message}`);
          // Continua comunque con l'eliminazione dal DB
        }
      }
      
      // 4. Elimina dal Database (se richiesto)
      if (options.deleteFromDatabase) {
        console.log(`🗄️ Eliminazione dal Database...`);
        if (options.softDelete) {
          await this.softDeleteFromDatabase(dbUser.id, client);
        } else {
          await this.hardDeleteFromDatabase(dbUser.id, client);
        }
        deletionResult.deletedFromDatabase = true;
        console.log(`✅ Utente eliminato dal Database`);
      }
      
      await client.query('COMMIT');
      
      console.log(`🎉 Eliminazione completata per ${dbUser.email}`);
      
      return {
        success: true,
        message: `Utente ${dbUser.email} eliminato con successo`,
        deletedData: deletionResult
      };
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error(`❌ Errore durante eliminazione:`, error);
      
      return {
        success: false,
        message: `Errore durante l'eliminazione: ${error.message}`
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * 🔍 TROVA UTENTE (Email, Cognito Sub, o ID)
   */
  private static async findUser(identifier: string): Promise<any | null> {
    // Prova prima per email
    if (identifier.includes('@')) {
      return await GlobalUsersService.getByEmail(identifier);
    }
    
    // Prova per cognito_sub (formato UUID lungo)
    if (identifier.length > 30) {
      return await GlobalUsersService.getByCognitoSub(identifier);
    }
    
    // Altrimenti prova per ID
    return await GlobalUsersService.getById(identifier);
  }
  
  /**
   * ☁️ ELIMINA DA COGNITO
   */
  private static async deleteFromCognito(cognitoSub: string): Promise<void> {
    const deleteCommand = new AdminDeleteUserCommand({
      UserPoolId: COGNITO_CONFIG.userPoolId,
      Username: cognitoSub // Cognito accetta sia username che sub
    });
    
    await cognitoClient.send(deleteCommand);
  }
  
  /**
   * 🗄️ ELIMINA DAL DATABASE (HARD DELETE)
   */
  private static async hardDeleteFromDatabase(userId: string, client: PoolClient): Promise<void> {
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
  }
  
  /**
   * 🏷️ ELIMINA DAL DATABASE (SOFT DELETE)
   */
  private static async softDeleteFromDatabase(userId: string, client: PoolClient): Promise<void> {
    await client.query(`
      UPDATE users 
      SET status = 'deleted', 
          email = CONCAT(email, '_deleted_', EXTRACT(EPOCH FROM CURRENT_TIMESTAMP))
      WHERE id = $1
    `, [userId]);
  }
  
  /**
   * 🧹 PULIZIA DIPENDENZE UTENTE
   */
  private static async cleanupUserDependencies(
    userId: string, 
    companyId: string, 
    client: PoolClient, 
    softDelete: boolean = false
  ): Promise<any> {
    const cleanupResult = {
      documents: 0,
      rapportini: 0,
      commesse: 0,
      other: {}
    };
    
    try {
      if (softDelete) {
        // SOFT DELETE: Marca come eliminati
        
        // Documents creati dall'utente
        const docsResult = await client.query(`
          UPDATE documents 
          SET status = 'deleted'
          WHERE created_by = $1 AND company_id = $2
        `, [userId, companyId]);
        cleanupResult.documents = docsResult.rowCount || 0;
        
        // Rapportini dell'utente
        const rapportiniResult = await client.query(`
          UPDATE rapportini 
          SET status = 'deleted'
          WHERE user_id = $1 AND company_id = $2
        `, [userId, companyId]);
        cleanupResult.rapportini = rapportiniResult.rowCount || 0;
        
        // Commesse create dall'utente: per soft delete le marchiamo come archiviate
        const commesseResult = await client.query(`
          UPDATE commesse 
          SET archiviata = true, stato = 'chiusa'
          WHERE created_by = $1 AND company_id = $2
        `, [userId, companyId]);
        cleanupResult.commesse = commesseResult.rowCount || 0;
        
      } else {
        // HARD DELETE: Elimina fisicamente
        
        // Documents creati dall'utente
        const docsResult = await client.query(`
          DELETE FROM documents 
          WHERE created_by = $1 AND company_id = $2
        `, [userId, companyId]);
        cleanupResult.documents = docsResult.rowCount || 0;
        
        // Rapportini dell'utente
        const rapportiniResult = await client.query(`
          DELETE FROM rapportini 
          WHERE user_id = $1 AND company_id = $2
        `, [userId, companyId]);
        cleanupResult.rapportini = rapportiniResult.rowCount || 0;
        
        // Per le commesse create dall'utente, non le eliminiamo: le archiviamo
        const commesseResult = await client.query(`
          UPDATE commesse 
          SET archiviata = true, stato = 'chiusa'
          WHERE created_by = $1 AND company_id = $2
        `, [userId, companyId]);
        cleanupResult.commesse = commesseResult.rowCount || 0;
      }
      
      console.log(`🧹 Cleanup completato:`, cleanupResult);
      return cleanupResult;
      
    } catch (error) {
      console.error(`❌ Errore durante cleanup dipendenze:`, error);
      throw error;
    }
  }
  
  /**
   * 🔄 SINCRONIZZAZIONE DA COGNITO → DATABASE
   * Chiamata quando un utente viene eliminato da Cognito
   */
  static async handleCognitoUserDeletion(cognitoSub: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔄 Sincronizzazione eliminazione da Cognito: ${cognitoSub}`);
      
      // Trova l'utente nel DB tramite cognito_sub
      const dbUser = await GlobalUsersService.getByCognitoSub(cognitoSub);
      if (!dbUser) {
        return {
          success: true,
          message: `Utente ${cognitoSub} non trovato nel DB (già eliminato o mai esistito)`
        };
      }
      
      // Elimina dal database (senza toccare Cognito)
      const result = await this.deleteUser(cognitoSub, {
        deleteFromCognito: false,  // ❌ Non toccare Cognito (già eliminato)
        deleteFromDatabase: true,  // ✅ Elimina dal DB
        cascadeDelete: true,       // ✅ Pulisci dipendenze
        softDelete: false          // ✅ Hard delete
      });
      
      return result;
      
    } catch (error: any) {
      console.error(`❌ Errore sincronizzazione Cognito → DB:`, error);
      return {
        success: false,
        message: `Errore sincronizzazione: ${error.message}`
      };
    }
  }
  
  /**
   * 📊 REPORT ELIMINAZIONE UTENTE
   * Mostra cosa verrebbe eliminato prima di procedere
   */
  static async getUserDeletionPreview(userIdentifier: string): Promise<any> {
    try {
      const dbUser = await this.findUser(userIdentifier);
      if (!dbUser) {
        throw new Error(`Utente non trovato: ${userIdentifier}`);
      }
      
      // Query per contare le dipendenze
      const dependencies = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM documents WHERE created_by = $1 AND company_id = $2) as documents_count,
          (SELECT COUNT(*) FROM rapportini WHERE user_id = $1 AND company_id = $2) as rapportini_count,
          (SELECT COUNT(*) FROM commesse WHERE created_by = $1 AND company_id = $2) as commesse_count
      `, [dbUser.id, dbUser.company_id]);
      
      return {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: `${dbUser.name} ${dbUser.surname}`,
          cognitoSub: dbUser.cognito_sub,
          companyId: dbUser.company_id,
          status: dbUser.status
        },
        dependencies: dependencies.rows[0],
        warnings: [
          'L\'eliminazione è irreversibile',
          'Tutti i dati correlati verranno eliminati',
          'L\'utente verrà rimosso anche da AWS Cognito'
        ]
      };
      
    } catch (error: any) {
      throw new Error(`Errore preview eliminazione: ${error.message}`);
    }
  }
}

export default UserManagementService;