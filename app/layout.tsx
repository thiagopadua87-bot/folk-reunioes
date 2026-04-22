import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppHeader from "./components/AppHeader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Folk — Facilitador de Reuniões",
  description: "Sistema de facilitação de reuniões semanais",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F5F5F5] text-gray-900">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
