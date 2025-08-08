import App from './app';

// Gestione segnali di terminazione
const gracefulShutdown = (signal: string) => {
  console.log(`\n🔔 Received ${signal}. Graceful shutdown initiated...`);
  
  // Qui puoi aggiungere cleanup operations:
  // - Chiudere connessioni database
  // - Completare operazioni in corso
  // - Salvare dati critici
  
  setTimeout(() => {
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  }, 1000);
};

// Gestione errori non gestiti
process.on('uncaughtException', (error: Error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Gestione segnali di terminazione
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Inizializza e avvia l'applicazione
const startServer = async () => {
  try {
    console.log('🔄 Starting MioSaaS Backend Server...');
    
    const app = new App();
    // Forza porta da ENV se impostata
    if (process.env.PORT) {
      (app as any).port = process.env.PORT;
    }
    app.listen();
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Avvia il server
startServer();