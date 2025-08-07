import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Estendere l'interfaccia Request per includere user
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email: string;
        companyId?: string;
        role?: string;
        tokenType?: string;
        name?: string;
        emailVerified?: boolean;
        username?: string;
        scope?: string;
        [key: string]: any;
      };
    }
  }
}

// Configurazione AWS Cognito
const COGNITO_CONFIG = {
  userPoolId: 'eu-north-1_MVwkbI87K',
  clientId: '18b21rcmp9f1sl3q7v0pcrircf',
  region: 'eu-north-1'
};

// Inizializza il verificatore JWT per Access Token
const accessTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: COGNITO_CONFIG.userPoolId,
  tokenUse: 'access',
  clientId: COGNITO_CONFIG.clientId,
});

// Inizializza il verificatore JWT per ID Token
const idTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: COGNITO_CONFIG.userPoolId,
  tokenUse: 'id',
  clientId: COGNITO_CONFIG.clientId,
});

/**
 * Middleware di autenticazione che verifica i token JWT di AWS Cognito
 * 
 * @param req Request object di Express
 * @param res Response object di Express  
 * @param next NextFunction per passare al middleware successivo
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Estrai il token dall'header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        status: 'error',
        message: 'Token di accesso mancante',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Verifica il formato "Bearer <token>"
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      res.status(401).json({
        status: 'error',
        message: 'Formato token non valido. Utilizzare: Bearer <token>',
        code: 'INVALID_TOKEN_FORMAT'
      });
      return;
    }

    const token = tokenParts[1];

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Token non presente',
        code: 'TOKEN_NOT_PRESENT'
      });
      return;
    }

    // Tentativo di verifica come Access Token prima
    let payload;
    let tokenType = 'access';

    try {
      payload = await accessTokenVerifier.verify(token);
    } catch (accessError) {
      // Se fallisce come access token, prova come ID token
      try {
        payload = await idTokenVerifier.verify(token);
        tokenType = 'id';
      } catch (idError) {
        console.error('Token verification failed:', {
          accessError: accessError instanceof Error ? accessError.message : 'Unknown access token error',
          idError: idError instanceof Error ? idError.message : 'Unknown ID token error'
        });
        
        res.status(401).json({
          status: 'error',
          message: 'Token non valido o scaduto',
          code: 'INVALID_TOKEN'
        });
        return;
      }
    }

    // Estrai le informazioni dell'utente dal payload
    const userInfo: any = {
      sub: payload.sub,
      tokenType
    };

    // Per ID token, abbiamo più informazioni dell'utente
    if (tokenType === 'id') {
      userInfo.email = payload.email;
      userInfo.emailVerified = payload.email_verified;
      userInfo.name = payload.name;
      userInfo.preferredUsername = payload.preferred_username;
      
      // Attributi personalizzati (se presenti)
      userInfo.companyId = payload['custom:company_id'];
      userInfo.role = payload['custom:role'];
    }

    // Per access token, abbiamo informazioni di base
    if (tokenType === 'access') {
      userInfo.username = payload.username;
      userInfo.scope = payload.scope;
    }

    // Aggiungi l'utente all'oggetto request
    req.user = userInfo;

    // Log per debugging (rimuovi in produzione)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 User authenticated:', {
        sub: userInfo.sub,
        email: userInfo.email,
        tokenType,
        timestamp: new Date().toISOString()
      });
    }

    // Passa al middleware successivo
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Errore interno del server durante l\'autenticazione',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware opzionale per l'autenticazione (non blocca se il token manca)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  // Se non c'è token, continua senza autenticazione
  if (!authHeader) {
    next();
    return;
  }

  // Se c'è un token, prova ad autenticare
  await authenticateToken(req, res, next);
};

/**
 * Middleware per verificare ruoli specifici
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Autenticazione richiesta',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const userRole = req.user.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        status: 'error',
        message: 'Accesso non autorizzato per questo ruolo',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: userRole || 'none'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware per verificare che l'utente appartenga a una specifica company
 */
export const requireCompany = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      status: 'error',
      message: 'Autenticazione richiesta',
      code: 'AUTHENTICATION_REQUIRED'
    });
    return;
  }

  const companyId = req.params.companyId || req.body.companyId;
  const userCompanyId = req.user.companyId;

  if (!userCompanyId) {
    res.status(403).json({
      status: 'error',
      message: 'Utente non associato a nessuna company',
      code: 'NO_COMPANY_ASSOCIATION'
    });
    return;
  }

  if (companyId && userCompanyId !== companyId) {
    res.status(403).json({
      status: 'error',
      message: 'Accesso non autorizzato a questa company',
      code: 'COMPANY_ACCESS_DENIED'
    });
    return;
  }

  next();
};

export default {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireCompany
};