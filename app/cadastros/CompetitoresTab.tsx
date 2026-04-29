"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarCompetitors, criarCompetitor, editarCompetitor,
  formatarCNPJ,
  type Competitor, type CompetitorPayload, type FiltrosCompetitors,
} from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

const INPUT =
  "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

interface FormState {
  cnpj: string;
  legal_name: string;
  trade_name: string;
  status: "ativo" | "inativo";
}

const FORM_VAZIO: FormState = { cnpj: "", legal_name: "", trade_name: "", status: "ativo" };

export default function CompetitoresTab() {
  const [registros, setRegistros]   = useState<Competitor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState<string | null>(null);
  const [view, setView]             = useState<"list" | "form">("list");
  const [editando, setEditando]     = useState<Competitor | null>(null);
  const [form, setForm]             = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando]     = useState(false);
  const [erroForm, setErroForm]     = useState<string | null>(null);
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false);
  const [filtros, setFiltros]       = useState<FiltrosCompetitors>({ busca: "", status: "" });

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      setRegistros(
        await listarCompetitors({
          busca:  filtros.busca  || undefined,
          status: filtros.status || undefined,
        }),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally { setCarregando(false); }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  function abrirNovo() {
    setEditando(null); setForm(FORM_VAZIO); setErroForm(null); markClean(); setView("form");
  }
  function abrirEditar(r: Competitor) {
    setEditando(r);
    setForm({ cnpj: r.cnpj, legal_name: r.legal_name, trade_name: r.trade_name, status: r.status });
    setErroForm(null); markClean(); setView("form");
  }
  function cancelar() { guardCancel(() => { setView("list"); setEditando(null); setErroForm(null); }); }
  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v })); markDirty();
  }

  async function buscarCNPJ(cnpjRaw: string) {
    const digits = cnpjRaw.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setBuscandoCNPJ(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) return;
      const json = await res.json();
      setForm((p) => ({
        ...p,
        legal_name: json.razao_social  ?? p.legal_name,
        trade_name: json.nome_fantasia ?? p.trade_name,
      }));
    } catch {
      // falha silenciosa — usuário pode preencher manualmente
    } finally {
      setBuscandoCNPJ(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.legal_name.trim()) { setErroForm("Razão Social é obrigatória."); return; }
    setSalvando(true); setErroForm(null);
    try {
      const payload: CompetitorPayload = {
        cnpj:       form.cnpj.replace(/\D/g, ""),
        legal_name: form.legal_name.trim(),
        trade_name: form.trade_name.trim(),
        status:     form.status,
      };
      if (editando) await editarCompetitor(editando.id, payload);
      else           await criarCompetitor(payload);
      markClean(); setView("list"); setEditando(null); await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  async function toggleStatus(r: Competitor) {
    try {
      await editarCompetitor(r.id, {
        cnpj: r.cnpj, legal_name: r.legal_name, trade_name: r.trade_name,
        status: r.status === "ativo" ? "inativo" : "ativo",
      });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  // ── Formulário ──────────────────────────────────────────────

  if (view === "form") {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">
            ← Voltar
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {editando ? "Editar concorrente" : "Novo concorrente"}
          </h2>
        </div>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* CNPJ com lookup automático */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>
                CNPJ
                {buscandoCNPJ && (
                  <span className="ml-2 font-normal normal-case text-gray-400">Buscando...</span>
                )}
              </label>
              <input
                type="text"
                value={formatarCNPJ(form.cnpj)}
                onChange={(e) => set("cnpj", e.target.value)}
                onBlur={(e) => buscarCNPJ(e.target.value)}
                placeholder="00.000.000/0000-00"
                className={INPUT}
              />
              <p className="text-[11px] text-gray-400">
                Ao preencher o CNPJ, a Razão Social e o Nome Fantasia são preenchidos automaticamente.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Razão Social *</label>
              <input
                type="text"
                value={form.legal_name}
                onChange={(e) => set("legal_name", e.target.value)}
                required
                placeholder="Razão social da empresa"
                className={INPUT}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Nome Fantasia</label>
              <input
                type="text"
                value={form.trade_name}
                onChange={(e) => set("trade_name", e.target.value)}
                placeholder="Nome fantasia (opcional)"
                className={INPUT}
              />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <input
                type="checkbox"
                id="ativo-c"
                checked={form.status === "ativo"}
                onChange={(e) => set("status", e.target.checked ? "ativo" : "inativo")}
                className="h-4 w-4 rounded border-gray-300 accent-folk"
              />
              <label htmlFor="ativo-c" className="text-sm text-gray-700">Ativo</label>
            </div>

            {erroForm && (
              <div className="sm:col-span-2">
                <Alert status="error" message={erroForm} />
              </div>
            )}

            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar concorrente"}
              </button>
              <button
                type="button"
                onClick={cancelar}
                className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ── Listagem ────────────────────────────────────────────────

  return (
    <div>
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Buscar</label>
            <input
              type="text"
              value={filtros.busca}
              onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
              placeholder="Razão social ou nome fantasia..."
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Status</label>
            <select
              value={filtros.status ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({
                  ...f,
                  status: e.target.value as "ativo" | "inativo" | "",
                }))
              }
              className={INPUT}
            >
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {carregando
            ? "Carregando..."
            : `${registros.length} concorrente${registros.length !== 1 ? "s" : ""}`}
        </p>
        <button
          onClick={abrirNovo}
          className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
        >
          + Novo concorrente
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && registros.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
          Nenhum concorrente cadastrado.
        </div>
      )}

      {registros.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Nome Fantasia
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Razão Social
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  CNPJ
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50/50"
                >
                  <td className="py-3.5 pl-6 pr-4 text-sm font-medium text-gray-900">
                    {r.trade_name || "—"}
                  </td>
                  <td className="py-3.5 pr-4 text-sm text-gray-700">{r.legal_name}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">
                    {r.cnpj ? formatarCNPJ(r.cnpj) : "—"}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        r.status === "ativo"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-gray-200 bg-gray-100 text-gray-500"
                      }`}
                    >
                      {r.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="py-3.5 pr-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(r)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleStatus(r)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          r.status === "ativo"
                            ? "border-amber-100 text-amber-600 hover:bg-amber-50"
                            : "border-green-100 text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {r.status === "ativo" ? "Inativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
