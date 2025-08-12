import db from '../config/db';

async function main() {
  try {
    console.log('🔄 Rendo nullable i campi fattura su public.uscite...');
    await db.query(`
      ALTER TABLE public.uscite
        ALTER COLUMN numero_fattura DROP NOT NULL,
        ALTER COLUMN emissione_fattura DROP NOT NULL,
        ALTER COLUMN aliquota_iva DROP NOT NULL,
        ALTER COLUMN imponibile DROP NOT NULL,
        ALTER COLUMN iva DROP NOT NULL;
    `);
    console.log('✅ Completato');
  } catch (error) {
    console.error('❌ Errore nello script:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();


