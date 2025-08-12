#!/usr/bin/env ts-node
import { db } from '../config/db';
import Migration017CreateFornitori from '../database/migrations/017-create-fornitori';

async function main() {
  console.log('🎯 Esecuzione singola migrazione 017 (fornitori)');
  try {
    const applied = await Migration017CreateFornitori.isApplied();
    if (applied) {
      console.log('✅ Migrazione 017 già applicata. Nulla da fare.');
      return;
    }
    await Migration017CreateFornitori.up();
    console.log('🎉 Migrazione 017 applicata con successo');
  } catch (error) {
    console.error('💥 Errore eseguendo migrazione 017:', error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();


