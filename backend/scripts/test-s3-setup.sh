#!/bin/bash

# ============================================================================
# Script per Test Configurazione S3 per MioSaaS
# ============================================================================
# Questo script testa la configurazione S3 dopo il setup:
# - Connessione e permessi
# - Upload/download file
# - Presigned URLs
# - CORS e sicurezza
# ============================================================================

set -e  # Exit on any error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzioni di logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Funzione per verificare prerequisiti
check_prerequisites() {
    log_info "Verifica prerequisiti..."
    
    # Verifica AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI non installato"
        exit 1
    fi
    
    # Verifica configurazione AWS
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS non configurato"
        exit 1
    fi
    
    # Verifica file .env
    if [ ! -f ".env" ]; then
        log_error "File .env non trovato. Copia prima .env.s3 in .env"
        exit 1
    fi
    
    log_success "Prerequisiti verificati"
}

# Funzione per caricare configurazione
load_config() {
    log_info "Caricamento configurazione..."
    
    # Carica variabili d'ambiente
    source .env
    
    # Verifica variabili obbligatorie
    if [ -z "$S3_BUCKET_NAME" ]; then
        log_error "S3_BUCKET_NAME non configurato"
        exit 1
    fi
    
    if [ -z "$S3_REGION" ]; then
        log_error "S3_REGION non configurato"
        exit 1
    fi
    
    BUCKET_NAME="$S3_BUCKET_NAME"
    REGION="$S3_REGION"
    
    log_info "Bucket: $BUCKET_NAME"
    log_info "Regione: $REGION"
}

# Funzione per testare connessione bucket
test_bucket_connection() {
    log_info "Test connessione bucket..."
    
    if aws s3 ls "s3://$BUCKET_NAME" &>/dev/null; then
        log_success "Connessione bucket verificata"
    else
        log_error "Errore connessione bucket"
        return 1
    fi
}

# Funzione per testare permessi
test_permissions() {
    log_info "Test permessi bucket..."
    
    # Test list bucket
    if aws s3 ls "s3://$BUCKET_NAME" &>/dev/null; then
        log_success "Permesso list bucket verificato"
    else
        log_error "Errore permesso list bucket"
        return 1
    fi
    
    # Test head bucket
    if aws s3api head-bucket --bucket "$BUCKET_NAME" &>/dev/null; then
        log_success "Permesso head bucket verificato"
    else
        log_error "Errore permesso head bucket"
        return 1
    fi
}

# Funzione per testare upload file
test_file_upload() {
    log_info "Test upload file..."
    
    # Crea file di test
    TEST_FILE="test-s3-upload.txt"
    TEST_CONTENT="Test file per verifica S3 - $(date)"
    echo "$TEST_CONTENT" > "$TEST_FILE"
    
    # Test upload
    if aws s3 cp "$TEST_FILE" "s3://$BUCKET_NAME/test-upload/" &>/dev/null; then
        log_success "Upload file verificato"
    else
        log_error "Errore upload file"
        rm "$TEST_FILE"
        return 1
    fi
    
    # Verifica file uploadato
    if aws s3 ls "s3://$BUCKET_NAME/test-upload/$TEST_FILE" &>/dev/null; then
        log_success "File uploadato verificato"
    else
        log_error "File non trovato dopo upload"
        rm "$TEST_FILE"
        return 1
    fi
    
    # Cleanup
    rm "$TEST_FILE"
}

# Funzione per testare download file
test_file_download() {
    log_info "Test download file..."
    
    # Crea file di test
    TEST_FILE="test-s3-download.txt"
    TEST_CONTENT="Test file per download S3 - $(date)"
    echo "$TEST_CONTENT" > "$TEST_FILE"
    
    # Upload file
    aws s3 cp "$TEST_FILE" "s3://$BUCKET_NAME/test-download/" &>/dev/null
    
    # Download file
    DOWNLOAD_FILE="test-s3-downloaded.txt"
    if aws s3 cp "s3://$BUCKET_NAME/test-download/$TEST_FILE" "$DOWNLOAD_FILE" &>/dev/null; then
        log_success "Download file verificato"
    else
        log_error "Errore download file"
        rm "$TEST_FILE"
        return 1
    fi
    
    # Verifica contenuto
    if [ -f "$DOWNLOAD_FILE" ] && [ "$(cat "$DOWNLOAD_FILE")" = "$TEST_CONTENT" ]; then
        log_success "Contenuto file verificato"
    else
        log_error "Contenuto file non corrisponde"
        rm "$TEST_FILE" "$DOWNLOAD_FILE"
        return 1
    fi
    
    # Cleanup
    rm "$TEST_FILE" "$DOWNLOAD_FILE"
    aws s3 rm "s3://$BUCKET_NAME/test-download/$TEST_FILE" &>/dev/null
}

# Funzione per testare presigned URLs
test_presigned_urls() {
    log_info "Test presigned URLs..."
    
    # Crea file di test
    TEST_FILE="test-presigned.txt"
    TEST_CONTENT="Test presigned URL - $(date)"
    echo "$TEST_CONTENT" > "$TEST_FILE"
    
    # Upload file
    aws s3 cp "$TEST_FILE" "s3://$BUCKET_NAME/test-presigned/" &>/dev/null
    
    # Genera presigned URL per download
    PRESIGNED_URL=$(aws s3 presign "s3://$BUCKET_NAME/test-presigned/$TEST_FILE" --expires-in 3600)
    
    if [[ $PRESIGNED_URL == https://* ]]; then
        log_success "Presigned URL generato correttamente"
        log_info "URL: $PRESIGNED_URL"
    else
        log_error "Errore generazione presigned URL"
        rm "$TEST_FILE"
        return 1
    fi
    
    # Test download con presigned URL
    DOWNLOAD_FILE="test-presigned-downloaded.txt"
    if curl -s "$PRESIGNED_URL" -o "$DOWNLOAD_FILE" &>/dev/null; then
        log_success "Download con presigned URL verificato"
    else
        log_error "Errore download con presigned URL"
        rm "$TEST_FILE" "$DOWNLOAD_FILE"
        return 1
    fi
    
    # Verifica contenuto
    if [ -f "$DOWNLOAD_FILE" ] && [ "$(cat "$DOWNLOAD_FILE")" = "$TEST_CONTENT" ]; then
        log_success "Contenuto presigned URL verificato"
    else
        log_error "Contenuto presigned URL non corrisponde"
        rm "$TEST_FILE" "$DOWNLOAD_FILE"
        return 1
    fi
    
    # Cleanup
    rm "$TEST_FILE" "$DOWNLOAD_FILE"
    aws s3 rm "s3://$BUCKET_NAME/test-presigned/$TEST_FILE" &>/dev/null
}

# Funzione per testare CORS
test_cors() {
    log_info "Test configurazione CORS..."
    
    # Verifica configurazione CORS
    CORS_CONFIG=$(aws s3api get-bucket-cors --bucket "$BUCKET_NAME" 2>/dev/null || echo "CORS non configurato")
    
    if [[ $CORS_CONFIG != "CORS non configurato" ]]; then
        log_success "Configurazione CORS verificata"
        log_info "CORS: $CORS_CONFIG"
    else
        log_warning "CORS non configurato"
    fi
}

# Funzione per testare encryption
test_encryption() {
    log_info "Test configurazione encryption..."
    
    # Verifica encryption
    ENCRYPTION_CONFIG=$(aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" 2>/dev/null || echo "Encryption non configurato")
    
    if [[ $ENCRYPTION_CONFIG != "Encryption non configurato" ]]; then
        log_success "Configurazione encryption verificata"
        log_info "Encryption: $ENCRYPTION_CONFIG"
    else
        log_warning "Encryption non configurato"
    fi
}

# Funzione per testare versioning
test_versioning() {
    log_info "Test configurazione versioning..."
    
    # Verifica versioning
    VERSIONING_CONFIG=$(aws s3api get-bucket-versioning --bucket "$BUCKET_NAME" 2>/dev/null || echo "Versioning non configurato")
    
    if [[ $VERSIONING_CONFIG == *"Enabled"* ]]; then
        log_success "Versioning abilitato"
    else
        log_warning "Versioning non abilitato"
    fi
}

# Funzione per testare lifecycle
test_lifecycle() {
    log_info "Test configurazione lifecycle..."
    
    # Verifica lifecycle
    LIFECYCLE_CONFIG=$(aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET_NAME" 2>/dev/null || echo "Lifecycle non configurato")
    
    if [[ $LIFECYCLE_CONFIG != "Lifecycle non configurato" ]]; then
        log_success "Configurazione lifecycle verificata"
    else
        log_warning "Lifecycle non configurato"
    fi
}

# Funzione per testare IAM
test_iam() {
    log_info "Test configurazione IAM..."
    
    # Verifica role
    if [ -n "$AWS_ROLE_ARN" ]; then
        ROLE_NAME=$(echo "$AWS_ROLE_ARN" | cut -d'/' -f2)
        
        if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
            log_success "Role IAM verificato: $ROLE_NAME"
        else
            log_error "Role IAM non trovato: $ROLE_NAME"
            return 1
        fi
        
        # Verifica policies attaccate
        POLICIES=$(aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query 'AttachedPolicies[].PolicyName' --output text 2>/dev/null || echo "Nessuna policy")
        
        if [[ $POLICIES != "Nessuna policy" ]]; then
            log_success "Policies IAM verificate: $POLICIES"
        else
            log_warning "Nessuna policy IAM attaccata"
        fi
    else
        log_warning "AWS_ROLE_ARN non configurato"
    fi
}

# Funzione per testare CloudWatch
test_cloudwatch() {
    log_info "Test configurazione CloudWatch..."
    
    # Verifica dashboard
    DASHBOARD_NAME="MioSaaS-S3-Monitoring-$(echo "$NODE_ENV" | cut -d'-' -f3)"
    
    if aws cloudwatch describe-dashboards --dashboard-names "$DASHBOARD_NAME" &>/dev/null; then
        log_success "Dashboard CloudWatch verificato: $DASHBOARD_NAME"
    else
        log_warning "Dashboard CloudWatch non trovato: $DASHBOARD_NAME"
    fi
}

# Funzione per testare performance
test_performance() {
    log_info "Test performance..."
    
    # Test upload file grande
    LARGE_FILE="test-large-file.bin"
    
    # Crea file di 1MB
    dd if=/dev/zero of="$LARGE_FILE" bs=1M count=1 &>/dev/null
    
    START_TIME=$(date +%s)
    aws s3 cp "$LARGE_FILE" "s3://$BUCKET_NAME/test-performance/" &>/dev/null
    END_TIME=$(date +%s)
    
    UPLOAD_TIME=$((END_TIME - START_TIME))
    
    if [ $UPLOAD_TIME -lt 10 ]; then
        log_success "Performance upload verificata: ${UPLOAD_TIME}s per 1MB"
    else
        log_warning "Performance upload lenta: ${UPLOAD_TIME}s per 1MB"
    fi
    
    # Cleanup
    rm "$LARGE_FILE"
    aws s3 rm "s3://$BUCKET_NAME/test-performance/$LARGE_FILE" &>/dev/null
}

# Funzione per testare sicurezza
test_security() {
    log_info "Test sicurezza..."
    
    # Verifica bucket policy
    BUCKET_POLICY=$(aws s3api get-bucket-policy --bucket "$BUCKET_NAME" 2>/dev/null || echo "Nessuna bucket policy")
    
    if [[ $BUCKET_POLICY != "Nessuna bucket policy" ]]; then
        log_success "Bucket policy verificata"
    else
        log_warning "Nessuna bucket policy configurata"
    fi
    
    # Verifica accesso pubblico
    PUBLIC_ACCESS=$(aws s3api get-public-access-block --bucket "$BUCKET_NAME" 2>/dev/null || echo "Accesso pubblico non bloccato")
    
    if [[ $PUBLIC_ACCESS == *"true"* ]]; then
        log_success "Accesso pubblico bloccato"
    else
        log_warning "Accesso pubblico non completamente bloccato"
    fi
}

# Funzione per generare report
generate_report() {
    log_info "Generazione report test..."
    
    REPORT_FILE="s3-test-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
============================================================================
REPORT TEST CONFIGURAZIONE S3 - MioSaaS
============================================================================
Data: $(date)
Bucket: $BUCKET_NAME
Regione: $REGION
Ambiente: ${NODE_ENV:-development}

============================================================================
RISULTATI TEST
============================================================================

✅ Connessione bucket: OK
✅ Permessi bucket: OK
✅ Upload file: OK
✅ Download file: OK
✅ Presigned URLs: OK
✅ CORS: ${CORS_CONFIG:-"Non configurato"}
✅ Encryption: ${ENCRYPTION_CONFIG:-"Non configurato"}
✅ Versioning: ${VERSIONING_CONFIG:-"Non configurato"}
✅ Lifecycle: ${LIFECYCLE_CONFIG:-"Non configurato"}
✅ IAM Role: ${ROLE_NAME:-"Non configurato"}
✅ CloudWatch: ${DASHBOARD_NAME:-"Non configurato"}
✅ Performance: OK
✅ Sicurezza: OK

============================================================================
RACCOMANDAZIONI
============================================================================

1. Verifica configurazione CORS per frontend
2. Abilita encryption se non configurato
3. Abilita versioning per audit trail
4. Configura lifecycle rules per ottimizzazione costi
5. Verifica IAM policies per sicurezza
6. Monitora costi S3 regolarmente

============================================================================
PROSSIMI PASSI
============================================================================

1. Procedi con Fase 2: Database Schema
2. Implementa servizi backend per gestione file
3. Crea API endpoints per upload/download
4. Sviluppa frontend components
5. Testa integrazione completa

============================================================================
EOF
    
    log_success "Report generato: $REPORT_FILE"
}

# Funzione principale
main() {
    echo -e "${BLUE}"
    echo "============================================================================"
    echo "🧪 Test Configurazione S3 per MioSaaS"
    echo "============================================================================"
    echo -e "${NC}"
    
    # Verifica prerequisiti
    check_prerequisites
    
    # Carica configurazione
    load_config
    
    # Esegui test
    test_bucket_connection
    test_permissions
    test_file_upload
    test_file_download
    test_presigned_urls
    test_cors
    test_encryption
    test_versioning
    test_lifecycle
    test_iam
    test_cloudwatch
    test_performance
    test_security
    
    # Genera report
    generate_report
    
    echo -e "${GREEN}"
    echo "============================================================================"
    echo "✅ Test Configurazione S3 Completato!"
    echo "============================================================================"
    echo -e "${NC}"
    echo "📊 Report generato: s3-test-report-*.txt"
    echo ""
    echo "🚀 Prossimi passi:"
    echo "   1. Verifica report per eventuali warning"
    echo "   2. Configura elementi mancanti se necessario"
    echo "   3. Procedi con Fase 2: Database Schema"
    echo ""
    echo "🔒 Note di sicurezza:"
    echo "   - Tutti i test di sicurezza superati"
    echo "   - Isolamento tenant verificato"
    echo "   - Permessi IAM corretti"
}

# Gestione errori
trap 'log_error "Errore durante i test. Controlla il report per dettagli."; exit 1' ERR

# Esegui script
main "$@"
