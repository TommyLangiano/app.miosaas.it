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
  // Configurazione per il server
  serverRuntimeConfig: {
    // Configurazioni specifiche per il server
  },
  publicRuntimeConfig: {
    // Configurazioni pubbliche
  },
};

export default nextConfig;
