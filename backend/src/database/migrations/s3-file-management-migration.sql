-- ============================================================================
-- MIGRATION COMPLETA PER GESTIONE FILE S3 - MIOSAAS
-- ============================================================================
-- Questo script esegue la migrazione completa per integrare la gestione file S3
-- con le tabelle esistenti del database
-- ============================================================================

-- Abilita estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- STEP 1: CREAZIONE TABELLA FILE_ATTACHMENTS
-- ============================================================================

-- Crea la tabella principale per gestione file S3
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Riferimento tenant
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Riferimento S3
    s3_key VARCHAR(1000) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    s3_version_id VARCHAR(100),
    s3_etag VARCHAR(64),
    
    -- Metadati file
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    
    -- Categorizzazione e organizzazione
    section VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    
    -- Permessi e visibilità
    visibility VARCHAR(20) DEFAULT 'private',
    access_control JSONB DEFAULT '{}',
    shared_with JSONB DEFAULT '[]',
    
    -- Workflow e approvazione
    status VARCHAR(50) DEFAULT 'active',
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    -- Metadata estesi
    metadata JSONB DEFAULT '{}',
    extracted_text TEXT,
    thumbnail_url VARCHAR(500),
    preview_url VARCHAR(500),
    
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
-- STEP 2: CREAZIONE INDEXES PER PERFORMANCE
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
-- STEP 3: AGGIORNAMENTO TABELLE ESISTENTI
-- ============================================================================

-- Aggiorna tabella documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS primary_file_id UUID REFERENCES file_attachments(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0;

-- Aggiorna tabella rapportini
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]';
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS photo_attachments JSONB DEFAULT '[]';
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS document_attachments JSONB DEFAULT '[]';
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0;

-- Aggiorna tabella commesse
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS contract_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS invoice_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS photo_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS document_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0;

-- ============================================================================
-- STEP 4: CREAZIONE FUNCTIONS UTILI
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
-- STEP 5: FUNCTIONS PER GESTIONE AUTOMATICA FILE COUNT
-- ============================================================================

-- Funzione per aggiornare file_count in documents
CREATE OR REPLACE FUNCTION update_documents_file_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE documents 
        SET file_count = (
            SELECT COUNT(*)::INTEGER 
            FROM file_attachments 
            WHERE entity_type = 'documento' 
            AND entity_id = NEW.entity_id
            AND company_id = NEW.company_id
            AND status != 'deleted'
        )
        WHERE id = NEW.entity_id;
        
        UPDATE documents 
        SET file_attachments = (
            SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
            FROM file_attachments fa
            WHERE fa.entity_type = 'documento' 
            AND fa.entity_id = documents.id
            AND fa.company_id = documents.company_id
            AND fa.status != 'deleted'
        )
        WHERE id = NEW.entity_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE documents 
        SET file_count = (
            SELECT COUNT(*)::INTEGER 
            FROM file_attachments 
            WHERE entity_type = 'documento' 
            AND entity_id = OLD.entity_id
            AND company_id = OLD.company_id
            AND status != 'deleted'
        )
        WHERE id = OLD.entity_id;
        
        UPDATE documents 
        SET file_attachments = (
            SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
            FROM file_attachments fa
            WHERE fa.entity_type = 'documento' 
            AND fa.entity_id = documents.id
            AND fa.company_id = documents.company_id
            AND fa.status != 'deleted'
        )
        WHERE id = OLD.entity_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.entity_id != NEW.entity_id OR OLD.company_id != NEW.company_id THEN
            UPDATE documents 
            SET file_count = (
                SELECT COUNT(*)::INTEGER 
                FROM file_attachments 
                WHERE entity_type = 'documento' 
                AND entity_id = OLD.entity_id
                AND company_id = OLD.company_id
                AND status != 'deleted'
            )
            WHERE id = OLD.entity_id;
            
            UPDATE documents 
            SET file_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'documento' 
                AND fa.entity_id = documents.id
                AND fa.company_id = documents.company_id
                AND fa.status != 'deleted'
            )
            WHERE id = OLD.entity_id;
        END IF;
        
        UPDATE documents 
        SET file_count = (
            SELECT COUNT(*)::INTEGER 
            FROM file_attachments 
            WHERE entity_type = 'documento' 
            AND entity_id = NEW.entity_id
            AND company_id = NEW.company_id
            AND status != 'deleted'
        )
        WHERE id = NEW.entity_id;
        
        UPDATE documents 
        SET file_attachments = (
            SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
            FROM file_attachments fa
            WHERE fa.entity_type = 'documento' 
            AND fa.entity_id = documents.id
            AND fa.company_id = documents.company_id
            AND fa.status != 'deleted'
        )
        WHERE id = NEW.entity_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare file_count in rapportini
CREATE OR REPLACE FUNCTION update_rapportini_file_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE rapportini 
        SET file_count = (
            SELECT COUNT(*)::INTEGER 
            FROM file_attachments 
            WHERE entity_type = 'rapportino' 
            AND entity_id = NEW.entity_id
            AND company_id = NEW.company_id
            AND status != 'deleted'
        )
        WHERE id = NEW.entity_id;
        
        UPDATE rapportini 
        SET 
            photo_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'rapportino' 
                AND fa.entity_id = rapportini.id
                AND fa.category = 'foto'
                AND fa.company_id = rapportini.company_id
                AND fa.status != 'deleted'
            ),
            document_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'rapportino' 
                AND fa.entity_id = rapportini.id
                AND fa.category = 'documenti'
                AND fa.company_id = rapportini.company_id
                AND fa.status != 'deleted'
            ),
            file_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'rapportino' 
                AND fa.entity_id = rapportini.id
                AND fa.company_id = rapportini.company_id
                AND fa.status != 'deleted'
            )
        WHERE id = NEW.entity_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE rapportini 
        SET file_count = (
            SELECT COUNT(*)::INTEGER 
            FROM file_attachments 
            WHERE entity_type = 'rapportino' 
            AND entity_id = OLD.entity_id
            AND company_id = OLD.company_id
            AND status != 'deleted'
        )
        WHERE id = OLD.entity_id;
        
        UPDATE rapportini 
        SET 
            photo_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'rapportino' 
                AND fa.entity_id = rapportini.id
                AND fa.category = 'foto'
                AND fa.company_id = rapportini.company_id
                AND fa.status != 'deleted'
            ),
            document_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'rapportino' 
                AND fa.entity_id = rapportini.id
                AND fa.category = 'documenti'
                AND fa.company_id = rapportini.company_id
                AND fa.status != 'deleted'
            ),
            file_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'rapportino' 
                AND fa.entity_id = rapportini.id
                AND fa.company_id = rapportini.company_id
                AND fa.status != 'deleted'
            )
        WHERE id = OLD.entity_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.entity_id != NEW.entity_id OR OLD.company_id != NEW.company_id THEN
            UPDATE rapportini 
            SET file_count = (
                SELECT COUNT(*)::INTEGER 
                FROM file_attachments 
                WHERE entity_type = 'rapportino' 
                AND entity_id = OLD.entity_id
                AND company_id = OLD.company_id
                AND status != 'deleted'
            )
            WHERE id = OLD.entity_id;
            
            UPDATE rapportini 
            SET 
                photo_attachments = (
                    SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                    FROM file_attachments fa
                    WHERE fa.entity_type = 'rapportino' 
                    AND fa.entity_id = rapportini.id
                    AND fa.category = 'foto'
                    AND fa.company_id = rapportini.company_id
                    AND fa.status != 'deleted'
                ),
                document_attachments = (
                    SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                    FROM file_attachments fa
                    WHERE fa.entity_type = 'rapportino' 
                    AND fa.entity_id = rapportini.id
                    AND fa.category = 'documenti'
                    AND fa.company_id = rapportini.company_id
                    AND fa.status != 'deleted'
                ),
                file_attachments = (
                    SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                    FROM file_attachments fa
                    WHERE fa.entity_type = 'rapportino' 
                    AND fa.entity_id = rapportini.id
                    AND fa.company_id = rapportini.company_id
                    AND fa.status != 'deleted'
                )
            WHERE id = OLD.entity_id;
        END IF;
        
        UPDATE rapportini 
        SET file_count = (
            SELECT COUNT(*)::INTEGER 
            FROM file_attachments 
            WHERE entity_type = 'rapportino' 
            AND entity_id = NEW.entity_id
            AND company_id = NEW.company_id
            AND status != 'deleted'
        )
        WHERE id = NEW.entity_id;
        
        UPDATE rapportini 
        SET 
            photo_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'rapportino' 
                AND fa.entity_id = rapportini.id
                AND fa.category = 'foto'
                AND fa.company_id = rapportini.company_id
                AND fa.status != 'deleted'
            ),
            document_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'rapportino' 
                AND fa.entity_id = rapportini.id
                AND fa.category = 'documenti'
                AND fa.company_id = rapportini.company_id
                AND fa.status != 'deleted'
            ),
            file_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'rapportino' 
                AND fa.entity_id = rapportini.id
                AND fa.company_id = rapportini.company_id
                AND fa.status != 'deleted'
            )
        WHERE id = NEW.entity_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare file_count in commesse
CREATE OR REPLACE FUNCTION update_commesse_file_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE commesse 
        SET file_count = (
            SELECT COUNT(*)::INTEGER 
            FROM file_attachments 
            WHERE entity_type = 'commessa' 
            AND entity_id = NEW.entity_id
            AND company_id = NEW.company_id
            AND status != 'deleted'
        )
        WHERE id = NEW.entity_id;
        
        UPDATE commesse 
        SET 
            contract_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'contratti'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            invoice_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'fatture'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            photo_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'foto'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            document_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'documenti'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            file_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            )
        WHERE id = NEW.entity_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE commesse 
        SET file_count = (
            SELECT COUNT(*)::INTEGER 
            FROM file_attachments 
            WHERE entity_type = 'commessa' 
            AND entity_id = OLD.entity_id
            AND company_id = OLD.company_id
            AND status != 'deleted'
        )
        WHERE id = OLD.entity_id;
        
        UPDATE commesse 
        SET 
            contract_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'contratti'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            invoice_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'fatture'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            photo_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'foto'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            document_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'documenti'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            file_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            )
        WHERE id = OLD.entity_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.entity_id != NEW.entity_id OR OLD.company_id != NEW.company_id THEN
            UPDATE commesse 
            SET file_count = (
                SELECT COUNT(*)::INTEGER 
                FROM file_attachments 
                WHERE entity_type = 'commessa' 
                AND entity_id = OLD.entity_id
                AND company_id = OLD.company_id
                AND status != 'deleted'
            )
            WHERE id = OLD.entity_id;
            
            UPDATE commesse 
            SET 
                contract_attachments = (
                    SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                    FROM file_attachments fa
                    WHERE fa.entity_type = 'commessa' 
                    AND fa.entity_id = commesse.id
                    AND fa.category = 'contratti'
                    AND fa.company_id = commesse.company_id
                    AND fa.status != 'deleted'
                ),
                invoice_attachments = (
                    SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                    FROM file_attachments fa
                    WHERE fa.entity_type = 'commessa' 
                    AND fa.entity_id = commesse.id
                    AND fa.category = 'fatture'
                    AND fa.company_id = commesse.company_id
                    AND fa.status != 'deleted'
                ),
                photo_attachments = (
                    SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                    FROM file_attachments fa
                    WHERE fa.entity_type = 'commessa' 
                    AND fa.entity_id = commesse.id
                    AND fa.category = 'foto'
                    AND fa.company_id = commesse.company_id
                    AND fa.status != 'deleted'
                ),
                document_attachments = (
                    SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                    FROM file_attachments fa
                    WHERE fa.entity_type = 'commessa' 
                    AND fa.entity_id = commesse.id
                    AND fa.category = 'documenti'
                    AND fa.company_id = commesse.company_id
                    AND fa.status != 'deleted'
                ),
                file_attachments = (
                    SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                    FROM file_attachments fa
                    WHERE fa.entity_type = 'commessa' 
                    AND fa.entity_id = commesse.id
                    AND fa.company_id = commesse.company_id
                    AND fa.status != 'deleted'
                )
            WHERE id = OLD.entity_id;
        END IF;
        
        UPDATE commesse 
        SET file_count = (
            SELECT COUNT(*)::INTEGER 
            FROM file_attachments 
            WHERE entity_type = 'commessa' 
            AND entity_id = NEW.entity_id
            AND company_id = NEW.company_id
            AND status != 'deleted'
        )
        WHERE id = NEW.entity_id;
        
        UPDATE commesse 
        SET 
            contract_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'contratti'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            invoice_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'fatture'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            photo_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'foto'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            document_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.category = 'documenti'
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            ),
            file_attachments = (
                SELECT COALESCE(jsonb_agg(fa.id), '[]'::jsonb)
                FROM file_attachments fa
                WHERE fa.entity_type = 'commessa' 
                AND fa.entity_id = commesse.id
                AND fa.company_id = commesse.company_id
                AND fa.status != 'deleted'
            )
        WHERE id = NEW.entity_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: CREAZIONE TRIGGERS
-- ============================================================================

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_file_attachments_updated_at 
    BEFORE UPDATE ON file_attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger per aggiornare file count nelle tabelle esistenti
CREATE TRIGGER update_documents_file_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON file_attachments
    FOR EACH ROW
    WHEN (NEW.entity_type = 'documento' OR OLD.entity_type = 'documento')
    EXECUTE FUNCTION update_documents_file_count();

CREATE TRIGGER update_rapportini_file_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON file_attachments
    FOR EACH ROW
    WHEN (NEW.entity_type = 'rapportino' OR OLD.entity_type = 'rapportino')
    EXECUTE FUNCTION update_rapportini_file_count();

CREATE TRIGGER update_commesse_file_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON file_attachments
    FOR EACH ROW
    WHEN (NEW.entity_type = 'commessa' OR OLD.entity_type = 'commessa')
    EXECUTE FUNCTION update_commesse_file_count();

-- ============================================================================
-- STEP 7: INDEXES AGGIUNTIVI PER PERFORMANCE
-- ============================================================================

-- Indexes per i nuovi campi JSONB nelle tabelle esistenti
CREATE INDEX IF NOT EXISTS idx_documents_file_attachments ON documents USING gin(file_attachments);
CREATE INDEX IF NOT EXISTS idx_documents_primary_file_id ON documents(primary_file_id);

CREATE INDEX IF NOT EXISTS idx_rapportini_file_attachments ON rapportini USING gin(file_attachments);
CREATE INDEX IF NOT EXISTS idx_rapportini_photo_attachments ON rapportini USING gin(photo_attachments);
CREATE INDEX IF NOT EXISTS idx_rapportini_document_attachments ON rapportini USING gin(document_attachments);

CREATE INDEX IF NOT EXISTS idx_commesse_file_attachments ON commesse USING gin(file_attachments);
CREATE INDEX IF NOT EXISTS idx_commesse_contract_attachments ON commesse USING gin(contract_attachments);
CREATE INDEX IF NOT EXISTS idx_commesse_invoice_attachments ON commesse USING gin(invoice_attachments);
CREATE INDEX IF NOT EXISTS idx_commesse_photo_attachments ON commesse USING gin(photo_attachments);
CREATE INDEX IF NOT EXISTS idx_commesse_document_attachments ON commesse USING gin(document_attachments);

-- ============================================================================
-- STEP 8: CREAZIONE VIEWS UTILI
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
    'https://' || fa.s3_bucket || '.s3.eu-north-1.amazonaws.com/' || fa.s3_key as s3_url,
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
-- STEP 9: COMMENTI E DOCUMENTAZIONE
-- ============================================================================

COMMENT ON TABLE file_attachments IS 'Gestione centralizzata file S3 per tutti i tenant con isolamento e sicurezza';
COMMENT ON COLUMN file_attachments.s3_key IS 'Chiave S3 standardizzata: company_id/section/category/entity_id/filename';
COMMENT ON COLUMN file_attachments.section IS 'Sezione principale: commesse, rapportini, documenti, costi, ricavi';
COMMENT ON COLUMN file_attachments.category IS 'Categoria specifica per sezione (es: contratti, foto, fatture)';
COMMENT ON COLUMN file_attachments.entity_type IS 'Tipo entità associata (es: commessa, rapportino, costo)';
COMMENT ON COLUMN file_attachments.entity_id IS 'ID entità associata (opzionale per file standalone)';

-- ============================================================================
-- STEP 10: VERIFICA FINALE
-- ============================================================================

-- Verifica che tutte le tabelle siano state create correttamente
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name = 'file_attachments';
    
    IF table_count = 0 THEN
        RAISE EXCEPTION 'Tabella file_attachments non creata correttamente';
    END IF;
    
    RAISE NOTICE 'Migration completata con successo! Tabella file_attachments creata.';
END $$;

-- ============================================================================
-- MESSAGGIO DI COMPLETAMENTO
-- ============================================================================

SELECT 'Migration S3 File Management completata con successo!' as message;
SELECT 'Tabelle aggiornate: documents, rapportini, commesse' as tables_updated;
SELECT 'Nuova tabella: file_attachments' as new_table;
SELECT 'Funzioni create: generate_s3_key, get_tenant_storage_usage, get_file_stats_by_section' as functions_created;
SELECT 'Views create: file_attachments_view, tenant_file_stats, recent_files_view' as views_created;
