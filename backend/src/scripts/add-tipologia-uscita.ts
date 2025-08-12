import db from '../config/db';

async function main() {
  try {
    console.log('🔄 Aggiungo colonna tipologia_uscita a public.uscite...');
    await db.query(
      `ALTER TABLE public.uscite 
       ADD COLUMN IF NOT EXISTS tipologia_uscita VARCHAR(20) DEFAULT 'fattura';`
    );

    console.log('🔍 Creo indice se non esiste...');
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE schemaname = 'public' AND indexname = 'idx_uscite_tipologia_uscita'
        ) THEN
          CREATE INDEX idx_uscite_tipologia_uscita ON public.uscite (tipologia_uscita);
        END IF;
      END$$;
    `);

    console.log('✅ Operazione completata');
  } catch (error) {
    console.error('❌ Errore nello script:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();


