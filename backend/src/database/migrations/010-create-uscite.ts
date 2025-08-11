import { db } from '../../config/db';

export class Migration010CreateUscite {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 010: Creazione tabella uscite...');
    try {
      await db.query('BEGIN');

      await db.query(`
        CREATE TABLE IF NOT EXISTS uscite (
          id SERIAL PRIMARY KEY,
          company_id UUID NOT NULL,
          commessa_id INTEGER,
          fornitore VARCHAR(255) NOT NULL,
          tipologia VARCHAR(100) NOT NULL,
          numero_fattura VARCHAR(100) NOT NULL,
          emissione_fattura DATE NOT NULL,
          importo_totale DECIMAL(12,2) NOT NULL,
          aliquota_iva DECIMAL(5,2) NOT NULL,
          imponibile DECIMAL(12,2) NOT NULL,
          iva DECIMAL(12,2) NOT NULL,
          data_pagamento DATE NOT NULL,
          modalita_pagamento VARCHAR(100),
          banca_emissione VARCHAR(255),
          numero_conto VARCHAR(100),
          created_by UUID NOT NULL,
          updated_by UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_uscite_company ON uscite(company_id);
        CREATE INDEX IF NOT EXISTS idx_uscite_commessa ON uscite(company_id, commessa_id);
        CREATE INDEX IF NOT EXISTS idx_uscite_emissione ON uscite(company_id, emissione_fattura DESC);
        CREATE INDEX IF NOT EXISTS idx_uscite_pagamento ON uscite(company_id, data_pagamento DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_uscite_company_invoice ON uscite(company_id, numero_fattura);

        CREATE TRIGGER update_uscite_updated_at BEFORE UPDATE ON uscite
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 010 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 010:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 010: uscite...');
    try {
      await db.query('BEGIN');
      await db.query('DROP TABLE IF EXISTS uscite CASCADE;');
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback 010 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 010:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'uscite'
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
        VALUES ('010-create-uscite')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 010:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`DELETE FROM migrations WHERE name = '010-create-uscite';`);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 010:', error);
    }
  }
}

export default Migration010CreateUscite;


