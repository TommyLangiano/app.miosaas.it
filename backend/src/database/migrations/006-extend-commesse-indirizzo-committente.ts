import { db } from '../../config/db';

/**
 * Migrazione 006: Estende tabella commesse
 * - Aggiunge committente_commessa (dopo codice a livello logico)
 * - Rinomina localita -> citta
 * - Aggiunge via, civico
 */
export class Migration006ExtendCommesseIndirizzoCommittente {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 006: Estensione campi commesse (committente, citta, via, civico)...');
    try {
      await db.query('BEGIN');

      // Aggiungi nuovi campi se non esistono
      await db.query(`
        ALTER TABLE commesse
          ADD COLUMN IF NOT EXISTS committente_commessa VARCHAR(255),
          ADD COLUMN IF NOT EXISTS via VARCHAR(255),
          ADD COLUMN IF NOT EXISTS civico VARCHAR(20);
      `);

      // Rinomina localita -> citta se la colonna legacy esiste e la nuova non esiste
      const res = await db.query(`
        SELECT 
          EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'localita'
          ) AS has_localita,
          EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'citta'
          ) AS has_citta;
      `);
      const hasLocalita = !!res.rows?.[0]?.has_localita;
      const hasCitta = !!res.rows?.[0]?.has_citta;
      if (hasLocalita && !hasCitta) {
        await db.query(`ALTER TABLE commesse RENAME COLUMN localita TO citta;`);
      }

      await this.recordMigration();
      await db.query('COMMIT');
      console.log('✅ Migrazione 006 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 006:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 006: ripristino campi commesse...');
    try {
      await db.query('BEGIN');

      // Rinomina citta -> localita se applicabile
      const res = await db.query(`
        SELECT 
          EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'citta'
          ) AS has_citta,
          EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'localita'
          ) AS has_localita;
      `);
      const hasCitta = !!res.rows?.[0]?.has_citta;
      const hasLocalita = !!res.rows?.[0]?.has_localita;
      if (hasCitta && !hasLocalita) {
        await db.query(`ALTER TABLE commesse RENAME COLUMN citta TO localita;`);
      }

      // Elimina colonne aggiunte
      await db.query(`
        ALTER TABLE commesse
          DROP COLUMN IF EXISTS committente_commessa,
          DROP COLUMN IF EXISTS via,
          DROP COLUMN IF EXISTS civico;
      `);

      await this.removeMigrationRecord();
      await db.query('COMMIT');
      console.log('✅ Rollback migrazione 006 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 006:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'commesse' AND column_name = 'committente_commessa'
        ) AS exists;
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
        VALUES ('006-extend-commesse-indirizzo-committente')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 006:', error);
    }
  }

  private static async removeMigrationRecord(): Promise<void> {
    try {
      await db.query(`
        DELETE FROM migrations WHERE name = '006-extend-commesse-indirizzo-committente';
      `);
    } catch (error) {
      console.error('Errore nella rimozione record migrazione 006:', error);
    }
  }
}

export default Migration006ExtendCommesseIndirizzoCommittente;


