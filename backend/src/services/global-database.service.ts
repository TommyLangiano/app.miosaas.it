import { db } from '../config/db';

/**
 * Servizio per operazioni sulle tabelle globali
 */

// ============================================================================
// PLANS SERVICE
// ============================================================================
export class PlansService {
  
  static async getAll(): Promise<any[]> {
    const result = await db.query(`
      SELECT * FROM plans 
      WHERE is_active = true 
      ORDER BY sort_order, price_month ASC
    `);
    return result.rows;
  }

  static async getById(planId: number): Promise<any | null> {
    const result = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
    return result.rows[0] || null;
  }

  static async getBySlug(slug: string): Promise<any | null> {
    const result = await db.query('SELECT * FROM plans WHERE slug = $1', [slug]);
    return result.rows[0] || null;
  }

  static async create(planData: {
    name: string;
    slug: string;
    description?: string;
    price_month: number;
    price_year: number;
    max_users?: number;
    max_storage_gb?: number;
    features: string[];
  }): Promise<any> {
    const {
      name, slug, description, price_month, price_year,
      max_users, max_storage_gb, features
    } = planData;

    const result = await db.query(`
      INSERT INTO plans (
        name, slug, description, price_month, price_year,
        max_users, max_storage_gb, features
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      name, slug, description, price_month, price_year,
      max_users, max_storage_gb, JSON.stringify(features)
    ]);

    return result.rows[0];
  }
}

// ============================================================================
// COMPANIES SERVICE
// ============================================================================
export class CompaniesService {
  
  static async getAll(limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await db.query(`
      SELECT c.*, p.name as plan_name, p.slug as plan_slug
      FROM companies c
      LEFT JOIN plans p ON c.plan_id = p.id
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return result.rows;
  }

  static async getById(companyId: string): Promise<any | null> {
    const result = await db.query(`
      SELECT c.*, p.name as plan_name, p.slug as plan_slug
      FROM companies c
      LEFT JOIN plans p ON c.plan_id = p.id
      WHERE c.id = $1
    `, [companyId]);
    
    return result.rows[0] || null;
  }

  static async getBySlug(slug: string): Promise<any | null> {
    const result = await db.query(`
      SELECT c.*, p.name as plan_name, p.slug as plan_slug
      FROM companies c
      LEFT JOIN plans p ON c.plan_id = p.id
      WHERE c.slug = $1
    `, [slug]);
    
    return result.rows[0] || null;
  }

  static async create(companyData: {
    name: string;
    slug: string;
    email: string;
    plan_id: number;
    company_size?: string;
    industry?: string;
    country?: string;
  }): Promise<any> {
    const {
      name, slug, email, plan_id,
      company_size, industry, country
    } = companyData;

    const result = await db.query(`
      INSERT INTO companies (
        name, slug, email, plan_id,
        company_size, industry, country,
        db_schema_prefix, s3_bucket_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      name, slug, email, plan_id,
      company_size, industry, country,
      slug, // usa slug come prefisso schema
      `miosaas-${slug}` // bucket S3 naming
    ]);

    return result.rows[0];
  }

  static async updateSubscription(companyId: string, subscriptionData: {
    subscription_id?: string;
    subscription_status?: string;
    subscription_current_period_start?: Date;
    subscription_current_period_end?: Date;
    plan_id?: number;
  }): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(subscriptionData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('Nessun campo da aggiornare');
    }

    values.push(companyId);

    const result = await db.query(`
      UPDATE companies 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  static async getStats(): Promise<any> {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_companies,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_companies,
        COUNT(CASE WHEN status = 'trial' THEN 1 END) as trial_companies,
        COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as paying_companies,
        AVG(CASE WHEN plans.price_month > 0 THEN plans.price_month END) as avg_monthly_revenue
      FROM companies
      LEFT JOIN plans ON companies.plan_id = plans.id
    `);
    
    return result.rows[0];
  }
}

// ============================================================================
// GLOBAL USERS SERVICE
// ============================================================================
export class GlobalUsersService {
  
  static async getByCompany(companyId: string, limit: number = 50): Promise<any[]> {
    const result = await db.query(`
      SELECT u.*, r.name as role_name, r.permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.company_id = $1
      ORDER BY u.created_at DESC
      LIMIT $2
    `, [companyId, limit]);
    
    return result.rows;
  }

  static async getByCognitoSub(cognitoSub: string): Promise<any | null> {
    const result = await db.query(`
      SELECT u.*, c.name as company_name, c.slug as company_slug, 
             r.name as role_name, r.permissions
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.cognito_sub = $1
    `, [cognitoSub]);
    
    return result.rows[0] || null;
  }

  static async create(userData: {
    email: string;
    name?: string;
    surname?: string;
    cognito_sub: string;
    company_id: string;
    role_id?: number;
    phone?: string;
    invited_by?: string;
  }): Promise<any> {
    const {
      email, name, surname, cognito_sub, company_id,
      role_id, phone, invited_by
    } = userData;

    // Default role_id se non specificato (user)
    const defaultRoleResult = await db.query(`
      SELECT id FROM roles WHERE name = 'user' LIMIT 1
    `);
    const finalRoleId = role_id || defaultRoleResult.rows[0]?.id;

    const result = await db.query(`
      INSERT INTO users (
        email, name, surname, cognito_sub, company_id,
        role_id, phone, invited_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      email, name, surname, cognito_sub, company_id,
      finalRoleId, phone, invited_by
    ]);

    return result.rows[0];
  }

  static async updateLastLogin(cognitoSub: string): Promise<void> {
    await db.query(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP,
          last_activity = CURRENT_TIMESTAMP,
          login_count = login_count + 1
      WHERE cognito_sub = $1
    `, [cognitoSub]);
  }

  static async updateProfile(userId: string, profileData: {
    name?: string;
    surname?: string;
    phone?: string;
    avatar_url?: string;
    locale?: string;
    timezone?: string;
    settings?: object;
    preferences?: object;
  }): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(profileData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('Nessun campo da aggiornare');
    }

    values.push(userId);

    const result = await db.query(`
      UPDATE users 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  static async getCompanyUserStats(companyId: string): Promise<any> {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN last_login > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as active_last_30_days,
        COUNT(CASE WHEN last_login > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as active_last_7_days,
        MAX(last_login) as last_user_login
      FROM users
      WHERE company_id = $1
    `, [companyId]);
    
    return result.rows[0];
  }
}

// ============================================================================
// ROLES SERVICE
// ============================================================================
export class RolesService {
  
  static async getAll(): Promise<any[]> {
    const result = await db.query(`
      SELECT * FROM roles 
      ORDER BY is_system_role DESC, name ASC
    `);
    return result.rows;
  }

  static async getByName(name: string): Promise<any | null> {
    const result = await db.query('SELECT * FROM roles WHERE name = $1', [name]);
    return result.rows[0] || null;
  }

  static async getNonSystemRoles(): Promise<any[]> {
    const result = await db.query(`
      SELECT * FROM roles 
      WHERE is_system_role = false
      ORDER BY name ASC
    `);
    return result.rows;
  }

  static async create(roleData: {
    name: string;
    description?: string;
    permissions: string[];
  }): Promise<any> {
    const { name, description, permissions } = roleData;

    const result = await db.query(`
      INSERT INTO roles (name, description, permissions, is_system_role)
      VALUES ($1, $2, $3, false)
      RETURNING *
    `, [name, description, JSON.stringify(permissions)]);

    return result.rows[0];
  }
}

// ============================================================================
// AGGREGATED STATS SERVICE
// ============================================================================
export class StatsService {
  
  static async getGlobalStats(): Promise<any> {
    const [companiesStats, usersStats, plansStats] = await Promise.all([
      CompaniesService.getStats(),
      db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
          COUNT(CASE WHEN last_login > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as active_last_30_days
        FROM users
      `),
      db.query(`
        SELECT 
          COUNT(*) as total_plans,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_plans
        FROM plans
      `)
    ]);

    return {
      companies: companiesStats,
      users: usersStats.rows[0],
      plans: plansStats.rows[0],
      timestamp: new Date().toISOString()
    };
  }

  static async getCompanyDashboardStats(companyId: string): Promise<any> {
    // Qui potresti aggregare stats dalle tabelle tenant del company
    const userStats = await GlobalUsersService.getCompanyUserStats(companyId);
    
    // Placeholder per stats dalle tabelle tenant
    const tenantStats = {
      documents: 0,
      reports: 0,
      rapportini: 0
    };

    return {
      company_id: companyId,
      users: userStats,
      tenant: tenantStats,
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  PlansService,
  CompaniesService,
  GlobalUsersService,
  RolesService,
  StatsService
};