#!/usr/bin/env ts-node

import { db } from '../../config/db';
import Migration010CreateUscite from './010-create-uscite';
import Migration011UsciteCommessaToUuid from './011-uscite-commessa-to-uuid';
import Migration012AddStatoUscita from './012-add-stato-uscita';

async function main() {
  console.log('🚀 Avvio setup mirato per tabella uscite (010, 011, 012)...');
  try {
    // Health DB
    await db.healthCheck();

    if (!(await Migration010CreateUscite.isApplied())) {
      console.log('📦 Applicando migrazione 010-create-uscite');
      await Migration010CreateUscite.up();
    } else {
      console.log('✅ 010-create-uscite già applicata');
    }

    if (!(await Migration011UsciteCommessaToUuid.isApplied())) {
      console.log('📦 Applicando migrazione 011-uscite-commessa-to-uuid');
      await Migration011UsciteCommessaToUuid.up();
    } else {
      console.log('✅ 011-uscite-commessa-to-uuid già applicata');
    }

    if (!(await Migration012AddStatoUscita.isApplied())) {
      console.log('📦 Applicando migrazione 012-add-stato-uscita');
      await Migration012AddStatoUscita.up();
    } else {
      console.log('✅ 012-add-stato-uscita già applicata');
    }

    console.log('🎉 Setup uscite completato');
  } catch (error) {
    console.error('💥 Errore in uscita-setup:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  main();
}

export default main;


