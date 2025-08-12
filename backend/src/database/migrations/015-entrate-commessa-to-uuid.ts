import { db } from '../../config/db';

export class Migration015EntrateCommessaToUuid {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 015: entrate.commessa_id → UUID/TEXT compatibile...');
    try {
      await db.query('BEGIN');
      try {
        await db.query(`ALTER TABLE entrate ALTER COLUMN commessa_id TYPE uuid USING commessa_id::uuid`);
      } catch {
        await db.query(`ALTER TABLE entrate ALTER COLUMN commessa_id TYPE text USING commessa_id::text`);
      }
      await db.query('COMMIT');
      await this.recordMigration();
      console.log('✅ Migrazione 015 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 015:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback 015: non sicuro riportare a INTEGER. Nessuna azione.');
  }

  static async isApplied(): Promise<boolean> {
    try {
      const res = await db.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'entrate' AND column_name = 'commessa_id'
      `);
      const t = (res.rows?.[0]?.data_type || '').toString();
      return t === 'uuid' || t === 'text' || t === 'character varying';
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
        VALUES ('015-entrate-commessa-to-uuid')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Errore nella registrazione migrazione 015:', error);
    }
  }
}

export default Migration015EntrateCommessaToUuid;


