#!/usr/bin/env ts-node
import { db } from '../config/db';
import Migration014CreateEntrate from '../database/migrations/014-create-entrate';

async function main() {
  console.log('🎯 Esecuzione singola migrazione 014 (entrate)');
  try {
    const applied = await Migration014CreateEntrate.isApplied();
    if (applied) {
      console.log('✅ Migrazione 014 già applicata. Nulla da fare.');
      return;
    }
    await Migration014CreateEntrate.up();
    console.log('🎉 Migrazione 014 applicata con successo');
  } catch (error) {
    console.error('💥 Errore eseguendo migrazione 014:', error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();


