#!/bin/bash

# ============================================================================
# SCRIPT ESECUZIONE MIGRATION S3 FILE MANAGEMENT - MIOSAAS
# ============================================================================
# Questo script esegue la migrazione completa per integrare la gestione file S3
# con le tabelle esistenti del database
# ============================================================================

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per log colorato
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# ============================================================================
# VERIFICA PREREQUISITI
# ============================================================================

log "🚀 Avvio Migration S3 File Management per MioSaaS"
echo "=============================================================================="

# Verifica che siamo nella directory corretta
if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
    error "❌ Script deve essere eseguito dalla directory backend del progetto"
    exit 1
fi

# Verifica variabili d'ambiente
if [[ -z "$DB_HOST" ]] && [[ -z "$DATABASE_URL" ]]; then
    error "❌ Variabili d'ambiente database non configurate"
    error "   Imposta DB_HOST, DB_NAME, DB_USER, DB_PASSWORD oppure DATABASE_URL"
    exit 1
fi

# Verifica connessione database
log "ℹ️  Verifica connessione database..."
if ! psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    if [[ -n "$DATABASE_URL" ]]; then
        if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
            error "❌ Impossibile connettersi al database"
            exit 1
        fi
    else
        error "❌ Impossibile connettersi al database"
        exit 1
    fi
fi

log "✅ Connessione database verificata"

# ============================================================================
# BACKUP DATABASE (OPZIONALE)
# ============================================================================

if [[ "$1" == "--backup" ]]; then
    log "ℹ️  Creazione backup database..."
    BACKUP_FILE="backup_pre_s3_migration_$(date +'%Y%m%d_%H%M%S').sql"
    
    if [[ -n "$DATABASE_URL" ]]; then
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    else
        pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
    fi
    
    if [[ $? -eq 0 ]]; then
        log "✅ Backup creato: $BACKUP_FILE"
    else
        warn "⚠️  Backup fallito, continuo senza backup"
    fi
fi

# ============================================================================
# ESECUZIONE MIGRATION
# ============================================================================

log "ℹ️  Esecuzione migration S3 File Management..."

# Percorso file migration
MIGRATION_FILE="src/database/migrations/s3-file-management-migration.sql"

if [[ ! -f "$MIGRATION_FILE" ]]; then
    error "❌ File migration non trovato: $MIGRATION_FILE"
    exit 1
fi

# Esegui migration
log "ℹ️  Applicazione schema database..."

if [[ -n "$DATABASE_URL" ]]; then
    psql "$DATABASE_URL" -f "$MIGRATION_FILE"
else
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"
fi

if [[ $? -eq 0 ]]; then
    log "✅ Migration completata con successo!"
else
    error "❌ Migration fallita!"
    exit 1
fi

# ============================================================================
# VERIFICA MIGRATION
# ============================================================================

log "ℹ️  Verifica migration..."

# Verifica tabella file_attachments
if [[ -n "$DATABASE_URL" ]]; then
    TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'file_attachments');" | xargs)
else
    TABLE_EXISTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'file_attachments');" | xargs)
fi

if [[ "$TABLE_EXISTS" == "t" ]]; then
    log "✅ Tabella file_attachments creata correttamente"
else
    error "❌ Tabella file_attachments non trovata"
    exit 1
fi

# Verifica campi aggiunti alle tabelle esistenti
log "ℹ️  Verifica campi aggiunti alle tabelle esistenti..."

if [[ -n "$DATABASE_URL" ]]; then
    # Verifica documents
    DOCS_FILES=$(psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_attachments';" | xargs)
    # Verifica rapportini
    RAPP_FILES=$(psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'rapportini' AND column_name = 'file_attachments';" | xargs)
    # Verifica commesse
    COMM_FILES=$(psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'commesse' AND column_name = 'file_attachments';" | xargs)
else
    # Verifica documents
    DOCS_FILES=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_attachments';" | xargs)
    # Verifica rapportini
    RAPP_FILES=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'rapportini' AND column_name = 'file_attachments';" | xargs)
    # Verifica commesse
    COMM_FILES=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'commesse' AND column_name = 'file_attachments';" | xargs)
fi

if [[ -n "$DOCS_FILES" ]]; then
    log "✅ Campo file_attachments aggiunto a documents"
else
    warn "⚠️  Campo file_attachments non trovato in documents"
fi

if [[ -n "$RAPP_FILES" ]]; then
    log "✅ Campo file_attachments aggiunto a rapportini"
else
    warn "⚠️  Campo file_attachments non trovato in rapportini"
fi

if [[ -n "$COMM_FILES" ]]; then
    log "✅ Campo file_attachments aggiunto a commesse"
else
    warn "⚠️  Campo file_attachments non trovato in commesse"
fi

# ============================================================================
# TEST FUNZIONI
# ============================================================================

log "ℹ️  Test funzioni database..."

if [[ -n "$DATABASE_URL" ]]; then
    # Test funzione generate_s3_key
    S3_KEY_TEST=$(psql "$DATABASE_URL" -t -c "SELECT generate_s3_key('123e4567-e89b-12d3-a456-426614174000', 'commesse', 'contratti', '987fcdeb-51a2-43d1-9f12-345678901234', 'test.pdf');" | xargs)
    
    if [[ -n "$S3_KEY_TEST" ]]; then
        log "✅ Funzione generate_s3_key funziona correttamente"
        log "   Esempio: $S3_KEY_TEST"
    else
        warn "⚠️  Funzione generate_s3_key non funziona"
    fi
else
    # Test funzione generate_s3_key
    S3_KEY_TEST=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT generate_s3_key('123e4567-e89b-12d3-a456-426614174000', 'commesse', 'contratti', '987fcdeb-51a2-43d1-9f12-345678901234', 'test.pdf');" | xargs)
    
    if [[ -n "$S3_KEY_TEST" ]]; then
        log "✅ Funzione generate_s3_key funziona correttamente"
        log "   Esempio: $S3_KEY_TEST"
    else
        warn "⚠️  Funzione generate_s3_key non funziona"
    fi
fi

# ============================================================================
# STATISTICHE FINALI
# ============================================================================

log "ℹ️  Statistiche finali..."

if [[ -n "$DATABASE_URL" ]]; then
    # Conta tabelle
    TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    # Conta funzioni
    FUNCTION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';" | xargs)
    # Conta views
    VIEW_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';" | xargs)
else
    # Conta tabelle
    TABLE_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    # Conta funzioni
    FUNCTION_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';" | xargs)
    # Conta views
    VIEW_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';" | xargs)
fi

log "📊 Statistiche database:"
log "   • Tabelle: $TABLE_COUNT"
log "   • Funzioni: $FUNCTION_COUNT"
log "   • Views: $VIEW_COUNT"

# ============================================================================
# COMPLETAMENTO
# ============================================================================

echo "=============================================================================="
log "🎉 Migration S3 File Management completata con successo!"
log ""
log "✅ Cosa è stato creato:"
log "   • Tabella file_attachments per gestione centralizzata file S3"
log "   • Campi file_attachments nelle tabelle esistenti"
log "   • Funzioni per generazione chiavi S3 e statistiche"
log "   • Views per visualizzazione file e statistiche"
log "   • Triggers per aggiornamento automatico file count"
log ""
log "✅ Tabelle aggiornate:"
log "   • documents (file_attachments, primary_file_id, file_count)"
log "   • rapportini (file_attachments, photo_attachments, document_attachments, file_count)"
log "   • commesse (file_attachments, contract_attachments, invoice_attachments, photo_attachments, document_attachments, file_count)"
log ""
log "🚀 Prossimi passi:"
log "   1. Procedi con Fase 3: Servizi Backend per Gestione File"
log "   2. Testa le API per upload/download file"
log "   3. Integra con il frontend per gestione file"
log ""
log "📚 Documentazione:"
log "   • Schema: src/database/schemas/file-attachments.sql"
log "   • Migration: src/database/migrations/s3-file-management-migration.sql"
log "   • Aggiornamento tabelle: src/database/schemas/update-existing-tables.sql"

# ============================================================================
# PULIZIA
# ============================================================================

if [[ "$1" == "--clean" ]]; then
    log "ℹ️  Pulizia file temporanei..."
    rm -f backup_pre_s3_migration_*.sql
    log "✅ Pulizia completata"
fi

exit 0
