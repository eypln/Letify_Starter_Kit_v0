import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import ToastRoot from "@/components/system/ToastRoot";
import ErrorShield from "./(app)/error-shield";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import ClientProviders from "@/components/system/ClientProviders";
import { siteConfig, generateOGMetadata } from "@/lib/seo";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  ...generateOGMetadata({
    title: siteConfig.title,
    description: siteConfig.description,
  }),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icons/Logo/32.png',
    shortcut: '/icons/Logo/16.png',
    apple: '/icons/Logo/180.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#9333ea" />
        <link rel="apple-touch-icon" href="/icons/Logo/180.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClientProviders />
        <ToastRoot>
          <ErrorBoundary>
            <ErrorShield>{children}</ErrorShield>
          </ErrorBoundary>
        </ToastRoot>
      </body>
    </html>
  );
}