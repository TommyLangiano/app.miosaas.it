import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configurazione per Amazon Amplify
  output: 'standalone',
  serverExternalPackages: ['aws-amplify'],
  // Configurazione per il build
  distDir: '.next',
  // Configurazione per le immagini
  images: {
    unoptimized: true,
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
      { source: '/api/register', destination: 'http://localhost:5001/api/register' },
      { source: '/api/demo/:path*', destination: 'http://localhost:5001/api/demo/:path*' },
      { source: '/api/auth/:path*', destination: 'http://localhost:5001/api/auth/:path*' },
      { source: '/api/tenants/:path*', destination: 'http://localhost:5001/api/tenants/:path*' },
      { source: '/api/:path*', destination: 'http://localhost:5001/api/:path*' },
      { source: '/health', destination: 'http://localhost:5001/health' }
    ];
  },
  // Configurazione per il server
  serverRuntimeConfig: {
    // Configurazioni specifiche per il server
  },
  publicRuntimeConfig: {
    // Configurazioni pubbliche
  },
};

export default nextConfig;
