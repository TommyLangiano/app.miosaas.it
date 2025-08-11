import { db } from '../../config/db';

/**
 * Migrazione 008: Rende obbligatoria la colonna provincia e applica vincolo formato (2 lettere maiuscole)
 */
export class Migration008CommesseProvinciaNotNullCheck {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 008: provincia NOT NULL + CHECK (A-Z{2})...');
    try {
      await db.query('BEGIN');

      // Normalizza valori esistenti: uppercase e 2 caratteri
      await db.query(`
        UPDATE commesse
        SET provincia = UPPER(SUBSTRING(TRIM(provincia) FROM 1 FOR 2))
        WHERE provincia IS NOT NULL AND provincia <> '';
      `);

      // Sostituisci null/vuoti con placeholder 'XX'
      await db.query(`
        UPDATE commesse
        SET provincia = 'XX'
        WHERE provincia IS NULL OR provincia = '';
      `);

      // Aggiungi CHECK se non esiste già
      const checkExists = await db.query(`
        SELECT 1 FROM pg_constraint WHERE conname = 'commesse_provincia_format_check'
      `);
      if (checkExists.rowCount === 0) {
        await db.query(`
          ALTER TABLE commesse
          ADD CONSTRAINT commesse_provincia_format_check CHECK (provincia ~ '^[A-Z]{2}$')
        `);
      }

      // Imposta NOT NULL
      await db.query(`
        ALTER TABLE commesse
        ALTER COLUMN provincia SET NOT NULL;
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 008 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 008:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 008: rimozione NOT NULL + CHECK su provincia...');
    try {
      await db.query('BEGIN');

      // Rimuovi NOT NULL
      await db.query(`
        ALTER TABLE commesse
        ALTER COLUMN provincia DROP NOT NULL;
      `);

      // Rimuovi CHECK se esiste
      const checkExists = await db.query(`
        SELECT 1 FROM pg_constraint WHERE conname = 'commesse_provincia_format_check'
      `);
      if (checkExists.rowCount && checkExists.rowCount > 0) {
        await db.query(`
          ALTER TABLE commesse
          DROP CONSTRAINT commesse_provincia_format_check;
        `);
      }

      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback migrazione 008 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 008:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const notNull = await db.query(`
        SELECT is_nullable FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'provincia'
      `);
      const isNotNull = (notNull.rows?.[0]?.is_nullable || 'YES') === 'NO';
      return !!isNotNull;
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
        VALUES ('008-commesse-provincia-not-null-check')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 008:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`
        DELETE FROM migrations WHERE name = '008-commesse-provincia-not-null-check';
      `);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 008:', error);
    }
  }
}

export default Migration008CommesseProvinciaNotNullCheck;


