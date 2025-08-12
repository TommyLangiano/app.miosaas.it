import { db } from '../../config/db';

export class Migration018AddAliquotaIvaPredefinita {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 018: Aggiunta aliquota_iva_predefinita a clienti e fornitori...');
    try {
      await db.query('BEGIN');

      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='clienti' AND column_name='aliquota_iva_predefinita'
          ) THEN
            ALTER TABLE clienti ADD COLUMN aliquota_iva_predefinita DECIMAL(5,2);
          END IF;
        END $$;
      `);

      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='fornitori' AND column_name='aliquota_iva_predefinita'
          ) THEN
            ALTER TABLE fornitori ADD COLUMN aliquota_iva_predefinita DECIMAL(5,2);
          END IF;
        END $$;
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 018 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 018:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 018: rimozione aliquota_iva_predefinita...');
    try {
      await db.query('BEGIN');
      await db.query(`ALTER TABLE IF EXISTS clienti DROP COLUMN IF EXISTS aliquota_iva_predefinita;`);
      await db.query(`ALTER TABLE IF EXISTS fornitori DROP COLUMN IF EXISTS aliquota_iva_predefinita;`);
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback 018 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 018:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT (
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='clienti' AND column_name='aliquota_iva_predefinita'
          )
        ) AND (
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='fornitori' AND column_name='aliquota_iva_predefinita'
          )
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
        VALUES ('018-add-aliquota-iva-predefinita')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 018:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`DELETE FROM migrations WHERE name = '018-add-aliquota-iva-predefinita';`);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 018:', error);
    }
  }
}

export default Migration018AddAliquotaIvaPredefinita;


