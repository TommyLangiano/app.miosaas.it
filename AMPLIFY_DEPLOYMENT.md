# Deployment su Amazon Amplify

## Configurazione

### 1. Variabili d'Ambiente

Configura le seguenti variabili d'ambiente in Amplify Console:

```
NEXT_PUBLIC_AWS_PROJECT_REGION=eu-north-1
NEXT_PUBLIC_AWS_COGNITO_REGION=eu-north-1
NEXT_PUBLIC_AWS_USER_POOLS_ID=eu-north-1_MVwkbI87K
NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID=18b21rcmp9f1sl3q7v0pcrircf
NEXT_PUBLIC_APP_NAME=MioSaaS
NEXT_PUBLIC_APP_URL=https://app.miosaas.it
```

### 2. Build Settings

Il file `amplify.yml` è già configurato per:
- Installazione dipendenze: `npm ci`
- Build: `npm run build`
- Output directory: `.next`

### 3. Domains

Configura il dominio `app.miosaas.it` in Amplify Console.

## Troubleshooting

### Problema: Build fallisce
- Verifica che tutte le variabili d'ambiente siano configurate
- Controlla i log di build in Amplify Console

### Problema: App non si carica
- Verifica che il routing sia configurato correttamente
- Controlla che Cognito sia configurato per il dominio

### Problema: Cognito non funziona
- Verifica che le variabili d'ambiente AWS siano corrette
- Controlla che il User Pool sia configurato per il dominio

## Comandi Utili

```bash
# Build locale per test
npm run build

# Test locale
npm run dev

# Deploy su Amplify (automatico via Git)
git add .
git commit -m "Update for Amplify deployment"
git push
``` 