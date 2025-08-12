#!/usr/bin/env ts-node
import { db } from '../config/db';
import Migration015EntrateCommessaToUuid from '../database/migrations/015-entrate-commessa-to-uuid';

async function main() {
  console.log('🎯 Esecuzione singola migrazione 015 (entrate.commessa_id)');
  try {
    const applied = await Migration015EntrateCommessaToUuid.isApplied();
    if (applied) {
      console.log('✅ Migrazione 015 già applicata. Nulla da fare.');
      return;
    }
    await Migration015EntrateCommessaToUuid.up();
    console.log('🎉 Migrazione 015 applicata con successo');
  } catch (error) {
    console.error('💥 Errore eseguendo migrazione 015:', error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();


