"use client";

import { useEffect, useState } from "react";
import {
  listarTiposAcao,
  criarTipoAcao,
  alternarTipoAcao,
  type TipoAcaoCobranca,
} from "@/lib/cobranca";

export default function ConfiguracoesCobrancaTab() {
  const [tipos, setTipos]     = useState<TipoAcaoCobranca[]>([]);
  const [novo, setNovo]       = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]       = useState("");
  const [sucesso, setSucesso] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      setTipos(await listarTiposAcao());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function handleAdicionar() {
    const nome = novo.trim();
    if (!nome) return;
    setSalvando(true);
    setErro("");
    try {
      await criarTipoAcao(nome);
      setNovo("");
      setSucesso("Tipo adicionado.");
      await carregar();
      setTimeout(() => setSucesso(""), 2500);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleAlternar(id: string, ativo: boolean) {
    try {
      await alternarTipoAcao(id, !ativo);
      setTipos((prev) => prev.map((t) => (t.id === id ? { ...t, ativo: !ativo } : t)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro.");
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Tipos de Ação de Cobrança</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure os tipos disponíveis ao registrar uma ação na timeline de cobrança.
        </p>
      </div>

      {/* Adicionar novo */}
      <div className="flex gap-2">
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdicionar()}
          placeholder="Novo tipo de ação..."
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-folk"
        />
        <button
          onClick={handleAdicionar}
          disabled={salvando || !novo.trim()}
          className="rounded-xl bg-folk px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>

      {erro    && <p className="text-sm text-red-600">{erro}</p>}
      {sucesso && <p className="text-sm text-green-600">{sucesso}</p>}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {tipos.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3">
              <span className={`text-sm ${t.ativo ? "text-gray-800" : "text-gray-400 line-through"}`}>
                {t.nome}
              </span>
              <button
                onClick={() => handleAlternar(t.id, t.ativo)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  t.ativo
                    ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                    : "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700"
                }`}
              >
                {t.ativo ? "Ativo" : "Inativo"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
