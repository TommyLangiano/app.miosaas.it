import { db } from '../../config/db';

export class Migration014CreateEntrate {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 014: Creazione tabella entrate...');
    try {
      await db.query('BEGIN');

      await db.query(`
        CREATE TABLE IF NOT EXISTS entrate (
          id SERIAL PRIMARY KEY,
          company_id UUID NOT NULL,
          commessa_id INTEGER,
          cliente VARCHAR(255) NOT NULL,
          tipologia VARCHAR(100) NOT NULL,
          numero_fattura VARCHAR(100) NOT NULL,
          emissione_fattura DATE NOT NULL,
          importo_totale DECIMAL(12,2) NOT NULL,
          aliquota_iva DECIMAL(5,2) NOT NULL,
          imponibile DECIMAL(12,2) NOT NULL,
          iva DECIMAL(12,2) NOT NULL,
          data_pagamento DATE NOT NULL,
          modalita_pagamento VARCHAR(100),
          stato_entrata VARCHAR(50) NOT NULL DEFAULT 'No Pagato',
          tipologia_entrata VARCHAR(50) NOT NULL DEFAULT 'fattura',
          created_by UUID NOT NULL,
          updated_by UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_entrate_company ON entrate(company_id);
        CREATE INDEX IF NOT EXISTS idx_entrate_commessa ON entrate(company_id, commessa_id);
        CREATE INDEX IF NOT EXISTS idx_entrate_emissione ON entrate(company_id, emissione_fattura DESC);
        CREATE INDEX IF NOT EXISTS idx_entrate_pagamento ON entrate(company_id, data_pagamento DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_entrate_company_invoice ON entrate(company_id, numero_fattura);

        CREATE TRIGGER update_entrate_updated_at BEFORE UPDATE ON entrate
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 014 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 014:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 014: entrate...');
    try {
      await db.query('BEGIN');
      await db.query('DROP TABLE IF EXISTS entrate CASCADE;');
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback 014 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 014:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'entrate'
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
        VALUES ('014-create-entrate')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 014:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`DELETE FROM migrations WHERE name = '014-create-entrate';`);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 014:', error);
    }
  }
}

export default Migration014CreateEntrate;


