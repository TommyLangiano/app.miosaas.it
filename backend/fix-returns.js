const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/files.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Sostituisce tutte le occorrenze di res.status(...).json(...) con return res.status(...).json(...)
content = content.replace(/res\.status\(/g, 'return res.status(');

// Scrivi il file corretto
fs.writeFileSync(filePath, content);

console.log('✅ Return statements corretti automaticamente!');
