#!/usr/bin/env ts-node

import { db } from '../../config/db';
import Migration001CreateGlobalTables from './001-create-global-tables';
import Migration002RebuildCommesse from './002-rebuild-commesse';
import Migration003ForceRebuildCommesse from './003-force-rebuild-commesse';

/**
 * Sistema di migrazioni per MioSaaS
 */
class MigrationRunner {
  private migrations = [
    Migration001CreateGlobalTables,
    Migration002RebuildCommesse,
    Migration003ForceRebuildCommesse
  ];

  /**
   * Esegue tutte le migrazioni pendenti
   */
  async up(): Promise<void> {
    console.log('🚀 Avvio migrazioni database...');
    
    try {
      for (const Migration of this.migrations) {
        const isApplied = await Migration.isApplied();
        
        if (!isApplied) {
          console.log(`📦 Applicando migrazione: ${Migration.name}`);
          await Migration.up();
        } else {
          console.log(`✅ Migrazione già applicata: ${Migration.name}`);
        }
      }
      
      console.log('🎉 Tutte le migrazioni completate!');
      
    } catch (error) {
      console.error('💥 Errore durante le migrazioni:', error);
      throw error;
    }
  }

  /**
   * Rollback dell'ultima migrazione
   */
  async down(): Promise<void> {
    console.log('⏪ Rollback ultima migrazione...');
    
    try {
      // Trova l'ultima migrazione applicata
      const lastMigration = this.migrations[this.migrations.length - 1];
      
      if (await lastMigration.isApplied()) {
        await lastMigration.down();
        console.log('✅ Rollback completato');
      } else {
        console.log('ℹ️ Nessuna migrazione da rollback');
      }
      
    } catch (error) {
      console.error('💥 Errore durante rollback:', error);
      throw error;
    }
  }

  /**
   * Mostra lo status delle migrazioni
   */
  async status(): Promise<void> {
    console.log('📊 Status migrazioni:\n');
    
    try {
      for (const Migration of this.migrations) {
        const isApplied = await Migration.isApplied();
        const status = isApplied ? '✅ APPLICATA' : '⏳ PENDENTE';
        console.log(`${status} - ${Migration.name}`);
      }
      
    } catch (error) {
      console.error('💥 Errore nel controllo status:', error);
      throw error;
    }
  }

  /**
   * Crea tabelle per un nuovo tenant
   */
  async createTenantTables(companyId: string): Promise<void> {
    console.log(`🏢 Creazione tabelle per tenant: ${companyId}`);
    
    try {
      const { SQL_TEMPLATES } = await import('../../config/db');
      
      // Crea tabelle tenant
      const documentsTable = `documents_${companyId}`;
      const reportsTable = `reports_${companyId}`;
      const rapportiniTable = `rapportini_${companyId}`;
      
      await db.query(SQL_TEMPLATES.DOCUMENTS_TABLE(documentsTable));
      await db.query(SQL_TEMPLATES.REPORTS_TABLE(reportsTable));
      await db.query(SQL_TEMPLATES.RAPPORTINI_TABLE(rapportiniTable));
      
      console.log(`✅ Tabelle tenant ${companyId} create con successo`);
      
    } catch (error) {
      console.error(`💥 Errore nella creazione tabelle tenant ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Health check del database
   */
  async healthCheck(): Promise<void> {
    try {
      const health = await db.healthCheck();
      
      console.log('🏥 Database Health Check:');
      console.log(`Status: ${health.status}`);
      
      if (health.status === 'healthy') {
        console.log(`✅ Database connesso e funzionante`);
        console.log(`📊 Response time: ${health.details.responseTime}`);
        console.log(`🔗 Connessioni attive: ${health.details.activeConnections}`);
      } else {
        console.log('❌ Database non raggiungibile');
        console.log(`Errore: ${health.details.error}`);
      }
      
    } catch (error) {
      console.error('💥 Errore durante health check:', error);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const runner = new MigrationRunner();

  try {
    switch (command) {
      case 'up':
        await runner.up();
        break;
        
      case 'down':
        await runner.down();
        break;
        
      case 'status':
        await runner.status();
        break;
        
      case 'health':
        await runner.healthCheck();
        break;
        
      case 'create-tenant':
        const companyId = process.argv[3];
        if (!companyId) {
          console.error('❌ Fornisci un company ID: npm run migrate create-tenant COMPANY_ID');
          process.exit(1);
        }
        await runner.createTenantTables(companyId);
        break;
        
      default:
        console.log(`
🗄️  MioSaaS Database Migrations

Comandi disponibili:
  up              - Applica tutte le migrazioni pendenti
  down            - Rollback ultima migrazione
  status          - Mostra status delle migrazioni
  health          - Health check del database
  create-tenant   - Crea tabelle per nuovo tenant
  
Esempi:
  npm run migrate up
  npm run migrate status
  npm run migrate create-tenant company123
        `);
    }
    
  } catch (error) {
    console.error('💥 Comando fallito:', error);
    process.exit(1);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
  main();
}

export default MigrationRunner;