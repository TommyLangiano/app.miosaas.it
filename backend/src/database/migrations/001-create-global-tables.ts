import { db } from '../../config/db';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Migrazione 001: Creazione tabelle globali
 * - plans
 * - companies  
 * - users
 * - roles
 */
export class Migration001CreateGlobalTables {
  
  static async up(): Promise<void> {
    console.log('🔄 Esecuzione migrazione 001: Creazione tabelle globali...');
    
    try {
      // Leggi e esegui lo script SQL delle tabelle globali
      const sqlPath = join(__dirname, '../schemas/global-tables.sql');
      const sql = readFileSync(sqlPath, 'utf8');
      
      await db.query(sql);
      
      console.log('✅ Migrazione 001 completata con successo');
      
      // Registra la migrazione nella tabella migrations
      await this.recordMigration();
      
    } catch (error) {
      console.error('❌ Errore durante migrazione 001:', error);
      throw error;
    }
  }
  
  static async down(): Promise<void> {
    console.log('🔄 Rollback migrazione 001: Rimozione tabelle globali...');
    
    try {
      // Rimuovi le tabelle in ordine inverso di dipendenza
      await db.query('DROP TABLE IF EXISTS users CASCADE;');
      await db.query('DROP TABLE IF EXISTS companies CASCADE;');
      await db.query('DROP TABLE IF EXISTS plans CASCADE;');
      await db.query('DROP TABLE IF EXISTS roles CASCADE;');
      
      // Rimuovi viste
      await db.query('DROP VIEW IF EXISTS company_details CASCADE;');
      await db.query('DROP VIEW IF EXISTS company_user_stats CASCADE;');
      
      // Rimuovi funzioni
      await db.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;');
      
      console.log('✅ Rollback migrazione 001 completato');
      
      // Rimuovi record dalla tabella migrations
      await this.removeMigrationRecord();
      
    } catch (error) {
      console.error('❌ Errore durante rollback migrazione 001:', error);
      throw error;
    }
  }
  
  static async isApplied(): Promise<boolean> {
    try {
      // Verifica se la tabella users esiste
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      return result.rows[0].exists;
    } catch (error) {
      return false;
    }
  }
  
  private static async recordMigration(): Promise<void> {
    try {
      // Crea tabella migrations se non esiste
      await db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Registra questa migrazione
      await db.query(`
        INSERT INTO migrations (name) 
        VALUES ('001-create-global-tables')
        ON CONFLICT (name) DO NOTHING;
      `);
      
    } catch (error) {
      console.error('Errore nella registrazione migrazione:', error);
    }
  }
  
  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`
        DELETE FROM migrations 
        WHERE name = '001-create-global-tables';
      `);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione:', error);
    }
  }
}

export default Migration001CreateGlobalTables;