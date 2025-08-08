# 🔄 **GUIDA SINCRONIZZAZIONE COGNITO ↔ DATABASE**

## 🎯 **PROBLEMA RISOLTO:**

Quando elimini un utente direttamente da **AWS Cognito Console**, rimane nel database. Ora abbiamo un sistema completo per sincronizzare!

---

## 🚀 **SOLUZIONE IMPLEMENTATA:**

### **📁 NUOVI FILE:**
- `backend/src/routes/sync-cognito.ts` - API per sincronizzazione
- `SYNC_COGNITO_GUIDE.md` - Questa guida

### **🌐 NUOVE API:**
- `GET /api/sync-cognito/scan` - Scansiona tutti gli utenti
- `POST /api/sync-cognito/fix-orphaned` - Elimina orfani dal DB
- `GET /api/sync-cognito/check/:identifier` - Verifica utente specifico

---

## 🎯 **UTILIZZO IMMEDIATO:**

### **1️⃣ SCAN COMPLETO (Raccomandato)**
```bash
# Scansiona tutti gli utenti Cognito ↔ DB
GET /api/sync-cognito/scan
Authorization: Bearer JWT_TOKEN
```

**Risposta:**
```json
{
  "status": "success",
  "scanResult": {
    "cognitoUsersCount": 5,
    "dbUsersCount": 6,
    "orphanedInDB": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "cognito_sub": "cognito-sub-here",
        "status": "active"
      }
    ],
    "orphanedInCognito": [],
    "syncNeeded": true
  }
}
```

### **2️⃣ FIX AUTOMATICO**
```bash
# Elimina automaticamente tutti gli utenti orfani dal DB
POST /api/sync-cognito/fix-orphaned
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "confirmSync": true
}
```

**Risposta:**
```json
{
  "status": "success",
  "message": "Sincronizzazione completata: 1 utenti eliminati, 0 errori",
  "results": [
    {
      "user": "user@example.com",
      "success": true,
      "message": "Utente user@example.com eliminato con successo"
    }
  ],
  "summary": {
    "total": 1,
    "success": 1,
    "errors": 0
  }
}
```

### **3️⃣ VERIFICA UTENTE SPECIFICO**
```bash
# Verifica se un utente è sincronizzato
GET /api/sync-cognito/check/prova2@gmail.com
Authorization: Bearer JWT_TOKEN
```

**Risposta:**
```json
{
  "status": "success",
  "checkResult": {
    "user": {
      "id": "uuid",
      "email": "prova2@gmail.com",
      "cognito_sub": "cognito-sub-here",
      "status": "active",
      "inDB": true
    },
    "inCognito": false,
    "syncStatus": "ORPHANED_IN_DB",
    "needsSync": true
  }
}
```

---

## 🔧 **TEST IMMEDIATO:**

### **Con curl:**
```bash
# 1. Login per ottenere token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"prova2@gmail.com","password":"Test123!"}' \
  | jq -r '.token')

# 2. Scan completo
curl -s -X GET "http://localhost:5001/api/sync-cognito/scan" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Fix automatico (se necessario)
curl -s -X POST "http://localhost:5001/api/sync-cognito/fix-orphaned" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmSync": true}' | jq

# 4. Verifica utente specifico
curl -s -X GET "http://localhost:5001/api/sync-cognito/check/prova2@gmail.com" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### **Con Postman/Thunder Client:**
1. **Login**: `POST /api/auth/login`
2. **Scan**: `GET /api/sync-cognito/scan`
3. **Fix**: `POST /api/sync-cognito/fix-orphaned`
4. **Check**: `GET /api/sync-cognito/check/prova2@gmail.com`

---

## 🎯 **SCENARI D'USO:**

### **Scenario 1: Utente eliminato da Cognito Console**
```javascript
// 1. Scopri il problema
const scan = await fetch('/api/sync-cognito/scan', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Risolvi automaticamente
if (scan.scanResult.syncNeeded) {
  await fetch('/api/sync-cognito/fix-orphaned', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ confirmSync: true })
  });
}
```

### **Scenario 2: Verifica utente specifico**
```javascript
// Controlla se un utente è sincronizzato
const check = await fetch('/api/sync-cognito/check/user@example.com', {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (check.checkResult.syncStatus === 'ORPHANED_IN_DB') {
  // Utente in DB ma non in Cognito → elimina dal DB
  await fetch('/api/users/user@example.com', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      confirmDeletion: true,
      deleteFromCognito: false,  // Già eliminato
      deleteFromDatabase: true,
      cascadeDelete: true
    })
  });
}
```

### **Scenario 3: Pulizia periodica**
```javascript
// Script per pulizia automatica settimanale
setInterval(async () => {
  const scan = await fetch('/api/sync-cognito/scan');
  if (scan.scanResult.orphanedInDB.length > 0) {
    await fetch('/api/sync-cognito/fix-orphaned', {
      method: 'POST',
      body: JSON.stringify({ confirmSync: true })
    });
  }
}, 7 * 24 * 60 * 60 * 1000); // Settimanale
```

---

## ⚠️ **IMPORTANTE:**

### **🔐 Sicurezza:**
- Solo `company_owner` e `admin` possono usare queste API
- Richiede autenticazione JWT
- Conferma esplicita per eliminazioni

### **🔄 Logica:**
- **Scan**: Confronta tutti gli utenti Cognito ↔ DB
- **Orphaned in DB**: Utenti nel DB ma non in Cognito
- **Orphaned in Cognito**: Utenti in Cognito ma non nel DB
- **Fix**: Elimina automaticamente gli orfani dal DB

### **📊 Risultati:**
- **Success**: Utente eliminato con successo
- **Error**: Problema durante l'eliminazione
- **Summary**: Statistiche complete dell'operazione

---

## 🚨 **TROUBLESHOOTING:**

### **Errore: "Access Denied"**
```bash
# Verifica che l'utente sia admin/owner
curl -s "http://localhost:5001/api/test-auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.user.role'
```

### **Errore: "Cognito API Error"**
```bash
# Verifica credenziali AWS
aws sts get-caller-identity
aws cognito-idp list-users --user-pool-id eu-north-1_MVwkbI87K
```

### **Errore: "Database Error"**
```bash
# Verifica connessione DB
curl -s "http://localhost:5001/api/test-auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎉 **RISULTATO:**

**ORA HAI UN SISTEMA COMPLETO PER SINCRONIZZARE COGNITO ↔ DATABASE!**

- ✅ **Scan automatico** di tutti gli utenti
- ✅ **Fix automatico** degli orfani
- ✅ **Verifica specifica** per utenti singoli
- ✅ **Log completo** di tutte le operazioni
- ✅ **Gestione errori** robusta

**Il problema è risolto!** 🚀

Vuoi testare subito il sistema con l'utente che hai eliminato da Cognito? 