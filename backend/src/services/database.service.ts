import { db, getTableName, ensureTableExists, SQL_TEMPLATES } from '../config/db';

/**
 * Servizio per operazioni comuni del database
 */
export class DatabaseService {
  
  /**
   * Inizializza le tabelle per un nuovo tenant
   */
  static async initializeTenant(companyId: string): Promise<void> {
    try {
      const documentsTable = getTableName('documents', companyId);
      const usersTable = getTableName('users', companyId);
      
      // Crea le tabelle necessarie
      await ensureTableExists(documentsTable, SQL_TEMPLATES.DOCUMENTS_TABLE(documentsTable));
      await ensureTableExists(getTableName('reports', companyId), SQL_TEMPLATES.REPORTS_TABLE(getTableName('reports', companyId)));
      await ensureTableExists(getTableName('rapportini', companyId), SQL_TEMPLATES.RAPPORTINI_TABLE(getTableName('rapportini', companyId)));
      
      console.log(`✅ Tenant ${companyId} inizializzato con successo`);
    } catch (error) {
      console.error(`❌ Errore nell'inizializzazione tenant ${companyId}:`, error);
      throw new Error(`Inizializzazione tenant fallita: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verifica se un tenant esiste (ha almeno una tabella)
   */
  static async tenantExists(companyId: string): Promise<boolean> {
    try {
      const documentsTable = getTableName('documents', companyId);
      
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [documentsTable]);
      
      return result.rows[0].exists;
    } catch (error) {
      console.error(`Errore nella verifica tenant ${companyId}:`, error);
      return false;
    }
  }

  /**
   * Ottiene statistiche generali di un tenant
   */
  static async getTenantStats(companyId: string): Promise<any> {
    try {
      const documentsTable = getTableName('documents', companyId);
      const usersTable = getTableName('users', companyId);
      
      // Verifica esistenza tabelle
      const tablesExist = await this.tenantExists(companyId);
      if (!tablesExist) {
        return {
          companyId,
          exists: false,
          error: 'Tenant non trovato'
        };
      }

      // Statistiche documenti
      const documentsStats = await db.query(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_documents,
          SUM(file_size) as total_size
        FROM ${documentsTable}
      `);

      // Statistiche utenti (se la tabella esiste)
      let usersStats = { total_users: 0, active_users: 0 };
      try {
        const usersResult = await db.query(`
          SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
          FROM ${usersTable}
        `);
        usersStats = usersResult.rows[0];
      } catch (error) {
        // Tabella utenti potrebbe non esistere ancora
        console.log(`Tabella ${usersTable} non ancora disponibile`);
      }

      return {
        companyId,
        exists: true,
        documents: documentsStats.rows[0],
        users: usersStats,
        tables: {
          documents: documentsTable,
          users: usersTable
        }
      };

    } catch (error) {
      console.error(`Errore nel recupero statistiche tenant ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Elimina tutte le tabelle di un tenant (ATTENZIONE: operazione irreversibile)
   */
  static async deleteTenant(companyId: string): Promise<void> {
    try {
      const documentsTable = getTableName('documents', companyId);
      const usersTable = getTableName('users', companyId);
      
      // Elimina le tabelle in ordine di dipendenza
      await db.query(`DROP TABLE IF EXISTS ${documentsTable} CASCADE`);
      await db.query(`DROP TABLE IF EXISTS ${usersTable} CASCADE`);
      
      console.log(`🗑️ Tenant ${companyId} eliminato completamente`);
    } catch (error) {
      console.error(`❌ Errore nell'eliminazione tenant ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Esegue backup dei dati di un tenant
   */
  static async backupTenant(companyId: string): Promise<any> {
    try {
      const documentsTable = getTableName('documents', companyId);
      const usersTable = getTableName('users', companyId);
      
      const documentsData = await db.query(`SELECT * FROM ${documentsTable}`);
      
      let usersData = { rows: [] };
      try {
        usersData = await db.query(`SELECT * FROM ${usersTable}`);
      } catch (error) {
        console.log(`Tabella ${usersTable} non disponibile per backup`);
      }

      return {
        companyId,
        timestamp: new Date().toISOString(),
        data: {
          documents: documentsData.rows,
          users: usersData.rows
        }
      };

    } catch (error) {
      console.error(`Errore nel backup tenant ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Migrazione schema per tutti i tenant esistenti
   */
  static async migrateAllTenants(): Promise<{ success: string[], failed: string[] }> {
    try {
      // Trova tutti i tenant esistenti cercando tabelle documents_*
      const result = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'documents_%'
      `);

      const success: string[] = [];
      const failed: string[] = [];

      for (const row of result.rows) {
        const tableName = row.table_name;
        const companyId = tableName.replace('documents_', '');
        
        try {
          await this.initializeTenant(companyId);
          success.push(companyId);
        } catch (error) {
          console.error(`Migrazione fallita per ${companyId}:`, error);
          failed.push(companyId);
        }
      }

      return { success, failed };

    } catch (error) {
      console.error('Errore nella migrazione globale:', error);
      throw error;
    }
  }
}

/**
 * Servizio per query specifiche sui documenti
 */
export class DocumentsService {
  
  static async findByUser(companyId: string, userSub: string, limit: number = 50): Promise<any[]> {
    const table = getTableName('documents', companyId);
    
    const result = await db.query(`
      SELECT * FROM ${table}
      WHERE created_by = $1 AND status = 'active'
      ORDER BY created_at DESC
      LIMIT $2
    `, [userSub, limit]);
    
    return result.rows;
  }

  static async findByStatus(companyId: string, status: string): Promise<any[]> {
    const table = getTableName('documents', companyId);
    
    const result = await db.query(`
      SELECT * FROM ${table}
      WHERE status = $1
      ORDER BY created_at DESC
    `, [status]);
    
    return result.rows;
  }

  static async searchDocuments(companyId: string, searchTerm: string, limit: number = 20): Promise<any[]> {
    const table = getTableName('documents', companyId);
    
    const result = await db.query(`
      SELECT * FROM ${table}
      WHERE (name ILIKE $1 OR description ILIKE $1)
      AND status = 'active'
      ORDER BY created_at DESC
      LIMIT $2
    `, [`%${searchTerm}%`, limit]);
    
    return result.rows;
  }
}

/**
 * Servizio per query specifiche sugli utenti
 */
export class UsersService {
  
  static async findOrCreateUser(companyId: string, userData: {
    sub: string;
    email: string;
    name?: string;
    role?: string;
  }): Promise<any> {
    const table = getTableName('users', companyId);
    
    // Cerca utente esistente
    const existing = await db.query(`
      SELECT * FROM ${table} WHERE sub = $1
    `, [userData.sub]);
    
    if (existing.rows.length > 0) {
      // Aggiorna last_login
      await db.query(`
        UPDATE ${table} 
        SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE sub = $1
      `, [userData.sub]);
      
      return existing.rows[0];
    }
    
    // Crea nuovo utente
    const result = await db.query(`
      INSERT INTO ${table} (sub, email, name, role, company_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      userData.sub,
      userData.email,
      userData.name || null,
      userData.role || 'user',
      companyId
    ]);
    
    return result.rows[0];
  }

  static async getUsersByRole(companyId: string, role: string): Promise<any[]> {
    const table = getTableName('users', companyId);
    
    const result = await db.query(`
      SELECT * FROM ${table}
      WHERE role = $1 AND is_active = true
      ORDER BY created_at DESC
    `, [role]);
    
    return result.rows;
  }
}

export default {
  DatabaseService,
  DocumentsService,
  UsersService
};