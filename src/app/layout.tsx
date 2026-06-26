import type { Metadata } from "next";
import { Rajdhani, Space_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const rajdhaniHeading = Rajdhani({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marlowee Inspector",
  description: "Internal log inspector for Savvly container apps",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rajdhani.variable} ${rajdhaniHeading.variable} ${spaceMono.variable}`}>
      <body className="min-h-dvh bg-bg font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
