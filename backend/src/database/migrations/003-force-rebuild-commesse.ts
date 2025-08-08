import { db } from '../../config/db';

/**
 * Migrazione 003: Forza ricostruzione tabella commesse con nuovo schema
 */
export class Migration003ForceRebuildCommesse {
  static async up(): Promise<void> {
    console.log('🔄 Esecuzione migrazione 003: Forza ricostruzione tabella commesse...');

    const timestampSuffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const backupTableName = `commesse_old_${timestampSuffix}`;

    try {
      await db.query('BEGIN');

      // Se esiste commesse, rinominala a backup
      const exists = await db.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'commesse') as exists;"
      );
      if (exists.rows[0]?.exists) {
        console.log(`📦 Backup tabella attuale: commesse → ${backupTableName}`);
        await db.query(`ALTER TABLE commesse RENAME TO ${backupTableName};`);
      }

      // Crea nuova tabella con lo schema richiesto
      await db.query(`
        CREATE TABLE commesse (
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

      // Migrazione dati best-effort dal backup (se esiste)
      if (exists.rows[0]?.exists) {
        try {
          await db.query(`
            INSERT INTO commesse (
              id, cliente, luogo, data_inizio, data_fine, descrizione,
              imponibile_commessa, iva_commessa, importo_commessa,
              archiviata, stato, company_id,
              created_by, updated_by, created_at, updated_at
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

          // Riallinea la sequence in modo robusto: almeno 1, is_called=true
          await db.query(
            `SELECT setval(pg_get_serial_sequence('commesse', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM commesse), 1), true);`
          );
        } catch (migrateError) {
          console.error('⚠️ Errore migrazione dati 003, mantengo il backup:', migrateError);
        }
      }

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 003 completata con successo');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore durante migrazione 003:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 003: ripristino tabella commesse dal backup più recente se presente...');
    try {
      await db.query('BEGIN');
      const backup = await db.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'commesse_old_%' ORDER BY table_name DESC LIMIT 1;`
      );
      const backupName: string | undefined = backup.rows[0]?.table_name;

      await db.query('DROP TABLE IF EXISTS commesse CASCADE;');
      if (backupName) {
        await db.query(`ALTER TABLE ${backupName} RENAME TO commesse;`);
      }
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback migrazione 003 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore durante rollback 003:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'cliente'
        ) as exists;
      `);
      return !!result.rows[0]?.exists;
    } catch (e) {
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
        INSERT INTO migrations (name) VALUES ('003-force-rebuild-commesse')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (e) {
      console.error('Errore nella registrazione migrazione 003:', e);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`DELETE FROM migrations WHERE name = '003-force-rebuild-commesse';`);
    } catch (e) {
      console.error('Errore nella rimozione record migrazione 003:', e);
    }
  }
}

export default Migration003ForceRebuildCommesse;


