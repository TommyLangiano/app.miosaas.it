import { db } from '../../config/db';

export class Migration016CreateClienti {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 016: Creazione tabella clienti...');
    try {
      await db.query('BEGIN');

      await db.query(`
        CREATE TABLE IF NOT EXISTS clienti (
          id SERIAL PRIMARY KEY,
          company_id UUID NOT NULL,

          -- Macro forma giuridica: PF (persona fisica) | PG (persona giuridica)
          forma_giuridica VARCHAR(2) NOT NULL,

          -- Campi comuni
          tipologia VARCHAR(100) NOT NULL,

          -- Persona Fisica
          nome VARCHAR(100),
          cognome VARCHAR(100),
          codice_fiscale VARCHAR(32),
          partita_iva VARCHAR(32),

          -- Persona Giuridica
          ragione_sociale VARCHAR(255),
          forma_giuridica_dettaglio VARCHAR(100), -- es. SRL, SPA, SNC

          -- Contatti
          telefono VARCHAR(50),
          fax VARCHAR(50),
          pec VARCHAR(255),
          email VARCHAR(255),
          website VARCHAR(255),

          -- Indirizzo sede legale / principale
          via VARCHAR(255),
          civico VARCHAR(50),
          cap VARCHAR(10),
          citta VARCHAR(255),
          provincia VARCHAR(2),
          nazione VARCHAR(100),

          -- Indirizzo sede operativa (SO)
          via_so VARCHAR(255),
          civico_so VARCHAR(50),
          cap_so VARCHAR(10),
          citta_so VARCHAR(255),
          provincia_so VARCHAR(2),
          nazione_so VARCHAR(100),

          -- Dati fiscali aggiuntivi
          ateco VARCHAR(16),
          rea VARCHAR(32),
          mod_pagamento_pref VARCHAR(100),
          iban VARCHAR(34),
          codice_sdi VARCHAR(10),
          note TEXT,

          -- Tracking
          created_by UUID NOT NULL,
          updated_by UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          -- Vincoli
          CONSTRAINT clienti_forma_check CHECK (forma_giuridica IN ('PF','PG')),
          CONSTRAINT clienti_pf_obblighi CHECK (
            (forma_giuridica = 'PF' AND nome IS NOT NULL AND cognome IS NOT NULL AND codice_fiscale IS NOT NULL)
            OR forma_giuridica = 'PG'
          ),
          CONSTRAINT clienti_pg_obblighi CHECK (
            (forma_giuridica = 'PG' AND ragione_sociale IS NOT NULL AND partita_iva IS NOT NULL)
            OR forma_giuridica = 'PF'
          )
        );

        -- Indici
        CREATE INDEX IF NOT EXISTS idx_clienti_company ON clienti(company_id);
        CREATE INDEX IF NOT EXISTS idx_clienti_created_at ON clienti(company_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_clienti_ricerca ON clienti USING GIN (to_tsvector('italian',
          COALESCE(ragione_sociale,'') || ' ' || COALESCE(nome,'') || ' ' || COALESCE(cognome,'') || ' ' || COALESCE(email,'') || ' ' || COALESCE(pec,'')
        ));

        -- Unicità fiscalità per azienda (parziali dove valorizzate)
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_clienti_company_cf ON clienti(company_id, codice_fiscale) WHERE codice_fiscale IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_clienti_company_piva ON clienti(company_id, partita_iva) WHERE partita_iva IS NOT NULL;

        -- Trigger updated_at
        CREATE TRIGGER update_clienti_updated_at BEFORE UPDATE ON clienti
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 016 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 016:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 016: clienti...');
    try {
      await db.query('BEGIN');
      await db.query('DROP TABLE IF EXISTS clienti CASCADE;');
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback 016 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 016:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'clienti'
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
        VALUES ('016-create-clienti')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 016:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`DELETE FROM migrations WHERE name = '016-create-clienti';`);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 016:', error);
    }
  }
}

export default Migration016CreateClienti;


