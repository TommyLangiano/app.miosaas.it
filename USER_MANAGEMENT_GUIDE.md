# 🗑️ GUIDA GESTIONE ELIMINAZIONE UTENTI

## Sistema di Sincronizzazione DB ↔ Cognito

### ✅ IMPLEMENTATO:

1. **🔐 Eliminazione Sicura**: Solo `company_owner` e `admin` possono eliminare utenti
2. **🔄 Sincronizzazione Bidirezionale**: DB ↔ Cognito sempre in sync
3. **🧹 Pulizia Dipendenze**: Documenti, rapportini, commesse automaticamente gestiti
4. **🏷️ Soft Delete**: Opzione per marcare come eliminato senza cancellare
5. **📊 Preview**: Anteprima di cosa verrà eliminato prima di procedere
6. **🔄 Webhook**: Gestione automatica eliminazioni da Cognito
7. **📈 Statistiche**: Report su utenti eliminati

---

## 🎯 UTILIZZO PRATICO:

### 1. 📊 Preview Eliminazione
```bash
# Vedi cosa verrebbe eliminato
GET /api/users/{email|cognito_sub|user_id}/deletion-preview
Authorization: Bearer JWT_TOKEN
```

**Risposta:**
```json
{
  "status": "success",
  "preview": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Nome Cognome",
      "cognitoSub": "cognito-sub-here",
      "companyId": "company-uuid"
    },
    "dependencies": {
      "documents_count": 15,
      "rapportini_count": 23,
      "commesse_count": 3
    },
    "warnings": [
      "L'eliminazione è irreversibile",
      "Tutti i dati correlati verranno eliminati"
    ]
  }
}
```

### 2. 🗑️ Eliminazione Completa
```bash
# Elimina utente + dipendenze + Cognito
DELETE /api/users/{identifier}
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "confirmDeletion": true,
  "deleteFromCognito": true,     # Elimina da AWS Cognito
  "deleteFromDatabase": true,    # Elimina dal Database
  "cascadeDelete": true,         # Elimina documenti/rapportini
  "softDelete": false           # Hard delete (true = soft delete)
}
```

**Risposta:**
```json
{
  "status": "success",
  "message": "Utente user@example.com eliminato con successo",
  "deletionResult": {
    "userId": "uuid",
    "email": "user@example.com",
    "deletedFromCognito": true,
    "deletedFromDatabase": true,
    "cascadeData": {
      "documents": 15,
      "rapportini": 23,
      "commesse": 3
    },
    "errors": []
  }
}
```

### 3. 🏷️ Soft Delete (Raccomandato)
```bash
# Marca come eliminato ma conserva i dati
DELETE /api/users/{identifier}
{
  "confirmDeletion": true,
  "softDelete": true            # Non cancella, marca come deleted
}
```

### 4. 🔄 Sincronizzazione da Cognito
```bash
# Se un utente è stato eliminato da Cognito Console
POST /api/users/{cognito_sub}/sync-from-cognito
Authorization: Bearer JWT_TOKEN
```

### 5. 📊 Statistiche Eliminazioni
```bash
# Report utenti eliminati
GET /api/users/deletion-stats
Authorization: Bearer JWT_TOKEN
```

**Risposta:**
```json
{
  "stats": {
    "active_users": 45,
    "deleted_users": 8,
    "soft_deleted_total": 12,
    "deleted_last_30_days": 3,
    "deleted_last_7_days": 1
  }
}
```

---

## 🔄 SCENARI D'USO:

### Scenario 1: Dipendente Licenziato
```javascript
// 1. Preview per vedere l'impatto
const preview = await fetch('/api/users/dipendente@azienda.com/deletion-preview');

// 2. Soft delete per conservare storico
await fetch('/api/users/dipendente@azienda.com', {
  method: 'DELETE',
  body: JSON.stringify({
    confirmDeletion: true,
    softDelete: true,           // ✅ Conserva dati per compliance
    cascadeDelete: false        // ❌ Non tocca i suoi documenti
  })
});
```

### Scenario 2: Account Compromesso
```javascript
// Eliminazione immediata e completa
await fetch('/api/users/compromesso@azienda.com', {
  method: 'DELETE',
  body: JSON.stringify({
    confirmDeletion: true,
    deleteFromCognito: true,    // ✅ Blocca accesso immediato
    deleteFromDatabase: true,   // ✅ Rimuovi dal DB
    cascadeDelete: true,        // ✅ Elimina tutti i suoi dati
    softDelete: false           // ✅ Hard delete per sicurezza
  })
});
```

### Scenario 3: Pulizia Account Test
```javascript
// Elimina account di test con tutti i dati
await fetch('/api/users/test@example.com', {
  method: 'DELETE',
  body: JSON.stringify({
    confirmDeletion: true,
    deleteFromCognito: true,
    deleteFromDatabase: true,
    cascadeDelete: true,
    softDelete: false
  })
});
```

---

## ⚠️ CONSIDERAZIONI IMPORTANTI:

### 🔒 Sicurezza:
- Solo `company_owner` e `admin` possono eliminare utenti
- Richiesta conferma esplicita (`confirmDeletion: true`)
- Log completo di tutte le eliminazioni
- Non si può eliminare sé stessi

### 📊 Compliance:
- Soft delete mantiene storico per audit
- Timestamp di eliminazione per compliance GDPR
- Possibilità di ripristino dati soft-deleted

### 🔄 Sincronizzazione:
- Webhook automatico da Cognito (se configurato)
- Sync manuale per casi edge
- Gestione errori e retry logic

### 💾 Performance:
- Eliminazioni batch non supportate (by design)
- Transazioni atomiche per consistenza
- Cleanup asincrono per grosse quantità di dati

---

## 🚨 TROUBLESHOOTING:

### Errore: "User not found in DB"
```bash
# L'utente esiste in Cognito ma non nel DB
POST /api/users/{cognito_sub}/sync-from-cognito
```

### Errore: "Cognito deletion failed"
```bash
# Elimina solo dal DB
DELETE /api/users/{identifier}
{
  "confirmDeletion": true,
  "deleteFromCognito": false,   # ✅ Skip Cognito
  "deleteFromDatabase": true
}
```

### Ripristino Soft Delete:
```sql
-- Ripristina utente
UPDATE users 
SET status = 'active', deleted_at = NULL 
WHERE email = 'user@example.com';

-- Ripristina dipendenze
UPDATE documents 
SET status = 'active', deleted_at = NULL 
WHERE created_by = 'USER_ID';
```

---

## 🎯 PROSSIMI SVILUPPI:

- [ ] Eliminazione batch per admin
- [ ] Export dati prima dell'eliminazione
- [ ] Notifiche email agli amministratori
- [ ] API per ripristino soft-deleted
- [ ] Dashboard per gestione utenti eliminati
- [ ] Backup automatico prima di hard delete