import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// Tipi locali per evitare errori sui campi estesi
type TenantDb = {
  companyId: string;
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, string>> }>;
};
type AuthedTenantRequest = Request & {
  user?: {
    sub?: string;
    email?: string;
    dbUserId?: string;
    name?: string;
    status?: string;
    companyId?: string;
    companyName?: string;
    companySlug?: string;
    role?: string;
    tokenType?: 'access' | 'id';
  };
  tenant?: { companyId: string; isValidTenant: boolean };
  db?: TenantDb;
};

/**
 * 🧪 ENDPOINT DI TEST per JWT ↔ DB Connection
 * - Verifica autenticazione JWT
 * - Mostra dati utente dal database  
 * - Testa tenant isolation
 */
router.get('/me', authenticateToken, async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Utente non autenticato',
        code: 'NO_USER'
      });
      return;
    }

    // Risposta con tutti i dati dell'utente dal DB
    res.json({
      status: 'success',
      message: 'Utente autenticato con successo via JWT ↔ DB',
      user: {
        // Dal token JWT
        cognitoSub: user.sub,
        tokenType: user.tokenType,
        
        // Dal database lookup
        dbUserId: user.dbUserId,
        email: user.email,
        name: user.name,
        status: user.status,
        
        // Company info dal DB
        companyId: user.companyId,
        companyName: user.companyName,
        companySlug: user.companySlug,
        
        // Role dal DB
        role: user.role,
        
        // Metadata
        authenticatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Test auth error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Errore interno durante il test di autenticazione',
      code: 'TEST_AUTH_ERROR'
    });
  }
});

/**
 * 🧪 ENDPOINT DI TEST per Tenant Isolation
 * - Richiede autenticazione + tenant middleware
 * - Mostra dati company-specific
 */
router.get('/tenant-info', authenticateToken, tenantMiddleware, async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const tenant = req.tenant;
    const db = req.db;
    
    if (!user || !tenant || !db) {
      res.status(500).json({
        status: 'error',
        message: 'Middleware non configurato correttamente',
        code: 'MIDDLEWARE_ERROR'
      });
      return;
    }

    // Test query tenant-aware (documenti della company)
    const documentsCount = await db.query(
      'SELECT COUNT(*) as count FROM documents WHERE company_id = $1',
      [db.companyId]
    );

    const rapportiniCount = await db.query(
      'SELECT COUNT(*) as count FROM rapportini WHERE company_id = $1', 
      [db.companyId]
    );

    const commesseCount = await db.query(
      'SELECT COUNT(*) as count FROM commesse WHERE company_id = $1',
      [db.companyId]
    );

    res.json({
      status: 'success',
      message: 'Tenant isolation funzionante',
      tenant: {
        companyId: tenant.companyId,
        isValidTenant: tenant.isValidTenant
      },
      user: {
        email: user.email,
        role: user.role,
        companyName: user.companyName
      },
      data: {
        documentsCount: parseInt(documentsCount.rows[0]?.count || '0'),
        rapportiniCount: parseInt(rapportiniCount.rows[0]?.count || '0'),
        commesseCount: parseInt(commesseCount.rows[0]?.count || '0')
      },
      security: {
        dataIsolation: 'ACTIVE',
        companyFilter: db.companyId,
        queryMethod: 'TENANT_AWARE'
      }
    });

  } catch (error) {
    console.error('❌ Tenant test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Errore durante il test di tenant isolation',
      code: 'TENANT_TEST_ERROR'
    });
  }
});

/**
 * 🧪 ENDPOINT DI TEST per Role-based Access
 * - Solo company_owner può accedere
 */
router.get('/admin-only', authenticateToken, requireRole(['company_owner']), async (req: AuthedTenantRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;

    res.json({
      status: 'success',
      message: 'Accesso autorizzato per company_owner',
      user: {
        email: user?.email,
        role: user?.role,
        companyName: user?.companyName
      },
      adminData: {
        message: 'Questi dati sono visibili solo ai company_owner',
        accessLevel: 'ADMIN',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Admin test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Errore durante il test admin',
      code: 'ADMIN_TEST_ERROR'
    });
  }
});

export default router;