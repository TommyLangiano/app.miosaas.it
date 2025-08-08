import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { GlobalUsersService } from '../services/global-database.service';

interface UserInfo {
  sub: string;
  tokenType: 'access' | 'id';
  email?: string;
  emailVerified?: boolean;
  name?: string;
  surname?: string;
  preferredUsername?: string;
  username?: string;
  scope?: string;
  cognitoUsername?: string;
  // Campi dal DB
  dbUserId?: string;
  companyId?: string;
  role?: string;
  status?: string;
  companyName?: string;
  companySlug?: string;
}

type RequestWithUser = Request & { user?: UserInfo };

// Payload minimi che ci interessano dai token Cognito
interface IdTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  name?: string;
  family_name?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

interface AccessTokenPayload {
  sub: string;
  username?: string;
  scope?: string;
  [key: string]: unknown;
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
    let payload: IdTokenPayload | AccessTokenPayload;
    let tokenType: 'access' | 'id' = 'access';

    try {
      payload = (await accessTokenVerifier.verify(token)) as unknown as AccessTokenPayload;
    } catch (accessError) {
      // Se fallisce come access token, prova come ID token
      try {
        payload = (await idTokenVerifier.verify(token)) as unknown as IdTokenPayload;
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
    const userInfo: UserInfo = {
      sub: String(payload.sub),
      tokenType,
    };

    // Per ID token, abbiamo più informazioni dell'utente
    if (tokenType === 'id') {
      const idPayload = payload as IdTokenPayload;
      userInfo.email = typeof idPayload.email === 'string' ? idPayload.email : undefined;
      userInfo.emailVerified = typeof idPayload.email_verified === 'boolean' ? idPayload.email_verified : undefined;
      const givenName = typeof idPayload.given_name === 'string' ? idPayload.given_name : undefined;
      const name = typeof idPayload.name === 'string' ? idPayload.name : undefined;
      userInfo.name = givenName || name;
      userInfo.surname = typeof idPayload.family_name === 'string' ? idPayload.family_name : undefined;
      userInfo.preferredUsername =
        typeof idPayload.preferred_username === 'string' ? idPayload.preferred_username : undefined;
      // Cognito username (immutabile) per operazioni Admin*
      const cognitoUsername = idPayload['cognito:username'];
      userInfo.cognitoUsername = typeof cognitoUsername === 'string' ? cognitoUsername : undefined;
    }

    // Per access token, abbiamo informazioni di base
    if (tokenType === 'access') {
      const accessPayload = payload as AccessTokenPayload;
      userInfo.username = typeof accessPayload.username === 'string' ? accessPayload.username : undefined;
      userInfo.scope = typeof accessPayload.scope === 'string' ? accessPayload.scope : undefined;
    }

    // 🔍 LOOKUP UTENTE REALE NEL DATABASE usando cognito_sub
    try {
      const dbUser = await GlobalUsersService.getByCognitoSub(String(payload.sub));
      
      if (!dbUser) {
        console.warn(`🚨 User not found in DB for cognito_sub: ${payload.sub} – proceeding with token-only data`);
        // Continua con i soli dati del token (profilo minimale)
      } else {
        // ✅ CARICA DATI REALI DAL DATABASE (non dal token!)
        userInfo.dbUserId = dbUser.id;
        userInfo.companyId = dbUser.company_id;  // 🔥 COMPANY_ID REALE DAL DB
        userInfo.role = dbUser.role_name || 'user';  // Ruolo reale dal DB
        userInfo.status = dbUser.status;
        userInfo.email = dbUser.email; // Email verificata dal DB
        userInfo.companyName = dbUser.company_name;
        userInfo.companySlug = dbUser.company_slug;
        
        // Aggiorna last_login usando cognito_sub
        await GlobalUsersService.updateLastLogin(String(payload.sub));
        
        console.log('✅ User authenticated from DB:', {
          dbUserId: dbUser.id,
          email: dbUser.email,
          companyId: dbUser.company_id,
          role: userInfo.role,
          cognitoSub: payload.sub
        });
      }
      
    } catch (dbError) {
      console.error('❌ Database lookup error:', dbError);
      res.status(500).json({
        status: 'error',
        message: 'Errore durante la verifica utente nel database',
        code: 'DB_LOOKUP_ERROR'
      });
      return;
    }

    // Aggiungi l'utente all'oggetto request
    (req as RequestWithUser).user = userInfo;

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
  return (req: RequestWithUser, res: Response, next: NextFunction): void => {
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
export const requireCompany = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      status: 'error',
      message: 'Autenticazione richiesta',
      code: 'AUTHENTICATION_REQUIRED'
    });
    return;
  }

  const companyId = (req.params?.companyId as string | undefined) || (req.body as Record<string, unknown>)?.['companyId'] as string | undefined;
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

const authMiddleware = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireCompany,
};

export default authMiddleware;