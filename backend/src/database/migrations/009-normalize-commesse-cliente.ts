import { db } from '../../config/db';

/**
 * Migrazione 009: Normalizza cliente su commesse
 * - Copia eventuale valore di `cliente` in `committente_commessa` se mancante
 * - Elimina la colonna ridondante `cliente`
 */
export class Migration009NormalizeCommesseCliente {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 009: Normalizzazione cliente su commesse...');
    try {
      await db.query('BEGIN');

      // Assicurati che il campo target esista
      await db.query(`
        ALTER TABLE commesse
          ADD COLUMN IF NOT EXISTS committente_commessa VARCHAR(255);
      `);

      // Copia dati da cliente -> committente_commessa se quest'ultimo è nullo
      await db.query(`
        UPDATE commesse
        SET committente_commessa = COALESCE(committente_commessa, cliente)
        WHERE (committente_commessa IS NULL OR committente_commessa = '')
          AND cliente IS NOT NULL AND cliente <> '';
      `);

      // Elimina la colonna ridondante
      await db.query(`
        ALTER TABLE commesse
          DROP COLUMN IF EXISTS cliente;
      `);

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 009 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 009:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 009: ripristino colonna cliente...');
    try {
      await db.query('BEGIN');
      await db.query(`
        ALTER TABLE commesse
          ADD COLUMN IF NOT EXISTS cliente VARCHAR(255);
      `);
      // Opzionale: ricopia da committente_commessa solo se ha senso
      await db.query(`
        UPDATE commesse
        SET cliente = COALESCE(cliente, committente_commessa)
        WHERE cliente IS NULL OR cliente = '';
      `);
      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback migrazione 009 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 009:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'cliente'
        ) as applied;
      `);
      return !!result.rows[0]?.applied;
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
        VALUES ('009-normalize-commesse-cliente')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 009:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`
        DELETE FROM migrations WHERE name = '009-normalize-commesse-cliente';
      `);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 009:', error);
    }
  }
}

export default Migration009NormalizeCommesseCliente;


