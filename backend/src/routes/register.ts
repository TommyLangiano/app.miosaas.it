import { Router, Request, Response } from 'express';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, MessageActionType } from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import { CompaniesService, GlobalUsersService, PlansService, RolesService } from '../services/global-database.service';
import { createTenantTables } from '../services/tenantTables';

const router = Router();

// Configurazione AWS Cognito (dalla configurazione esistente)
const COGNITO_CONFIG = {
  userPoolId: 'eu-north-1_MVwkbI87K',
  clientId: '18b21rcmp9f1sl3q7v0pcrircf',
  region: 'eu-north-1'
};

// Cliente AWS Cognito
const cognitoClient = new CognitoIdentityProviderClient({ 
  region: COGNITO_CONFIG.region 
});

// Interfacce TypeScript
interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  surname: string;
  company_name: string;
  company_size?: 'small' | 'medium' | 'large';
  country?: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  company_id?: string;
  user_id?: string;
  error?: string;
}

/**
 * POST /api/register
 * Registrazione completa: Cognito + Database
 * 
 * Flusso:
 * 1. Valida input
 * 2. Genera slug aziendale
 * 3. Crea utente in AWS Cognito
 * 4. Solo se Cognito OK: crea azienda e utente nel DB
 * 5. Configurazione tabelle tenant
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      email, 
      password, 
      name, 
      surname, 
      company_name, 
      company_size = 'medium', 
      country = 'IT' 
    }: RegisterRequest = req.body;

    console.log(`🚀 Inizio registrazione COMPLETA per ${email}`);

    // ===== 1. VALIDAZIONE INPUT =====
    if (!email || !password || !name || !surname || !company_name) {
      res.status(400).json({
        success: false,
        error: 'Tutti i campi sono obbligatori: email, password, name, surname, company_name'
      } as RegisterResponse);
      return;
    }

    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Email non valida'
      } as RegisterResponse);
      return;
    }

    // Validazione password
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'La password deve essere di almeno 8 caratteri'
      } as RegisterResponse);
      return;
    }

    // ===== 2. GENERAZIONE DATI =====
    const companySlug = slugify(company_name, {
      lower: true,
      strict: true,
      replacement: '-'
    }).substring(0, 50); // Limita lunghezza slug

    const timezone = 'Europe/Rome';
    const locale = 'it-IT';

    console.log(`📊 Dati generati: slug=${companySlug}, timezone=${timezone}`);

    // Verifica che lo slug non esista già
    const existingCompany = await CompaniesService.getBySlug(companySlug);
    if (existingCompany) {
      res.status(409).json({
        success: false,
        error: `Nome azienda già in uso: "${company_name}". Prova con un nome diverso.`
      } as RegisterResponse);
      return;
    }

    // ===== 3. CREAZIONE UTENTE IN AWS COGNITO =====
    console.log(`🔐 Creazione utente Cognito: ${email}`);
    
    let cognitoSub: string;
    
    try {
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        Username: email,
        UserAttributes: [
          {
            Name: 'email',
            Value: email
          },
          {
            Name: 'email_verified',
            Value: 'false'
          },
          {
            Name: 'given_name',
            Value: name
          },
          {
            Name: 'family_name',
            Value: surname
          }
          // Attributi custom rimossi temporaneamente per test
          // {
          //   Name: 'custom:company_slug',
          //   Value: companySlug
          // },
          // {
          //   Name: 'custom:role',
          //   Value: 'owner'
          // }
        ],
        TemporaryPassword: password,
        // MessageAction: MessageActionType.SUPPRESS, // Rimosso per test
        ForceAliasCreation: false
      });

      const cognitoResponse = await cognitoClient.send(createUserCommand);
      
      if (!cognitoResponse.User?.Username) {
        throw new Error('Cognito non ha restituito un username valido');
      }

      const cognitoSubAttribute = cognitoResponse.User.Attributes?.find(attr => attr.Name === 'sub')?.Value;
      if (!cognitoSubAttribute) {
        throw new Error('Cognito non ha restituito un sub valido');
      }
      cognitoSub = cognitoSubAttribute;

      console.log(`✅ Utente Cognito creato: ${cognitoResponse.User.Username} (sub: ${cognitoSub})`);

    } catch (cognitoError: any) {
      console.error('❌ Errore creazione Cognito:', cognitoError);
      
      // Gestione errori specifici Cognito
      if (cognitoError.name === 'UsernameExistsException') {
        res.status(409).json({
          success: false,
          error: 'Email già registrata. Prova ad accedere o usa un\'altra email.'
        } as RegisterResponse);
        return;
      }

      if (cognitoError.name === 'InvalidPasswordException') {
        res.status(400).json({
          success: false,
          error: 'Password non valida. Deve contenere almeno 8 caratteri con maiuscole, minuscole, numeri e simboli.'
        } as RegisterResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Errore durante la creazione dell\'account. Riprova più tardi.'
      } as RegisterResponse);
      return;
    }

    // ===== 4. CREAZIONE NEL DATABASE (SOLO SE COGNITO OK) =====
    console.log(`🗂️ Cognito OK, creazione dati nel database per ${email}`);

    try {
      // Recupera piano "base"
      const basePlan = await PlansService.getBySlug('base');
      if (!basePlan) {
        throw new Error('Piano base non configurato nel sistema');
      }

      // Recupera ruolo "company_owner"
      const ownerRole = await RolesService.getByName('company_owner');
      if (!ownerRole) {
        throw new Error('Ruolo company_owner non configurato nel sistema');
      }

      // Crea azienda nel DB
      console.log(`🏢 Creazione azienda: ${company_name} (${companySlug})`);
      const newCompany = await CompaniesService.create({
        name: company_name,
        slug: companySlug,
        email: email,
        plan_id: basePlan.id,
        company_size: company_size === 'small' ? 'sm' : company_size === 'large' ? 'lg' : 'md',
        industry: 'general', // Default
        country: country
      });

      // Crea utente nel DB
      console.log(`👤 Creazione utente: ${name} ${surname} con ruolo company_owner`);
      const newUser = await GlobalUsersService.create({
        email: email,
        name: name,
        surname: surname,
        cognito_sub: cognitoSub,
        company_id: newCompany.id,
        role_id: ownerRole.id
      });

      // Verifica tabelle tenant (nuova architettura condivisa)
      console.log(`✅ Verifica tabelle condivise per azienda ${company_name}`);
      const tablesVerified = await createTenantTables(newCompany.id);

      // ===== 5. RISPOSTA DI SUCCESSO =====
      const response: RegisterResponse = {
        success: true,
        message: 'Registrazione completata! Controlla l\'email per confermare l\'account.',
        company_id: newCompany.id,
        user_id: newUser.id
      };

      console.log(`🎉 Registrazione COMPLETA per ${email} - Azienda: ${company_name}`);
      console.log(`📊 Dati creati: Company ID=${newCompany.id}, User ID=${newUser.id}`);
      console.log(`🔒 Tabelle verificate: ${tablesVerified.join(', ')}`);

      res.status(201).json(response);

    } catch (dbError: any) {
      console.error('❌ Errore database dopo creazione Cognito:', dbError);
      
      // ROLLBACK: Elimina utente da Cognito se creazione DB fallisce
      try {
        console.log('🔄 Tentativo rollback utente Cognito...');
        // Nota: In produzione potresti voler implementare un sistema di rollback più sofisticato
        // Per ora logghiamo l'errore e restituiamo errore generico
      } catch (rollbackError) {
        console.error('❌ Errore durante rollback Cognito:', rollbackError);
      }

      res.status(500).json({
        success: false,
        error: 'Errore durante la finalizzazione della registrazione. Contatta il supporto.'
      } as RegisterResponse);
      return;
    }

  } catch (error: any) {
    console.error('❌ Errore generale durante registrazione:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server. Riprova più tardi.'
    } as RegisterResponse);
  }
});

export default router;