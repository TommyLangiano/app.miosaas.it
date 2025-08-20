import type { NextConfig } from "next";
import { createRequire } from "module";

const nextConfig: NextConfig = {
  // Configurazione per Amazon Amplify
  output: 'standalone',
  serverExternalPackages: ['aws-amplify'],
  // Configurazione per il build
  distDir: '.next',
  // Configurazione per le immagini
  images: {
    unoptimized: false,
  },
  // Configurazione per il routing
  trailingSlash: false,
  // Proxy per le API del backend
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (apiBase) {
      return [
        { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
        { source: '/health', destination: `${apiBase}/health` }
      ];
    }
    // fallback dev/local
    return [
      { source: '/api/register', destination: 'http://127.0.0.1:5000/api/register' },
      { source: '/api/demo/:path*', destination: 'http://127.0.0.1:5000/api/demo/:path*' },
      { source: '/api/auth/:path*', destination: 'http://127.0.0.1:5000/api/auth/:path*' },
      { source: '/api/tenants/:path*', destination: 'http://127.0.0.1:5000/api/tenants/:path*' },
      { source: '/api/:path*', destination: 'http://127.0.0.1:5000/api/:path*' },
      { source: '/health', destination: 'http://127.0.0.1:5000/health' }
    ];
  },
  // Configurazione per il server
  serverRuntimeConfig: {
    // Configurazioni specifiche per il server
  },
  publicRuntimeConfig: {
    // Configurazioni pubbliche
  },
  // Aggiunge alias intelligente per @mui/material/Grid2 con fallback a Unstable_Grid2
  webpack(config) {
    const req = createRequire(import.meta.url);

    // Mantieni alias esistenti
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};

    let grid2Target: string = "@mui/material/Grid2";
    try {
      req.resolve("@mui/material/Grid2");
      grid2Target = "@mui/material/Grid2";
    } catch {
      try {
        req.resolve("@mui/material/Unstable_Grid2");
        grid2Target = "@mui/material/Unstable_Grid2";
      } catch {
        // Nessuna delle due disponibili: lascia il default, l'import fallirà e segnalerà chiaramente la dipendenza mancante
        grid2Target = "@mui/material/Grid2";
      }
    }

    // Alias: reindirizza sempre gli import di Grid2 verso il target risolto
    config.resolve.alias["@mui/material/Grid2"] = grid2Target;

    return config;
  },
};

export default nextConfig;
