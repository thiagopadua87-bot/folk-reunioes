"use client";

import Link from "next/link";
import DashboardObrasTab from "../DashboardObrasTab";

export default function ProjetosDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <Link href="/projetos" className="text-sm text-gray-400 hover:text-gray-600">
          ← Gerência de Projetos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Dashboard de Obras 2.0</h1>
        <p className="mt-1 text-sm text-gray-500">Inteligência operacional, riscos e saúde da operação</p>
      </div>
      <DashboardObrasTab />
    </main>
  );
}
