import { db } from '../config/db';

async function main() {
  try {
    const result = await db.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'commesse'
       ORDER BY ordinal_position;`
    );

    console.log('Colonne tabella commesse:');
    for (const row of result.rows) {
      console.log(`${row.column_name} :: ${row.data_type} :: ${row.is_nullable}`);
    }
  } catch (error) {
    console.error('Errore ispezionando tabella commesse:', error);
  } finally {
    await db.close();
  }
}

main();


