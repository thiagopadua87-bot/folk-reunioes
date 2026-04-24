"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarClientesPerdidos, criarClientePerdido, editarClientePerdido, excluirClientePerdido,
  TIPOS_SERVICO, MOTIVOS_PERDA,
  labelTipoServico, labelMotivoPerda, formatMoeda, formatData,
  type ClientePerdido, type TipoServico, type MotivoPerda, type FiltrosClientesPerdidos,
} from "@/lib/operacional";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

// ── Tipos de formulário ──────────────────────────────────────

interface FormState {
  data_aviso: string;
  data_encerramento: string;
  cliente: string;
  tipo_servico: TipoServico;
  valor_contrato: string;
  motivo_perda: MotivoPerda;
  observacoes: string;
}

const FORM_VAZIO: FormState = {
  data_aviso: "",
  data_encerramento: "",
  cliente: "",
  tipo_servico: "portaria_remota",
  valor_contrato: "",
  motivo_perda: "qualidade_servico",
  observacoes: "",
};

function formParaPayload(f: FormState): Omit<ClientePerdido, "id" | "user_id" | "created_at"> {
  return {
    data_aviso: f.data_aviso,
    data_encerramento: f.data_encerramento,
    cliente: f.cliente.trim(),
    tipo_servico: f.tipo_servico,
    valor_contrato: parseFloat(f.valor_contrato.replace(",", ".")) || 0,
    motivo_perda: f.motivo_perda,
    observacoes: f.observacoes.trim(),
  };
}

function registroParaForm(r: ClientePerdido): FormState {
  return {
    data_aviso: r.data_aviso,
    data_encerramento: r.data_encerramento,
    cliente: r.cliente,
    tipo_servico: r.tipo_servico,
    valor_contrato: String(r.valor_contrato),
    motivo_perda: r.motivo_perda,
    observacoes: r.observacoes,
  };
}

// ── Estilos compartilhados ──────────────────────────────────

const INPUT =
  "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

// ── Componente principal ─────────────────────────────────────

export default function ClientesPerdidos() {
  const [registros, setRegistros] = useState<ClientePerdido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<ClientePerdido | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltrosClientesPerdidos>({
    dataInicio: "", dataFim: "", motivo: "",
  });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await listarClientesPerdidos({
        dataInicio: filtros.dataInicio || undefined,
        dataFim:    filtros.dataFim    || undefined,
        motivo:     filtros.motivo     || undefined,
      });
      setRegistros(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar registros.");
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  function abrirFormNovo() {
    setEditando(null); setForm(FORM_VAZIO); setErroForm(null); markClean(); setView("form");
  }

  function abrirFormEditar(r: ClientePerdido) {
    setEditando(r); setForm(registroParaForm(r)); setErroForm(null); markClean(); setView("form");
  }

  function cancelar() { guardCancel(() => { setView("list"); setEditando(null); setErroForm(null); }); }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v })); markDirty();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.data_aviso || !form.data_encerramento || !form.cliente) {
      setErroForm("Preencha todos os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    setErroForm(null);
    try {
      const payload = formParaPayload(form);
      if (editando) await editarClientePerdido(editando.id, payload);
      else           await criarClientePerdido(payload);
      markClean(); setView("list"); setEditando(null); await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id: string) {
    setExcluindo(id);
    try {
      await excluirClientePerdido(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir.");
    } finally {
      setExcluindo(null);
    }
  }

  // ── Formulário ─────────────────────────────────────────────

  if (view === "form") {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">
            ← Voltar
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {editando ? "Editar registro" : "Novo cliente perdido"}
          </h2>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Data do aviso *</label>
              <input type="date" value={form.data_aviso} onChange={(e) => set("data_aviso", e.target.value)} required className={INPUT} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Data de encerramento *</label>
              <input type="date" value={form.data_encerramento} onChange={(e) => set("data_encerramento", e.target.value)} required className={INPUT} />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Cliente *</label>
              <input type="text" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} required placeholder="Nome do cliente" className={INPUT} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Tipo de serviço</label>
              <select value={form.tipo_servico} onChange={(e) => set("tipo_servico", e.target.value as TipoServico)} className={INPUT}>
                {TIPOS_SERVICO.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Valor do contrato (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor_contrato} onChange={(e) => set("valor_contrato", e.target.value)} placeholder="0,00" className={INPUT} />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Motivo da perda</label>
              <select value={form.motivo_perda} onChange={(e) => set("motivo_perda", e.target.value as MotivoPerda)} className={INPUT}>
                {MOTIVOS_PERDA.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Observações</label>
              <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Detalhes adicionais..." rows={3} className={`${INPUT} resize-none`} />
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
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar registro"}
              </button>
              <button type="button" onClick={cancelar} className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300">
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ── Listagem ───────────────────────────────────────────────

  return (
    <div>
      {/* Filtros */}
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Data aviso — de</label>
            <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros((f) => ({ ...f, dataInicio: e.target.value }))} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Data aviso — até</label>
            <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Motivo da perda</label>
            <select value={filtros.motivo} onChange={(e) => setFiltros((f) => ({ ...f, motivo: e.target.value as MotivoPerda | "" }))} className={INPUT}>
              <option value="">Todos</option>
              {MOTIVOS_PERDA.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Cabeçalho + botão novo */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {carregando ? "Carregando..." : `${registros.length} registro${registros.length !== 1 ? "s" : ""}`}
        </p>
        <button onClick={abrirFormNovo} className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]">
          + Novo registro
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && registros.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
          Nenhum registro encontrado.
        </div>
      )}

      {registros.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Data aviso</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo de serviço</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Valor</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Motivo</th>
                <th className="py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 pl-6 pr-4 text-sm text-gray-700">{formatData(r.data_aviso)}</td>
                  <td className="py-3.5 pr-4 text-sm font-medium text-gray-900">{r.cliente}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">{labelTipoServico(r.tipo_servico)}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-700">{formatMoeda(r.valor_contrato)}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">{labelMotivoPerda(r.motivo_perda)}</td>
                  <td className="py-3.5 pr-6">
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirFormEditar(r)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk">
                        Editar
                      </button>
                      <button onClick={() => handleExcluir(r.id)} disabled={excluindo === r.id} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50">
                        {excluindo === r.id ? "..." : "Excluir"}
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
