import { db } from '../../config/db';

export default class Migration013AddTipologiaUscita {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 013: Aggiunta colonna tipologia_uscita a uscite...');
    try {
      await db.query('BEGIN');
      await db.query(`
        ALTER TABLE uscite
        ADD COLUMN IF NOT EXISTS tipologia_uscita VARCHAR(20) DEFAULT 'fattura';
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_uscite_tipologia_uscita ON uscite(tipologia_uscita);
      `);
      // registra la migrazione
      await db.query(`
        INSERT INTO migrations (name)
        VALUES ('013-add-tipologia-uscita')
        ON CONFLICT (name) DO NOTHING;
      `);
      await db.query('COMMIT');
      console.log('✅ Migrazione 013 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 013:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback migrazione 013: tipologia_uscita...');
    try {
      await db.query('BEGIN');
      await db.query(`
        ALTER TABLE uscite
        DROP COLUMN IF EXISTS tipologia_uscita;
      `);
      await db.query(`DELETE FROM migrations WHERE name = '013-add-tipologia-uscita';`);
      await db.query('COMMIT');
      console.log('✅ Rollback 013 completato');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore rollback 013:', error);
      throw error;
    }
  }

  static async isApplied(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'uscite' AND column_name = 'tipologia_uscita'
        ) AS exists;
      `);
      return !!result.rows[0]?.exists;
    } catch {
      return false;
    }
  }
}


