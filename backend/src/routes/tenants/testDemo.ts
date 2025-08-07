import { Router, Request, Response } from 'express';
import { db, getTableName } from '../../config/db';

const router = Router();

/**
 * ENDPOINT DI TEST DEMO - SENZA AUTENTICAZIONE
 * Questi endpoint sono solo per testare il sistema multi-tenant
 * In produzione vanno rimossi!
 */

// Interfaccia per simulare un utente/tenant
interface TestTenant {
  companyId: string;
  companyName: string;
  userId: string;
}

// GET /api/tenants/test/companies - Lista aziende per test
router.get('/companies', async (req: Request, res: Response): Promise<void> => {
  try {
    const companiesQuery = `
      SELECT c.id, c.name, c.slug, c.email, c.created_at,
             COUNT(u.id) as users_count
      FROM companies c
      LEFT JOIN users u ON c.id = u.company_id
      GROUP BY c.id, c.name, c.slug, c.email, c.created_at
      ORDER BY c.created_at DESC
      LIMIT 10
    `;
    
    const result = await db.query(companiesQuery);
    
    res.json({
      success: true,
      companies: result.rows,
      message: 'Aziende disponibili per test'
    });

  } catch (error) {
    console.error('Error fetching test companies:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/tenants/test/:companyId/tables - Verifica tabelle tenant
router.get('/:companyId/tables', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    
    // Verifica esistenza tabelle
    const tableNames = ['documents', 'rapportini', 'commesse'];
    const tableStatus = [];
    
    for (const tableName of tableNames) {
      const fullTableName = getTableName(tableName, companyId);
      
      const checkQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists,
        (SELECT COUNT(*) FROM ${fullTableName}) as records_count
      `;
      
      try {
        const result = await db.query(checkQuery, [fullTableName]);
        tableStatus.push({
          tableName: fullTableName,
          exists: result.rows[0].exists,
          recordsCount: result.rows[0].exists ? result.rows[0].records_count : 0
        });
      } catch (error) {
        tableStatus.push({
          tableName: fullTableName,
          exists: false,
          recordsCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      success: true,
      companyId,
      tables: tableStatus
    });

  } catch (error) {
    console.error('Error checking tenant tables:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// POST /api/tenants/test/:companyId/documents - Crea documento test
router.post('/:companyId/documents', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { name, description, category } = req.body;
    
    if (!name) {
      res.status(400).json({ 
        success: false, 
        error: 'Nome documento richiesto' 
      });
      return;
    }
    
    const documentsTable = getTableName('documents', companyId);
    
    // Per il test, trova l'UUID della company dal slug
    let actualCompanyId = companyId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
      // È un slug, trova l'UUID
      const companyQuery = 'SELECT id FROM companies WHERE slug = $1';
      const companyResult = await db.query(companyQuery, [companyId]);
      if (companyResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Azienda non trovata' });
        return;
      }
      actualCompanyId = companyResult.rows[0].id;
    }
    
    // Simula un UUID utente per il test o usa NULL
    const mockUserUUID = '00000000-0000-0000-0000-000000000001'; // UUID fisso per test
    
    const insertQuery = `
      INSERT INTO ${documentsTable} (
        name, description, category, status, company_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      name,
      description || 'Documento di test',
      category || 'test',
      'active',
      actualCompanyId,
      mockUserUUID
    ]);
    
    res.status(201).json({
      success: true,
      document: result.rows[0],
      message: 'Documento di test creato con successo'
    });

  } catch (error) {
    console.error('Error creating test document:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/tenants/test/:companyId/documents - Lista documenti
router.get('/:companyId/documents', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const documentsTable = getTableName('documents', companyId);
    
    // Per il test, trova l'UUID della company dal slug se necessario
    let actualCompanyId = companyId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
      const companyQuery = 'SELECT id FROM companies WHERE slug = $1';
      const companyResult = await db.query(companyQuery, [companyId]);
      if (companyResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Azienda non trovata' });
        return;
      }
      actualCompanyId = companyResult.rows[0].id;
    }
    
    const selectQuery = `
      SELECT * FROM ${documentsTable} 
      WHERE company_id = $1 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    
    const result = await db.query(selectQuery, [actualCompanyId]);
    
    res.json({
      success: true,
      documents: result.rows,
      tableName: documentsTable,
      companyId
    });

  } catch (error) {
    console.error('Error fetching test documents:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// POST /api/tenants/test/:companyId/rapportini - Crea rapportino test
router.post('/:companyId/rapportini', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { title, description, hours_worked } = req.body;
    
    if (!title) {
      res.status(400).json({ 
        success: false, 
        error: 'Titolo rapportino richiesto' 
      });
      return;
    }
    
    const rapportiniTable = getTableName('rapportini', companyId);
    const mockUserId = 'test-user-' + Date.now();
    
    const insertQuery = `
      INSERT INTO ${rapportiniTable} (
        title, description, date, hours_worked, status, company_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      title,
      description || 'Rapportino di test',
      new Date().toISOString().split('T')[0], // Today's date
      hours_worked || 8.0,
      'draft',
      companyId,
      mockUserId
    ]);
    
    res.status(201).json({
      success: true,
      rapportino: result.rows[0],
      message: 'Rapportino di test creato con successo'
    });

  } catch (error) {
    console.error('Error creating test rapportino:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/tenants/test/:companyId/rapportini - Lista rapportini
router.get('/:companyId/rapportini', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const rapportiniTable = getTableName('rapportini', companyId);
    
    const selectQuery = `
      SELECT * FROM ${rapportiniTable} 
      WHERE company_id = $1 
      ORDER BY date DESC, created_at DESC 
      LIMIT 20
    `;
    
    const result = await db.query(selectQuery, [companyId]);
    
    res.json({
      success: true,
      rapportini: result.rows,
      tableName: rapportiniTable,
      companyId
    });

  } catch (error) {
    console.error('Error fetching test rapportini:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// POST /api/tenants/test/:companyId/commesse - Crea commessa test
router.post('/:companyId/commesse', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { name, code, client_name, estimated_hours } = req.body;
    
    if (!name || !code) {
      res.status(400).json({ 
        success: false, 
        error: 'Nome e codice commessa richiesti' 
      });
      return;
    }
    
    const commesseTable = getTableName('commesse', companyId);
    const mockUserId = 'test-user-' + Date.now();
    
    const insertQuery = `
      INSERT INTO ${commesseTable} (
        code, name, client_name, estimated_hours, status, priority, 
        created_by, start_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      code,
      name,
      client_name || 'Cliente Test',
      estimated_hours || 40.0,
      'planning',
      'medium',
      mockUserId,
      new Date().toISOString().split('T')[0]
    ]);
    
    res.status(201).json({
      success: true,
      commessa: result.rows[0],
      message: 'Commessa di test creata con successo'
    });

  } catch (error) {
    console.error('Error creating test commessa:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/tenants/test/:companyId/commesse - Lista commesse
router.get('/:companyId/commesse', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const commesseTable = getTableName('commesse', companyId);
    
    const selectQuery = `
      SELECT * FROM ${commesseTable} 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    
    const result = await db.query(selectQuery);
    
    res.json({
      success: true,
      commesse: result.rows,
      tableName: commesseTable,
      companyId
    });

  } catch (error) {
    console.error('Error fetching test commesse:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// DELETE /api/tenants/test/:companyId/:table/:id - Elimina record test
router.delete('/:companyId/:table/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, table, id } = req.params;
    
    if (!['documents', 'rapportini', 'commesse'].includes(table)) {
      res.status(400).json({ 
        success: false, 
        error: 'Tabella non valida' 
      });
      return;
    }
    
    const tableName = getTableName(table, companyId);
    
    const deleteQuery = `DELETE FROM ${tableName} WHERE id = $1`;
    const result = await db.query(deleteQuery, [id]);
    
    if ((result.rowCount || 0) > 0) {
      res.json({
        success: true,
        message: `Record eliminato dalla tabella ${tableName}`
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Record non trovato'
      });
    }

  } catch (error) {
    console.error('Error deleting test record:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;