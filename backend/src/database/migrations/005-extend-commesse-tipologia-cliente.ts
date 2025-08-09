import { db } from '../../config/db';

/**
 * Migrazione 005: aggiunge campi cliente_tipo e tipologia_commessa a commesse
 */
export class Migration005ExtendCommesseTipologiaCliente {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 005: Aggiunta cliente_tipo e tipologia_commessa...');
    try {
      await db.query('BEGIN');

      await db.query(`
        ALTER TABLE commesse
          ADD COLUMN IF NOT EXISTS cliente_tipo VARCHAR(20) NOT NULL DEFAULT 'privato',
          ADD COLUMN IF NOT EXISTS tipologia_commessa VARCHAR(30) NOT NULL DEFAULT 'appalto';

        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'commesse_cliente_tipo_check'
          ) THEN
            ALTER TABLE commesse
              ADD CONSTRAINT commesse_cliente_tipo_check CHECK (LOWER(cliente_tipo) IN ('privato','pubblico'));
          END IF;
        END $$;

        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'commesse_tipologia_commessa_check'
          ) THEN
            ALTER TABLE commesse
              ADD CONSTRAINT commesse_tipologia_commessa_check CHECK (
                LOWER(tipologia_commessa) IN ('appalto','ati','sub_appalto','sub_affidamento')
              );
          END IF;
        END $$;

        CREATE INDEX IF NOT EXISTS idx_commesse_cliente_tipo ON commesse(LOWER(cliente_tipo));
        CREATE INDEX IF NOT EXISTS idx_commesse_tipologia_commessa ON commesse(LOWER(tipologia_commessa));
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 005 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 005:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 005: rimozione nuovi campi...');
    try {
      await db.query('BEGIN');
      await db.query(`
        ALTER TABLE commesse
          DROP CONSTRAINT IF EXISTS commesse_tipologia_commessa_check,
          DROP CONSTRAINT IF EXISTS commesse_cliente_tipo_check,
          DROP COLUMN IF EXISTS tipologia_commessa,
          DROP COLUMN IF EXISTS cliente_tipo;
      `);
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback migrazione 005 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 005:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'cliente_tipo'
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
        VALUES ('005-extend-commesse-tipologia-cliente')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 005:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`DELETE FROM migrations WHERE name = '005-extend-commesse-tipologia-cliente';`);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 005:', error);
    }
  }
}

export default Migration005ExtendCommesseTipologiaCliente;


