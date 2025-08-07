import { Request, Response, NextFunction } from 'express';
import { Pool, PoolClient } from 'pg';
import { db } from '../config/db';

// Interfaccia per i risultati delle query
interface QueryResult {
  rows: any[];
  rowCount: number | null;
}

// Interfaccia per filtri di ricerca
interface QueryFilter {
  where?: Record<string, any>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

// Estendere l'interfaccia Request per includere db e tenant info
declare global {
  namespace Express {
    interface Request {
      db?: {
        pool: Pool;
        companyId: string;
        
        // Metodi tenant-aware per database operations con TABELLE CONDIVISE
        get: (tableName: string, id: number | string) => Promise<any>;
        findMany: (tableName: string, filter?: QueryFilter) => Promise<any[]>;
        insert: (tableName: string, data: Record<string, any>) => Promise<any>;
        update: (tableName: string, id: number | string, data: Record<string, any>) => Promise<any>;
        delete: (tableName: string, id: number | string) => Promise<boolean>;
        
        // Metodi raw per query personalizzate
        query: (text: string, params?: any[]) => Promise<QueryResult>;
        getClient: () => Promise<PoolClient>;
      };
      tenant?: {
        companyId: string;
        isValidTenant: boolean;
      };
    }
  }
}

/**
 * Middleware per gestire multi-tenancy con TABELLE CONDIVISE
 * - Usa sempre le tabelle fisse: documents, rapportini, commesse
 * - Isolamento tramite company_id in ogni query
 * - NON crea più tabelle dinamiche per azienda
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Estrai companyId dall'header X-Company-ID o dal token JWT
    const companyId = req.headers['x-company-id'] as string || req.user?.companyId;

    if (!companyId) {
      res.status(400).json({
        status: 'error',
        message: 'Company ID mancante. Richiesto header X-Company-ID o token JWT valido.',
        code: 'MISSING_COMPANY_ID'
      });
      return;
    }

    // Valida il formato del companyId (UUID)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(companyId)) {
      res.status(400).json({
        status: 'error',
        message: 'Company ID deve essere un UUID valido',
        code: 'INVALID_COMPANY_ID'
      });
      return;
    }

    // Verifica che l'azienda esista nel database
    const companyExists = await db.query(
      'SELECT id FROM companies WHERE id = $1 LIMIT 1',
      [companyId]
    );

    if (companyExists.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Azienda non trovata',
        code: 'COMPANY_NOT_FOUND'
      });
      return;
    }

    // Crea l'oggetto db con metodi tenant-aware per TABELLE CONDIVISE
    req.db = {
      pool: db.getPool(),
      companyId: companyId,
      
      // Metodo GET - Ottiene un record per ID (con isolamento company_id)
      get: async (tableName: string, id: number | string): Promise<any> => {
        // Valida nome tabella per sicurezza
        const allowedTables = ['documents', 'rapportini', 'commesse'];
        if (!allowedTables.includes(tableName)) {
          throw new Error(`Tabella non consentita: ${tableName}`);
        }

        const query = `SELECT * FROM ${tableName} WHERE id = $1 AND company_id = $2 LIMIT 1`;
        const result = await db.query(query, [id, companyId]);
        return result.rows[0] || null;
      },

      // Metodo FIND_MANY - Cerca records con filtri (sempre isolato per company_id)
      findMany: async (tableName: string, filter: QueryFilter = {}): Promise<any[]> => {
        // Valida nome tabella per sicurezza
        const allowedTables = ['documents', 'rapportini', 'commesse'];
        if (!allowedTables.includes(tableName)) {
          throw new Error(`Tabella non consentita: ${tableName}`);
        }

        let query = `SELECT * FROM ${tableName} WHERE company_id = $1`;
        const params: any[] = [companyId];
        let paramIndex = 2;

        // Aggiungi condizioni WHERE
        if (filter.where) {
          for (const [key, value] of Object.entries(filter.where)) {
            query += ` AND ${key} = $${paramIndex}`;
            params.push(value);
            paramIndex++;
          }
        }

        // Aggiungi ORDER BY
        if (filter.orderBy) {
          query += ` ORDER BY ${filter.orderBy}`;
        } else {
          query += ` ORDER BY created_at DESC`;
        }

        // Aggiungi LIMIT e OFFSET
        if (filter.limit) {
          query += ` LIMIT $${paramIndex}`;
          params.push(filter.limit);
          paramIndex++;
        }
        if (filter.offset) {
          query += ` OFFSET $${paramIndex}`;
          params.push(filter.offset);
        }

        const result = await db.query(query, params);
        return result.rows;
      },

      // Metodo INSERT - Crea un nuovo record (company_id automatico)
      insert: async (tableName: string, data: Record<string, any>): Promise<any> => {
        // Valida nome tabella per sicurezza
        const allowedTables = ['documents', 'rapportini', 'commesse'];
        if (!allowedTables.includes(tableName)) {
          throw new Error(`Tabella non consentita: ${tableName}`);
        }
        
        // Aggiungi automaticamente company_id
        const insertData = { ...data, company_id: companyId };
        
        const keys = Object.keys(insertData);
        const values = Object.values(insertData);
        const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${tableName} (${keys.join(', ')}) 
          VALUES (${placeholders}) 
          RETURNING *
        `;
        
        const result = await db.query(query, values);
        return result.rows[0];
      },

      // Metodo UPDATE - Aggiorna un record esistente (con controllo company_id)
      update: async (tableName: string, id: number | string, data: Record<string, any>): Promise<any> => {
        // Valida nome tabella per sicurezza
        const allowedTables = ['documents', 'rapportini', 'commesse'];
        if (!allowedTables.includes(tableName)) {
          throw new Error(`Tabella non consentita: ${tableName}`);
        }
        
        // Rimuovi company_id dai dati di update (non deve essere modificato)
        const { company_id, ...updateData } = data;
        
        const keys = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
        
        const query = `
          UPDATE ${tableName} 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $1 AND company_id = $${keys.length + 2}
          RETURNING *
        `;
        
        const result = await db.query(query, [id, ...values, companyId]);
        return result.rows[0] || null;
      },

      // Metodo DELETE - Elimina un record (con controllo company_id)
      delete: async (tableName: string, id: number | string): Promise<boolean> => {
        // Valida nome tabella per sicurezza
        const allowedTables = ['documents', 'rapportini', 'commesse'];
        if (!allowedTables.includes(tableName)) {
          throw new Error(`Tabella non consentita: ${tableName}`);
        }

        const query = `DELETE FROM ${tableName} WHERE id = $1 AND company_id = $2`;
        const result = await db.query(query, [id, companyId]);
        return (result.rowCount || 0) > 0;
      },

      // Metodi raw per query personalizzate
      query: async (text: string, params?: any[]): Promise<QueryResult> => {
        return await db.query(text, params);
      },

      getClient: async (): Promise<PoolClient> => {
        return await db.getClient();
      }
    };

    // Popola req.tenant per compatibilità
    req.tenant = {
      companyId: companyId,
      isValidTenant: true
    };

    next();

  } catch (error) {
    console.error('❌ Errore nel tenantMiddleware:', error);
    res.status(500).json({
      status: 'error',
      message: 'Errore interno del server durante la gestione del tenant',
      code: 'TENANT_MIDDLEWARE_ERROR'
    });
  }
};

/**
 * Middleware per estrarre companyId dall'URL per endpoint di test
 * Utilizzato per gli endpoint /api/tenants/test/:companyId/*
 */
export const tenantTestMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyIdOrSlug = req.params.companyId;
    
    if (!companyIdOrSlug) {
      res.status(400).json({
        status: 'error',
        message: 'Company ID o slug mancante nell\'URL',
        code: 'MISSING_COMPANY_PARAM'
      });
      return;
    }

    let actualCompanyId = companyIdOrSlug;

    // Se non è un UUID, presumi sia uno slug e cerca l'UUID corrispondente
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(companyIdOrSlug)) {
      const companyQuery = 'SELECT id FROM companies WHERE slug = $1';
      const companyResult = await db.query(companyQuery, [companyIdOrSlug]);
      
      if (companyResult.rows.length === 0) {
        res.status(404).json({
          status: 'error',
          message: 'Azienda non trovata',
          code: 'COMPANY_NOT_FOUND'
        });
        return;
      }
      
      actualCompanyId = companyResult.rows[0].id;
    }

    // Imposta req.user.companyId per il tenantMiddleware
    if (!req.user) {
      req.user = { sub: '', email: '', companyId: actualCompanyId };
    } else {
      req.user = { ...req.user, companyId: actualCompanyId };
    }
    req.headers['x-company-id'] = actualCompanyId;

    next();

  } catch (error) {
    console.error('❌ Errore nel tenantTestMiddleware:', error);
    res.status(500).json({
      status: 'error',
      message: 'Errore interno del server durante la risoluzione del tenant',
      code: 'TENANT_TEST_MIDDLEWARE_ERROR'
    });
  }
};

export default tenantMiddleware;