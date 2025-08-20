-- ============================================================================
-- SCHEMA TABELLE CONDIVISE PER MIOSAAS
-- ============================================================================
-- Queste tabelle sono condivise tra tutti i tenant con isolamento tramite company_id
-- ============================================================================

-- ============================================================================
-- TABELLA DOCUMENTS (CONDIVISA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informazioni documento
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- File information (legacy)
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Categorizzazione
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    
    -- Metadata e contenuto
    metadata JSONB DEFAULT '{}',
    extracted_text TEXT,
    
    -- Permessi e sharing
    visibility VARCHAR(20) DEFAULT 'private',
    shared_with JSONB DEFAULT '[]',
    
    -- Workflow status
    status VARCHAR(50) DEFAULT 'draft',
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    
    -- Tracking
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Tenant isolation
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT documents_status_check CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived', 'deleted')),
    CONSTRAINT documents_visibility_check CHECK (visibility IN ('private', 'company', 'public')),
    CONSTRAINT documents_tags_array CHECK (jsonb_typeof(tags) = 'array'),
    CONSTRAINT documents_shared_array CHECK (jsonb_typeof(shared_with) = 'array')
);

-- ============================================================================
-- TABELLA RAPPORTINI (CONDIVISA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rapportini (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informazioni base
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Dettagli lavoro
    work_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    total_hours DECIMAL(5,2),
    
    -- Progetto e commessa
    project_id UUID,
    commessa_id UUID,
    
    -- Location e dettagli
    location VARCHAR(255),
    work_type VARCHAR(100),
    
    -- Billing
    billable BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    
    -- Status e approvazione
    status VARCHAR(50) DEFAULT 'draft',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    
    -- Tracking
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Tenant isolation
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT rapportini_status_check CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'archived')),
    CONSTRAINT rapportini_hours_positive CHECK (total_hours >= 0),
    CONSTRAINT rapportini_rate_positive CHECK (hourly_rate >= 0)
);

-- ============================================================================
-- TABELLA COMMESSE (CONDIVISA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS commesse (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informazioni base
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Dettagli progetto
    project_type VARCHAR(100),
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    
    -- Date e timeline
    start_date DATE,
    end_date DATE,
    estimated_duration INTEGER, -- giorni
    
    -- Budget e costi
    budget DECIMAL(12,2),
    hourly_rate DECIMAL(10,2),
    total_hours DECIMAL(8,2),
    total_cost DECIMAL(12,2),
    
    -- Status e progresso
    status VARCHAR(50) DEFAULT 'active',
    progress_percentage INTEGER DEFAULT 0,
    
    -- Tracking
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Tenant isolation
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT commesse_status_check CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
    CONSTRAINT commesse_progress_check CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT commesse_budget_positive CHECK (budget >= 0),
    CONSTRAINT commesse_rate_positive CHECK (hourly_rate >= 0)
);

-- ============================================================================
-- INDEXES PER PERFORMANCE
-- ============================================================================

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_name_search ON documents USING gin(to_tsvector('italian', name));
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING gin(tags);

-- Rapportini indexes
CREATE INDEX IF NOT EXISTS idx_rapportini_company_id ON rapportini(company_id);
CREATE INDEX IF NOT EXISTS idx_rapportini_work_date ON rapportini(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_rapportini_status ON rapportini(status);
CREATE INDEX IF NOT EXISTS idx_rapportini_created_by ON rapportini(created_by);
CREATE INDEX IF NOT EXISTS idx_rapportini_project_id ON rapportini(project_id);
CREATE INDEX IF NOT EXISTS idx_rapportini_commessa_id ON rapportini(commessa_id);

-- Commesse indexes
CREATE INDEX IF NOT EXISTS idx_commesse_company_id ON commesse(company_id);
CREATE INDEX IF NOT EXISTS idx_commesse_status ON commesse(status);
CREATE INDEX IF NOT EXISTS idx_commesse_start_date ON commesse(start_date);
CREATE INDEX IF NOT EXISTS idx_commesse_client_name ON commesse(client_name);
CREATE INDEX IF NOT EXISTS idx_commesse_created_by ON commesse(created_by);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_documents_company_status ON documents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_rapportini_company_date ON rapportini(company_id, work_date);
CREATE INDEX IF NOT EXISTS idx_commesse_company_status ON commesse(company_id, status);

-- ============================================================================
-- TRIGGERS PER AUTO-UPDATE
-- ============================================================================

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rapportini_updated_at 
    BEFORE UPDATE ON rapportini
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commesse_updated_at 
    BEFORE UPDATE ON commesse
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTI SULLE TABELLE
-- ============================================================================

COMMENT ON TABLE documents IS 'Documenti condivisi per tutti i tenant con isolamento company_id';
COMMENT ON TABLE rapportini IS 'Rapportini di lavoro condivisi per tutti i tenant';
COMMENT ON TABLE commesse IS 'Commesse/progetti condivisi per tutti i tenant';

COMMENT ON COLUMN documents.company_id IS 'ID azienda per isolamento tenant';
COMMENT ON COLUMN rapportini.company_id IS 'ID azienda per isolamento tenant';
COMMENT ON COLUMN commesse.company_id IS 'ID azienda per isolamento tenant';

-- ============================================================================
-- MESSAGGIO DI COMPLETAMENTO
-- ============================================================================

SELECT 'Tabelle condivise create con successo!' as message;
