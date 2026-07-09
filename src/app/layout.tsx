import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIKESRA - Sistem Informasi Keuangan & Sosial Perumahan",
  description: "Aplikasi manajemen keuangan dan sosial perumahan: iuran sampah, sosial, kurban, kas, laporan, dan notifikasi WhatsApp otomatis.",
  keywords: ["perumahan", "keuangan", "iuran", "sampah", "kurban", "kas", "laporan"],
  authors: [{ name: "SIKESRA Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
