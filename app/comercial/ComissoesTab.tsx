"use client";

import { useState, useEffect, useTransition } from "react";
import { usePermissions } from "@/app/components/PermissionsProvider";
import {
  listarRegras, listarCompetencias, buscarResumoDashboard,
  type ComissaoRegra, type Competencia, type ResumoDashboard,
} from "@/lib/comissoes";
import ComissoesDashboard from "./comissoes/ComissoesDashboard";
import CompetenciasTable  from "./comissoes/CompetenciasTable";
import ConfiguracaoRegras from "./comissoes/ConfiguracaoRegras";
import HistoricoComissoes from "./comissoes/HistoricoComissoes";

type SubAba = "dashboard" | "competencias" | "historico" | "regras";

const SUB_ABAS: { value: SubAba; label: string }[] = [
  { value: "dashboard",    label: "Dashboard"    },
  { value: "competencias", label: "Competências" },
  { value: "historico",    label: "Histórico"    },
  { value: "regras",       label: "Regras"       },
];

export default function ComissoesTab() {
  const { isAdmin } = usePermissions();
  const [subAba, setSubAba] = useState<SubAba>("dashboard");
  const [regras, setRegras] = useState<ComissaoRegra[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [dashboard, setDashboard] = useState<ResumoDashboard | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [, startTransition] = useTransition();

  const subAbas = isAdmin ? SUB_ABAS : SUB_ABAS.filter((s) => s.value !== "regras");

  async function carregar() {
    setCarregando(true);
    try {
      const [r, c, d] = await Promise.all([
        listarRegras(),
        listarCompetencias(),
        buscarResumoDashboard(),
      ]);
      setRegras(r);
      setCompetencias(c);
      setDashboard(d);
    } catch {
      // silencioso; componentes filhos lidam com erro individualmente
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function recarregar() {
    startTransition(() => { carregar(); });
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-400">
        Carregando comissões...
      </div>
    );
  }

  return (
    <div>
      {/* Sub-navegação */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm w-fit">
        {subAbas.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setSubAba(value)}
            className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors ${
              subAba === value
                ? "bg-folk text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subAba === "dashboard" && dashboard && (
        <ComissoesDashboard
          dashboard={dashboard}
          competencias={competencias}
          onIrParaCompetencias={() => setSubAba("competencias")}
        />
      )}

      {subAba === "competencias" && (
        <CompetenciasTable
          competencias={competencias}
          onRecarregar={recarregar}
        />
      )}

      {subAba === "historico" && (
        <HistoricoComissoes />
      )}

      {subAba === "regras" && isAdmin && (
        <ConfiguracaoRegras
          regras={regras}
          onRecarregar={recarregar}
        />
      )}
    </div>
  );
}
