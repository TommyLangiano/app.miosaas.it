import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { CompaniesService, GlobalUsersService, PlansService, RolesService } from '../services/global-database.service';
import { createTenantTables } from '../services/tenantTables';

const router = Router();

interface CompanyRegistrationRequest {
  company_name: string;
  company_email: string;
  company_slug: string;
  admin_email: string;
  admin_name: string;
  admin_surname: string;
  cognito_sub: string;
  plan_slug: string;
}

interface CompanyRegistrationResponse {
  success: boolean;
  message?: string;
  company_id?: string;
  user_id?: string;
  data?: {
    user_id: string;
    company_id: string;
    tables_created: string[];
    plan_name: string;
    company_slug: string;
  };
  error?: string;
}

/**
 * POST /api/register-company
 * Registra una nuova azienda (PRODUCTION - con autenticazione Cognito)
 */
router.post('/register-company', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      company_name, 
      company_email, 
      company_slug, 
      admin_email, 
      admin_name, 
      admin_surname, 
      cognito_sub, 
      plan_slug 
    }: CompanyRegistrationRequest = req.body;

    // Validazione input obbligatori
    if (!company_name || !company_email || !company_slug || !admin_email || !admin_name || !admin_surname || !cognito_sub || !plan_slug) {
      res.status(400).json({
        success: false,
        error: 'Tutti i campi sono obbligatori: company_name, company_email, company_slug, admin_email, admin_name, admin_surname, cognito_sub, plan_slug'
      } as CompanyRegistrationResponse);
      return;
    }

    // Verifica che l'utente autenticato corrisponda al cognito_sub
    if (req.user?.sub !== cognito_sub) {
      res.status(403).json({
        success: false,
        error: 'Il cognito_sub deve corrispondere all\'utente autenticato'
      } as CompanyRegistrationResponse);
      return;
    }

    console.log(`🚀 Inizio registrazione AZIENDA per ${admin_email} (${cognito_sub})`);

    // 1. Valida che company_slug abbia solo lettere/numeri/underscore
    const slugPattern = /^[a-zA-Z0-9_]+$/;
    if (!slugPattern.test(company_slug)) {
      res.status(400).json({
        success: false,
        error: 'Lo slug aziendale può contenere solo lettere, numeri e underscore'
      } as CompanyRegistrationResponse);
      return;
    }

    // Validazione email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(company_email) || !emailPattern.test(admin_email)) {
      res.status(400).json({
        success: false,
        error: 'Formato email non valido'
      } as CompanyRegistrationResponse);
      return;
    }

    // 2. Verifica se l'utente ha già un'azienda
    const existingUser = await GlobalUsersService.getByCognitoSub(cognito_sub);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'L\'utente è già associato a un\'azienda esistente'
      } as CompanyRegistrationResponse);
      return;
    }

    // 3. Controlla che lo slug aziendale non sia già in uso
    const existingCompany = await CompaniesService.getBySlug(company_slug);
    if (existingCompany) {
      res.status(409).json({
        success: false,
        error: 'Slug aziendale già in uso. Scegli un altro slug.'
      } as CompanyRegistrationResponse);
      return;
    }

    // 4. Cerca il piano tramite plan_slug
    const selectedPlan = await PlansService.getBySlug(plan_slug);
    if (!selectedPlan) {
      res.status(400).json({
        success: false,
        error: `Piano "${plan_slug}" non trovato nel sistema`
      } as CompanyRegistrationResponse);
      return;
    }

    console.log(`📋 Piano selezionato: ${selectedPlan.name} (${plan_slug})`);

    // 5. Recupera role_id da roles con name "company_owner"
    const ownerRole = await RolesService.getByName('company_owner');
    if (!ownerRole) {
      res.status(500).json({
        success: false,
        error: 'Ruolo company_owner non configurato nel sistema'
      } as CompanyRegistrationResponse);
      return;
    }

    // 6. Crea il record company
    console.log(`🏢 Creazione azienda: ${company_name} (${company_slug})`);
    const newCompany = await CompaniesService.create({
      name: company_name,
      slug: company_slug,
      email: company_email,
      plan_id: selectedPlan.id,
      company_size: 'sm', // Valori di default, potrebbero essere parametrizzati
      industry: 'tc',     // tech/general
      country: 'IT'
    });

    // 7. Crea l'utente admin con ruolo "company_owner"
    console.log(`👤 Creazione utente admin: ${admin_name} ${admin_surname} con ruolo company_owner`);
    const newUser = await GlobalUsersService.create({
      email: admin_email,
      name: admin_name,
      surname: admin_surname,
      cognito_sub,
      company_id: newCompany.id,
      role_id: ownerRole.id
    });

    // 8. Chiama la funzione createTenantTables(company_id) per generare tabelle tenant
    console.log(`🏗️ Creazione tabelle tenant per company ID: ${newCompany.id}`);
    const tablesCreated = await createTenantTables(newCompany.id);

    // 9. Aggiorna il timestamp di ultimo accesso
    await GlobalUsersService.updateLastLogin(cognito_sub);

    // 10. Risposta di successo
    const response: CompanyRegistrationResponse = {
      success: true,
      company_id: newCompany.id,
      user_id: newUser.id,
      message: `Azienda "${company_name}" registrata con successo! Piano "${selectedPlan.name}" attivato con ${tablesCreated.length} tabelle business.`,
      data: {
        user_id: newUser.id,
        company_id: newCompany.id,
        tables_created: tablesCreated,
        plan_name: selectedPlan.name,
        company_slug: company_slug
      }
    };

    console.log(`✅ Registrazione AZIENDA completata per ${admin_email}`);
    res.status(201).json(response);

  } catch (error) {
    console.error('❌ Errore durante la registrazione AZIENDA:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Errore interno del server'
    } as CompanyRegistrationResponse);
  }
});

export default router;