-- ============================================================================
-- SCHEMA DATABASE GLOBALE PER MIOSAAS
-- ============================================================================
-- Tabelle condivise tra tutti i tenant per gestione globale del sistema
-- ============================================================================

-- Estensioni PostgreSQL necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Per ricerca full-text

-- ============================================================================
-- TABELLA ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT roles_name_check CHECK (name ~ '^[a-z_]+$'),
    CONSTRAINT roles_permissions_check CHECK (jsonb_typeof(permissions) = 'array')
);

-- Inserimento ruoli di sistema
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
('super_admin', 'Amministratore di sistema con accesso completo', '["system:manage", "companies:manage", "users:manage", "plans:manage"]', true),
('company_owner', 'Proprietario dell''azienda con controllo completo del tenant', '["company:manage", "users:manage", "billing:manage", "settings:manage"]', true),
('company_admin', 'Amministratore aziendale con permessi estesi', '["users:manage", "documents:manage", "reports:manage"]', true),
('manager', 'Manager con accesso ai report e gestione team', '["documents:read", "reports:manage", "team:manage"]', false),
('user', 'Utente standard con accesso base', '["documents:read", "documents:create", "reports:read"]', false),
('viewer', 'Utente in sola lettura', '["documents:read", "reports:read"]', false)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- TABELLA PLANS
-- ============================================================================
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price_month DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    price_year DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Limiti del piano
    max_users INTEGER DEFAULT NULL, -- NULL = illimitato
    max_storage_gb INTEGER DEFAULT NULL, -- NULL = illimitato
    max_documents INTEGER DEFAULT NULL,
    max_reports INTEGER DEFAULT NULL,
    
    -- Features disponibili (array JSON)
    features JSONB DEFAULT '[]',
    
    -- Configurazioni speciali
    custom_branding BOOLEAN DEFAULT false,
    api_access BOOLEAN DEFAULT false,
    advanced_analytics BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT plans_slug_format CHECK (slug ~ '^[a-z0-9_-]+$'),
    CONSTRAINT plans_prices_positive CHECK (price_month >= 0 AND price_year >= 0),
    CONSTRAINT plans_features_array CHECK (jsonb_typeof(features) = 'array')
);

-- Inserimento piani di esempio
INSERT INTO plans (name, slug, description, price_month, price_year, max_users, max_storage_gb, features, is_popular) VALUES
('Free', 'free', 'Piano gratuito per iniziare', 0.00, 0.00, 3, 1, '["documents:basic", "reports:basic"]', false),
('Starter', 'starter', 'Piano per piccole aziende', 29.99, 299.90, 10, 10, '["documents:full", "reports:full", "integrations:basic"]', true),
('Professional', 'professional', 'Piano per aziende in crescita', 79.99, 799.90, 50, 100, '["documents:full", "reports:advanced", "integrations:full", "analytics:basic"]', false),
('Enterprise', 'enterprise', 'Piano per grandi organizzazioni', 199.99, 1999.90, NULL, NULL, '["documents:full", "reports:advanced", "integrations:full", "analytics:advanced", "custom:branding"]', false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- TABELLA COMPANIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- per URL amichevoli
    email VARCHAR(255) NOT NULL,
    
    -- Relazioni
    plan_id INTEGER REFERENCES plans(id) ON DELETE RESTRICT,
    
    -- Billing & Subscription
    subscription_id VARCHAR(255), -- ID Stripe/PayPal
    subscription_status VARCHAR(50) DEFAULT 'active',
    subscription_current_period_start TIMESTAMP,
    subscription_current_period_end TIMESTAMP,
    trial_ends_at TIMESTAMP,
    
    -- Configurazione tenant
    s3_bucket_name VARCHAR(255), -- bucket AWS S3 dedicato
    db_schema_prefix VARCHAR(50), -- prefisso per tabelle tenant
    
    -- Informazioni azienda
    company_size VARCHAR(50), -- 'startup', 'small', 'medium', 'large', 'enterprise'
    industry VARCHAR(100),
    country VARCHAR(2), -- codice ISO
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    -- Status e metadata
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'cancelled', 'pending'
    onboarding_completed BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT companies_slug_format CHECK (slug ~ '^[a-z0-9_-]+$'),
    CONSTRAINT companies_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT companies_status_check CHECK (status IN ('active', 'suspended', 'cancelled', 'pending', 'trial')),
    CONSTRAINT companies_subscription_status_check CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'trialing', 'incomplete'))
);

-- ============================================================================
-- TABELLA USERS (GLOBALE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informazioni base
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    surname VARCHAR(100),
    
    -- Autenticazione
    cognito_sub VARCHAR(255) UNIQUE NOT NULL, -- Subject da AWS Cognito
    
    -- Relazioni
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE RESTRICT,
    
    -- Status e preferenze
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'suspended', 'pending'
    email_verified BOOLEAN DEFAULT false,
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT false,
    
    -- Avatar e preferenze
    avatar_url VARCHAR(500),
    locale VARCHAR(10) DEFAULT 'it-IT',
    timezone VARCHAR(50) DEFAULT 'Europe/Rome',
    
    -- Settings personali
    settings JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    
    -- Activity tracking
    last_login TIMESTAMP,
    last_activity TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    
    -- Invitations
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invitation_accepted_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    CONSTRAINT users_locale_format CHECK (locale ~ '^[a-z]{2}-[A-Z]{2}$')
);

-- ============================================================================
-- INDEXES PER PERFORMANCE
-- ============================================================================

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_system ON roles(is_system_role);

-- Plans indexes
CREATE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_popular ON plans(is_popular);
CREATE INDEX IF NOT EXISTS idx_plans_price_month ON plans(price_month);

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_plan_id ON companies(plan_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);
CREATE INDEX IF NOT EXISTS idx_companies_trial_ends ON companies(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cognito_sub ON users(cognito_sub);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_users_company_status ON users(company_id, status);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role_id);

-- ============================================================================
-- TRIGGERS PER AUTO-UPDATE
-- ============================================================================

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Applicazione triggers
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS UTILI
-- ============================================================================

-- Vista per informazioni complete azienda
CREATE OR REPLACE VIEW company_details AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.email,
    c.status,
    c.subscription_status,
    c.trial_ends_at,
    c.created_at,
    p.name as plan_name,
    p.slug as plan_slug,
    p.price_month,
    p.price_year,
    p.max_users,
    p.max_storage_gb,
    COUNT(u.id) as user_count,
    COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_user_count
FROM companies c
LEFT JOIN plans p ON c.plan_id = p.id
LEFT JOIN users u ON c.id = u.company_id
GROUP BY c.id, p.id;

-- Vista per statistiche utenti per azienda
CREATE OR REPLACE VIEW company_user_stats AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(u.id) as total_users,
    COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN u.last_login > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as active_last_30_days,
    MAX(u.last_login) as last_user_login,
    MIN(u.created_at) as first_user_created
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
GROUP BY c.id, c.name;

-- ============================================================================
-- COMMENTI FINALI
-- ============================================================================

COMMENT ON TABLE roles IS 'Ruoli sistema e permessi utente';
COMMENT ON TABLE plans IS 'Piani di abbonamento disponibili';
COMMENT ON TABLE companies IS 'Aziende/tenant registrate nel sistema';
COMMENT ON TABLE users IS 'Utenti globali con associazione ai tenant';

COMMENT ON COLUMN companies.db_schema_prefix IS 'Prefisso per naming tabelle tenant (es: documents_companyid)';
COMMENT ON COLUMN companies.s3_bucket_name IS 'Nome bucket S3 dedicato per file del tenant';
COMMENT ON COLUMN users.cognito_sub IS 'Subject identifier univoco da AWS Cognito';

-- Statistiche finali
SELECT 'Schema globale MioSaaS creato con successo!' as message;