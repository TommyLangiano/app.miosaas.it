-- ============================================================================
-- TEMPLATE TABELLE TENANT PER MIOSAAS
-- ============================================================================
-- Queste tabelle vengono create dinamicamente per ogni azienda/tenant
-- Sostituire {COMPANY_ID} con l'ID effettivo dell'azienda
-- ============================================================================

-- ============================================================================
-- TABELLA DOCUMENTS_{COMPANY_ID}
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents_{COMPANY_ID} (
    id SERIAL PRIMARY KEY,
    
    -- Informazioni documento
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- File information
    file_path VARCHAR(500),
    file_size BIGINT, -- dimensione in bytes
    mime_type VARCHAR(100),
    file_hash VARCHAR(64), -- SHA256 per deduplication
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_document_id INTEGER REFERENCES documents_{COMPANY_ID}(id) ON DELETE CASCADE,
    
    -- Categorizzazione
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    
    -- Metadata e contenuto
    metadata JSONB DEFAULT '{}',
    extracted_text TEXT, -- testo estratto per ricerca
    
    -- Permissions e sharing
    visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'company', 'public'
    shared_with JSONB DEFAULT '[]', -- array di user IDs
    
    -- Workflow status
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'published', 'archived', 'deleted'
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID, -- reference a users.id globale
    approved_at TIMESTAMP,
    
    -- Tracking
    created_by UUID NOT NULL, -- reference a users.id globale
    updated_by UUID, -- reference a users.id globale
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT documents_{COMPANY_ID}_status_check CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived', 'deleted')),
    CONSTRAINT documents_{COMPANY_ID}_visibility_check CHECK (visibility IN ('private', 'company', 'public')),
    CONSTRAINT documents_{COMPANY_ID}_tags_array CHECK (jsonb_typeof(tags) = 'array'),
    CONSTRAINT documents_{COMPANY_ID}_shared_array CHECK (jsonb_typeof(shared_with) = 'array')
);

-- Indexes per documents
CREATE INDEX IF NOT EXISTS idx_documents_{COMPANY_ID}_created_by ON documents_{COMPANY_ID}(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_{COMPANY_ID}_status ON documents_{COMPANY_ID}(status);
CREATE INDEX IF NOT EXISTS idx_documents_{COMPANY_ID}_created_at ON documents_{COMPANY_ID}(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_{COMPANY_ID}_category ON documents_{COMPANY_ID}(category);
CREATE INDEX IF NOT EXISTS idx_documents_{COMPANY_ID}_name ON documents_{COMPANY_ID}(name);
CREATE INDEX IF NOT EXISTS idx_documents_{COMPANY_ID}_file_hash ON documents_{COMPANY_ID}(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_{COMPANY_ID}_tags ON documents_{COMPANY_ID} USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_{COMPANY_ID}_text_search ON documents_{COMPANY_ID} USING GIN(to_tsvector('italian', COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(extracted_text, '')));

-- ============================================================================
-- TABELLA REPORTS_{COMPANY_ID}
-- ============================================================================
CREATE TABLE IF NOT EXISTS reports_{COMPANY_ID} (
    id SERIAL PRIMARY KEY,
    
    -- Informazioni report
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Tipologia report
    report_type VARCHAR(50) NOT NULL, -- 'monthly', 'quarterly', 'annual', 'custom', 'project'
    
    -- Periodo coperto dal report
    period_start DATE,
    period_end DATE,
    
    -- Contenuto report
    data JSONB NOT NULL DEFAULT '{}', -- dati strutturati del report
    charts_config JSONB DEFAULT '{}', -- configurazione grafici
    
    -- Template e formato
    template_id INTEGER, -- reference a template se esistono
    format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'excel', 'html'
    
    -- Status e workflow
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'generating', 'completed', 'failed', 'archived'
    generation_progress INTEGER DEFAULT 0, -- 0-100
    
    -- File generato
    generated_file_path VARCHAR(500),
    generated_file_size BIGINT,
    
    -- Scheduling
    is_scheduled BOOLEAN DEFAULT false,
    schedule_config JSONB, -- cron config per report automatici
    next_generation TIMESTAMP,
    
    -- Sharing e distribuzione
    shared_with JSONB DEFAULT '[]',
    auto_send_email BOOLEAN DEFAULT false,
    email_recipients JSONB DEFAULT '[]',
    
    -- Tracking
    created_by UUID NOT NULL,
    updated_by UUID,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_at TIMESTAMP,
    last_sent_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT reports_{COMPANY_ID}_status_check CHECK (status IN ('draft', 'generating', 'completed', 'failed', 'archived')),
    CONSTRAINT reports_{COMPANY_ID}_type_check CHECK (report_type IN ('monthly', 'quarterly', 'annual', 'custom', 'project', 'dashboard')),
    CONSTRAINT reports_{COMPANY_ID}_format_check CHECK (format IN ('pdf', 'excel', 'html', 'csv')),
    CONSTRAINT reports_{COMPANY_ID}_progress_check CHECK (generation_progress >= 0 AND generation_progress <= 100),
    CONSTRAINT reports_{COMPANY_ID}_period_check CHECK (period_start IS NULL OR period_end IS NULL OR period_start <= period_end)
);

-- Indexes per reports
CREATE INDEX IF NOT EXISTS idx_reports_{COMPANY_ID}_created_by ON reports_{COMPANY_ID}(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_{COMPANY_ID}_status ON reports_{COMPANY_ID}(status);
CREATE INDEX IF NOT EXISTS idx_reports_{COMPANY_ID}_type ON reports_{COMPANY_ID}(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_{COMPANY_ID}_period ON reports_{COMPANY_ID}(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_reports_{COMPANY_ID}_created_at ON reports_{COMPANY_ID}(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_{COMPANY_ID}_scheduled ON reports_{COMPANY_ID}(is_scheduled, next_generation) WHERE is_scheduled = true;

-- ============================================================================
-- TABELLA RAPPORTINI_{COMPANY_ID}
-- ============================================================================
CREATE TABLE IF NOT EXISTS rapportini_{COMPANY_ID} (
    id SERIAL PRIMARY KEY,
    
    -- Informazioni base rapportino
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Associazioni
    project_id INTEGER, -- reference a progetti se esistono
    client_name VARCHAR(255),
    
    -- Date e timing
    work_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    total_hours DECIMAL(5,2), -- ore totali lavorate
    
    -- Tipo di lavoro
    work_type VARCHAR(100), -- 'development', 'meeting', 'support', 'analysis', etc
    location VARCHAR(255), -- sede, remoto, cliente
    
    -- Contenuto
    activities JSONB DEFAULT '[]', -- array di attività svolte
    materials_used JSONB DEFAULT '[]', -- materiali/strumenti utilizzati
    notes TEXT,
    
    -- Risultati e output
    deliverables JSONB DEFAULT '[]', -- deliverable completati
    next_steps TEXT,
    issues_encountered TEXT,
    
    -- Approvazione
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected', 'billed'
    
    -- Billing
    is_billable BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    billed_at TIMESTAMP,
    invoice_id VARCHAR(100),
    
    -- Attachments
    attachments JSONB DEFAULT '[]', -- file allegati
    photos JSONB DEFAULT '[]', -- foto del lavoro
    
    -- Geolocation (se applicabile)
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    address TEXT,
    
    -- Tracking
    created_by UUID NOT NULL,
    updated_by UUID,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT rapportini_{COMPANY_ID}_status_check CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'billed')),
    CONSTRAINT rapportini_{COMPANY_ID}_hours_positive CHECK (total_hours IS NULL OR total_hours >= 0),
    CONSTRAINT rapportini_{COMPANY_ID}_rate_positive CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    CONSTRAINT rapportini_{COMPANY_ID}_amount_positive CHECK (total_amount IS NULL OR total_amount >= 0),
    CONSTRAINT rapportini_{COMPANY_ID}_time_logic CHECK (start_time IS NULL OR end_time IS NULL OR start_time <= end_time),
    CONSTRAINT rapportini_{COMPANY_ID}_activities_array CHECK (jsonb_typeof(activities) = 'array')
);

-- Indexes per rapportini
CREATE INDEX IF NOT EXISTS idx_rapportini_{COMPANY_ID}_created_by ON rapportini_{COMPANY_ID}(created_by);
CREATE INDEX IF NOT EXISTS idx_rapportini_{COMPANY_ID}_work_date ON rapportini_{COMPANY_ID}(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_rapportini_{COMPANY_ID}_status ON rapportini_{COMPANY_ID}(status);
CREATE INDEX IF NOT EXISTS idx_rapportini_{COMPANY_ID}_project ON rapportini_{COMPANY_ID}(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rapportini_{COMPANY_ID}_billable ON rapportini_{COMPANY_ID}(is_billable, work_date) WHERE is_billable = true;
CREATE INDEX IF NOT EXISTS idx_rapportini_{COMPANY_ID}_approval ON rapportini_{COMPANY_ID}(requires_approval, approved_at) WHERE requires_approval = true;
CREATE INDEX IF NOT EXISTS idx_rapportini_{COMPANY_ID}_location ON rapportini_{COMPANY_ID}(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- TRIGGERS PER AUTO-UPDATE
-- ============================================================================

-- Trigger per aggiornare updated_at su documents
CREATE TRIGGER update_documents_{COMPANY_ID}_updated_at 
    BEFORE UPDATE ON documents_{COMPANY_ID}
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger per aggiornare updated_at su reports
CREATE TRIGGER update_reports_{COMPANY_ID}_updated_at 
    BEFORE UPDATE ON reports_{COMPANY_ID}
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger per aggiornare updated_at su rapportini
CREATE TRIGGER update_rapportini_{COMPANY_ID}_updated_at 
    BEFORE UPDATE ON rapportini_{COMPANY_ID}
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION PER CALCOLO AUTOMATICO ORE
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_total_hours_{COMPANY_ID}()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcola automaticamente total_hours se start_time e end_time sono presenti
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0;
    END IF;
    
    -- Calcola total_amount se hourly_rate è presente
    IF NEW.total_hours IS NOT NULL AND NEW.hourly_rate IS NOT NULL THEN
        NEW.total_amount = NEW.total_hours * NEW.hourly_rate;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica trigger per calcolo ore
CREATE TRIGGER calculate_hours_rapportini_{COMPANY_ID}
    BEFORE INSERT OR UPDATE ON rapportini_{COMPANY_ID}
    FOR EACH ROW EXECUTE FUNCTION calculate_total_hours_{COMPANY_ID}();

-- ============================================================================
-- VIEWS UTILI PER TENANT
-- ============================================================================

-- Vista per statistiche documenti
CREATE OR REPLACE VIEW documents_stats_{COMPANY_ID} AS
SELECT 
    COUNT(*) as total_documents,
    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_documents,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_documents,
    COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_documents,
    SUM(file_size) as total_file_size,
    AVG(file_size) as avg_file_size,
    COUNT(DISTINCT created_by) as contributing_users,
    COUNT(DISTINCT category) as categories_count
FROM documents_{COMPANY_ID}
WHERE status != 'deleted';

-- Vista per report mensili rapportini
CREATE OR REPLACE VIEW rapportini_monthly_{COMPANY_ID} AS
SELECT 
    DATE_TRUNC('month', work_date) as month,
    COUNT(*) as total_rapportini,
    SUM(total_hours) as total_hours,
    SUM(CASE WHEN is_billable THEN total_hours ELSE 0 END) as billable_hours,
    SUM(total_amount) as total_amount,
    COUNT(DISTINCT created_by) as active_users
FROM rapportini_{COMPANY_ID}
WHERE status NOT IN ('draft', 'rejected')
GROUP BY DATE_TRUNC('month', work_date)
ORDER BY month DESC;

-- ============================================================================
-- COMMENTI SULLE TABELLE
-- ============================================================================

COMMENT ON TABLE documents_{COMPANY_ID} IS 'Documenti del tenant con versioning e workflow';
COMMENT ON TABLE reports_{COMPANY_ID} IS 'Report generati e schedulati per il tenant';
COMMENT ON TABLE rapportini_{COMPANY_ID} IS 'Rapportini di lavoro giornalieri con tracking ore';

-- Messaggio di completamento
SELECT 'Template tabelle tenant creato per: {COMPANY_ID}' as message;