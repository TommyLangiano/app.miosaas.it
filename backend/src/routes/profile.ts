import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { GlobalUsersService } from '../services/global-database.service';
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';

const router = Router();

// Config Cognito (in produzione spostare in config centralizzata)
const COGNITO_CONFIG = {
  userPoolId: 'eu-north-1_MVwkbI87K',
  clientId: '18b21rcmp9f1sl3q7v0pcrircf',
  region: 'eu-north-1'
};
const cognitoClient = new CognitoIdentityProviderClient({ region: COGNITO_CONFIG.region });

// GET /api/profile/me → dati ufficiali utente loggato
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (user.dbUserId) {
      const dbUser = await GlobalUsersService.getById(user.dbUserId);
      if (dbUser) {
        res.json({
          status: 'success',
          data: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            surname: dbUser.surname,
            phone: dbUser.phone,
            status: dbUser.status,
            avatar_url: dbUser.avatar_url,
            last_login: dbUser.last_login
          }
        });
        return;
      }
    }
    // Fallback se utente non esiste nel DB: dati minimi dal token
    res.json({
      status: 'success',
      data: {
        id: null,
        email: user.email,
        name: user.name || user.given_name,
        surname: user.surname || user.family_name || null,
        phone: null,
        status: 'unknown',
        avatar_url: null,
        last_login: null
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Errore interno' });
  }
});

// PUT /api/profile/me → aggiorna profilo utente loggato
router.put('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.dbUserId) {
      res.status(400).json({ status: 'error', message: 'Utente non presente nel database' });
      return;
    }
    const { name, surname, email, phone, avatar_url } = req.body || {};

    // Conserva l'email corrente per usarla come Username su Cognito (se diverso dall'email nuova)
    const currentDb = await GlobalUsersService.getById(user.dbUserId);
    const oldEmail = currentDb?.email || user.email;
    const cognitoUsername = (user as any).cognitoUsername || oldEmail;

    // 1) Aggiorna DB
    const updated = await GlobalUsersService.updateProfile(user.dbUserId, { name, surname, email, phone, avatar_url });

    // 2) Aggiorna Cognito (best-effort)
    let cognitoUpdate = { success: true, message: 'Cognito aggiornato' } as { success: boolean; message: string };
    try {
      const attrs = [] as { Name: string; Value: string }[];
      if (name) attrs.push({ Name: 'given_name', Value: String(name) });
      if (surname) attrs.push({ Name: 'family_name', Value: String(surname) });
      if (email && email !== oldEmail) {
        attrs.push({ Name: 'email', Value: String(email) });
        attrs.push({ Name: 'email_verified', Value: 'false' });
      }
      // NB: phone_number su Cognito richiede formato E.164 (+39...), evitiamo se non validato

      if (attrs.length > 0) {
        const cmd = new AdminUpdateUserAttributesCommand({
          UserPoolId: COGNITO_CONFIG.userPoolId,
          Username: cognitoUsername, // username immutabile di Cognito
          UserAttributes: attrs
        });
        await cognitoClient.send(cmd);
      }
    } catch (e: any) {
      cognitoUpdate = { success: false, message: e?.message || 'Errore aggiornamento Cognito' };
    }

    res.json({ status: 'success', data: updated, cognito: cognitoUpdate });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Aggiornamento profilo fallito' });
  }
});

export default router;


