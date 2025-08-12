#!/usr/bin/env ts-node
import { db } from '../config/db';
import Migration019AlignFornitoriColumns from '../database/migrations/019-align-fornitori-columns';

async function main() {
  console.log('🎯 Esecuzione singola migrazione 019 (allineamento colonne fornitori)');
  try {
    const applied = await Migration019AlignFornitoriColumns.isApplied();
    if (applied) {
      console.log('✅ Migrazione 019 già applicata. Nulla da fare.');
      return;
    }
    await Migration019AlignFornitoriColumns.up();
    console.log('🎉 Migrazione 019 applicata con successo');
  } catch (error) {
    console.error('💥 Errore eseguendo migrazione 019:', error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();


