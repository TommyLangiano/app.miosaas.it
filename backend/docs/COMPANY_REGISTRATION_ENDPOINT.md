# Company Registration Endpoint

## Overview
L'endpoint `POST /api/register-company` gestisce la registrazione production di nuove aziende nel sistema multi-tenant MioSaaS.

## Endpoint Details
- **URL**: `POST /api/register-company`
- **Authentication**: ✅ **REQUIRED** (Bearer Token Cognito)
- **Content-Type**: `application/json`

## Request Headers
```http
Authorization: Bearer <cognito_jwt_token>
Content-Type: application/json
```

## Request Body
```json
{
  "company_name": "string (required)",
  "company_email": "string (required, valid email)",
  "company_slug": "string (required, alphanumeric + underscore only)",
  "admin_email": "string (required, valid email)",
  "admin_name": "string (required)",
  "admin_surname": "string (required)",
  "cognito_sub": "string (required, must match authenticated user)",
  "plan_slug": "string (required)"
}
```

### Available Plan Slugs
- `free` - Piano Free
- `starter` - Piano Starter
- `professional` - Piano Professional
- `enterprise` - Piano Enterprise
- `base` - Piano Base

## Response Format

### Success Response (201)
```json
{
  "success": true,
  "company_id": "uuid",
  "user_id": "uuid",
  "message": "Azienda \"Company Name\" registrata con successo! Piano \"Plan Name\" attivato con 8 tabelle business.",
  "data": {
    "user_id": "uuid",
    "company_id": "uuid",
    "tables_created": [
      "documents_company_slug",
      "reports_company_slug",
      "rapportini_company_slug",
      "projects_company_slug",
      "clients_company_slug",
      "tasks_company_slug",
      "timesheet_company_slug",
      "invoices_company_slug"
    ],
    "plan_name": "Plan Name",
    "company_slug": "company_slug"
  }
}
```

### Error Responses

#### 400 - Bad Request
```json
{
  "success": false,
  "error": "Validation error message"
}
```

#### 401 - Unauthorized
```json
{
  "status": "error",
  "message": "Token di accesso mancante",
  "code": "MISSING_TOKEN"
}
```

#### 403 - Forbidden
```json
{
  "success": false,
  "error": "Il cognito_sub deve corrispondere all'utente autenticato"
}
```

#### 409 - Conflict
```json
{
  "success": false,
  "error": "L'utente è già associato a un'azienda esistente"
}
```

#### 500 - Internal Server Error
```json
{
  "success": false,
  "error": "Errore interno del server"
}
```

## Validation Rules

### company_slug
- ✅ Only alphanumeric characters and underscores
- ✅ Must be unique across all companies
- ✅ Pattern: `^[a-zA-Z0-9_]+$`

### Emails
- ✅ Valid email format required
- ✅ Pattern: `^[^\s@]+@[^\s@]+\.[^\s@]+$`

### cognito_sub
- ✅ Must match the authenticated user's Cognito sub
- ✅ User must not already be associated with another company

### plan_slug
- ✅ Must exist in the plans table
- ✅ Available options: free, starter, professional, enterprise, base

## Process Flow

1. **Authentication Check** - Verifies Bearer token
2. **Input Validation** - Validates all required fields and formats
3. **User Verification** - Ensures cognito_sub matches authenticated user
4. **Uniqueness Check** - Verifies company_slug is unique
5. **Plan Validation** - Ensures selected plan exists
6. **Company Creation** - Creates record in companies table
7. **User Creation** - Creates admin user with company_owner role
8. **Tenant Tables** - Automatically creates 8 tenant-specific tables
9. **Last Login Update** - Updates user's last login timestamp
10. **Success Response** - Returns complete registration details

## Example Usage

### cURL Command
```bash
curl -X POST "http://localhost:5001/api/register-company" \
-H "Authorization: Bearer YOUR_COGNITO_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "company_name": "Acme Corporation",
  "company_email": "contact@acme.com",
  "company_slug": "acme_corp",
  "admin_email": "admin@acme.com",
  "admin_name": "John",
  "admin_surname": "Doe",
  "cognito_sub": "user-cognito-sub-from-token",
  "plan_slug": "professional"
}'
```

### JavaScript/Fetch Example
```javascript
const registerCompany = async (token, companyData) => {
  const response = await fetch('/api/register-company', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(companyData)
  });
  
  return await response.json();
};
```

## Database Impact

### Tables Created/Updated
- **companies** - New company record
- **users** - New admin user with company_owner role
- **8 Tenant Tables** - Automatically created with company_slug prefix:
  - `documents_{company_slug}`
  - `reports_{company_slug}`
  - `rapportini_{company_slug}`
  - `projects_{company_slug}`
  - `clients_{company_slug}`
  - `tasks_{company_slug}`
  - `timesheet_{company_slug}`
  - `invoices_{company_slug}`

## Security Features
- ✅ JWT Token verification (Cognito)
- ✅ User identity validation
- ✅ Input sanitization
- ✅ SQL injection protection
- ✅ Company ownership verification
- ✅ Unique constraint enforcement

## Notes
- This endpoint is for production use (requires real Cognito authentication)
- For testing/demo purposes, use `/api/demo/register` instead
- Each company gets isolated tenant tables for data separation
- Admin user automatically gets company_owner role
- Company size defaults to 'sm', industry to 'tc', country to 'IT'