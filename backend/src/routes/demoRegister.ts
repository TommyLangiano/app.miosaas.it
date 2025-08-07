import { Router, Request, Response } from 'express';
import { CompaniesService, GlobalUsersService, PlansService, RolesService } from '../services/global-database.service';
import { createTenantTables, deleteCompanyAndResources, cleanupOrphanedTenantTables } from '../services/tenantTables';

const router = Router();

interface DemoRegisterRequest {
  name: string;
  surname: string;
  company_name: string;
  company_slug: string;
}

interface DemoRegisterResponse {
  success: boolean;
  message?: string;
  company_id?: string;
  user_id?: string;
  data?: {
    user_id: string;
    company_id: string;
    tables_created: string[];
  };
  error?: string;
}

/**
 * POST /api/demo/register
 * Registra un nuovo utente e la sua azienda (DEMO - senza autenticazione)
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, surname, company_name, company_slug }: DemoRegisterRequest = req.body;

    // Validazione input
    if (!name || !surname || !company_name || !company_slug) {
      res.status(400).json({
        success: false,
        error: 'Tutti i campi sono obbligatori'
      } as DemoRegisterResponse);
      return;
    }

    // 1. Valida che company_slug abbia solo lettere/numeri/underscore
    const slugPattern = /^[a-zA-Z0-9_]+$/;
    if (!slugPattern.test(company_slug)) {
      res.status(400).json({
        success: false,
        error: 'Lo slug può contenere solo lettere, numeri e underscore'
      } as DemoRegisterResponse);
      return;
    }

    // DEMO: Genera dati mock per simulare l'utente Cognito
    const timestamp = Date.now();
    const cognitoSub = `demo_user_${timestamp}`;
    const cognitoEmail = `demo+${timestamp}@example.com`;

    console.log(`🚀 Inizio registrazione DEMO per ${cognitoEmail} (${cognitoSub})`);

    // Verifica se l'utente esiste già (improbabile per demo)
    const existingUser = await GlobalUsersService.getByCognitoSub(cognitoSub);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Demo ID già utilizzato (riprova)'
      } as DemoRegisterResponse);
      return;
    }

    // 2. Controlla che non esista già in companies
    const existingCompany = await CompaniesService.getBySlug(company_slug);
    if (existingCompany) {
      res.status(409).json({
        success: false,
        error: 'Slug aziendale già in uso. Scegli un altro slug.'
      } as DemoRegisterResponse);
      return;
    }

    // 3. Recupera plan_id dal piano con slug "base"
    const basePlan = await PlansService.getBySlug('base');
    if (!basePlan) {
      res.status(500).json({
        success: false,
        error: 'Piano base non configurato nel sistema'
      } as DemoRegisterResponse);
      return;
    }

    // 5. Recupera role_id da roles con name "company_owner"
    const ownerRole = await RolesService.getByName('company_owner');
    if (!ownerRole) {
      res.status(500).json({
        success: false,
        error: 'Ruolo company_owner non configurato nel sistema'
      } as DemoRegisterResponse);
      return;
    }

    // 4. Crea una nuova company
    console.log(`📊 Creazione azienda: ${company_name} (${company_slug})`);
    const newCompany = await CompaniesService.create({
      name: company_name,
      slug: company_slug,
      email: cognitoEmail,
      plan_id: basePlan.id,
      company_size: 'sm',
      industry: 'dm',
      country: 'IT'
    });

    // 6. Crea l'utente con ruolo "company_owner" e sub da cognito
    console.log(`👤 Creazione utente: ${name} ${surname} con ruolo company_owner`);
    const newUser = await GlobalUsersService.create({
      email: cognitoEmail,
      name,
      surname,
      cognito_sub: cognitoSub,
      company_id: newCompany.id,
      role_id: ownerRole.id
    });

    // 7. Verifica che le tabelle condivise esistano (nuova architettura)
    console.log(`✅ Verifica tabelle condivise per azienda ${company_name}`);
    const tablesCreated = await createTenantTables(newCompany.id);

    // Aggiorna il timestamp di ultimo accesso
    await GlobalUsersService.updateLastLogin(cognitoSub);

    // 8. Risponde con success: true + company_id, user_id
    const response: DemoRegisterResponse = {
      success: true,
      company_id: newCompany.id,
      user_id: newUser.id,
      message: `Registrazione completata! Azienda "${company_name}" creata. Dati saranno isolati in tabelle condivise.`,
      data: {
        user_id: newUser.id,
        company_id: newCompany.id,
        tables_created: tablesCreated
      }
    };

    console.log(`✅ Registrazione DEMO completata per ${cognitoEmail}`);
    res.status(201).json(response);

  } catch (error) {
    console.error('❌ Errore durante la registrazione DEMO:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Errore interno del server'
    } as DemoRegisterResponse);
  }
});

/**
 * DELETE /api/demo/company/:companyId
 * Elimina un'azienda demo e tutte le sue risorse
 */
router.delete('/company/:companyId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      res.status(400).json({
        success: false,
        error: 'Company ID è richiesto'
      });
      return;
    }

    console.log(`🗑️ Richiesta eliminazione azienda demo: ${companyId}`);

    const result = await deleteCompanyAndResources(companyId);

    console.log(`✅ Eliminazione azienda demo completata: ${result.companySlug}`);
    
    res.status(200).json({
      success: true,
      message: `Azienda "${result.companySlug}" eliminata con successo`,
      details: {
        companyDeleted: result.companyDeleted,
        usersDeleted: result.usersDeleted,
        tablesDeleted: result.tablesDeleted.length,
        tableNames: result.tablesDeleted
      }
    });

  } catch (error) {
    console.error('❌ Errore durante l\'eliminazione azienda demo:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Errore interno del server'
    });
  }
});

/**
 * POST /api/demo/cleanup
 * Pulisce tutte le tabelle tenant orfane
 */
router.post('/cleanup', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`🧹 Richiesta pulizia tabelle orfane`);

    const deletedTables = await cleanupOrphanedTenantTables();

    console.log(`✅ Pulizia tabelle orfane completata`);
    
    res.status(200).json({
      success: true,
      message: `Pulizia completata: ${deletedTables.length} tabelle orfane eliminate`,
      details: {
        tablesDeleted: deletedTables.length,
        tableNames: deletedTables
      }
    });

  } catch (error) {
    console.error('❌ Errore durante la pulizia tabelle orfane:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Errore interno del server'
    });
  }
});

export default router;