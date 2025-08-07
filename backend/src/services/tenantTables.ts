import { db, getTableName, ensureTableExists, SQL_TEMPLATES } from '../config/db';

/**
 * Verifica che le tabelle condivise esistano (NON crea più tabelle per azienda)
 * @param companyId L'ID univoco dell'azienda (UUID)
 * @returns Messaggio di conferma
 */
export async function createTenantTables(companyId: string): Promise<string[]> {
  try {
    console.log(`✅ Verifica tabelle condivise per azienda: ${companyId}`);

    // Validazione companyId (deve essere UUID)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(companyId)) {
      throw new Error(`Company ID deve essere un UUID valido: ${companyId}`);
    }

    // Verifica che le tabelle condivise esistano
    const requiredTables = ['documents', 'rapportini', 'commesse'];
    const existingTables: string[] = [];

    for (const tableName of requiredTables) {
      const existsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `;
      const result = await db.query(existsQuery, [tableName]);
      
      if (result.rows[0].exists) {
        existingTables.push(tableName);
        console.log(`✅ Tabella condivisa ${tableName} disponibile`);
      } else {
        console.log(`❌ Tabella condivisa ${tableName} mancante!`);
      }
    }

    if (existingTables.length !== requiredTables.length) {
      throw new Error('Alcune tabelle condivise sono mancanti. Eseguire lo script create-shared-tables.js');
    }

    console.log(`🎉 Tutte le tabelle condivise sono disponibili per l'azienda ${companyId}`);
    console.log(`🔒 Isolamento dati garantito tramite company_id`);
    
    return existingTables;

  } catch (error) {
    console.error(`❌ Errore nella verifica tabelle per ${companyId}:`, error);
    throw new Error(`Impossibile verificare le tabelle condivise: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * SQL per creare la tabella documenti con indici ottimizzati
 */
function createDocumentsTableSQL(tableName: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      file_path VARCHAR(500),
      file_size BIGINT,
      mime_type VARCHAR(100),
      version VARCHAR(50) DEFAULT '1.0',
      category VARCHAR(100),
      tags JSONB DEFAULT '[]',
      status VARCHAR(50) DEFAULT 'active',
      company_id UUID NOT NULL,
      created_by UUID NOT NULL,
      updated_by UUID,
      approved_by UUID,
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      archived_at TIMESTAMP,
      metadata JSONB DEFAULT '{}',
      
      CONSTRAINT ${tableName}_status_check CHECK (status IN ('active', 'draft', 'approved', 'archived', 'deleted'))
    );
    
    -- Indici ottimizzati per performance
    CREATE INDEX IF NOT EXISTS idx_${tableName}_company_id ON ${tableName}(company_id);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_status ON ${tableName}(status);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_by ON ${tableName}(created_by);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_category ON ${tableName}(category);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_name_search ON ${tableName} USING gin(to_tsvector('italian', name));
    
    -- Trigger per aggiornamento automatico timestamp
    CREATE TRIGGER update_${tableName}_updated_at BEFORE UPDATE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;
}

/**
 * SQL per creare la tabella rapportini con indici ottimizzati
 */
function createRapportiniTableSQL(tableName: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      hours_worked DECIMAL(5,2) DEFAULT 0,
      project_id INTEGER,
      activity_type VARCHAR(100),
      location VARCHAR(255),
      weather_conditions VARCHAR(100),
      equipment_used JSONB DEFAULT '[]',
      materials_used JSONB DEFAULT '[]',
      issues_encountered TEXT,
      next_actions TEXT,
      photos JSONB DEFAULT '[]',
      attachments JSONB DEFAULT '[]',
      status VARCHAR(50) DEFAULT 'draft',
      company_id UUID NOT NULL,
      created_by UUID NOT NULL,
      updated_by UUID,
      approved_by UUID,
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT ${tableName}_status_check CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'archived')),
      CONSTRAINT ${tableName}_hours_check CHECK (hours_worked >= 0 AND hours_worked <= 24)
    );
    
    -- Indici ottimizzati per performance
    CREATE INDEX IF NOT EXISTS idx_${tableName}_company_id ON ${tableName}(company_id);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_status ON ${tableName}(status);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_date ON ${tableName}(date);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_by ON ${tableName}(created_by);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_project ON ${tableName}(project_id);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_date_status ON ${tableName}(date, status);
    
    -- Trigger per aggiornamento automatico timestamp
    CREATE TRIGGER update_${tableName}_updated_at BEFORE UPDATE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;
}

/**
 * SQL per creare la tabella commesse con indici ottimizzati
 */
function createCommesseTableSQL(tableName: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      client_name VARCHAR(255),
      client_contact VARCHAR(255),
      client_phone VARCHAR(50),
      client_email VARCHAR(255),
      project_type VARCHAR(100),
      location VARCHAR(255),
      start_date DATE,
      estimated_end_date DATE,
      actual_end_date DATE,
      estimated_hours DECIMAL(8,2),
      actual_hours DECIMAL(8,2) DEFAULT 0,
      hourly_rate DECIMAL(10,2),
      fixed_price DECIMAL(12,2),
      total_amount DECIMAL(12,2),
      paid_amount DECIMAL(12,2) DEFAULT 0,
      billing_type VARCHAR(20) DEFAULT 'hourly',
      payment_terms INTEGER DEFAULT 30,
      status VARCHAR(50) DEFAULT 'planning',
      priority VARCHAR(20) DEFAULT 'medium',
      progress INTEGER DEFAULT 0,
      manager_id UUID,
      team_members JSONB DEFAULT '[]',
      notes TEXT,
      requirements TEXT,
      deliverables JSONB DEFAULT '[]',
      risk_assessment TEXT,
      documents JSONB DEFAULT '[]',
      company_id UUID NOT NULL,
      created_by UUID NOT NULL,
      updated_by UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT ${tableName}_status_check CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived')),
      CONSTRAINT ${tableName}_billing_check CHECK (billing_type IN ('hourly', 'fixed', 'mixed')),
      CONSTRAINT ${tableName}_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      CONSTRAINT ${tableName}_progress_check CHECK (progress >= 0 AND progress <= 100),
      CONSTRAINT ${tableName}_payment_terms_check CHECK (payment_terms > 0)
    );
    
    -- Indici ottimizzati per performance
    CREATE INDEX IF NOT EXISTS idx_${tableName}_company_id ON ${tableName}(company_id);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_status ON ${tableName}(status);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_by ON ${tableName}(created_by);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_code ON ${tableName}(code);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_dates ON ${tableName}(start_date, estimated_end_date);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_client ON ${tableName}(client_name);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_status_priority ON ${tableName}(status, priority);
    
    -- Trigger per aggiornamento automatico timestamp
    CREATE TRIGGER update_${tableName}_updated_at BEFORE UPDATE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;
}

// Funzioni SQL rimosse - ora usiamo solo le 3 tabelle principali definite sopra

/**
 * Elimina tutti i dati di un'azienda dalle tabelle condivise
 * @param companyId L'ID univoco dell'azienda (UUID)
 * @returns Array dei nomi delle tabelle pulite
 */
export async function deleteTenantTables(companyId: string): Promise<string[]> {
  const tablesCleaned: string[] = [];

  try {
    console.log(`🗑️ Inizio pulizia dati azienda: ${companyId}`);

    // Validazione companyId (deve essere UUID)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(companyId)) {
      throw new Error(`Company ID deve essere un UUID valido: ${companyId}`);
    }

    // Array delle tabelle condivise da pulire
    const sharedTables = ['documents', 'rapportini', 'commesse'];

    for (const tableName of sharedTables) {
      try {
        // Elimina tutti i record dell'azienda dalla tabella condivisa
        const deleteQuery = `DELETE FROM ${tableName} WHERE company_id = $1`;
        const result = await db.query(deleteQuery, [companyId]);
        
        const deletedCount = result.rowCount || 0;
        tablesCleaned.push(tableName);
        console.log(`✅ Pulita tabella ${tableName}: ${deletedCount} record eliminati`);
        
      } catch (tableError) {
        console.error(`❌ Errore pulendo tabella ${tableName}:`, tableError);
        // Continuiamo con le altre tabelle anche se una fallisce
      }
    }

    console.log(`🎉 Pulizia dati azienda completata per ${companyId}: ${tablesCleaned.length} tabelle pulite`);
    return tablesCleaned;

  } catch (error) {
    console.error(`❌ Errore nella pulizia dati per ${companyId}:`, error);
    throw new Error(`Impossibile pulire i dati dell'azienda: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Elimina un'azienda e tutte le sue risorse associate
 * @param companyId ID dell'azienda da eliminare
 * @returns Oggetto con dettagli dell'eliminazione
 */
export async function deleteCompanyAndResources(companyId: string): Promise<{
  companyDeleted: boolean;
  usersDeleted: number;
  tablesDeleted: string[];
  companySlug: string;
}> {
  try {
    await db.query('BEGIN');

    // 1. Ottieni i dettagli dell'azienda
    const companyQuery = 'SELECT slug, name FROM companies WHERE id = $1';
    const companyResult = await db.query(companyQuery, [companyId]);
    
    if (companyResult.rows.length === 0) {
      throw new Error(`Azienda con ID ${companyId} non trovata`);
    }

    const companySlug = companyResult.rows[0].slug;
    const companyName = companyResult.rows[0].name;

    console.log(`🗑️ Inizio eliminazione completa azienda: ${companyName} (${companySlug})`);

    // 2. Elimina tutti gli utenti dell'azienda
    const deleteUsersQuery = 'DELETE FROM users WHERE company_id = $1';
    const usersResult = await db.query(deleteUsersQuery, [companyId]);
    const usersDeleted = usersResult.rowCount || 0;
    console.log(`👥 Eliminati ${usersDeleted} utenti`);

    // 3. Elimina l'azienda
    const deleteCompanyQuery = 'DELETE FROM companies WHERE id = $1';
    await db.query(deleteCompanyQuery, [companyId]);
    console.log(`🏢 Eliminata azienda: ${companyName}`);

    await db.query('COMMIT');
    
    // 4. Elimina tutte le tabelle tenant (fuori dalla transazione)
    const tablesDeleted = await deleteTenantTables(companySlug);

    console.log(`✅ Eliminazione completa azienda ${companyName} completata`);

    return {
      companyDeleted: true,
      usersDeleted,
      tablesDeleted,
      companySlug
    };

  } catch (error) {
    await db.query('ROLLBACK');
    console.error(`❌ Errore nell'eliminazione azienda:`, error);
    throw error;
  }
}

/**
 * Pulisce i dati orfani dalle tabelle condivise (aziende che non esistono più)
 * @returns Array dei company_id puliti
 */
export async function cleanupOrphanedTenantTables(): Promise<string[]> {
  const companiesCleanedUp: string[] = [];

  try {
    console.log('🧹 Inizio pulizia dati orfani dalle tabelle condivise...');

    // 1. Ottieni tutti gli UUID delle aziende esistenti
    const companiesQuery = 'SELECT id FROM companies ORDER BY id';
    const companiesResult = await db.query(companiesQuery);
    const existingCompanyIds = new Set(companiesResult.rows.map(row => row.id));
    
    console.log(`🏢 Trovate ${existingCompanyIds.size} aziende attive`);

    // 2. Trova company_id orfani in ogni tabella condivisa
    const sharedTables = ['documents', 'rapportini', 'commesse'];
    
    for (const tableName of sharedTables) {
      try {
        // Trova company_id unici in questa tabella
        const uniqueCompanyIdsQuery = `SELECT DISTINCT company_id FROM ${tableName}`;
        const uniqueResult = await db.query(uniqueCompanyIdsQuery);
        
        for (const row of uniqueResult.rows) {
          const companyId = row.company_id;
          
          // Se l'azienda non esiste più, elimina i suoi dati
          if (!existingCompanyIds.has(companyId)) {
            const deleteQuery = `DELETE FROM ${tableName} WHERE company_id = $1`;
            const deleteResult = await db.query(deleteQuery, [companyId]);
            
            const deletedCount = deleteResult.rowCount || 0;
            if (deletedCount > 0) {
              console.log(`🗑️ Eliminati ${deletedCount} record orfani da ${tableName} (company_id: ${companyId})`);
              
              // Aggiungi alla lista solo se non già presente
              if (!companiesCleanedUp.includes(companyId)) {
                companiesCleanedUp.push(companyId);
              }
            }
          }
        }
        
      } catch (tableError) {
        console.error(`❌ Errore durante la pulizia di ${tableName}:`, tableError);
      }
    }

    console.log(`🎉 Pulizia completata: dati di ${companiesCleanedUp.length} aziende orfane eliminati`);
    return companiesCleanedUp;

  } catch (error) {
    console.error('❌ Errore durante la pulizia dei dati orfani:', error);
    throw new Error(`Impossibile pulire i dati orfani: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default {
  createTenantTables,
  deleteTenantTables,
  deleteCompanyAndResources,
  cleanupOrphanedTenantTables
};