import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import ToastRoot from "@/components/system/ToastRoot";
import ErrorShield from "./(app)/error-shield";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Letify - Realtor Assistant",
  description: "A SaaS platform for realtors to generate content from a listing link and share as Facebook Post and Reels.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastRoot>
          <ErrorShield>{children}</ErrorShield>
        </ToastRoot>
      </body>
    </html>
  );
}