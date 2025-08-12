import { db } from '../../config/db';

export class Migration017CreateFornitori {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 017: Creazione tabella fornitori...');
    try {
      await db.query('BEGIN');

      await db.query(`
        CREATE TABLE IF NOT EXISTS fornitori (
          id SERIAL PRIMARY KEY,
          company_id UUID NOT NULL,

          ragione_sociale VARCHAR(255) NOT NULL,
          partita_iva VARCHAR(32),
          codice_fiscale VARCHAR(32),
          telefono VARCHAR(50),
          email VARCHAR(255),
          fax VARCHAR(50),
          pec VARCHAR(255),
          website VARCHAR(255),

          via VARCHAR(255),
          civico VARCHAR(50),
          cap VARCHAR(10),
          citta VARCHAR(255),
          provincia VARCHAR(2),
          nazione VARCHAR(100),

          via_so VARCHAR(255),
          civico_so VARCHAR(50),
          cap_so VARCHAR(10),
          citta_so VARCHAR(255),
          provincia_so VARCHAR(2),
          nazione_so VARCHAR(100),

          mod_pagamento_pref VARCHAR(100),
          iban VARCHAR(34),
          codice_sdi VARCHAR(10),
          note TEXT,

          created_by UUID NOT NULL,
          updated_by UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_fornitori_company ON fornitori(company_id);
        CREATE INDEX IF NOT EXISTS idx_fornitori_created_at ON fornitori(company_id, created_at DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_fornitori_company_piva ON fornitori(company_id, partita_iva) WHERE partita_iva IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_fornitori_company_cf ON fornitori(company_id, codice_fiscale) WHERE codice_fiscale IS NOT NULL;

        CREATE TRIGGER update_fornitori_updated_at BEFORE UPDATE ON fornitori
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 017 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 017:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 017: fornitori...');
    try {
      await db.query('BEGIN');
      await db.query('DROP TABLE IF EXISTS fornitori CASCADE;');
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback 017 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 017:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'fornitori'
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
        VALUES ('017-create-fornitori')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 017:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`DELETE FROM migrations WHERE name = '017-create-fornitori';`);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 017:', error);
    }
  }
}

export default Migration017CreateFornitori;


