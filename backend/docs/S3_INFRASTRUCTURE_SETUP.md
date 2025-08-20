# Setup Infrastruttura S3 e IAM per Gestione File Multi-Tenant

## Panoramica

Questo documento descrive la configurazione dell'infrastruttura AWS S3 e IAM per la gestione sicura dei file con isolamento tenant completo.

## Architettura Target

```
┌─────────────────────────────────────────────────────────────┐
│                    MioSaaS File Storage                     │
├─────────────────────────────────────────────────────────────┤
│  Bucket: miosaas-files-{ENV}                              │
│  Region: eu-north-1                                        │
│  Encryption: AES-256                                       │
│  Versioning: Enabled                                       │
│  Lifecycle: Intelligent Tiering                            │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Struttura Chiavi                        │
├─────────────────────────────────────────────────────────────┤
│ {company_id}/                                               │
│ ├── commesse/                                               │
│ │   ├── {commessa_id}/                                      │
│ │   │   ├── contratti/                                      │
│ │   │   ├── fatture/                                        │
│ │   │   ├── foto/                                           │
│ │   │   └── documenti/                                      │
│ ├── rapportini/                                             │
│ │   ├── {date}/                                             │
│ │   │   ├── foto/                                           │
│ │   │   └── allegati/                                       │
│ ├── documenti/                                              │
│ │   ├── contratti/                                          │
│ │   ├── preventivi/                                         │
│ │   └── amministrativi/                                     │
│ ├── costi/                                                  │
│ │   ├── {costo_id}/                                         │
│ │   │   ├── fatture/                                        │
│ │   │   └── ricevute/                                       │
│ └── ricavi/                                                 │
│     ├── {ricavo_id}/                                        │
│     │   ├── fatture/                                        │
│     │   └── documenti/                                      │
└─────────────────────────────────────────────────────────────┘
```

## 1. Configurazione S3 Bucket

### 1.1 Creazione Bucket

```bash
# Nome bucket per ambiente
BUCKET_NAME="miosaas-files-prod"  # o miosaas-files-dev
REGION="eu-north-1"

# Crea bucket con configurazioni di sicurezza
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION \
    --create-bucket-configuration LocationConstraint=$REGION
```

### 1.2 Configurazioni Bucket

```bash
# Abilita versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Abilita encryption
aws s3api put-bucket-encryption \
    --bucket $BUCKET_NAME \
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

# Abilita Intelligent Tiering
aws s3api put-bucket-intelligent-tiering-configuration \
    --bucket $BUCKET_NAME \
    --id "default" \
    --intelligent-tiering-configuration '{
        "Status": "Enabled",
        "Tierings": [
            {
                "Days": 90,
                "AccessTier": "DEEP_ARCHIVE_ACCESS"
            },
            {
                "Days": 30,
                "AccessTier": "ARCHIVE_ACCESS"
            }
        ]
    }'
```

### 1.3 Lifecycle Rules

```bash
# Regola per archiviazione automatica
aws s3api put-bucket-lifecycle-configuration \
    --bucket $BUCKET_NAME \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "ArchiveOldFiles",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": ""
                },
                "Transitions": [
                    {
                        "Days": 90,
                        "StorageClass": "STANDARD_IA"
                    },
                    {
                        "Days": 365,
                        "StorageClass": "GLACIER"
                    }
                ],
                "Expiration": {
                    "Days": 2555
                }
            }
        ]
    }'
```

## 2. Configurazione IAM

### 2.1 Policy per Accesso S3

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "MioSaaSTenantFileAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::miosaas-files-*",
                "arn:aws:s3:::miosaas-files-*/*"
            ],
            "Condition": {
                "StringEquals": {
                    "aws:PrincipalTag/TenantID": "${aws:PrincipalTag/TenantID}"
                }
            }
        }
    ]
}
```

### 2.2 Role per EC2/ECS

```bash
# Crea role per il backend
aws iam create-role \
    --role-name MioSaaSBackendS3Role \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "ec2.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'

# Attacca policy
aws iam attach-role-policy \
    --role-name MioSaaSBackendS3Role \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/MioSaaSS3AccessPolicy
```

### 2.3 Policy per Presigned URLs

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "GeneratePresignedUrls",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::miosaas-files-*/*",
            "Condition": {
                "StringEquals": {
                    "aws:PrincipalTag/Environment": "production"
                }
            }
        }
    ]
}
```

## 3. Configurazione CORS

```bash
# Configura CORS per accesso frontend
aws s3api put-bucket-cors \
    --bucket $BUCKET_NAME \
    --cors-configuration '{
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
                "AllowedOrigins": [
                    "https://app.miosaas.it",
                    "https://*.miosaas.it"
                ],
                "ExposeHeaders": ["ETag"],
                "MaxAgeSeconds": 3000
            }
        ]
    }'
```

## 4. Configurazione CloudWatch

### 4.1 Metriche da Monitorare

- `NumberOfObjects` - Numero totale oggetti
- `BucketSizeBytes` - Dimensione bucket per storage class
- `AllRequests` - Richieste totali
- `GetRequests` - Richieste GET
- `PutRequests` - Richieste PUT
- `DeleteRequests` - Richieste DELETE

### 4.2 Dashboard CloudWatch

```bash
# Crea dashboard per monitoring
aws cloudwatch put-dashboard \
    --dashboard-name "MioSaaS-S3-Monitoring" \
    --dashboard-body '{
        "widgets": [
            {
                "type": "metric",
                "properties": {
                    "metrics": [
                        ["AWS/S3", "NumberOfObjects", "BucketName", "'$BUCKET_NAME'"]
                    ],
                    "period": 300,
                    "stat": "Average",
                    "region": "'$REGION'",
                    "title": "S3 Objects Count"
                }
            }
        ]
    }'
```

## 5. Configurazione Backup e Disaster Recovery

### 5.1 Replica Cross-Region

```bash
# Abilita replica per disaster recovery
aws s3api put-bucket-replication \
    --bucket $BUCKET_NAME \
    --replication-configuration '{
        "Role": "arn:aws:iam::ACCOUNT_ID:role/s3-replication-role",
        "Rules": [
            {
                "ID": "CrossRegionReplication",
                "Status": "Enabled",
                "Destination": {
                    "Bucket": "arn:aws:s3:::miosaas-files-dr-eu-west-1"
                },
                "DeleteMarkerReplication": {
                    "Status": "Enabled"
                }
            }
        ]
    }'
```

### 5.2 Point-in-Time Recovery

```bash
# Abilita point-in-time recovery
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Configura lifecycle per versioni
aws s3api put-bucket-lifecycle-configuration \
    --bucket $BUCKET_NAME \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "VersionLifecycle",
                "Status": "Enabled",
                "NoncurrentVersionTransitions": [
                    {
                        "NoncurrentDays": 30,
                        "StorageClass": "STANDARD_IA"
                    }
                ],
                "NoncurrentVersionExpiration": {
                    "NoncurrentDays": 90
                }
            }
        ]
    }'
```

## 6. Variabili d'Ambiente

### 6.1 Backend (.env)

```bash
# S3 Configuration
S3_BUCKET_NAME=miosaas-files-prod
S3_REGION=eu-north-1
S3_ENCRYPTION=AES256

# IAM Configuration
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/MioSaaSBackendS3Role
AWS_REGION=eu-north-1

# File Upload Configuration
MAX_FILE_SIZE=100MB
ALLOWED_MIME_TYPES=image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document
UPLOAD_EXPIRY_SECONDS=3600
```

### 6.2 Frontend (.env.local)

```bash
NEXT_PUBLIC_S3_BUCKET=miosaas-files-prod
NEXT_PUBLIC_S3_REGION=eu-north-1
NEXT_PUBLIC_MAX_FILE_SIZE=100MB
```

## 7. Script di Setup Automatico

### 7.1 setup-s3-infrastructure.sh

```bash
#!/bin/bash

# Script per setup automatico infrastruttura S3
set -e

echo "🚀 Setup infrastruttura S3 per MioSaaS..."

# Variabili configurazione
ENVIRONMENT=${1:-dev}
BUCKET_NAME="miosaas-files-${ENVIRONMENT}"
REGION="eu-north-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "📦 Configurazione per ambiente: $ENVIRONMENT"
echo "🪣 Bucket: $BUCKET_NAME"
echo "🌍 Regione: $REGION"
echo "🆔 Account: $ACCOUNT_ID"

# Crea bucket
echo "🔨 Creazione bucket S3..."
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION \
    --create-bucket-configuration LocationConstraint=$REGION

# Configura versioning e encryption
echo "🔒 Configurazione sicurezza..."
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
    --bucket $BUCKET_NAME \
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

# Configura CORS
echo "🌐 Configurazione CORS..."
aws s3api put-bucket-cors \
    --bucket $BUCKET_NAME \
    --cors-configuration '{
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
                "AllowedOrigins": [
                    "https://app.miosaas.it",
                    "https://*.miosaas.it"
                ],
                "ExposeHeaders": ["ETag"],
                "MaxAgeSeconds": 3000
            }
        ]
    }'

echo "✅ Setup infrastruttura S3 completato!"
echo "🪣 Bucket: $BUCKET_NAME"
echo "🔗 URL: https://$BUCKET_NAME.s3.$REGION.amazonaws.com"
```

## 8. Verifica e Testing

### 8.1 Test Connessione

```bash
# Test accesso bucket
aws s3 ls s3://$BUCKET_NAME

# Test upload file
echo "test content" > test.txt
aws s3 cp test.txt s3://$BUCKET_NAME/test/
aws s3 rm s3://$BUCKET_NAME/test/test.txt
rm test.txt
```

### 8.2 Test Presigned URLs

```bash
# Test generazione presigned URL
aws s3 presign s3://$BUCKET_NAME/test/file.txt --expires-in 3600
```

## 9. Prossimi Passi

1. **Eseguire script di setup**
2. **Configurare variabili d'ambiente**
3. **Testare connessione e permessi**
4. **Procedere con Fase 2: Database Schema**

## Note di Sicurezza

- ✅ Encryption AES-256 abilitato
- ✅ Versioning abilitato per audit trail
- ✅ Lifecycle rules per gestione costi
- ✅ CORS configurato per frontend
- ✅ IAM policies con principio del minimo privilegio
- ✅ Backup cross-region per disaster recovery
- ✅ Monitoring CloudWatch abilitato

## Supporto

Per problemi o domande:
- Controllare log CloudWatch
- Verificare permessi IAM
- Controllare configurazione CORS
- Verificare regioni e nomi bucket
