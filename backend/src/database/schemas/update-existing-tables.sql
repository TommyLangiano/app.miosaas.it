-- ============================================================================
-- SCRIPT AGGIORNAMENTO TABELLE ESISTENTI PER INTEGRAZIONE FILE S3
-- ============================================================================
-- Questo script aggiorna le tabelle esistenti per supportare la gestione file S3
-- Mantiene la compatibilità con il codice esistente
-- ============================================================================

-- ============================================================================
-- AGGIORNAMENTO TABELLA DOCUMENTS
-- ============================================================================

-- Aggiungi campi per gestione file S3
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS primary_file_id UUID REFERENCES file_attachments(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0;

-- Aggiorna commenti
COMMENT ON COLUMN documents.file_attachments IS 'Array di ID file_attachments associati al documento';
COMMENT ON COLUMN documents.primary_file_id IS 'ID del file principale del documento';
COMMENT ON COLUMN documents.file_count IS 'Numero totale di file associati al documento';

-- ============================================================================
-- AGGIORNAMENTO TABELLA RAPPORTINI
-- ============================================================================

-- Aggiungi campi per gestione file S3
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]';
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS photo_attachments JSONB DEFAULT '[]';
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS document_attachments JSONB DEFAULT '[]';
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0;

-- Aggiorna commenti
COMMENT ON COLUMN rapportini.file_attachments IS 'Array di ID file_attachments generici associati al rapportino';
COMMENT ON COLUMN rapportini.photo_attachments IS 'Array di ID file_attachments per foto del lavoro';
COMMENT ON COLUMN rapportini.document_attachments IS 'Array di ID file_attachments per documenti allegati';
COMMENT ON COLUMN rapportini.file_count IS 'Numero totale di file associati al rapportino';

-- ============================================================================
-- AGGIORNAMENTO TABELLA COMMESSE
-- ============================================================================

-- Aggiungi campi per gestione file S3
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS contract_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS invoice_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS photo_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS document_attachments JSONB DEFAULT '[]';
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0;

-- Aggiorna commenti
COMMENT ON COLUMN commesse.file_attachments IS 'Array di ID file_attachments generici associati alla commessa';
COMMENT ON COLUMN commesse.contract_attachments IS 'Array di ID file_attachments per contratti';
COMMENT ON COLUMN commesse.invoice_attachments IS 'Array di ID file_attachments per fatture';
COMMENT ON COLUMN commesse.photo_attachments IS 'Array di ID file_attachments per foto del progetto';
COMMENT ON COLUMN commesse.document_attachments IS 'Array di ID file_attachments per documenti del progetto';
COMMENT ON COLUMN commesse.file_count IS 'Numero totale di file associati alla commessa';

-- ============================================================================
-- FUNCTIONS PER GESTIONE AUTOMATICA FILE COUNT
-- ============================================================================

-- Funzione per aggiornare file_count in documents
CREATE OR REPLACE FUNCTION update_documents_file_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Aggiorna il documento associato
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
        
        -- Aggiorna l'array file_attachments
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
        -- Aggiorna il documento associato
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
        
        -- Aggiorna l'array file_attachments
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
        -- Se è cambiato entity_id o company_id, aggiorna entrambi i documenti
        IF OLD.entity_id != NEW.entity_id OR OLD.company_id != NEW.company_id THEN
            -- Aggiorna il documento vecchio
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
            
            -- Aggiorna l'array file_attachments del documento vecchio
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
        
        -- Aggiorna il documento nuovo
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
        
        -- Aggiorna l'array file_attachments del documento nuovo
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
        -- Aggiorna il rapportino associato
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
        
        -- Aggiorna gli array specifici
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
        -- Aggiorna il rapportino associato
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
        
        -- Aggiorna gli array specifici
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
        -- Se è cambiato entity_id o company_id, aggiorna entrambi i rapportini
        IF OLD.entity_id != NEW.entity_id OR OLD.company_id != NEW.company_id THEN
            -- Aggiorna il rapportino vecchio
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
            
            -- Aggiorna gli array specifici del rapportino vecchio
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
        
        -- Aggiorna il rapportino nuovo
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
        
        -- Aggiorna gli array specifici del rapportino nuovo
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
        -- Aggiorna la commessa associata
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
        
        -- Aggiorna gli array specifici
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
        -- Aggiorna la commessa associata
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
        
        -- Aggiorna gli array specifici
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
        -- Se è cambiato entity_id o company_id, aggiorna entrambe le commesse
        IF OLD.entity_id != NEW.entity_id OR OLD.company_id != NEW.company_id THEN
            -- Aggiorna la commessa vecchia
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
            
            -- Aggiorna gli array specifici della commessa vecchia
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
        
        -- Aggiorna la commessa nuova
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
        
        -- Aggiorna gli array specifici della commessa nuova
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
-- TRIGGERS PER AUTO-UPDATE
-- ============================================================================

-- Trigger per documents
CREATE TRIGGER update_documents_file_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON file_attachments
    FOR EACH ROW
    WHEN (NEW.entity_type = 'documento' OR OLD.entity_type = 'documento')
    EXECUTE FUNCTION update_documents_file_count();

-- Trigger per rapportini
CREATE TRIGGER update_rapportini_file_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON file_attachments
    FOR EACH ROW
    WHEN (NEW.entity_type = 'rapportino' OR OLD.entity_type = 'rapportino')
    EXECUTE FUNCTION update_rapportini_file_count();

-- Trigger per commesse
CREATE TRIGGER update_commesse_file_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON file_attachments
    FOR EACH ROW
    WHEN (NEW.entity_type = 'commessa' OR OLD.entity_type = 'commessa')
    EXECUTE FUNCTION update_commesse_file_count();

-- ============================================================================
-- INDEXES AGGIUNTIVI PER PERFORMANCE
-- ============================================================================

-- Indexes per i nuovi campi JSONB
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
-- MESSAGGIO DI COMPLETAMENTO
-- ============================================================================

SELECT 'Tabelle esistenti aggiornate con successo per integrazione file S3!' as message;
