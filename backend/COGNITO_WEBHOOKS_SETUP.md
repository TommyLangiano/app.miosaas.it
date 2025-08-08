# 🔄 CONFIGURAZIONE WEBHOOK COGNITO

## Configurazione AWS Cognito per Sincronizzazione Eliminazione Utenti

### 1. 📡 Lambda Trigger Setup

Per sincronizzare automaticamente le eliminazioni da Cognito al database, devi configurare un Lambda trigger:

#### Crea Lambda Function:
```javascript
// cognito-user-deletion-webhook.js
exports.handler = async (event, context) => {
    console.log('Cognito User Pool Trigger:', JSON.stringify(event, null, 2));
    
    // Gestisci solo eliminazioni utente
    if (event.triggerSource === 'PostConfirmation_ConfirmSignUp' || 
        event.triggerSource === 'PostConfirmation_ConfirmForgotPassword') {
        return event;
    }
    
    // Per eliminazioni, fai chiamata al nostro webhook
    if (event.request && event.request.userAttributes) {
        const cognitoSub = event.request.userAttributes.sub;
        const userPoolId = event.userPoolId;
        
        try {
            const https = require('https');
            const data = JSON.stringify({
                cognitoSub: cognitoSub,
                userPoolId: userPoolId,
                eventType: 'USER_DELETED',
                timestamp: new Date().toISOString()
            });
            
            const options = {
                hostname: 'your-api-domain.com', // Sostituisci con il tuo dominio
                port: 443,
                path: '/api/users/cognito-webhook/user-deleted',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };
            
            await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    console.log('Webhook response status:', res.statusCode);
                    resolve(res);
                });
                
                req.on('error', (error) => {
                    console.error('Webhook error:', error);
                    reject(error);
                });
                
                req.write(data);
                req.end();
            });
            
        } catch (error) {
            console.error('Error calling webhook:', error);
        }
    }
    
    return event;
};
```

#### Associa Lambda al User Pool:
1. Vai su AWS Cognito Console
2. Seleziona il tuo User Pool: `eu-north-1_MVwkbI87K`
3. Tab "Triggers"
4. Aggiungi la Lambda function ai trigger appropriati

### 2. 🔐 Sicurezza Webhook

#### Rate Limiting:
```javascript
// Nel tuo middleware Express
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // max 100 richieste per IP
  message: 'Troppi webhook da questo IP'
});

app.use('/api/users/cognito-webhook', webhookLimiter);
```

#### Verifica Signature (Opzionale):
```javascript
// Verifica che il webhook arrivi da AWS
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const calculatedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(calculatedSignature, 'hex')
    );
}
```

### 3. 🧪 Test Manuale

#### Test eliminazione con curl:
```bash
# 1. Preview eliminazione
curl -X GET "http://localhost:5001/api/users/test@example.com/deletion-preview" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Elimina utente
curl -X DELETE "http://localhost:5001/api/users/test@example.com" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmDeletion": true,
    "deleteFromCognito": true,
    "deleteFromDatabase": true,
    "cascadeDelete": true,
    "softDelete": false
  }'

# 3. Test webhook manuale
curl -X POST "http://localhost:5001/api/users/cognito-webhook/user-deleted" \
  -H "Content-Type: application/json" \
  -d '{
    "cognitoSub": "20ec196c-6031-706b-73e6-aa971256b988",
    "userPoolId": "eu-north-1_MVwkbI87K",
    "eventType": "USER_DELETED"
  }'

# 4. Sincronizzazione manuale
curl -X POST "http://localhost:5001/api/users/COGNITO_SUB_HERE/sync-from-cognito" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Statistiche eliminazioni
curl -X GET "http://localhost:5001/api/users/deletion-stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. 📊 Monitoraggio

#### Log da controllare:
- Lambda CloudWatch Logs
- Backend application logs
- Database query logs

#### Metriche importanti:
- Webhook success rate
- Sync latency
- Failed deletions
- Orphaned records

### 5. 🛡️ Rollback Strategy

#### Se qualcosa va storto:
```sql
-- Ripristina utente soft-deleted
UPDATE users 
SET status = 'active', deleted_at = NULL 
WHERE id = 'USER_ID_HERE';

-- Ripristina dipendenze soft-deleted
UPDATE documents 
SET status = 'active', deleted_at = NULL 
WHERE created_by = 'USER_ID_HERE';
```

### 6. 🚀 Deployment

#### Variabili ambiente necessarie:
```bash
# .env
COGNITO_WEBHOOK_SECRET=your-secret-key
WEBHOOK_RATE_LIMIT_MAX=100
WEBHOOK_RATE_LIMIT_WINDOW=900000
```

#### Nginx configuration:
```nginx
# Rate limiting per webhook
location /api/users/cognito-webhook {
    limit_req zone=webhook burst=5 nodelay;
    proxy_pass http://backend;
}
```