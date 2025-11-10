import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import ToastRoot from "@/components/system/ToastRoot";
import ErrorShield from "./(app)/error-shield";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import WebVitals from "@/components/system/WebVitals";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap', // Font display optimization
  preload: true,
});

export const metadata: Metadata = {
  title: "Letify - Realtor Assistant",
  description: "A SaaS platform for realtors to generate content from a listing link and share as Facebook Post and Reels.",
  keywords: ["realtor", "real estate", "content generation", "social media", "automation"],
  authors: [{ name: "Letify Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WebVitals />
        <ToastRoot>
          <ErrorBoundary>
            <ErrorShield>{children}</ErrorShield>
          </ErrorBoundary>
        </ToastRoot>
      </body>
    </html>
  );
}