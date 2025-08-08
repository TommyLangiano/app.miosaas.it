#!/bin/bash

echo "🚀 Inizio deploy automatico backend @ $(date)"

echo "📁 Ripristino stato repository locale"
git fetch --all --prune
git reset --hard origin/main
git clean -fdx

echo "📦 Installazione dipendenze..."
npm install

echo "🔨 Compilazione TypeScript..."
npm run build

echo "🔁 Riavvio con PM2..."
pm2 restart backend-api || pm2 start dist/main.js --name backend-api
