-- ============================================================================
-- SCHEMA TABELLA FILE_ATTACHMENTS PER GESTIONE FILE S3
-- ============================================================================
-- Questa tabella gestisce tutti i file caricati su S3 con isolamento tenant
-- Integra con le tabelle esistenti: documents, rapportini, commesse
-- ============================================================================

-- ============================================================================
-- TABELLA FILE_ATTACHMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Riferimento tenant
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Riferimento S3
    s3_key VARCHAR(1000) NOT NULL, -- chiave completa S3 (es: company_id/section/category/entity_id/filename)
    s3_bucket VARCHAR(255) NOT NULL, -- nome bucket S3
    s3_version_id VARCHAR(100), -- ID versione per versioning
    s3_etag VARCHAR(64), -- ETag per verifiche integrità
    
    -- Metadati file
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL, -- dimensione in bytes
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL, -- SHA256 per deduplication
    
    -- Categorizzazione e organizzazione
    section VARCHAR(50) NOT NULL, -- 'commesse', 'rapportini', 'documenti', 'costi', 'ricavi'
    category VARCHAR(100) NOT NULL, -- 'contratti', 'foto', 'fatture', 'preventivi', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'commessa', 'rapportino', 'costo', 'ricavo', 'documento'
    entity_id UUID, -- ID dell'entità associata (opzionale per file standalone)
    
    -- Permessi e visibilità
    visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'company', 'public'
    access_control JSONB DEFAULT '{}', -- configurazione permessi dettagliata
    shared_with JSONB DEFAULT '[]', -- array di user IDs con accesso specifico
    
    -- Workflow e approvazione
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'pending_approval', 'approved', 'rejected', 'archived', 'deleted'
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    -- Metadata estesi
    metadata JSONB DEFAULT '{}', -- metadati personalizzati
    extracted_text TEXT, -- testo estratto per ricerca full-text
    thumbnail_url VARCHAR(500), -- URL thumbnail se generato
    preview_url VARCHAR(500), -- URL preview se disponibile
    
    -- Tracking e audit
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT file_attachments_section_check CHECK (section IN ('commesse', 'rapportini', 'documenti', 'costi', 'ricavi')),
    CONSTRAINT file_attachments_visibility_check CHECK (visibility IN ('private', 'company', 'public')),
    CONSTRAINT file_attachments_status_check CHECK (status IN ('active', 'pending_approval', 'approved', 'rejected', 'archived', 'deleted')),
    CONSTRAINT file_attachments_file_size_positive CHECK (file_size > 0),
    CONSTRAINT file_attachments_s3_key_unique UNIQUE (s3_key, s3_bucket),
    CONSTRAINT file_attachments_tags_array CHECK (jsonb_typeof(shared_with) = 'array'),
    CONSTRAINT file_attachments_access_control_object CHECK (jsonb_typeof(access_control) = 'object')
);

-- ============================================================================
-- INDEXES PER PERFORMANCE
-- ============================================================================

-- Indexes principali per query frequenti
CREATE INDEX IF NOT EXISTS idx_file_attachments_company_id ON file_attachments(company_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_section ON file_attachments(section);
CREATE INDEX IF NOT EXISTS idx_file_attachments_category ON file_attachments(category);
CREATE INDEX IF NOT EXISTS idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_status ON file_attachments(status);
CREATE INDEX IF NOT EXISTS idx_file_attachments_created_by ON file_attachments(created_by);
CREATE INDEX IF NOT EXISTS idx_file_attachments_created_at ON file_attachments(created_at DESC);

-- Indexes per ricerca e filtri
CREATE INDEX IF NOT EXISTS idx_file_attachments_mime_type ON file_attachments(mime_type);
CREATE INDEX IF NOT EXISTS idx_file_attachments_file_size ON file_attachments(file_size);
CREATE INDEX IF NOT EXISTS idx_file_attachments_visibility ON file_attachments(visibility);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_at ON file_attachments(uploaded_at DESC);

-- Indexes compositi per query complesse
CREATE INDEX IF NOT EXISTS idx_file_attachments_company_section ON file_attachments(company_id, section);
CREATE INDEX IF NOT EXISTS idx_file_attachments_company_category ON file_attachments(company_id, category);
CREATE INDEX IF NOT EXISTS idx_file_attachments_company_status ON file_attachments(company_id, status);
CREATE INDEX IF NOT EXISTS idx_file_attachments_company_entity ON file_attachments(company_id, entity_type, entity_id);

-- Indexes per ricerca full-text
CREATE INDEX IF NOT EXISTS idx_file_attachments_filename_search ON file_attachments USING gin(to_tsvector('italian', original_filename));
CREATE INDEX IF NOT EXISTS idx_file_attachments_text_search ON file_attachments USING gin(to_tsvector('italian', COALESCE(extracted_text, '')));

-- Indexes per JSON e array
CREATE INDEX IF NOT EXISTS idx_file_attachments_shared_with ON file_attachments USING gin(shared_with);
CREATE INDEX IF NOT EXISTS idx_file_attachments_metadata ON file_attachments USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_file_attachments_access_control ON file_attachments USING gin(access_control);

-- Indexes per deduplication e integrità
CREATE INDEX IF NOT EXISTS idx_file_attachments_file_hash ON file_attachments(file_hash);
CREATE INDEX IF NOT EXISTS idx_file_attachments_s3_key_bucket ON file_attachments(s3_key, s3_bucket);

-- ============================================================================
-- TRIGGERS PER AUTO-UPDATE
-- ============================================================================

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_file_attachments_updated_at 
    BEFORE UPDATE ON file_attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger per aggiornare last_accessed_at e access_count
CREATE OR REPLACE FUNCTION update_file_access_stats()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed_at = CURRENT_TIMESTAMP;
    NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_file_attachments_access_stats
    BEFORE UPDATE OF last_accessed_at ON file_attachments
    FOR EACH ROW EXECUTE FUNCTION update_file_access_stats();

-- ============================================================================
-- FUNCTIONS UTILI
-- ============================================================================

-- Funzione per generare chiave S3 standardizzata
CREATE OR REPLACE FUNCTION generate_s3_key(
    p_company_id UUID,
    p_section TEXT,
    p_category TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_filename TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_timestamp TEXT;
    v_entity_part TEXT;
    v_filename_part TEXT;
BEGIN
    v_timestamp := to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS');
    
    IF p_entity_id IS NOT NULL THEN
        v_entity_part := '/' || p_entity_id::TEXT;
    ELSE
        v_entity_part := '';
    END IF;
    
    IF p_filename IS NOT NULL THEN
        v_filename_part := '/' || p_filename;
    ELSE
        v_filename_part := '/' || v_timestamp;
    END IF;
    
    RETURN p_company_id::TEXT || '/' || p_section || '/' || p_category || v_entity_part || v_filename_part;
END;
$$ LANGUAGE plpgsql;

-- Funzione per calcolare dimensione totale file per tenant
CREATE OR REPLACE FUNCTION get_tenant_storage_usage(p_company_id UUID)
RETURNS BIGINT AS $$
DECLARE
    v_total_size BIGINT;
BEGIN
    SELECT COALESCE(SUM(file_size), 0)
    INTO v_total_size
    FROM file_attachments
    WHERE company_id = p_company_id
    AND status != 'deleted';
    
    RETURN v_total_size;
END;
$$ LANGUAGE plpgsql;

-- Funzione per ottenere statistiche file per sezione
CREATE OR REPLACE FUNCTION get_file_stats_by_section(p_company_id UUID)
RETURNS TABLE(
    section TEXT,
    category TEXT,
    file_count BIGINT,
    total_size BIGINT,
    avg_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fa.section::TEXT,
        fa.category::TEXT,
        COUNT(*)::BIGINT as file_count,
        SUM(fa.file_size)::BIGINT as total_size,
        AVG(fa.file_size)::BIGINT as avg_size
    FROM file_attachments fa
    WHERE fa.company_id = p_company_id
    AND fa.status != 'deleted'
    GROUP BY fa.section, fa.category
    ORDER BY fa.section, fa.category;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS UTILI
-- ============================================================================

-- Vista per file con informazioni complete
CREATE OR REPLACE VIEW file_attachments_view AS
SELECT 
    fa.*,
    c.name as company_name,
    c.slug as company_slug,
    u_created.name as created_by_name,
    u_created.email as created_by_email,
    u_updated.name as updated_by_name,
    u_approved.name as approved_by_name,
    -- Calcola URL S3
    'https://' || fa.s3_bucket || '.s3.eu-north-1.amazonaws.com/' || fa.s3_key as s3_url,
    -- Calcola dimensione formattata
    CASE 
        WHEN fa.file_size < 1024 THEN fa.file_size::TEXT || ' B'
        WHEN fa.file_size < 1048576 THEN (fa.file_size / 1024.0)::DECIMAL(10,1)::TEXT || ' KB'
        WHEN fa.file_size < 1073741824 THEN (fa.file_size / 1048576.0)::DECIMAL(10,1)::TEXT || ' MB'
        ELSE (fa.file_size / 1073741824.0)::DECIMAL(10,1)::TEXT || ' GB'
    END as file_size_formatted
FROM file_attachments fa
LEFT JOIN companies c ON fa.company_id = c.id
LEFT JOIN users u_created ON fa.created_by = u_created.id
LEFT JOIN users u_updated ON fa.updated_by = u_updated.id
LEFT JOIN users u_approved ON fa.approved_by = u_approved.id;

-- Vista per statistiche file per tenant
CREATE OR REPLACE VIEW tenant_file_stats AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    c.slug as company_slug,
    COUNT(fa.id) as total_files,
    COUNT(CASE WHEN fa.status = 'active' THEN 1 END) as active_files,
    COUNT(CASE WHEN fa.status = 'archived' THEN 1 END) as archived_files,
    SUM(CASE WHEN fa.status != 'deleted' THEN fa.file_size ELSE 0 END) as total_size_bytes,
    COUNT(DISTINCT fa.section) as sections_count,
    COUNT(DISTINCT fa.category) as categories_count,
    MAX(fa.uploaded_at) as last_file_upload,
    AVG(fa.file_size) as avg_file_size
FROM companies c
LEFT JOIN file_attachments fa ON c.id = fa.company_id
GROUP BY c.id, c.name, c.slug;

-- Vista per file recenti per tenant
CREATE OR REPLACE VIEW recent_files_view AS
SELECT 
    fa.*,
    c.name as company_name,
    c.slug as company_slug,
    u_created.name as created_by_name
FROM file_attachments fa
LEFT JOIN companies c ON fa.company_id = c.id
LEFT JOIN users u_created ON fa.created_by = u_created.id
WHERE fa.status != 'deleted'
ORDER BY fa.uploaded_at DESC;

-- ============================================================================
-- COMMENTI SULLE TABELLE
-- ============================================================================

COMMENT ON TABLE file_attachments IS 'Gestione centralizzata file S3 per tutti i tenant con isolamento e sicurezza';
COMMENT ON COLUMN file_attachments.s3_key IS 'Chiave S3 standardizzata: company_id/section/category/entity_id/filename';
COMMENT ON COLUMN file_attachments.section IS 'Sezione principale: commesse, rapportini, documenti, costi, ricavi';
COMMENT ON COLUMN file_attachments.category IS 'Categoria specifica per sezione (es: contratti, foto, fatture)';
COMMENT ON COLUMN file_attachments.entity_type IS 'Tipo entità associata (es: commessa, rapportino, costo)';
COMMENT ON COLUMN file_attachments.entity_id IS 'ID entità associata (opzionale per file standalone)';
COMMENT ON COLUMN file_attachments.access_control IS 'Configurazione permessi dettagliata per file specifici';
COMMENT ON COLUMN file_attachments.extracted_text IS 'Testo estratto per ricerca full-text e AI';

-- ============================================================================
-- MIGRATION SCRIPT PER TABELLE ESISTENTI
-- ============================================================================

-- Script per aggiornare tabelle esistenti con riferimento ai file
-- Questo script va eseguito dopo la creazione di file_attachments

-- Aggiungi campo file_attachments_id alle tabelle esistenti se necessario
-- ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_attachments_id UUID REFERENCES file_attachments(id);
-- ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS file_attachments_id UUID REFERENCES file_attachments(id);
-- ALTER TABLE commesse ADD COLUMN IF NOT EXISTS file_attachments_id UUID REFERENCES file_attachments(id);

-- ============================================================================
-- MESSAGGIO DI COMPLETAMENTO
-- ============================================================================

SELECT 'Schema file_attachments per gestione file S3 creato con successo!' as message;
