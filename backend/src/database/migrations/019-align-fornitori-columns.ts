import { db } from '../../config/db';

export class Migration019AlignFornitoriColumns {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 019: Allineamento colonne fornitori (PF/PG, tipologia, ATECO, REA)...');
    try {
      await db.query('BEGIN');

      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fornitori' AND column_name='forma_giuridica') THEN
            ALTER TABLE fornitori ADD COLUMN forma_giuridica VARCHAR(2);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fornitori' AND column_name='nome') THEN
            ALTER TABLE fornitori ADD COLUMN nome VARCHAR(100);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fornitori' AND column_name='cognome') THEN
            ALTER TABLE fornitori ADD COLUMN cognome VARCHAR(100);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fornitori' AND column_name='forma_giuridica_dettaglio') THEN
            ALTER TABLE fornitori ADD COLUMN forma_giuridica_dettaglio VARCHAR(100);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fornitori' AND column_name='tipologia') THEN
            ALTER TABLE fornitori ADD COLUMN tipologia VARCHAR(100);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fornitori' AND column_name='ateco') THEN
            ALTER TABLE fornitori ADD COLUMN ateco VARCHAR(16);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fornitori' AND column_name='rea') THEN
            ALTER TABLE fornitori ADD COLUMN rea VARCHAR(32);
          END IF;
        END $$;
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 019 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 019:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 019: nessuna rimozione automatica (non distruttivo)');
    try {
      await db.query('BEGIN');
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback 019 registrato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 019:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns WHERE table_name='fornitori' AND column_name='tipologia'
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
        VALUES ('019-align-fornitori-columns')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 019:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`DELETE FROM migrations WHERE name = '019-align-fornitori-columns';`);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 019:', error);
    }
  }
}

export default Migration019AlignFornitoriColumns;


