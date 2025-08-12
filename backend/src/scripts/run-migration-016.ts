#!/usr/bin/env ts-node
import { db } from '../config/db';
import Migration016CreateClienti from '../database/migrations/016-create-clienti';

async function main() {
  console.log('🎯 Esecuzione singola migrazione 016 (clienti)');
  try {
    const applied = await Migration016CreateClienti.isApplied();
    if (applied) {
      console.log('✅ Migrazione 016 già applicata. Nulla da fare.');
      return;
    }
    await Migration016CreateClienti.up();
    console.log('🎉 Migrazione 016 applicata con successo');
  } catch (error) {
    console.error('💥 Errore eseguendo migrazione 016:', error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();


