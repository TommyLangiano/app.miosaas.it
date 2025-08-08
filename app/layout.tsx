'use client';

import { useState, useEffect } from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Berry Theme Providers
import { ConfigProvider } from "../src/contexts/ConfigContext";
import ThemeCustomization from "../src/themes";
import ProviderWrapper from "../src/store/ProviderWrapper";

// Amplify Provider
import AmplifyProvider from "../src/providers/AmplifyProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata gestito dinamicamente nel componente

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Imposta metadata dinamicamente
    document.title = "MioSaaS - App Dashboard";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'MioSaaS Application - Accedi alla tua dashboard aziendale');
    }
  }, []);

  // 🔧 Evita rendering durante SSR per evitare hydration mismatch
  if (!isClient) {
    return (
      <html lang="it">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            fontSize: '18px',
            color: '#666'
          }}>
            Caricamento...
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AmplifyProvider>
          <ProviderWrapper>
            {children}
          </ProviderWrapper>
        </AmplifyProvider>
      </body>
    </html>
  );
}
