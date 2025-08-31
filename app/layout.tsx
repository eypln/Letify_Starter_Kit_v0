import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastRoot from "@/components/system/ToastRoot";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Letify - Emlak İçerik Üretim Platformu",
  description: "Emlakçıların bir ilan linkinden içerik üretip Facebook'ta Post ve Reels olarak paylaşmasını sağlayan SaaS platformu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <ToastRoot>{children}</ToastRoot>
      </body>
    </html>
  );
}