import { Router, Request, Response } from 'express';
import { authenticateToken, optionalAuth, requireRole } from '../middleware/auth';

// Interfaccia user ora definita in middleware/auth.ts

const router = Router();

// Request estesa con utente
type AuthedRequest = Request & {
  user?: {
    sub?: string;
    email?: string;
    companyId?: string;
    role?: string;
    tokenType?: string;
    name?: string;
    emailVerified?: boolean;
  };
};

/**
 * Route protetta che richiede autenticazione
 */
router.get('/protected', authenticateToken, (req: AuthedRequest, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Accesso autorizzato alla route protetta',
    user: {
      sub: req.user?.sub,
      email: req.user?.email,
      companyId: req.user?.companyId,
      role: req.user?.role,
      tokenType: req.user?.tokenType
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Route con autenticazione opzionale
 */
router.get('/optional', optionalAuth, (req: AuthedRequest, res: Response) => {
  const isAuthenticated = !!req.user;
  
  res.status(200).json({
    status: 'success',
    message: 'Route con autenticazione opzionale',
    authenticated: isAuthenticated,
    user: isAuthenticated ? {
      sub: req.user?.sub,
      email: req.user?.email,
      role: req.user?.role
    } : null,
    timestamp: new Date().toISOString()
  });
});

/**
 * Route che richiede ruolo admin
 */
router.get('/admin-only', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  (req: AuthedRequest, res: Response) => {
    res.status(200).json({
      status: 'success',
      message: 'Accesso autorizzato all\'area admin',
      user: {
        sub: req.user?.sub,
        email: req.user?.email,
        role: req.user?.role
      },
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * Route per ottenere le informazioni dell'utente corrente
 */
router.get('/me', authenticateToken, (req: AuthedRequest, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: {
      sub: req.user?.sub,
      email: req.user?.email,
      companyId: req.user?.companyId,
      role: req.user?.role,
      tokenType: req.user?.tokenType,
      name: req.user?.name,
      emailVerified: req.user?.emailVerified
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Route di test per validare il token senza altre operazioni
 */
router.post('/validate-token', authenticateToken, (req: AuthedRequest, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Token valido',
    valid: true,
    tokenType: req.user?.tokenType,
    timestamp: new Date().toISOString()
  });
});

export default router;