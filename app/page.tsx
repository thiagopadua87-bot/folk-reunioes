"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ── Ícones ────────────────────────────────────────────────────

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" strokeWidth={2.5} />
    </svg>
  );
}

function IconHardHat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
      <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    </svg>
  );
}

function IconAlertTriangle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2.5} />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ── Tipos ─────────────────────────────────────────────────────

interface ModuleCard {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface ModuleGroup {
  title: string;
  cards: ModuleCard[];
}

// ── Dados dos módulos ─────────────────────────────────────────

const GRUPOS: ModuleGroup[] = [
  {
    title: "Comercial",
    cards: [
      {
        label: "Comercial",
        description: "Vendas fechadas, pipeline e acompanhamento de propostas.",
        href: "/comercial",
        icon: <IconBriefcase />,
      },
    ],
  },
  {
    title: "Operação",
    cards: [
      {
        label: "Projetos",
        description: "Gerenciamento de projetos e execução de obras.",
        href: "/projetos",
        icon: <IconHardHat />,
      },
      {
        label: "Operacional",
        description: "Gestão de crises e acompanhamento de clientes perdidos.",
        href: "/operacional",
        icon: <IconAlertTriangle />,
      },
    ],
  },
  {
    title: "Gestão",
    cards: [
      {
        label: "Cadastros",
        description: "Vendedores, técnicos e terceirizados.",
        href: "/cadastros",
        icon: <IconUsers />,
      },
      {
        label: "Histórico",
        description: "Reuniões semanais registradas e seu histórico.",
        href: "/historico",
        icon: <IconClock />,
      },
      {
        label: "Reunião",
        description: "Conduzir e registrar a reunião semanal.",
        href: "/reuniao",
        icon: <IconCalendar />,
      },
    ],
  },
  {
    title: "Administração",
    cards: [
      {
        label: "Admin",
        description: "Gerenciamento de usuários e permissões do sistema.",
        href: "/admin",
        icon: <IconSettings />,
        adminOnly: true,
      },
    ],
  },
];

// ── Card de módulo ────────────────────────────────────────────

function Card({ card }: { card: ModuleCard }) {
  return (
    <Link
      href={card.href}
      className="group flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-folk/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-folk/8 text-folk">
          {card.icon}
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 text-gray-300 transition-colors group-hover:text-folk/60"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900 group-hover:text-folk transition-colors">{card.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{card.description}</p>
      </div>
    </Link>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function HomePage() {
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [isAdmin, setIsAdmin]         = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, role")
        .eq("id", user.id)
        .single();
      if (profile?.nome) setNomeUsuario(profile.nome);
      if (profile?.role === "admin") setIsAdmin(true);
    }
    init().catch(() => {});
  }, []);

  const gruposVisiveis = GRUPOS.map((grupo) => ({
    ...grupo,
    cards: grupo.cards.filter((c) => !c.adminOnly || isAdmin),
  })).filter((grupo) => grupo.cards.length > 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {nomeUsuario ? `Olá, ${nomeUsuario}` : "Início"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Acesse os módulos do sistema.</p>
      </div>

      <div className="flex flex-col gap-8">
        {gruposVisiveis.map((grupo) => (
          <section key={grupo.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              {grupo.title}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grupo.cards.map((card) => (
                <Card key={card.href} card={card} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
