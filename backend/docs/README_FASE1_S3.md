# Fase 1: Setup Infrastruttura S3 e IAM - MioSaaS

## 🎯 Obiettivo

Configurare l'infrastruttura AWS S3 e IAM per la gestione sicura dei file con isolamento tenant completo per MioSaaS.

## 📋 Prerequisiti

### 1. **AWS CLI Installato e Configurato**
```bash
# Verifica versione AWS CLI
aws --version

# Verifica configurazione
aws sts get-caller-identity

# Se non configurato, esegui:
aws configure
```

### 2. **Permessi AWS Richiesti**
- `s3:CreateBucket`
- `s3:PutBucketVersioning`
- `s3:PutBucketEncryption`
- `s3:PutBucketCors`
- `s3:PutBucketLifecycleConfiguration`
- `iam:CreatePolicy`
- `iam:CreateRole`
- `iam:AttachRolePolicy`
- `iam:TagRole`
- `cloudwatch:PutDashboard`

### 3. **Account AWS con Accesso**
- Account AWS attivo
- Regione: `eu-north-1` (configurata di default)
- Budget configurato per monitorare costi

## 🚀 Setup Automatico

### **Opzione 1: Script Automatico (Raccomandato)**

```bash
# Vai nella directory backend
cd backend

# Esegui setup per ambiente di sviluppo
./scripts/setup-s3-infrastructure.sh dev

# Esegui setup per ambiente di staging
./scripts/setup-s3-infrastructure.sh staging

# Esegui setup per ambiente di produzione
./scripts/setup-s3-infrastructure.sh prod
```

### **Opzione 2: Setup Manuale**

Se preferisci configurare manualmente, segui la documentazione completa in `S3_INFRASTRUCTURE_SETUP.md`.

## 📁 File Generati

Dopo l'esecuzione dello script, verranno generati:

- **`.env.s3`** - Configurazione backend
- **`.env.local.s3`** - Configurazione frontend
- **Dashboard CloudWatch** per monitoring

## 🔧 Configurazione Post-Setup

### 1. **Backend Configuration**
```bash
# Copia configurazione S3 nel file .env
cp .env.s3 .env

# Verifica configurazione
cat .env | grep S3_
```

### 2. **Frontend Configuration**
```bash
# Copia configurazione S3 nel file .env.local
cp .env.local.s3 .env.local

# Verifica configurazione
cat .env.local | grep NEXT_PUBLIC_S3_
```

### 3. **Verifica Configurazione**
```bash
# Testa la configurazione S3
./scripts/test-s3-setup.sh
```

## 🧪 Testing e Verifica

### **Script di Test Completo**
```bash
# Esegui tutti i test
./scripts/test-s3-setup.sh
```

### **Test Manuali**
```bash
# Test connessione bucket
aws s3 ls s3://miosaas-files-dev

# Test presigned URL
aws s3 presign s3://miosaas-files-dev/test/file.txt --expires-in 3600

# Verifica configurazioni
aws s3api get-bucket-versioning --bucket miosaas-files-dev
aws s3api get-bucket-encryption --bucket miosaas-files-dev
aws s3api get-bucket-cors --bucket miosaas-files-dev
```

## 📊 Monitoring e Dashboard

### **CloudWatch Dashboard**
- Nome: `MioSaaS-S3-Monitoring-{ENV}`
- Metriche: Numero oggetti, dimensione bucket, richieste
- Periodo: 5 minuti
- Regione: `eu-north-1`

### **Metriche Monitorate**
- `NumberOfObjects` - Numero totale oggetti
- `BucketSizeBytes` - Dimensione bucket per storage class
- `AllRequests` - Richieste totali
- `GetRequests` - Richieste GET
- `PutRequests` - Richieste PUT
- `DeleteRequests` - Richieste DELETE

## 🔒 Sicurezza Implementata

### **1. Encryption**
- ✅ AES-256 encryption per tutti i file
- ✅ Bucket key abilitato per ridurre costi
- ✅ Intelligent Tiering per ottimizzazione

### **2. Access Control**
- ✅ IAM policies con principio del minimo privilegio
- ✅ Role-based access control
- ✅ Tenant isolation tramite prefissi chiavi

### **3. Compliance**
- ✅ Versioning abilitato per audit trail
- ✅ Lifecycle rules per gestione costi
- ✅ Access logging configurabile

## 💰 Gestione Costi

### **Lifecycle Rules**
- **90 giorni**: Spostamento in STANDARD_IA
- **365 giorni**: Spostamento in GLACIER
- **2555 giorni**: Eliminazione automatica

### **Intelligent Tiering**
- Movimento automatico tra storage class
- Ottimizzazione costi basata su accesso
- Nessun costo aggiuntivo per transizioni

### **Monitoraggio Costi**
```bash
# Verifica costi S3
aws ce get-cost-and-usage \
    --time-period Start=2024-01-01,End=2024-01-31 \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE
```

## 🚨 Troubleshooting

### **Errori Comuni**

#### 1. **Bucket Already Exists**
```bash
# Verifica se bucket esiste
aws s3api head-bucket --bucket miosaas-files-dev

# Se esiste, lo script continuerà con la configurazione
```

#### 2. **Permission Denied**
```bash
# Verifica permessi AWS
aws sts get-caller-identity

# Verifica policy attaccate
aws iam list-attached-user-policies --user-name YOUR_USERNAME
```

#### 3. **CORS Configuration Failed**
```bash
# Verifica configurazione CORS
aws s3api get-bucket-cors --bucket miosaas-files-dev

# Reapplica configurazione
aws s3api put-bucket-cors --bucket miosaas-files-dev --cors-configuration file://cors.json
```

#### 4. **IAM Role Creation Failed**
```bash
# Verifica se role esiste
aws iam get-role --role-name MioSaaSBackendS3Role

# Elimina e ricrea se necessario
aws iam delete-role --role-name MioSaaSBackendS3Role
```

### **Log e Debug**
```bash
# Abilita debug AWS CLI
export AWS_CLI_DEBUG=1

# Verifica log CloudWatch
aws logs describe-log-groups --log-group-name-prefix /aws/s3
```

## 📚 Documentazione Riferimento

- **Setup Completo**: `S3_INFRASTRUCTURE_SETUP.md`
- **Configurazione**: `env.s3.example`
- **Script Setup**: `scripts/setup-s3-infrastructure.sh`
- **Script Test**: `scripts/test-s3-setup.sh`

## 🚀 Prossimi Passi

Dopo il completamento della Fase 1:

1. **✅ Fase 1: Setup Infrastruttura S3 e IAM** ← **COMPLETATO**
2. **🔄 Fase 2: Database Schema e Tabelle**
3. **⏳ Fase 3: Servizi Backend per Gestione File**
4. **⏳ Fase 4: API Endpoints e Middleware**
5. **⏳ Fase 5: Frontend Components e UI**
6. **⏳ Fase 6: Testing e Sicurezza**
7. **⏳ Fase 7: Deployment e Monitoring**

## 📞 Supporto

### **Per Problemi Tecnici**
1. Controlla i log AWS CloudWatch
2. Verifica permessi IAM
3. Controlla configurazione CORS
4. Verifica regioni e nomi bucket

### **Per Domande Generali**
- Controlla la documentazione in `docs/`
- Verifica i report di test generati
- Controlla le metriche CloudWatch

## 🎉 Completamento Fase 1

Una volta completata questa fase, avrai:

- ✅ Bucket S3 configurato e sicuro
- ✅ IAM policies e roles configurati
- ✅ CORS abilitato per frontend
- ✅ Lifecycle rules per gestione costi
- ✅ Monitoring CloudWatch attivo
- ✅ Isolamento tenant implementato
- ✅ File di configurazione generati

**Procedi con la Fase 2: Database Schema!** 🚀
