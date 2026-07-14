import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppSidebar from "./components/AppSidebar";
import MainLayout from "./components/MainLayout";
import { PermissionsProvider } from "./components/PermissionsProvider";
import SessionWatcher from "./components/SessionWatcher";
import { UnsavedChangesProvider } from "@/lib/unsaved-changes";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Folk — Portaria Remota",
  description: "Sistema de gestão Folk",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F5F5F5] text-gray-900">
        <UnsavedChangesProvider>
          <PermissionsProvider>
            <SessionWatcher />
            <AppSidebar />
            <MainLayout>{children}</MainLayout>
          </PermissionsProvider>
        </UnsavedChangesProvider>
      </body>
    </html>
  );
}
