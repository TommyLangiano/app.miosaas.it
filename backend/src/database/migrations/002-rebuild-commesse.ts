import { db } from '../../config/db';

/**
 * Migrazione 002: Ricostruzione tabella commesse con nuovo schema
 */
export class Migration002RebuildCommesse {
  static async up(): Promise<void> {
    console.log('🔄 Esecuzione migrazione 002: Ricostruzione tabella commesse...');

    // Genera un suffisso timestamp per il backup della tabella esistente
    const timestampSuffix = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const backupTableName = `commesse_old_${timestampSuffix}`;

    try {
      await db.query('BEGIN');

      // Verifica se la tabella commesse esiste
      const existsResult = await db.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'commesse') as exists;"
      );
      const commesseExists = !!existsResult.rows[0]?.exists;

      if (commesseExists) {
        console.log(`📦 Backup tabella esistente: commesse → ${backupTableName}`);
        await db.query(`ALTER TABLE commesse RENAME TO ${backupTableName};`);
      } else {
        console.log('ℹ️ Tabella commesse non esistente, verrà creata ex novo');
      }

      // Crea la nuova tabella commesse con i campi richiesti
      await db.query(`
        CREATE TABLE IF NOT EXISTS commesse (
          id SERIAL PRIMARY KEY,
          cliente VARCHAR(255) NOT NULL,
          luogo VARCHAR(255),
          data_inizio DATE,
          data_fine DATE,
          descrizione TEXT,
          imponibile_commessa DECIMAL(12,2),
          iva_commessa DECIMAL(12,2),
          importo_commessa DECIMAL(12,2),
          archiviata BOOLEAN DEFAULT false,
          stato VARCHAR(20) NOT NULL DEFAULT 'da_avviare',
          company_id UUID NOT NULL,
          created_by UUID NOT NULL,
          updated_by UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT commesse_stato_check CHECK (stato IN ('in_corso', 'chiusa', 'da_avviare'))
        );

        CREATE INDEX IF NOT EXISTS idx_commesse_company_id ON commesse(company_id);
        CREATE INDEX IF NOT EXISTS idx_commesse_stato ON commesse(stato);
        CREATE INDEX IF NOT EXISTS idx_commesse_created_at ON commesse(created_at);

        CREATE TRIGGER update_commesse_updated_at BEFORE UPDATE ON commesse
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);

      // Crea tabella file delle commesse se non esiste
      await db.query(`
        CREATE TABLE IF NOT EXISTS commessa_files (
          file_id UUID NOT NULL,
          commessa_id INTEGER NOT NULL,
          company_id UUID NOT NULL,
          filename_original VARCHAR(512) NOT NULL,
          s3_key VARCHAR(1024) NOT NULL,
          content_type VARCHAR(255),
          size_bytes BIGINT,
          checksum_sha256 VARCHAR(64),
          uploaded_by UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (company_id, commessa_id, file_id),
          FOREIGN KEY (commessa_id) REFERENCES commesse(id) ON DELETE CASCADE
        );
        -- Allinea schema legacy: aggiungi created_at se mancasse
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'commessa_files' AND column_name = 'created_at'
          ) THEN
            ALTER TABLE commessa_files ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
          END IF;
        END $$;
        CREATE INDEX IF NOT EXISTS idx_commessa_files_commessa ON commessa_files(company_id, commessa_id, created_at DESC);
      `);

      // Se esisteva una tabella precedente, prova a migrare i dati compatibili
      if (commesseExists) {
        console.log('🔁 Migrazione dati dalla tabella precedente (best-effort)...');
        try {
          // Copia selezionata dei dati con mapping dei campi
          await db.query(`
            INSERT INTO commesse (
              id,
              cliente,
              luogo,
              data_inizio,
              data_fine,
              descrizione,
              imponibile_commessa,
              iva_commessa,
              importo_commessa,
              archiviata,
              stato,
              company_id,
              created_by,
              updated_by,
              created_at,
              updated_at
            )
            SELECT 
              id,
              COALESCE(client_name, name, '')::varchar(255) as cliente,
              location as luogo,
              start_date as data_inizio,
              COALESCE(actual_end_date, estimated_end_date) as data_fine,
              description as descrizione,
              NULL::DECIMAL(12,2) as imponibile_commessa,
              NULL::DECIMAL(12,2) as iva_commessa,
              total_amount as importo_commessa,
              (status = 'archived') as archiviata,
              CASE 
                WHEN status IN ('active', 'on_hold') THEN 'in_corso'
                WHEN status IN ('completed', 'cancelled') THEN 'chiusa'
                WHEN status IN ('planning') THEN 'da_avviare'
                ELSE 'da_avviare'
              END as stato,
              company_id,
              created_by,
              updated_by,
              created_at,
              updated_at
            FROM ${backupTableName};
          `);

          // Allinea la sequence con il max(id)
          await db.query(
            "SELECT setval(pg_get_serial_sequence('commesse', 'id'), COALESCE((SELECT MAX(id) FROM commesse), 0));"
          );

          // Elimina la tabella di backup
          await db.query(`DROP TABLE ${backupTableName};`);
          console.log('✅ Migrazione dati completata e backup eliminato');
        } catch (migrateError) {
          console.error('⚠️ Errore nella migrazione dei dati, mantengo il backup:', migrateError);
          // In caso di errore, non eliminiamo la tabella di backup
        }
      }

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 002 completata con successo');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore durante migrazione 002:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 002: Ripristino tabella commesse precedente...');
    try {
      await db.query('BEGIN');

      // Trova l'eventuale tabella di backup più recente
      const backupSearch = await db.query(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name LIKE 'commesse_old_%' 
         ORDER BY table_name DESC LIMIT 1;`
      );
      const backupName: string | undefined = backupSearch.rows[0]?.table_name;

      // Elimina la tabella commesse attuale
      await db.query('DROP TABLE IF EXISTS commesse CASCADE;');

      // Se esiste un backup, rinominalo a commesse
      if (backupName) {
        await db.query(`ALTER TABLE ${backupName} RENAME TO commesse;`);
      }

      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback migrazione 002 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore durante rollback migrazione 002:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'commesse' 
          AND column_name = 'cliente'
        ) as exists;
      `);
      return !!result.rows[0]?.exists;
    } catch (error) {
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
        VALUES ('002-rebuild-commesse')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 002:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`
        DELETE FROM migrations WHERE name = '002-rebuild-commesse';
      `);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 002:', error);
    }
  }
}

export default Migration002RebuildCommesse;


