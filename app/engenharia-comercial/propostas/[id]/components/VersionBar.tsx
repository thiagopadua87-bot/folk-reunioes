"use client";

import { useState } from "react";
import type { VersaoListItem } from "@/lib/engenharia-comercial/propostas-db";
import { criarNovaVersao } from "@/lib/engenharia-comercial/propostas-mutations";
import { StatusBadgeVersao } from "./StatusBadge";

const INPUT = "block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-folk focus:ring-2 focus:ring-folk/20";
const FOLK_BTN  = "rounded-xl bg-folk-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50";
const GHOST_BTN = "rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50";

function NovaVersaoModal({
  versoes,
  propostaId,
  onClose,
  onCriada,
}: {
  versoes: VersaoListItem[];
  propostaId: string;
  onClose: () => void;
  onCriada: () => void;
}) {
  const currentVersao = versoes.find((v) => v.isCurrent);
  const [motivo, setMotivo]     = useState("");
  const [copiar, setCopiar]     = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) { setErro("Informe o motivo da revisão."); return; }
    setSalvando(true); setErro(null);
    try {
      await criarNovaVersao(
        propostaId,
        motivo,
        copiar && currentVersao ? currentVersao.id : undefined
      );
      onCriada();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const proxNum = (versoes.at(-1)?.numero ?? 0) + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-bold text-gray-900">Nova Versão — V{proxNum}</h2>
        <form onSubmit={salvar} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Motivo da revisão *</label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Ajuste de margem, alteração de escopo..."
              required
              autoFocus
            />
          </div>

          {currentVersao && (
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={copiar}
                onChange={(e) => setCopiar(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-folk"
              />
              <span className="text-sm text-gray-700">
                Copiar dados da V{currentVersao.numero} (escopo, soluções, premissas, custos)
              </span>
            </label>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={salvando} className={FOLK_BTN}>
              {salvando ? "Criando..." : `Criar V${proxNum}`}
            </button>
            <button type="button" onClick={onClose} className={GHOST_BTN}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function VersionBar({
  versoes,
  versaoSelecionada,
  propostaId,
  onSelectVersao,
  onNovaVersaoCriada,
}: {
  versoes: VersaoListItem[];
  versaoSelecionada: VersaoListItem | null;
  propostaId: string;
  onSelectVersao: (v: VersaoListItem) => void;
  onNovaVersaoCriada: () => void;
}) {
  const [modalAberto, setModalAberto] = useState(false);

  function handleCriada() {
    setModalAberto(false);
    onNovaVersaoCriada();
  }

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">Versões</span>

        <div className="flex items-center gap-1">
          {versoes.map((v) => {
            const isSelected = v.id === versaoSelecionada?.id;
            return (
              <button
                key={v.id}
                onClick={() => onSelectVersao(v)}
                className={`group relative flex shrink-0 flex-col items-center rounded-xl border px-3 py-1.5 transition-all ${
                  isSelected
                    ? "border-folk bg-folk-gradient text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
                title={v.motivoRevisao || `V${v.numero}`}
              >
                <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-gray-700"}`}>
                  V{v.numero}
                  {v.isCurrent && (
                    <span className={`ml-1 ${isSelected ? "text-white/70" : "text-folk"}`}>●</span>
                  )}
                </span>
                <StatusBadgeVersao status={v.status} small />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setModalAberto(true)}
          className="shrink-0 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-folk hover:text-folk"
        >
          + Nova Versão
        </button>
      </div>

      {modalAberto && (
        <NovaVersaoModal
          versoes={versoes}
          propostaId={propostaId}
          onClose={() => setModalAberto(false)}
          onCriada={handleCriada}
        />
      )}
    </>
  );
}
