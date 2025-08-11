import { db } from '../../config/db';

export class Migration012AddStatoUscita {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 012: Aggiunta colonna stato_uscita a uscite...');
    try {
      await db.query('BEGIN');

      // Aggiungi colonna se non esiste
      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'uscite' AND column_name = 'stato_uscita'
          ) THEN
            ALTER TABLE uscite ADD COLUMN stato_uscita VARCHAR(20);
          END IF;
        END $$;
      `);

      // Imposta default e normalizza valori esistenti
      await db.query(`
        ALTER TABLE uscite DROP CONSTRAINT IF EXISTS uscite_stato_check;
        ALTER TABLE uscite ALTER COLUMN stato_uscita SET DEFAULT 'No Pagato';
        UPDATE uscite SET stato_uscita = 'No Pagato' WHERE stato_uscita IS NULL;
        ALTER TABLE uscite ADD CONSTRAINT uscite_stato_check CHECK (stato_uscita IN ('No Pagato', 'Pagato'));
        ALTER TABLE uscite ALTER COLUMN stato_uscita SET NOT NULL;
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 012 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 012:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 012: rimozione colonna stato_uscita...');
    try {
      await db.query('BEGIN');
      await db.query(`
        ALTER TABLE uscite DROP CONSTRAINT IF EXISTS uscite_stato_check;
        ALTER TABLE uscite DROP COLUMN IF EXISTS stato_uscita;
      `);
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback 012 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 012:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'uscite' AND column_name = 'stato_uscita'
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
        VALUES ('012-add-stato-uscita')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 012:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`DELETE FROM migrations WHERE name = '012-add-stato-uscita';`);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 012:', error);
    }
  }
}

export default Migration012AddStatoUscita;


