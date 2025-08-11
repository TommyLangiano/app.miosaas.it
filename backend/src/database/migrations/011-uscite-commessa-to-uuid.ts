import { db } from '../../config/db';

export class Migration011UsciteCommessaToUuid {
  static async up(): Promise<void> {
    console.log('🔄 Migrazione 011: uscite.commessa_id → UUID/TEXT compatibile...');
    try {
      await db.query('BEGIN');
      // Prova a convertire a UUID; se fallisce, ripiega a TEXT
      try {
        await db.query(`ALTER TABLE uscite ALTER COLUMN commessa_id TYPE uuid USING commessa_id::uuid`);
      } catch {
        await db.query(`ALTER TABLE uscite ALTER COLUMN commessa_id TYPE text USING commessa_id::text`);
      }
      await db.query('COMMIT');
      console.log('✅ Migrazione 011 completata');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('❌ Errore migrazione 011:', error);
      throw error;
    }
  }

  static async down(): Promise<void> {
    console.log('⏪ Rollback 011: impossibile ripristinare tipo precedente in modo sicuro. Nessuna azione.');
  }

  static async isApplied(): Promise<boolean> {
    try {
      const res = await db.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'uscite' AND column_name = 'commessa_id'
      `);
      const t = (res.rows?.[0]?.data_type || '').toString();
      return t === 'uuid' || t === 'text' || t === 'character varying';
    } catch {
      return false;
    }
  }
}

export default Migration011UsciteCommessaToUuid;


