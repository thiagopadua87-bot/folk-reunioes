"use client";

import { useState, useEffect, useRef } from "react";
import { usePermissions } from "@/app/components/PermissionsProvider";
import {
  listarRegras, listarCompetencias, buscarResumoDashboard,
  type ComissaoRegra, type Competencia, type ResumoDashboard,
} from "@/lib/comissoes";
import ComissoesDashboard from "./comissoes/ComissoesDashboard";
import CompetenciasTable  from "./comissoes/CompetenciasTable";
import ConfiguracaoRegras from "./comissoes/ConfiguracaoRegras";
import HistoricoComissoes from "./comissoes/HistoricoComissoes";
import RelatorioComissoes  from "./comissoes/RelatorioComissoes";

type SubAba = "dashboard" | "competencias" | "historico" | "relatorio" | "regras";

const SUB_ABAS: { value: SubAba; label: string }[] = [
  { value: "dashboard",    label: "Dashboard"    },
  { value: "competencias", label: "Competências" },
  { value: "historico",    label: "Histórico"    },
  { value: "relatorio",    label: "Relatório"    },
  { value: "regras",       label: "Regras"       },
];

export default function ComissoesTab() {
  const { isAdmin } = usePermissions();
  const [subAba, setSubAba] = useState<SubAba>("dashboard");

  // dados por aba — carregados só quando necessário
  const [regras,        setRegras]        = useState<ComissaoRegra[]>([]);
  const [competencias,  setCompetencias]  = useState<Competencia[]>([]);
  const [dashboard,     setDashboard]     = useState<ResumoDashboard | null>(null);

  // controle de quais abas já foram carregadas (evita re-fetch ao voltar)
  const carregadas = useRef<Set<SubAba>>(new Set());
  const [carregandoAba, setCarregandoAba] = useState(false);

  const subAbas = isAdmin ? SUB_ABAS : SUB_ABAS.filter((s) => s.value !== "regras");

  useEffect(() => {
    if (carregadas.current.has(subAba)) return;

    async function carregar() {
      setCarregandoAba(true);
      try {
        if (subAba === "dashboard") {
          const [d, c] = await Promise.all([buscarResumoDashboard(), listarCompetencias()]);
          setDashboard(d);
          setCompetencias(c);
          carregadas.current.add("competencias"); // competências compartilhadas
        } else if (subAba === "competencias") {
          if (!carregadas.current.has("dashboard")) {
            const c = await listarCompetencias();
            setCompetencias(c);
          }
        } else if (subAba === "regras") {
          const r = await listarRegras();
          setRegras(r);
        }
        carregadas.current.add(subAba);
      } catch {
        // componentes filhos mostram seus próprios erros
      } finally {
        setCarregandoAba(false);
      }
    }

    carregar();
  }, [subAba]);

  async function recarregarAbaAtual() {
    carregadas.current.delete(subAba);
    // remove competências do cache também quando for dashboard
    if (subAba === "dashboard") carregadas.current.delete("competencias");

    setCarregandoAba(true);
    try {
      if (subAba === "dashboard") {
        const [d, c] = await Promise.all([buscarResumoDashboard(), listarCompetencias()]);
        setDashboard(d);
        setCompetencias(c);
        carregadas.current.add("competencias");
      } else if (subAba === "competencias") {
        const c = await listarCompetencias();
        setCompetencias(c);
      } else if (subAba === "regras") {
        const r = await listarRegras();
        setRegras(r);
      }
      carregadas.current.add(subAba);
    } catch {
      // silencioso
    } finally {
      setCarregandoAba(false);
    }
  }

  return (
    <div>
      {/* Sub-navegação — sempre visível, sem spinner global */}
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

      {carregandoAba && (
        <p className="text-sm text-gray-400">Carregando...</p>
      )}

      {!carregandoAba && subAba === "dashboard" && dashboard && (
        <ComissoesDashboard
          dashboard={dashboard}
          competencias={competencias}
          onIrParaCompetencias={() => setSubAba("competencias")}
        />
      )}

      {!carregandoAba && subAba === "competencias" && (
        <CompetenciasTable
          competencias={competencias}
          onRecarregar={recarregarAbaAtual}
        />
      )}

      {subAba === "historico" && (
        <HistoricoComissoes />
      )}

      {subAba === "relatorio" && (
        <RelatorioComissoes />
      )}

      {!carregandoAba && subAba === "regras" && isAdmin && (
        <ConfiguracaoRegras
          regras={regras}
          onRecarregar={recarregarAbaAtual}
        />
      )}
    </div>
  );
}
