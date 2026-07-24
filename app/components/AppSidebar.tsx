"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import LogoFolk from "./LogoFolk";
import LogoutButton from "./LogoutButton";
import { supabase } from "@/lib/supabase";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
import { usePermissions } from "./PermissionsProvider";
import type { ScreenKey } from "@/lib/permissions";

// ── Ícones ────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconCalculator() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="10" y2="18" />
      <line x1="14" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

function IconHardHat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
      <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconCreditCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
      className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Estrutura de navegação ────────────────────────────────────

type SubItem = {
  label:      string;
  aba?:       string;
  href?:      string;
  adminOnly?: boolean;
  screenKey?: ScreenKey;
};

type NavEntry =
  | { type: "link"; label: string; href: string; icon: React.ReactNode }
  | {
      type:       "group";
      key:        string;
      label:      string;
      icon:       React.ReactNode;
      basePath:   string;
      defaultAba: string;
      items:      SubItem[];
    };

const NAV: NavEntry[] = [
  { type: "link", label: "Início",   href: "/",       icon: <IconHome /> },
  { type: "link", label: "Reuniões", href: "/reuniao", icon: <IconCalendar /> },
  {
    type: "group", key: "comercial", label: "Comercial", icon: <IconBriefcase />,
    basePath: "/comercial", defaultAba: "pipeline",
    items: [
      { label: "Pipeline",  aba: "pipeline",  screenKey: "comercial.pipeline" },
      { label: "Vendas",    aba: "vendas",    screenKey: "comercial.vendas" },
      { label: "Dashboard", aba: "dashboard", screenKey: "comercial.dashboard" },
      { label: "Comissões", aba: "comissoes", screenKey: "comercial.comissoes", adminOnly: true },
    ],
  },
  {
    type: "group", key: "engenharia-comercial", label: "Eng. Comercial", icon: <IconCalculator />,
    basePath: "/engenharia-comercial", defaultAba: "propostas",
    items: [
      { label: "Propostas",    aba: "propostas" },
      { label: "Fabricantes",  aba: "fabricantes" },
      { label: "Fornecedores", aba: "fornecedores" },
      { label: "Categorias",   aba: "categorias" },
      { label: "Itens",        aba: "itens" },
      { label: "Kits",         aba: "kits" },
      { label: "Soluções",     aba: "solucoes" },
      { label: "Regras",       aba: "regras" },
      { label: "Parâmetros",   aba: "parametros" },
    ],
  },
  {
    type: "group", key: "obras", label: "Obras", icon: <IconHardHat />,
    basePath: "/obras", defaultAba: "andamento",
    items: [
      { label: "Em andamento", aba: "andamento",  screenKey: "obras.andamento" },
      { label: "Concluídas",   aba: "concluidas", screenKey: "obras.concluidas" },
      { label: "Dashboard",    aba: "dashboard",  screenKey: "obras.dashboard" },
    ],
  },
  {
    type: "group", key: "projetos", label: "Projetos", icon: <IconLayers />,
    basePath: "/projetos", defaultAba: "andamento",
    items: [
      { label: "Em andamento", aba: "andamento",  screenKey: "projetos.andamento" },
      { label: "Concluídos",   aba: "concluidos", screenKey: "projetos.concluidos" },
      { label: "Dashboard",    aba: "dashboard",  screenKey: "projetos.dashboard" },
    ],
  },
  {
    type: "group", key: "cobranca", label: "Cobrança", icon: <IconCreditCard />,
    basePath: "/inadimplencia", defaultAba: "faturas",
    items: [
      { label: "Clientes",      aba: "faturas",       screenKey: "cobranca.clientes" },
      { label: "Dashboard",     aba: "dashboard",     screenKey: "cobranca.dashboard" },
      { label: "Configurações", aba: "configuracoes", screenKey: "cobranca.configuracoes" },
    ],
  },
  {
    type: "group", key: "operacional", label: "Operacional", icon: <IconShield />,
    basePath: "/operacional", defaultAba: "clientes-perdidos",
    items: [
      { label: "Clientes Perdidos", aba: "clientes-perdidos" },
      { label: "Gestão de Crise",   aba: "gestao-crise" },
    ],
  },
  {
    type: "group", key: "cadastros", label: "Cadastros", icon: <IconUsers />,
    basePath: "/cadastros", defaultAba: "vendedores",
    items: [
      { label: "Usuários",          href: "/admin",                                   adminOnly: true },
      { label: "Vendedores",        aba: "vendedores",        screenKey: "cadastros.vendedores" },
      { label: "Técnicos",          aba: "tecnicos",          screenKey: "cadastros.tecnicos" },
      { label: "Terceirizados",     aba: "terceirizados",     screenKey: "cadastros.terceirizados" },
      { label: "Concorrentes",      aba: "concorrentes",      screenKey: "cadastros.concorrentes" },
      { label: "Motivos de Perda",  aba: "motivos_perda",     screenKey: "cadastros.motivos_perda" },
      { label: "Síndicos/Gestores", aba: "sindicos_gestores", screenKey: "cadastros.sindicos_gestores" },
    ],
  },
];

// ── Chave de persistência no localStorage ─────────────────────
const LS_KEY = "folk_sidebar_collapsed";

function getInitialCollapsed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

// ── Links de navegação ────────────────────────────────────────

function NavLinks({ isAdmin, onClose }: { isAdmin: boolean; onClose?: () => void }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const abaParam     = searchParams.get("aba");
  const { isDirty, guardNavigate } = useUnsavedChanges();
  const { perm } = usePermissions();

  const [collapsed, setCollapsed] = useState<Set<string>>(getInitialCollapsed);

  function toggleGroup(key: string, isActive: boolean) {
    // Grupo ativo não colapsa (UX: sempre vê onde está)
    if (isActive) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { localStorage.setItem(LS_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function handleNav(href: string, e: React.MouseEvent) {
    if (isDirty) { e.preventDefault(); guardNavigate(href); }
    onClose?.();
  }

  return (
    <div className="space-y-0.5">
      {NAV.map((entry) => {
        if (entry.type === "link") {
          const active = pathname === entry.href;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={(e) => handleNav(entry.href, e)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-folk text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className={active ? "text-white" : "text-gray-400"}>{entry.icon}</span>
              {entry.label}
            </Link>
          );
        }

        const visibleItems = entry.items.filter((s) => {
          if (s.adminOnly && !isAdmin) return false;
          if (s.screenKey && !perm(s.screenKey).can_view) return false;
          return true;
        });
        if (visibleItems.length === 0) return null;

        const groupActive =
          pathname === entry.basePath ||
          pathname.startsWith(entry.basePath + "/") ||
          visibleItems.some((s) => s.href && (pathname === s.href || pathname.startsWith(s.href + "/")));

        const isOpen     = groupActive || !collapsed.has(entry.key);
        const effectiveAba = abaParam ?? entry.defaultAba;

        return (
          <div key={entry.key}>
            {/* Cabeçalho do grupo — clicável para colapsar */}
            <button
              type="button"
              onClick={() => toggleGroup(entry.key, groupActive)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left transition-colors ${
                groupActive
                  ? "text-folk"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
            >
              <span className={groupActive ? "text-folk" : "text-gray-400"}>{entry.icon}</span>
              <span className={`flex-1 text-[11px] font-bold uppercase tracking-wider`}>
                {entry.label}
              </span>
              <IconChevron open={isOpen} />
            </button>

            {/* Sub-itens colapsáveis */}
            {isOpen && (
              <div className="ml-2 mt-0.5 mb-1 space-y-0.5">
                {visibleItems.map((sub) => {
                  const navHref = sub.href ?? `${entry.basePath}?aba=${sub.aba}`;
                  const subActive = sub.href
                    ? pathname === sub.href || pathname.startsWith(sub.href + "/")
                    : groupActive && effectiveAba === sub.aba;

                  return (
                    <Link
                      key={sub.href ?? sub.aba}
                      href={navHref}
                      onClick={(e) => handleNav(navHref, e)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-colors ${
                        subActive
                          ? "bg-folk/10 font-semibold text-folk"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${subActive ? "bg-folk" : "bg-gray-300"}`} />
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

const AUTH_PATHS = ["/login", "/signup", "/pendente", "/recusado", "/inativo", "/comercial/tv"];

export default function AppSidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin]       = useState(false);
  const [userEmail, setUserEmail]   = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHidden = AUTH_PATHS.includes(pathname);

  useEffect(() => {
    if (isHidden) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserEmail(user.email ?? "");
      supabase.from("profiles").select("role").eq("id", user.id).single()
        .then(({ data }) => setIsAdmin(data?.role === "admin"));
    });
  }, [isHidden]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (isHidden) return null;

  const footer = (
    <div className="shrink-0 border-t border-gray-100 px-4 py-3">
      {userEmail && (
        <p className="mb-2 truncate text-xs text-gray-400">{userEmail}</p>
      )}
      <LogoutButton className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-folk/30 hover:text-folk" />
    </div>
  );

  return (
    <>
      {/* ── Desktop: sidebar fixa ───────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col border-r border-gray-200 bg-white shadow-sm lg:flex">
        <div className="shrink-0 border-b border-gray-100 px-4 py-4">
          <Link href="/"><LogoFolk /></Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <Suspense fallback={null}>
            <NavLinks isAdmin={isAdmin} />
          </Suspense>
        </nav>
        {footer}
      </aside>

      {/* ── Mobile: barra superior ──────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Abrir menu"
        >
          <IconMenu />
        </button>
        <Link href="/"><LogoFolk /></Link>
      </div>

      {/* ── Mobile: drawer lateral ──────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-4">
              <Link href="/" onClick={() => setMobileOpen(false)}>
                <LogoFolk />
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                aria-label="Fechar menu"
              >
                <IconX />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <Suspense fallback={null}>
                <NavLinks isAdmin={isAdmin} onClose={() => setMobileOpen(false)} />
              </Suspense>
            </nav>
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
