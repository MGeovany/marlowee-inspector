import type { Metadata } from "next";
import { Michroma, Urbanist } from "next/font/google";

import "./globals.css";

const michroma = Michroma({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
  display: "swap",
});

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marlowee Inspector",
  description: "Internal log inspector for Savvly container apps",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${michroma.variable} ${urbanist.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
