"use client";

import { Suspense, lazy } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const PropostasTab    = lazy(() => import("./PropostasTab"));
const FabricantesTab  = lazy(() => import("./FabricantesTab"));
const FornecedoresTab = lazy(() => import("./FornecedoresTab"));
const CategoriasTab   = lazy(() => import("./CategoriasTab"));
const ItensTab        = lazy(() => import("./ItensTab"));
const KitsTab         = lazy(() => import("./KitsTab"));
const SolucoesTab     = lazy(() => import("./SolucoesTab"));
const RegrasTab       = lazy(() => import("./RegrasTab"));
const ParametrosTab   = lazy(() => import("./ParametrosTab"));

const ABAS = [
  { id: "propostas",    label: "Propostas" },
  { id: "fabricantes",  label: "Fabricantes" },
  { id: "fornecedores", label: "Fornecedores" },
  { id: "categorias",   label: "Categorias" },
  { id: "itens",        label: "Itens do Catálogo" },
  { id: "kits",         label: "Kits" },
  { id: "solucoes",     label: "Soluções" },
  { id: "regras",       label: "Regras de Composição" },
  { id: "parametros",   label: "Parâmetros Financeiros" },
] as const;

type AbaId = (typeof ABAS)[number]["id"];

function TabBar({ aba, onChange }: { aba: AbaId; onChange: (id: AbaId) => void }) {
  return (
    <div className="mb-6 -mx-1 flex flex-wrap gap-1">
      {ABAS.map((a) => (
        <button
          key={a.id}
          onClick={() => onChange(a.id)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            aba === a.id
              ? "bg-folk-gradient text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

function TabContent({ aba }: { aba: AbaId }) {
  const fallback = (
    <div className="py-10 text-center text-sm text-gray-400">Carregando...</div>
  );

  return (
    <Suspense fallback={fallback}>
      {aba === "propostas"    && <PropostasTab />}
      {aba === "fabricantes"  && <FabricantesTab />}
      {aba === "fornecedores" && <FornecedoresTab />}
      {aba === "categorias"   && <CategoriasTab />}
      {aba === "itens"        && <ItensTab />}
      {aba === "kits"         && <KitsTab />}
      {aba === "solucoes"     && <SolucoesTab />}
      {aba === "regras"       && <RegrasTab />}
      {aba === "parametros"   && <ParametrosTab />}
    </Suspense>
  );
}

function PageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const raw = searchParams.get("aba") ?? "propostas";
  const aba = (ABAS.some((a) => a.id === raw) ? raw : "propostas") as AbaId;

  function navegar(id: AbaId) {
    router.push(`?aba=${id}`);
  }

  const abaLabel = ABAS.find((a) => a.id === aba)?.label ?? "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Engenharia Comercial</h1>
        <p className="mt-1 text-sm text-gray-500">Propostas, catálogo de produtos, kits, soluções e parâmetros financeiros.</p>
      </div>

      <TabBar aba={aba} onChange={navegar} />

      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-700">{abaLabel}</h2>
        <TabContent aba={aba} />
      </div>
    </div>
  );
}

export default function EngenhariaComercialPage() {
  return (
    <Suspense>
      <PageInner />
    </Suspense>
  );
}
