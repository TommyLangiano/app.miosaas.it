# 🗄️ Schema Database e Tabelle per MioSaaS

## 📋 Overview

Sistema completo con tabelle globali condivise e tabelle tenant dinamiche per supportare l'architettura multi-tenant.

## 🏗️ Architettura Database

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE GLOBALE                        │
├─────────────────────────────────────────────────────────────┤
│ 🌐 TABELLE CONDIVISE (per tutti i tenant)                 │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │    roles    │ │    plans    │ │ migrations  │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐                           │
│ │ companies   │ │    users    │                           │
│ └─────────────┘ └─────────────┘                           │
├─────────────────────────────────────────────────────────────┤
│ 🏢 TABELLE TENANT-SPECIFIC (per ogni azienda)             │
│                                                             │
│ Company: "acme_inc"          Company: "startup_xyz"        │
│ ┌─────────────────────┐      ┌─────────────────────┐      │
│ │ documents_acme_inc  │      │ documents_startup_xyz│      │
│ │ reports_acme_inc    │      │ reports_startup_xyz  │      │
│ │ rapportini_acme_inc │      │ rapportini_startup_xyz│     │
│ └─────────────────────┘      └─────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 🌐 Tabelle Globali

### 1. **roles** - Ruoli e Permessi
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR UNIQUE) → 'super_admin', 'company_owner', 'user'
- description (TEXT)
- permissions (JSONB) → ["documents:read", "users:manage"]
- is_system_role (BOOLEAN)
- created_at, updated_at
```

**Ruoli Predefiniti:**
- `super_admin` → Accesso completo al sistema
- `company_owner` → Controllo completo del tenant
- `company_admin` → Gestione utenti e dati aziendali
- `manager` → Supervisione team e report
- `user` → Accesso standard ai documenti
- `viewer` → Solo lettura

### 2. **plans** - Piani di Abbonamento
```sql
- id (SERIAL PRIMARY KEY)
- name, slug (VARCHAR)
- price_month, price_year (DECIMAL)
- max_users, max_storage_gb (INTEGER)
- features (JSONB) → ["documents:full", "reports:advanced"]
- custom_branding, api_access (BOOLEAN)
- is_active, is_popular
```

**Piani Predefiniti:**
- `free` → 3 utenti, 1GB storage
- `starter` → 10 utenti, 10GB, €29.99/mese
- `professional` → 50 utenti, 100GB, €79.99/mese
- `enterprise` → Illimitato, €199.99/mese

### 3. **companies** - Aziende/Tenant
```sql
- id (UUID PRIMARY KEY)
- name, slug, email (VARCHAR)
- plan_id → FK to plans
- subscription_id, subscription_status
- s3_bucket_name, db_schema_prefix
- company_size, industry, country
- status → 'active', 'suspended', 'trial'
- settings (JSONB)
```

### 4. **users** - Utenti Globali
```sql
- id (UUID PRIMARY KEY)
- email, name, surname (VARCHAR)
- cognito_sub (VARCHAR UNIQUE) → AWS Cognito identifier
- company_id → FK to companies
- role_id → FK to roles
- status, email_verified, phone
- settings, preferences (JSONB)
- last_login, login_count
```

## 🏢 Tabelle Tenant (per ogni azienda)

### 1. **documents_{companyId}** - Gestione Documenti
```sql
- id (SERIAL PRIMARY KEY)
- name, description, category
- file_path, file_size, mime_type, file_hash
- version, parent_document_id (per versioning)
- tags, metadata (JSONB)
- visibility → 'private', 'company', 'public'
- status → 'draft', 'review', 'approved', 'published'
- created_by, updated_by (UUID → users.id)
- created_at, updated_at, published_at
```

**Features Avanzate:**
- 📝 Versioning documenti
- 🔍 Full-text search con PostgreSQL
- 🏷️ Sistema di tag JSONB
- 👥 Sharing e collaborazione
- ✅ Workflow di approvazione

### 2. **reports_{companyId}** - Report e Analytics
```sql
- id (SERIAL PRIMARY KEY)
- name, description, report_type
- period_start, period_end (DATE)
- data, charts_config (JSONB)
- template_id, format → 'pdf', 'excel', 'html'
- status → 'draft', 'generating', 'completed'
- generation_progress (0-100)
- is_scheduled, schedule_config (JSONB)
- shared_with, email_recipients (JSONB)
```

**Funzionalità:**
- 📊 Report schedulati automatici
- 📈 Configurazione grafici dinamica
- 📧 Invio automatico via email
- 🔄 Generazione asincrona con progress

### 3. **rapportini_{companyId}** - Rapportini di Lavoro
```sql
- id (SERIAL PRIMARY KEY)
- title, description, client_name
- work_date, start_time, end_time
- total_hours, work_type, location
- activities, materials_used (JSONB)
- deliverables, next_steps, issues_encountered
- requires_approval, approved_by
- status → 'draft', 'submitted', 'approved', 'billed'
- is_billable, hourly_rate, total_amount
- attachments, photos (JSONB)
- latitude, longitude (geolocation)
```

**Caratteristiche Speciali:**
- ⏱️ Calcolo automatico ore lavorate
- 💰 Gestione fatturazione integrata
- 📍 Geolocalizzazione opzionale
- 📎 Allegati e foto
- ✅ Sistema di approvazione

## 🛠️ Sistema di Migrazione

### Comandi Disponibili

```bash
# Status delle migrazioni
npm run migrate:status

# Applica tutte le migrazioni pendenti
npm run migrate:up

# Rollback ultima migrazione
npm run migrate:down

# Health check database
npm run db:health

# Crea tabelle per nuovo tenant
npm run db:create-tenant company123
```

### Struttura Migrazioni

```
src/database/
├── migrations/
│   ├── migrate.ts              ← Runner principale
│   └── 001-create-global-tables.ts ← Prima migrazione
├── schemas/
│   ├── global-tables.sql       ← Schema tabelle globali
│   └── tenant-tables.sql       ← Template tabelle tenant
```

## 🔧 API e Servizi

### Servizi Globali

```typescript
// Plans
import { PlansService } from './services/global-database.service';
const plans = await PlansService.getAll();
const plan = await PlansService.getBySlug('professional');

// Companies
import { CompaniesService } from './services/global-database.service';
const company = await CompaniesService.getBySlug('acme-inc');
await CompaniesService.updateSubscription(companyId, { plan_id: 2 });

// Users
import { GlobalUsersService } from './services/global-database.service';
const user = await GlobalUsersService.getByCognitoSub('cognito-sub-123');
await GlobalUsersService.updateLastLogin('cognito-sub-123');

// Stats
import { StatsService } from './services/global-database.service';
const globalStats = await StatsService.getGlobalStats();
```

### Servizi Tenant

```typescript
// Database tenant-specific
import { DatabaseService } from './services/database.service';
await DatabaseService.initializeTenant('company123');
const stats = await DatabaseService.getTenantStats('company123');

// Documenti
import { DocumentsService } from './services/database.service';
const docs = await DocumentsService.findByUser('company123', 'user-sub', 20);
const results = await DocumentsService.searchDocuments('company123', 'contratto');
```

## 📊 Viste e Statistiche

### Viste Globali Predefinite

```sql
-- Informazioni complete aziende
SELECT * FROM company_details;

-- Statistiche utenti per azienda
SELECT * FROM company_user_stats;
```

### Viste Tenant

```sql
-- Statistiche documenti per tenant
SELECT * FROM documents_stats_company123;

-- Report mensili rapportini
SELECT * FROM rapportini_monthly_company123;
```

## 🔐 Sicurezza e Isolamento

### Isolamento Tenant
- ✅ **Tabelle separate** per ogni tenant
- ✅ **Naming dinamico** `documents_{companyId}`
- ✅ **Validazione companyId** solo caratteri alfanumerici
- ✅ **Middleware di controllo** accesso automatico

### Permessi e Ruoli
- 🔐 **Sistema ruoli granulare** con permessi JSONB
- 👤 **Utenti globali** con associazione tenant
- 🚫 **Controllo accesso** basato su ruolo e company
- ✅ **Audit trail** con created_by/updated_by

### Sicurezza Database
- 🛡️ **Query parametrizzate** per prevenire SQL injection
- 🔒 **Constraint check** per validazione dati
- 📝 **Indexes ottimizzati** per performance
- 🏗️ **Triggers automatici** per updated_at

## 🚀 Deployment

### Configurazione Produzione

```env
# Database RDS
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/miosaas?ssl=true

# Auto-creazione tabelle
AUTO_CREATE_TENANT_TABLES=true

# Pool configuration
DB_POOL_MAX=50
DB_IDLE_TIMEOUT=30000
```

### Script di Setup

```bash
# Setup iniziale database
npm run migrate:up

# Crea tenant per nuova azienda
npm run db:create-tenant acme_inc

# Verifica health
npm run db:health
```

## 📈 Performance e Ottimizzazione

### Indexes Strategici

```sql
-- Ricerca full-text documenti
CREATE INDEX idx_documents_text_search ON documents_company123 
USING GIN(to_tsvector('italian', name || ' ' || description));

-- Query geolocalizzate rapportini
CREATE INDEX idx_rapportini_location ON rapportini_company123 (latitude, longitude);

-- Filtri data per report
CREATE INDEX idx_reports_period ON reports_company123 (period_start, period_end);
```

### Statistiche Database

```sql
-- Monitoring dimensioni tabelle
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

🎯 **Il sistema database è ora completamente strutturato e pronto per supportare l'architettura multi-tenant con scalabilità e sicurezza enterprise!**