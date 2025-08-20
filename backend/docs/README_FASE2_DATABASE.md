# 🔄 Fase 2: Database Schema e Tabelle - MioSaaS S3

## 📋 Panoramica

La **Fase 2** implementa lo schema del database per integrare la gestione file S3 con le tabelle esistenti di MioSaaS, mantenendo la compatibilità e l'isolamento tenant.

## 🎯 Obiettivi

- ✅ **Integrazione S3** con tabelle esistenti
- ✅ **Isolamento tenant** per file e metadati
- ✅ **Compatibilità** con codice esistente
- ✅ **Performance** ottimizzate con indici
- ✅ **Automazione** con triggers e funzioni

## 🏗️ Architettura Database

### **Struttura Principale**

```
┌─────────────────────────────────────────────────────────────┐
│                    TABELLE ESISTENTI                       │
├─────────────────────────────────────────────────────────────┤
│ documents     │ rapportini    │ commesse                   │
│ (condivisa)   │ (condivisa)   │ (condivisa)               │
│ company_id    │ company_id    │ company_id                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                NUOVA TABELLA CENTRALE                      │
├─────────────────────────────────────────────────────────────┤
│                    file_attachments                        │
│                                                           │
│  • company_id (FK → companies.id)                        │
│  • s3_key, s3_bucket, s3_version_id                      │
│  • section, category, entity_type, entity_id             │
│  • metadata, permissions, workflow                       │
│  • tracking, audit, statistics                           │
└─────────────────────────────────────────────────────────────┘
```

### **Relazioni e Isolamento**

- **`file_attachments.company_id`** → **`companies.id`** (FK con CASCADE)
- **`file_attachments.entity_id`** → **Tabelle esistenti** (opzionale)
- **Isolamento tenant** garantito tramite `company_id` in tutte le query
- **Relazioni bidirezionali** mantenute con campi JSONB nelle tabelle esistenti

## 📊 Schema Dettagliato

### **Tabella `file_attachments`**

| Campo | Tipo | Descrizione | Esempio |
|-------|------|-------------|---------|
| `id` | UUID | ID univoco file | `123e4567-e89b-12d3-a456-426614174000` |
| `company_id` | UUID | ID azienda tenant | `987fcdeb-51a2-43d1-9f12-345678901234` |
| `s3_key` | VARCHAR(1000) | Chiave S3 completa | `company_id/commesse/contratti/entity_id/filename.pdf` |
| `s3_bucket` | VARCHAR(255) | Nome bucket S3 | `miosaas-files-dev` |
| `section` | VARCHAR(50) | Sezione principale | `commesse`, `rapportini`, `documenti` |
| `category` | VARCHAR(100) | Categoria specifica | `contratti`, `foto`, `fatture` |
| `entity_type` | VARCHAR(50) | Tipo entità | `commessa`, `rapportino`, `documento` |
| `entity_id` | UUID | ID entità associata | Opzionale per file standalone |
| `visibility` | VARCHAR(20) | Visibilità file | `private`, `company`, `public` |
| `status` | VARCHAR(50) | Status workflow | `active`, `pending_approval`, `approved` |

### **Campi Aggiunti alle Tabelle Esistenti**

#### **`documents`**
```sql
ALTER TABLE documents ADD COLUMN file_attachments JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN primary_file_id UUID REFERENCES file_attachments(id);
ALTER TABLE documents ADD COLUMN file_count INTEGER DEFAULT 0;
```

#### **`rapportini`**
```sql
ALTER TABLE rapportini ADD COLUMN file_attachments JSONB DEFAULT '[]';
ALTER TABLE rapportini ADD COLUMN photo_attachments JSONB DEFAULT '[]';
ALTER TABLE rapportini ADD COLUMN document_attachments JSONB DEFAULT '[]';
ALTER TABLE rapportini ADD COLUMN file_count INTEGER DEFAULT 0;
```

#### **`commesse`**
```sql
ALTER TABLE commesse ADD COLUMN file_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN contract_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN invoice_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN photo_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN document_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN file_count INTEGER DEFAULT 0;
```

## 🔧 Funzioni Database

### **`generate_s3_key()`**
Genera chiavi S3 standardizzate per organizzazione file.

```sql
SELECT generate_s3_key(
    'company_id',
    'commesse',
    'contratti',
    'entity_id',
    'filename.pdf'
);
-- Risultato: company_id/commesse/contratti/entity_id/filename.pdf
```

### **`get_tenant_storage_usage()`**
Calcola dimensione totale file per tenant.

```sql
SELECT get_tenant_storage_usage('company_id');
-- Risultato: 1073741824 (bytes)
```

### **`get_file_stats_by_section()`**
Statistiche file per sezione e categoria.

```sql
SELECT * FROM get_file_stats_by_section('company_id');
-- Risultato: section, category, file_count, total_size, avg_size
```

## 🚀 Triggers e Automazione

### **Aggiornamento Automatico File Count**

I triggers mantengono sincronizzati i campi `file_count` e gli array `file_attachments` nelle tabelle esistenti:

- **`update_documents_file_count_trigger`** → Aggiorna `documents`
- **`update_rapportini_file_count_trigger`** → Aggiorna `rapportini`
- **`update_commesse_file_count_trigger`** → Aggiorna `commesse`

### **Comportamento Triggers**

1. **INSERT**: Aggiorna file count e array nella tabella associata
2. **DELETE**: Ricalcola file count e array dopo rimozione
3. **UPDATE**: Gestisce cambiamenti di `entity_id` o `company_id`

## 📈 Views e Statistiche

### **`file_attachments_view`**
Vista completa con informazioni file, utenti e URL S3.

### **`tenant_file_stats`**
Statistiche aggregate per tenant (conteggio file, dimensioni, sezioni).

### **`recent_files_view`**
File recenti ordinati per data upload.

## 🗂️ Organizzazione File S3

### **Struttura Chiavi S3**

```
s3://bucket-name/
├── company_id_1/
│   ├── commesse/
│   │   ├── contratti/
│   │   │   └── entity_id_1/
│   │   │       └── contratto_20241201_120000.pdf
│   │   ├── foto/
│   │   └── documenti/
│   ├── rapportini/
│   │   ├── foto/
│   │   └── documenti/
│   └── documenti/
│       ├── fatture/
│       └── preventivi/
└── company_id_2/
    └── ...
```

### **Convenzioni Naming**

- **Sezioni**: `commesse`, `rapportini`, `documenti`, `costi`, `ricavi`
- **Categorie**: Specifiche per sezione (es: `contratti`, `foto`, `fatture`)
- **Timestamp**: Formato `YYYYMMDD_HHMMSS` per evitare conflitti
- **Entity ID**: UUID dell'entità associata (opzionale)

## 🔒 Sicurezza e Permessi

### **Isolamento Tenant**

- **Row Level Security** tramite `company_id` in tutte le query
- **Foreign Key Constraints** con `ON DELETE CASCADE`
- **Access Control** configurabile per file specifici

### **Visibilità File**

- **`private`**: Solo utente creatore
- **`company`**: Tutti gli utenti del tenant
- **`public`**: Accesso pubblico (con approvazione)

### **Workflow Approvazione**

- **`approval_required`**: Flag per file che richiedono approvazione
- **`approved_by`**: Utente che ha approvato
- **`approved_at`**: Timestamp approvazione
- **`approval_notes`**: Note per l'approvazione

## 📊 Performance e Ottimizzazione

### **Indici Principali**

```sql
-- Indici per query frequenti
CREATE INDEX idx_file_attachments_company_id ON file_attachments(company_id);
CREATE INDEX idx_file_attachments_section ON file_attachments(section);
CREATE INDEX idx_file_attachments_entity ON file_attachments(entity_type, entity_id);

-- Indici compositi per query complesse
CREATE INDEX idx_file_attachments_company_section ON file_attachments(company_id, section);
CREATE INDEX idx_file_attachments_company_category ON file_attachments(company_id, category);

-- Indici per ricerca full-text
CREATE INDEX idx_file_attachments_filename_search ON file_attachments USING gin(to_tsvector('italian', original_filename));

-- Indici per JSON e array
CREATE INDEX idx_file_attachments_metadata ON file_attachments USING gin(metadata);
```

### **Strategie Query**

- **Filtri primari**: `company_id`, `section`, `category`
- **Ricerca full-text**: Nome file e testo estratto
- **Aggregazioni**: Statistiche per tenant e sezioni
- **Paginazione**: Ordinamento per `created_at` o `uploaded_at`

## 🚀 Esecuzione Migration

### **Script Automatico**

```bash
# Esecuzione base
./scripts/run-s3-migration.sh

# Con backup database
./scripts/run-s3-migration.sh --backup

# Con pulizia file temporanei
./scripts/run-s3-migration.sh --clean
```

### **Esecuzione Manuale**

```bash
# Applica schema completo
psql $DATABASE_URL -f src/database/migrations/s3-file-management-migration.sql

# Verifica creazione tabella
psql $DATABASE_URL -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'file_attachments');"

# Test funzioni
psql $DATABASE_URL -c "SELECT generate_s3_key('test', 'commesse', 'contratti');"
```

## ✅ Verifica Migration

### **Checklist Completamento**

- [ ] Tabella `file_attachments` creata
- [ ] Campi aggiunti a `documents`, `rapportini`, `commesse`
- [ ] Funzioni database create e testate
- [ ] Triggers attivi e funzionanti
- [ ] Views create e accessibili
- [ ] Indici creati per performance
- [ ] Constraints e validazioni attive

### **Test Funzionalità**

```sql
-- Verifica tabella
SELECT COUNT(*) FROM file_attachments;

-- Verifica campi aggiunti
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'documents' AND column_name LIKE '%file%';

-- Test funzione S3 key
SELECT generate_s3_key('test', 'commesse', 'contratti');

-- Verifica views
SELECT * FROM tenant_file_stats LIMIT 5;
```

## 🔄 Compatibilità Codice Esistente

### **Modifiche Minime**

- **Aggiunta campi** senza rimozione esistenti
- **Triggers automatici** per sincronizzazione
- **API esistenti** continuano a funzionare
- **Middleware tenant** già compatibile

### **Nuove Funzionalità**

- **Gestione file S3** integrata
- **Metadati estesi** per file
- **Workflow approvazione** configurabile
- **Statistiche e reporting** avanzati

## 📚 File e Documentazione

### **File Principali**

- **Schema**: `src/database/schemas/file-attachments.sql`
- **Migration**: `src/database/migrations/s3-file-management-migration.sql`
- **Aggiornamento**: `src/database/schemas/update-existing-tables.sql`
- **Script**: `scripts/run-s3-migration.sh`

### **Documentazione Correlata**

- **Fase 1**: Setup Infrastruttura S3 e IAM
- **Fase 3**: Servizi Backend per Gestione File
- **API Reference**: Endpoint per gestione file
- **Frontend Integration**: Componenti per upload/download

## 🚀 Prossimi Passi

### **Fase 3: Servizi Backend**

1. **File Service**: Gestione operazioni CRUD file
2. **Upload Service**: Gestione upload con presigned URLs
3. **Download Service**: Gestione download e permessi
4. **File Routes**: API endpoints per gestione file

### **Integrazione Frontend**

1. **File Upload Component**: Drag & drop, progress bar
2. **File Manager**: Visualizzazione, ricerca, organizzazione
3. **File Preview**: Anteprima file supportati
4. **Permission Management**: Gestione permessi file

### **Testing e Validazione**

1. **Unit Tests**: Servizi e funzioni database
2. **Integration Tests**: API endpoints e database
3. **Performance Tests**: Upload/download multipli
4. **Security Tests**: Isolamento tenant e permessi

## 🎯 Risultati Attesi

- ✅ **Database schema** completo per gestione file S3
- ✅ **Integrazione seamless** con tabelle esistenti
- ✅ **Performance ottimizzate** per query complesse
- ✅ **Sicurezza e isolamento** tenant garantiti
- ✅ **Automazione** per sincronizzazione dati
- ✅ **Scalabilità** per gestione file enterprise

---

**📅 Data**: Dicembre 2024  
**👨‍💻 Autore**: MioSaaS Development Team  
**🔗 Versione**: 1.0.0  
**📋 Status**: Completata
