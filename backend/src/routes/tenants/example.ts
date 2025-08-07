import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { tenantMiddleware } from '../../middleware/tenant';

const router = Router();

/**
 * Esempi di utilizzo dei nuovi metodi tenant-aware
 * Tutti questi endpoint sono protetti da auth + tenant middleware
 */

// GET /api/tenants/example/documents - Lista documenti
router.get('/documents', authenticateToken, tenantMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.db) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Esempio utilizzo findMany con filtri
    const documents = await req.db.findMany('documents', {
      where: { status: 'active' },
      orderBy: 'created_at DESC',
      limit: 20
    });

    res.json({
      success: true,
      data: documents,
      companyId: req.db.companyId,
      table: 'documents'
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/tenants/example/documents/:id - Singolo documento
router.get('/documents/:id', authenticateToken, tenantMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.db) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { id } = req.params;
    
    // Esempio utilizzo get
    const document = await req.db.get('documents', id);
    
    if (!document) {
      res.status(404).json({ 
        success: false, 
        error: 'Documento non trovato' 
      });
      return;
    }

    res.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// POST /api/tenants/example/documents - Crea nuovo documento
router.post('/documents', authenticateToken, tenantMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.db || !req.user) {
      res.status(500).json({ error: 'Database or user not configured' });
      return;
    }

    const { name, description, category } = req.body;

    if (!name) {
      res.status(400).json({ 
        success: false, 
        error: 'Nome documento richiesto' 
      });
      return;
    }

    // Esempio utilizzo insert
    const newDocument = await req.db.insert('documents', {
      name,
      description,
      category: category || 'general',
      status: 'active',
      created_by: req.user.sub
    });

    res.status(201).json({
      success: true,
      data: newDocument,
      message: 'Documento creato con successo'
    });

  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// PUT /api/tenants/example/documents/:id - Aggiorna documento
router.put('/documents/:id', authenticateToken, tenantMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.db || !req.user) {
      res.status(500).json({ error: 'Database or user not configured' });
      return;
    }

    const { id } = req.params;
    const { name, description, category, status } = req.body;

    // Esempio utilizzo update
    const updatedDocument = await req.db.update('documents', id, {
      name,
      description,
      category,
      status,
      updated_by: req.user.sub
    });

    if (!updatedDocument) {
      res.status(404).json({ 
        success: false, 
        error: 'Documento non trovato' 
      });
      return;
    }

    res.json({
      success: true,
      data: updatedDocument,
      message: 'Documento aggiornato con successo'
    });

  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// DELETE /api/tenants/example/documents/:id - Elimina documento
router.delete('/documents/:id', authenticateToken, tenantMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.db) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { id } = req.params;

    // Esempio utilizzo delete
    const deleted = await req.db.delete('documents', id);

    if (!deleted) {
      res.status(404).json({ 
        success: false, 
        error: 'Documento non trovato' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Documento eliminato con successo'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/tenants/example/rapportini - Lista rapportini
router.get('/rapportini', authenticateToken, tenantMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.db) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { status, date_from, date_to } = req.query;

    // Filtri opzionali
    const filter: any = {};
    if (status) filter.where = { status: status as string };
    if (date_from || date_to) {
      // Query più complessa per date range
      let customQuery = `
        SELECT * FROM rapportini 
        WHERE company_id = $1
      `;
      const params: any[] = [req.db.companyId];
      let paramIndex = 2;

      if (status) {
        customQuery += ` AND status = $${paramIndex}`;
        params.push(status as string);
        paramIndex++;
      }
      if (date_from) {
        customQuery += ` AND date >= $${paramIndex}`;
        params.push(date_from as string);
        paramIndex++;
      }
      if (date_to) {
        customQuery += ` AND date <= $${paramIndex}`;
        params.push(date_to as string);
        paramIndex++;
      }

      customQuery += ` ORDER BY date DESC LIMIT 50`;

      const result = await req.db.query(customQuery, params);
      res.json({
        success: true,
        data: result.rows,
        table: 'rapportini'
      });
      return;
    }

    // Utilizzo findMany per query semplici
    const rapportini = await req.db.findMany('rapportini', {
      ...filter,
      orderBy: 'date DESC',
      limit: 50
    });

    res.json({
      success: true,
      data: rapportini,
      table: 'rapportini'
    });

  } catch (error) {
    console.error('Error fetching rapportini:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/tenants/example/commesse - Lista commesse
router.get('/commesse', authenticateToken, tenantMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.db) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const commesse = await req.db.findMany('commesse', {
      orderBy: 'created_at DESC',
      limit: 20
    });

    res.json({
      success: true,
      data: commesse,
      table: 'commesse'
    });

  } catch (error) {
    console.error('Error fetching commesse:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;