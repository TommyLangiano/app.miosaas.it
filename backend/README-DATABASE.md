# 🗄️ Configurazione Database PostgreSQL per MioSaaS

## 📋 Overview

Sistema di database multi-tenant sicuro con supporto per PostgreSQL RDS su AWS e sviluppo locale.

## 🏗️ Architettura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Express.js    │───▶│  Database Pool   │───▶│ PostgreSQL RDS  │
│   Multi-Tenant  │    │   (pg library)   │    │  (Production)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │
        ▼
┌─────────────────┐
│ Tenant Tables   │
│ documents_co1   │
│ documents_co2   │
│ users_co1       │
│ users_co2       │
└─────────────────┘
```

## ⚙️ Configurazione Locale

### `.env` per Sviluppo
```env
# Database locale
DB_HOST=localhost
DB_PORT=5432
DB_NAME=miosaas_db
DB_USER=postgres
DB_PASSWORD=password

# Configurazione Pool
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# Tenant Configuration
AUTO_CREATE_TENANT_TABLES=true
```

## 🌐 Configurazione Produzione (Amplify + RDS)

### 1. Crea RDS PostgreSQL Instance

```bash
# Via AWS CLI
aws rds create-db-instance \
  --db-instance-identifier miosaas-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.9 \
  --master-username postgres \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-12345678 \
  --db-subnet-group-name default \
  --backup-retention-period 7 \
  --storage-encrypted \
  --multi-az false
```

### 2. Variabili d'Ambiente Amplify

Nel tuo `amplify.yml`:

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci
        - npm run build
frontend:
  phases:
    preBuild:
      commands:
        - cd backend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - backend/node_modules/**/*
environment:
  variables:
    NODE_ENV: production
    # Database Configuration
    DATABASE_URL: postgresql://postgres:PASSWORD@miosaas-db.xxxxx.eu-north-1.rds.amazonaws.com:5432/main?ssl=true
    DB_POOL_MAX: 20
    DB_IDLE_TIMEOUT: 30000
    DB_CONNECTION_TIMEOUT: 2000
    DB_STATEMENT_TIMEOUT: 30000
    DB_QUERY_TIMEOUT: 30000
    
    # Security
    AUTO_CREATE_TENANT_TABLES: true
    
    # AWS
    AWS_REGION: eu-north-1
```

### 3. Configurazione Sicurezza RDS

**Security Group Rules:**
```bash
# Ingress Rules
Port: 5432
Protocol: TCP
Source: 0.0.0.0/0 (o meglio: specifici Security Groups di Amplify)

# Encryption
- Storage Encryption: Enabled
- SSL Mode: require
- Certificate: rds-ca-2019
```

## 🔧 API del Database

### Configurazione Pool
```typescript
import { db } from './config/db';

// Health check
const health = await db.healthCheck();

// Query diretta
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Transazione
await db.transaction(async (client) => {
  await client.query('INSERT INTO users...');
  await client.query('INSERT INTO logs...');
});
```

### Servizi Multi-Tenant
```typescript
import { DatabaseService, DocumentsService } from './services/database.service';

// Inizializza tenant
await DatabaseService.initializeTenant('company123');

// Query documenti
const docs = await DocumentsService.findByUser('company123', 'user-sub', 20);

// Statistiche tenant
const stats = await DatabaseService.getTenantStats('company123');
```

## 📊 Health Check Endpoint

```http
GET /health

Response:
{
  "status": "OK", // o "DEGRADED" o "ERROR"
  "database": {
    "status": "healthy",
    "details": {
      "currentTime": "2024-01-01T12:00:00.000Z",
      "version": "PostgreSQL 14.9",
      "responseTime": "15ms",
      "activeConnections": 3,
      "idleConnections": 7
    }
  },
  "pool": {
    "totalCount": 10,
    "idleCount": 7,
    "waitingCount": 0
  }
}
```

## 🔐 Sicurezza

### 1. Connection String Sicura
```env
# Produzione - con SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?ssl=true&sslmode=require

# Sviluppo - senza SSL
DATABASE_URL=postgresql://user:pass@localhost:5432/db?ssl=false
```

### 2. Sanitizzazione Query
```typescript
// ✅ Sicuro - usa parametri
await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ NON sicuro - concatenazione stringa
await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### 3. Isolamento Tenant
```typescript
// Tabelle isolate per tenant
const tableName = getTableName('documents', companyId); // documents_company123
const sanitizedId = companyId.replace(/[^a-zA-Z0-9_]/g, ''); // Solo caratteri sicuri
```

## 🚀 Deployment su Amplify

### 1. Setup Repository
```bash
# Push del codice
git add .
git commit -m "Database configuration per RDS"
git push origin main
```

### 2. Amplify Console
1. Vai su AWS Amplify Console
2. Connetti il repository
3. Aggiungi le variabili d'ambiente
4. Deploy!

### 3. Monitoring
```bash
# CloudWatch Logs
aws logs tail /aws/amplify/app-id --follow

# RDS Monitoring
aws rds describe-db-instances --db-instance-identifier miosaas-db
```

## 🔧 Troubleshooting

### Errori Comuni

**1. "role postgres does not exist"**
```bash
# Crea l'utente nel database locale
sudo -u postgres createuser --superuser postgres
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
```

**2. "Connection timeout"**
- Verifica Security Groups RDS
- Controlla VPC configuration
- Verifica che l'endpoint RDS sia corretto

**3. "SSL required"**
```typescript
// Aggiungi SSL alla configurazione
ssl: {
  rejectUnauthorized: false,
  ca: fs.readFileSync('rds-ca-2019-root.pem')
}
```

## 📈 Performance

### Ottimizzazioni Pool
```env
# Per alta concorrenza
DB_POOL_MAX=50
DB_IDLE_TIMEOUT=10000
DB_CONNECTION_TIMEOUT=5000

# Per bassa latenza
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

### Query Performance
```sql
-- Indexes per performance
CREATE INDEX CONCURRENTLY idx_documents_company_created 
ON documents_company123 (created_at DESC);

CREATE INDEX CONCURRENTLY idx_documents_company_status 
ON documents_company123 (status) WHERE status = 'active';
```

## 📝 Migration Strategy

```typescript
// Migrazione automatica per tutti i tenant
const result = await DatabaseService.migrateAllTenants();
console.log('Migrati:', result.success);
console.log('Falliti:', result.failed);
```

🎯 **Il sistema è ora pronto per la produzione con PostgreSQL RDS su AWS Amplify!**