import { db } from '../../config/db';

export class Migration018AlignFornitoriToClienti {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 018: Allineamento fornitori a modello clienti (PF/PG) ...');
    try {
      await db.query('BEGIN');

      // Aggiunge colonna forma_giuridica se non esiste
      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'fornitori' AND column_name = 'forma_giuridica'
          ) THEN
            ALTER TABLE fornitori ADD COLUMN forma_giuridica VARCHAR(2);
          END IF;
        END $$;
      `);

      // Imposta default PG per righe esistenti
      await db.query(`
        UPDATE fornitori SET forma_giuridica = 'PG' WHERE forma_giuridica IS NULL;
      `);

      // Rendi NOT NULL dopo aver popolato
      await db.query(`
        ALTER TABLE fornitori ALTER COLUMN forma_giuridica SET NOT NULL;
      `);

      // Aggiunge colonna forma_giuridica_dettaglio se non esiste
      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'fornitori' AND column_name = 'forma_giuridica_dettaglio'
          ) THEN
            ALTER TABLE fornitori ADD COLUMN forma_giuridica_dettaglio VARCHAR(100);
          END IF;
        END $$;
      `);

      // Aggiunge colonne PF (nome, cognome) se non esistono
      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'fornitori' AND column_name = 'nome'
          ) THEN
            ALTER TABLE fornitori ADD COLUMN nome VARCHAR(100);
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'fornitori' AND column_name = 'cognome'
          ) THEN
            ALTER TABLE fornitori ADD COLUMN cognome VARCHAR(100);
          END IF;
        END $$;
      `);

      // Rendi ragione_sociale nullable per PF
      await db.query(`
        ALTER TABLE fornitori ALTER COLUMN ragione_sociale DROP NOT NULL;
      `);

      // Vincolo forma_giuridica
      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_schema = 'public' AND table_name = 'fornitori' AND constraint_name = 'fornitori_forma_check'
          ) THEN
            ALTER TABLE fornitori
            ADD CONSTRAINT fornitori_forma_check CHECK (forma_giuridica IN ('PF','PG'));
          END IF;
        END $$;
      `);

      // Vincoli PF/PG obblighi
      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_schema = 'public' AND table_name = 'fornitori' AND constraint_name = 'fornitori_pf_obblighi'
          ) THEN
            ALTER TABLE fornitori
            ADD CONSTRAINT fornitori_pf_obblighi CHECK (
              (forma_giuridica = 'PF' AND nome IS NOT NULL AND cognome IS NOT NULL AND codice_fiscale IS NOT NULL)
              OR forma_giuridica = 'PG'
            );
          END IF;
        END $$;
      `);

      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_schema = 'public' AND table_name = 'fornitori' AND constraint_name = 'fornitori_pg_obblighi'
          ) THEN
            ALTER TABLE fornitori
            ADD CONSTRAINT fornitori_pg_obblighi CHECK (
              (forma_giuridica = 'PG' AND ragione_sociale IS NOT NULL AND partita_iva IS NOT NULL)
              OR forma_giuridica = 'PF'
            );
          END IF;
        END $$;
      `);

      // Indice ricerca full-text (facoltativo ma utile)
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_fornitori_ricerca ON fornitori USING GIN (to_tsvector('italian',
          COALESCE(ragione_sociale,'') || ' ' || COALESCE(nome,'') || ' ' || COALESCE(cognome,'') || ' ' || COALESCE(email,'') || ' ' || COALESCE(pec,'')
        ));
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
    console.log('⏪ Rollback migrazione 018...');
    try {
      await db.query('BEGIN');

      // Rimuove indici e vincoli aggiunti
      await db.query(`
        DROP INDEX IF EXISTS idx_fornitori_ricerca;
        ALTER TABLE fornitori DROP CONSTRAINT IF EXISTS fornitori_pf_obblighi;
        ALTER TABLE fornitori DROP CONSTRAINT IF EXISTS fornitori_pg_obblighi;
        ALTER TABLE fornitori DROP CONSTRAINT IF EXISTS fornitori_forma_check;
      `);

      // Ripristina NOT NULL su ragione_sociale
      await db.query(`
        UPDATE fornitori SET ragione_sociale = COALESCE(ragione_sociale, '') WHERE ragione_sociale IS NULL;
        ALTER TABLE fornitori ALTER COLUMN ragione_sociale SET NOT NULL;
      `);

      // Rimuove colonne aggiunte
      await db.query(`
        ALTER TABLE fornitori DROP COLUMN IF EXISTS nome;
        ALTER TABLE fornitori DROP COLUMN IF EXISTS cognome;
        ALTER TABLE fornitori DROP COLUMN IF EXISTS forma_giuridica_dettaglio;
        ALTER TABLE fornitori DROP COLUMN IF EXISTS forma_giuridica;
      `);

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
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'fornitori' AND column_name = 'forma_giuridica'
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
        VALUES ('018-align-fornitori-to-clienti')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 018:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`DELETE FROM migrations WHERE name = '018-align-fornitori-to-clienti';`);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 018:', error);
    }
  }
}

export default Migration018AlignFornitoriToClienti;


