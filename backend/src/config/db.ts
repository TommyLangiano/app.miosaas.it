import { Pool, PoolClient, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

// Interfaccia per la configurazione del database
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// Configurazione del database basata sull'ambiente
const getDatabaseConfig = (): DatabaseConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isAWS = process.env.AWS_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME;
  const isAWSRDS = process.env.DB_HOST?.includes('rds.amazonaws.com') || false;

  // Configurazione base
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'miosaas_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  };

  // SSL per produzione, AWS o RDS
  if (isProduction || isAWS || isAWSRDS) {
    config.ssl = {
      rejectUnauthorized: false, // Per AWS RDS
      ca: process.env.DB_SSL_CA, // Certificato CA se necessario
    };
  }

  // URL completo se fornito (per Amplify)
  if (process.env.DATABASE_URL) {
    return parseConnectionString(process.env.DATABASE_URL);
  }

  return config;
};

// Parser per CONNECTION_STRING/DATABASE_URL
const parseConnectionString = (connectionString: string): DatabaseConfig => {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Rimuove il '/' iniziale
      user: url.username,
      password: url.password,
      ssl: url.searchParams.get('ssl') !== 'false' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  } catch (error) {
    console.error('Errore nel parsing della connection string:', error);
    throw new Error('CONNECTION_STRING non valida');
  }
};

// Configurazione del pool
const dbConfig = getDatabaseConfig();
const poolConfig: PoolConfig = {
  ...dbConfig,
  // Configurazioni avanzate per produzione
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  application_name: 'MioSaaS-Backend',
};

// Crea il pool di connessioni
let pool: Pool | null = null;

const createPool = (): Pool => {
  if (pool) {
    return pool;
  }

  pool = new Pool(poolConfig);

  // Event listeners per monitoraggio
  pool.on('connect', (client) => {
    console.log('✅ Nuova connessione database stabilita');
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 DB Config:', {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        ssl: !!dbConfig.ssl
      });
    }
  });

  pool.on('error', (err: any, client) => {
    console.error('💥 Errore nella connessione database:', err);
    if (err && err.code === 'ECONNRESET') {
      console.log('🔄 Tentativo di riconnessione...');
    }
  });

  pool.on('acquire', (client) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Client database acquisito dal pool');
    }
  });

  pool.on('release', (client) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 Client database rilasciato al pool');
    }
  });

  return pool;
};

// Ottieni il pool (lazy initialization)
export const getPool = (): Pool => {
  if (!pool) {
    pool = createPool();
  }
  return pool;
};

// Interfaccia per i risultati delle query
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number | null;
  command: string;
  oid: number;
  fields: any[];
}

// Classe per la gestione del database
export class Database {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Ottiene il pool di connessioni
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Esegue una query con parametri
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      
      // Log della query in development
      if (process.env.NODE_ENV === 'development') {
        const duration = Date.now() - start;
        console.log('📊 Query eseguita:', {
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          rows: result.rowCount
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Errore nella query:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        text: text.substring(0, 100),
        params: params ? JSON.stringify(params).substring(0, 200) : 'none'
      });
      throw error;
    }
  }

  /**
   * Ottiene un client per transazioni
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Esegue una transazione
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Health check del database
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const start = Date.now();
      const result = await this.query('SELECT NOW() as current_time, version() as version');
      const duration = Date.now() - start;
      
      return {
        status: 'healthy',
        details: {
          currentTime: result.rows[0].current_time,
          version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
          responseTime: `${duration}ms`,
          activeConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingClients: this.pool.waitingCount
        }
      };
    } catch (error) {
              return {
          status: 'unhealthy',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            code: (error as any)?.code || 'UNKNOWN'
          }
        };
    }
  }

  /**
   * Ottiene statistiche del pool
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      config: {
        max: poolConfig.max,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis,
        connectionTimeoutMillis: poolConfig.connectionTimeoutMillis
      }
    };
  }

  /**
   * Chiude tutte le connessioni
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('🔚 Pool database chiuso');
    }
  }
}

// Istanza singleton del database
export const db = new Database();

// Helper per ottenere nomi tabelle dinamici per multi-tenant
export const getTableName = (baseTable: string, companyId: string): string => {
  // Sanitizza il companyId per sicurezza
  const sanitizedCompanyId = companyId.replace(/[^a-zA-Z0-9_]/g, '');
  return `${baseTable}_${sanitizedCompanyId}`;
};

// Helper per creare tabelle tenant se non esistono
export const ensureTableExists = async (tableName: string, createTableSQL: string): Promise<void> => {
  try {
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `;
    
    const result = await db.query(checkQuery, [tableName]);
    const tableExists = result.rows[0].exists;
    
    if (!tableExists) {
      await db.query(createTableSQL);
      console.log(`✅ Tabella ${tableName} creata`);
    }
  } catch (error) {
    console.error(`❌ Errore nella creazione tabella ${tableName}:`, error);
    throw error;
  }
};

// SQL Templates per le tabelle tenant
export const SQL_TEMPLATES = {
  DOCUMENTS_TABLE: (tableName: string) => `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      file_path VARCHAR(500),
      file_size BIGINT,
      mime_type VARCHAR(100),
      file_hash VARCHAR(64),
      version INTEGER DEFAULT 1,
      parent_document_id INTEGER REFERENCES ${tableName}(id) ON DELETE CASCADE,
      category VARCHAR(100),
      tags JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      extracted_text TEXT,
      visibility VARCHAR(20) DEFAULT 'private',
      shared_with JSONB DEFAULT '[]',
      status VARCHAR(50) DEFAULT 'draft',
      approval_required BOOLEAN DEFAULT false,
      approved_by UUID,
      approved_at TIMESTAMP,
      created_by UUID NOT NULL,
      updated_by UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      published_at TIMESTAMP,
      
      CONSTRAINT ${tableName}_status_check CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived', 'deleted')),
      CONSTRAINT ${tableName}_visibility_check CHECK (visibility IN ('private', 'company', 'public')),
      CONSTRAINT ${tableName}_tags_array CHECK (jsonb_typeof(tags) = 'array')
    );
    
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_by ON ${tableName}(created_by);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_status ON ${tableName}(status);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_category ON ${tableName}(category);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_tags ON ${tableName} USING GIN(tags);
    
    CREATE TRIGGER update_${tableName}_updated_at BEFORE UPDATE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `,

  REPORTS_TABLE: (tableName: string) => `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      report_type VARCHAR(50) NOT NULL,
      period_start DATE,
      period_end DATE,
      data JSONB NOT NULL DEFAULT '{}',
      charts_config JSONB DEFAULT '{}',
      template_id INTEGER,
      format VARCHAR(20) DEFAULT 'pdf',
      status VARCHAR(50) DEFAULT 'draft',
      generation_progress INTEGER DEFAULT 0,
      generated_file_path VARCHAR(500),
      generated_file_size BIGINT,
      is_scheduled BOOLEAN DEFAULT false,
      schedule_config JSONB,
      next_generation TIMESTAMP,
      shared_with JSONB DEFAULT '[]',
      auto_send_email BOOLEAN DEFAULT false,
      email_recipients JSONB DEFAULT '[]',
      created_by UUID NOT NULL,
      updated_by UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      generated_at TIMESTAMP,
      last_sent_at TIMESTAMP,
      
      CONSTRAINT ${tableName}_status_check CHECK (status IN ('draft', 'generating', 'completed', 'failed', 'archived')),
      CONSTRAINT ${tableName}_type_check CHECK (report_type IN ('monthly', 'quarterly', 'annual', 'custom', 'project', 'dashboard')),
      CONSTRAINT ${tableName}_format_check CHECK (format IN ('pdf', 'excel', 'html', 'csv')),
      CONSTRAINT ${tableName}_progress_check CHECK (generation_progress >= 0 AND generation_progress <= 100)
    );
    
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_by ON ${tableName}(created_by);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_status ON ${tableName}(status);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_type ON ${tableName}(report_type);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_period ON ${tableName}(period_start, period_end);
    
    CREATE TRIGGER update_${tableName}_updated_at BEFORE UPDATE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `,

  RAPPORTINI_TABLE: (tableName: string) => `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      project_id INTEGER,
      client_name VARCHAR(255),
      work_date DATE NOT NULL,
      start_time TIME,
      end_time TIME,
      total_hours DECIMAL(5,2),
      work_type VARCHAR(100),
      location VARCHAR(255),
      activities JSONB DEFAULT '[]',
      materials_used JSONB DEFAULT '[]',
      notes TEXT,
      deliverables JSONB DEFAULT '[]',
      next_steps TEXT,
      issues_encountered TEXT,
      requires_approval BOOLEAN DEFAULT false,
      approved_by UUID,
      approved_at TIMESTAMP,
      approval_notes TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      is_billable BOOLEAN DEFAULT true,
      hourly_rate DECIMAL(10,2),
      total_amount DECIMAL(10,2),
      billed_at TIMESTAMP,
      invoice_id VARCHAR(100),
      attachments JSONB DEFAULT '[]',
      photos JSONB DEFAULT '[]',
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      address TEXT,
      created_by UUID NOT NULL,
      updated_by UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      submitted_at TIMESTAMP,
      
      CONSTRAINT ${tableName}_status_check CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'billed')),
      CONSTRAINT ${tableName}_hours_positive CHECK (total_hours IS NULL OR total_hours >= 0),
      CONSTRAINT ${tableName}_activities_array CHECK (jsonb_typeof(activities) = 'array')
    );
    
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_by ON ${tableName}(created_by);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_work_date ON ${tableName}(work_date DESC);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_status ON ${tableName}(status);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_billable ON ${tableName}(is_billable, work_date) WHERE is_billable = true;
    
    CREATE TRIGGER update_${tableName}_updated_at BEFORE UPDATE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `,

  COMMESSE_TABLE: (tableName: string) => `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      cliente VARCHAR(255) NOT NULL,
      committente_commessa VARCHAR(255),
      codice VARCHAR(50),
      nome VARCHAR(255),
      citta VARCHAR(255),
      via VARCHAR(255),
      civico VARCHAR(20),
      data_inizio DATE,
      data_fine_prevista DATE,
      descrizione TEXT,
      imponibile_commessa DECIMAL(12,2),
      iva_commessa DECIMAL(12,2),
      importo_commessa DECIMAL(12,2),
      archiviata BOOLEAN DEFAULT false,
      stato VARCHAR(20) NOT NULL DEFAULT 'da_avviare',
      created_by UUID NOT NULL,
      updated_by UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT ${tableName}_stato_check CHECK (stato IN ('in_corso', 'chiusa', 'da_avviare'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_by ON ${tableName}(created_by);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_codice ON ${tableName}(codice);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_nome ON ${tableName}(nome);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_citta ON ${tableName}(citta);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_stato ON ${tableName}(stato);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at DESC);
    
    CREATE TRIGGER update_${tableName}_updated_at BEFORE UPDATE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Ricevuto SIGINT, chiusura database...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Ricevuto SIGTERM, chiusura database...');
  await db.close();
  process.exit(0);
});

export default db;