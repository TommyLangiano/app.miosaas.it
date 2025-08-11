import { db } from '../../config/db';

/**
 * Migrazione 007: Aggiunge colonna provincia (2 lettere) alla tabella commesse
 */
export class Migration007ExtendCommesseProvincia {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 007: Aggiunta colonna provincia alle commesse...');
    try {
      await db.query('BEGIN');
      await db.query(`
        ALTER TABLE commesse
          ADD COLUMN IF NOT EXISTS provincia VARCHAR(2);
      `);
      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 007 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 007:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 007: rimozione colonna provincia...');
    try {
      await db.query('BEGIN');
      await db.query(`
        ALTER TABLE commesse
          DROP COLUMN IF EXISTS provincia;
      `);
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback migrazione 007 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 007:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'provincia'
        ) AS exists;
      `);
      return !!result.rows[0]?.exists;
    } catch {
      return false;
    }
  }

  private static async recordMigration(): Promise<void> {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.query(`
        INSERT INTO migrations (name)
        VALUES ('007-extend-commesse-provincia')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 007:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`
        DELETE FROM migrations WHERE name = '007-extend-commesse-provincia';
      `);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 007:', error);
    }
  }
}

export default Migration007ExtendCommesseProvincia;


