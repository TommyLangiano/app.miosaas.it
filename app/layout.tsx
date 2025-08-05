import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Berry Theme Providers
import { ConfigProvider } from "../src/contexts/ConfigContext";
import ThemeCustomization from "../src/themes";

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

export const metadata: Metadata = {
  title: "MioSaaS - App Dashboard",
  description: "MioSaaS Application - Accedi alla tua dashboard aziendale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AmplifyProvider>
          <ConfigProvider>
            <ThemeCustomization>
              {children}
            </ThemeCustomization>
          </ConfigProvider>
        </AmplifyProvider>
      </body>
    </html>
  );
}
