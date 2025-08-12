#!/usr/bin/env ts-node
import { db } from '../config/db';
import Migration018AddAliquotaIvaPredefinita from '../database/migrations/018-add-aliquota-iva-predefinita';

async function main() {
  console.log('🎯 Esecuzione singola migrazione 018 (aliquota_iva_predefinita)');
  try {
    const applied = await Migration018AddAliquotaIvaPredefinita.isApplied();
    if (applied) {
      console.log('✅ Migrazione 018 già applicata. Nulla da fare.');
      return;
    }
    await Migration018AddAliquotaIvaPredefinita.up();
    console.log('🎉 Migrazione 018 applicata con successo');
  } catch (error) {
    console.error('💥 Errore eseguendo migrazione 018:', error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();

