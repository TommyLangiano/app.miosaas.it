import { db } from '../../config/db';

/**
 * Migrazione 004: Estende tabella commesse con nuovi campi funzionali
 * - codice, nome, localita, data_fine_prevista, cig, cup
 */
export class Migration004ExtendCommesseNewFields {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 004: Aggiunta campi a commesse...');
    try {
      await db.query('BEGIN');

      await db.query(`
        ALTER TABLE commesse
          ADD COLUMN IF NOT EXISTS codice VARCHAR(50),
          ADD COLUMN IF NOT EXISTS nome VARCHAR(255),
          ADD COLUMN IF NOT EXISTS localita VARCHAR(255),
          ADD COLUMN IF NOT EXISTS data_fine_prevista DATE,
          ADD COLUMN IF NOT EXISTS cig VARCHAR(50),
          ADD COLUMN IF NOT EXISTS cup VARCHAR(50);
      `);

      // Indici utili
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_commesse_codice ON commesse(codice);
        CREATE INDEX IF NOT EXISTS idx_commesse_nome ON commesse(nome);
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 004 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 004:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 004: Rimozione nuovi campi da commesse...');
    try {
      await db.query('BEGIN');
      await db.query(`
        ALTER TABLE commesse
          DROP COLUMN IF EXISTS codice,
          DROP COLUMN IF EXISTS nome,
          DROP COLUMN IF EXISTS localita,
          DROP COLUMN IF EXISTS data_fine_prevista,
          DROP COLUMN IF EXISTS cig,
          DROP COLUMN IF EXISTS cup;
      `);
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback migrazione 004 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 004:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'codice'
        ) as exists;
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
        VALUES ('004-extend-commesse-new-fields')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 004:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`
        DELETE FROM migrations WHERE name = '004-extend-commesse-new-fields';
      `);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 004:', error);
    }
  }
}

export default Migration004ExtendCommesseNewFields;


