#!/bin/bash

# ============================================================================
# Script per Setup Automatico Infrastruttura S3 per MioSaaS
# ============================================================================

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Verifica prerequisiti
check_prerequisites() {
    log_info "Verifica prerequisiti..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI non installato"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS non configurato"
        exit 1
    fi
    
    log_success "Prerequisiti verificati"
}

# Configurazione ambiente
get_environment_config() {
    ENVIRONMENT=${1:-dev}
    
    case $ENVIRONMENT in
        "dev"|"development")
            BUCKET_NAME="miosaas-files-dev"
            ENV_TAG="development"
            ;;
        "staging"|"stage")
            BUCKET_NAME="miosaas-files-staging"
            ENV_TAG="staging"
            ;;
        "prod"|"production")
            BUCKET_NAME="miosaas-files-prod"
            ENV_TAG="production"
            ;;
        *)
            log_error "Ambiente non valido: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    REGION="eu-north-1"
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    log_info "Ambiente: $ENVIRONMENT"
    log_info "Bucket: $BUCKET_NAME"
    log_info "Regione: $REGION"
    log_info "Account ID: $ACCOUNT_ID"
}

# Crea bucket S3
create_s3_bucket() {
    log_info "Creazione bucket S3: $BUCKET_NAME"
    
    if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
        log_warning "Bucket $BUCKET_NAME esiste già"
        return 0
    fi
    
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
    
    log_success "Bucket S3 creato: $BUCKET_NAME"
}

# Configura sicurezza
configure_bucket_security() {
    log_info "Configurazione sicurezza bucket..."
    
    # Versioning
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled
    
    # Encryption
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    },
                    "BucketKeyEnabled": true
                }
            ]
        }'
    
    log_success "Sicurezza bucket configurata"
}

# Configura lifecycle
configure_lifecycle_rules() {
    log_info "Configurazione lifecycle rules..."
    
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$BUCKET_NAME" \
        --lifecycle-configuration '{
            "Rules": [
                {
                    "ID": "ArchiveOldFiles",
                    "Status": "Enabled",
                    "Filter": {"Prefix": ""},
                    "Transitions": [
                        {"Days": 90, "StorageClass": "STANDARD_IA"},
                        {"Days": 365, "StorageClass": "GLACIER"}
                    ],
                    "Expiration": {"Days": 2555}
                }
            ]
        }'
    
    log_success "Lifecycle rules configurate"
}

# Configura CORS
configure_cors() {
    log_info "Configurazione CORS..."
    
    aws s3api put-bucket-cors \
        --bucket "$BUCKET_NAME" \
        --cors-configuration '{
            "CORSRules": [
                {
                    "AllowedHeaders": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
                    "AllowedOrigins": [
                        "https://app.miosaas.it",
                        "https://*.miosaas.it",
                        "http://localhost:3000"
                    ],
                    "ExposeHeaders": ["ETag"],
                    "MaxAgeSeconds": 3000
                }
            ]
        }'
    
    log_success "CORS configurato"
}

# Crea IAM policies
create_iam_policies() {
    log_info "Creazione IAM policies..."
    
    POLICY_NAME="MioSaaSS3AccessPolicy"
    
    if aws iam get-policy --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME" &>/dev/null; then
        log_warning "Policy $POLICY_NAME esiste già"
    else
        aws iam create-policy \
            --policy-name "$POLICY_NAME" \
            --policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "s3:GetObject",
                            "s3:PutObject",
                            "s3:DeleteObject",
                            "s3:ListBucket"
                        ],
                        "Resource": [
                            "arn:aws:s3:::'$BUCKET_NAME'",
                            "arn:aws:s3:::'$BUCKET_NAME'/*"
                        ]
                    }
                ]
            }'
        
        log_success "Policy IAM creata: $POLICY_NAME"
    fi
}

# Crea IAM role
create_iam_role() {
    log_info "Creazione IAM role..."
    
    ROLE_NAME="MioSaaSBackendS3Role"
    
    if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
        log_warning "Role $ROLE_NAME esiste già"
        return 0
    fi
    
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "ec2.amazonaws.com"},
                    "Action": "sts:AssumeRole"
                }
            ]
        }'
    
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/MioSaaSS3AccessPolicy"
    
    aws iam tag-role \
        --role-name "$ROLE_NAME" \
        --tags Key=Environment,Value="$ENV_TAG" Key=Project,Value=MioSaaS
    
    log_success "Role IAM creato: $ROLE_NAME"
}

# Test configurazione
test_configuration() {
    log_info "Test configurazione..."
    
    if aws s3 ls "s3://$BUCKET_NAME" &>/dev/null; then
        log_success "Accesso bucket verificato"
    else
        log_error "Errore accesso bucket"
        return 1
    fi
    
    log_success "Test configurazione completato"
}

# Genera file configurazione
generate_config_files() {
    log_info "Generazione file di configurazione..."
    
    cat > ".env.s3" << EOF
# S3 Configuration - Generated by setup script
S3_BUCKET_NAME=$BUCKET_NAME
S3_REGION=$REGION
S3_ENCRYPTION=AES256
AWS_ROLE_ARN=arn:aws:iam::$ACCOUNT_ID:role/MioSaaSBackendS3Role
AWS_REGION=$REGION
MAX_FILE_SIZE=100MB
UPLOAD_EXPIRY_SECONDS=3600
NODE_ENV=$ENVIRONMENT
EOF
    
    cat > ".env.local.s3" << EOF
# S3 Configuration - Generated by setup script
NEXT_PUBLIC_S3_BUCKET=$BUCKET_NAME
NEXT_PUBLIC_S3_REGION=$REGION
NEXT_PUBLIC_MAX_FILE_SIZE=100MB
NEXT_PUBLIC_ENVIRONMENT=$ENVIRONMENT
EOF
    
    log_success "File di configurazione generati"
}

# Funzione principale
main() {
    echo -e "${BLUE}"
    echo "🚀 Setup Infrastruttura S3 per MioSaaS"
    echo "============================================================================"
    echo -e "${NC}"
    
    check_prerequisites
    get_environment_config "$1"
    create_s3_bucket
    configure_bucket_security
    configure_lifecycle_rules
    configure_cors
    create_iam_policies
    create_iam_role
    test_configuration
    generate_config_files
    
    echo -e "${GREEN}"
    echo "✅ Setup Infrastruttura S3 Completato!"
    echo "============================================================================"
    echo -e "${NC}"
    echo "🪣 Bucket: $BUCKET_NAME"
    echo "🌍 Regione: $REGION"
    echo "🆔 Account: $ACCOUNT_ID"
    echo "🔑 Role: MioSaaSBackendS3Role"
    echo ""
    echo "📁 File generati: .env.s3 e .env.local.s3"
    echo ""
    echo "🚀 Prossimi passi:"
    echo "   1. Copia .env.s3 in .env"
    echo "   2. Copia .env.local.s3 in .env.local"
    echo "   3. Procedi con Fase 2: Database Schema"
}

# Esegui script
main "$@"
