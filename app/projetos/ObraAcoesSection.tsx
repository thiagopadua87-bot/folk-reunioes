"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarObraAcoes, criarObraAcao, editarObraAcao, excluirObraAcao,
  concluirObraAcao, reabrirObraAcao,
  OBRA_ACAO_STATUSES, OBRA_ACAO_PRIORIDADES,
  labelObraAcaoStatus, labelObraAcaoPrioridade, formatData,
  type ObraAcao, type ObraAcaoStatus, type ObraAcaoPrioridade, type ObraAcaoPayload,
} from "@/lib/projetos";
import { Card, Alert } from "@/app/components/ui";

// ── Estilos ───────────────────────────────────────────────────

const STATUS_BADGE: Record<ObraAcaoStatus, string> = {
  pendente:            "bg-gray-100 text-gray-600",
  em_andamento:        "bg-amber-100 text-amber-700",
  concluido:           "bg-green-100 text-green-700",
  aguardando_terceiro: "bg-blue-100 text-blue-700",
  bloqueado:           "bg-red-100 text-red-700",
};

const PRIORIDADE_BADGE: Record<ObraAcaoPrioridade, string> = {
  baixa:   "bg-gray-100 text-gray-500",
  media:   "bg-blue-100 text-blue-700",
  alta:    "bg-amber-100 text-amber-700",
  critica: "bg-red-100 text-red-700 font-bold",
};

// ── Form state ────────────────────────────────────────────────

interface AcaoForm {
  titulo: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  status: ObraAcaoStatus;
  prioridade: ObraAcaoPrioridade;
  observacao: string;
}

const FORM_VAZIO: AcaoForm = {
  titulo: "", descricao: "", responsavel: "", prazo: "",
  status: "pendente", prioridade: "media", observacao: "",
};

const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

// ── Componente ────────────────────────────────────────────────

interface Props {
  obraId: string;
  onAcaoChange?: () => void;
}

export default function ObraAcoesSection({ obraId, onAcaoChange }: Props) {
  const [acoes, setAcoes]                 = useState<ObraAcao[]>([]);
  const [carregando, setCarregando]       = useState(true);
  const [modal, setModal]                 = useState<{ aberto: boolean; editando: ObraAcao | null }>({ aberto: false, editando: null });
  const [form, setForm]                   = useState<AcaoForm>(FORM_VAZIO);
  const [salvando, setSalvando]           = useState(false);
  const [erroForm, setErroForm]           = useState<string | null>(null);
  const [excluindoId, setExcluindoId]     = useState<string | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null);
  const [acionandoId, setAcionandoId]     = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try { setAcoes(await listarObraAcoes(obraId)); }
    catch { setAcoes([]); }
    finally { setCarregando(false); }
  }, [obraId]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNova() {
    setForm(FORM_VAZIO); setErroForm(null);
    setModal({ aberto: true, editando: null });
  }

  function abrirEditar(a: ObraAcao) {
    setForm({
      titulo: a.titulo, descricao: a.descricao, responsavel: a.responsavel,
      prazo: a.prazo ?? "", status: a.status, prioridade: a.prioridade, observacao: a.observacao,
    });
    setErroForm(null);
    setModal({ aberto: true, editando: a });
  }

  function fecharModal() { setModal({ aberto: false, editando: null }); }

  async function handleSalvar() {
    if (!form.titulo.trim() || !form.responsavel.trim() || !form.prazo) {
      setErroForm("Preencha: Título, Responsável e Prazo.");
      return;
    }
    setSalvando(true); setErroForm(null);
    try {
      const payload: Omit<ObraAcaoPayload, "obra_id"> = {
        titulo: form.titulo.trim(), descricao: form.descricao.trim(),
        responsavel: form.responsavel.trim(), prazo: form.prazo,
        status: form.status, prioridade: form.prioridade,
        observacao: form.observacao.trim(),
        data_conclusao: form.status === "concluido" ? (modal.editando?.data_conclusao ?? new Date().toISOString().slice(0, 10)) : null,
      };
      if (modal.editando) await editarObraAcao(modal.editando.id, obraId, payload);
      else                await criarObraAcao(obraId, payload);
      fecharModal(); await carregar(); onAcaoChange?.();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  async function handleExcluir(a: ObraAcao) {
    setExcluindoId(a.id);
    try { await excluirObraAcao(a.id, obraId, a.titulo); await carregar(); onAcaoChange?.(); }
    catch { /* silently ignore */ }
    finally { setExcluindoId(null); setConfirmExcluir(null); }
  }

  async function handleConcluir(a: ObraAcao) {
    setAcionandoId(a.id);
    try { await concluirObraAcao(a.id, obraId, a.titulo); await carregar(); onAcaoChange?.(); }
    catch { /* silently ignore */ }
    finally { setAcionandoId(null); }
  }

  async function handleReabrir(a: ObraAcao) {
    setAcionandoId(a.id);
    try { await reabrirObraAcao(a.id, obraId, a.titulo); await carregar(); onAcaoChange?.(); }
    catch { /* silently ignore */ }
    finally { setAcionandoId(null); }
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const total = acoes.length;
  const concluidas = acoes.filter((a) => a.status === "concluido").length;
  const atrasadas  = acoes.filter((a) => a.prazo && a.prazo < hoje && a.status !== "concluido").length;

  return (
    <>
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Ações da obra</h3>
          <button
            type="button" onClick={abrirNova}
            className="rounded-xl bg-folk-gradient px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
          >
            + Adicionar ação
          </button>
        </div>

        {total > 0 && (
          <div className="mb-4 flex flex-wrap gap-4 rounded-xl bg-gray-50 px-4 py-2.5 text-xs">
            <span className="text-gray-500">Total: <span className="font-semibold text-gray-700">{total}</span></span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">
              Concluídas: <span className="font-semibold text-green-600">{Math.round((concluidas / total) * 100)}%</span>
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">
              Atrasadas: <span className={`font-semibold ${atrasadas > 0 ? "text-red-600" : "text-gray-700"}`}>{atrasadas}</span>
            </span>
          </div>
        )}

        {carregando && <p className="text-sm text-gray-400">Carregando...</p>}
        {!carregando && total === 0 && <p className="text-sm text-gray-400">Nenhuma ação registrada ainda.</p>}

        {!carregando && total > 0 && (
          <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100">
            {acoes.map((a) => {
              const atrasada = a.prazo && a.prazo < hoje && a.status !== "concluido";
              const isBusy = acionandoId === a.id;
              return (
                <div
                  key={a.id}
                  className={[
                    "group flex items-start gap-4 px-5 py-4 transition-colors first:rounded-t-xl last:rounded-b-xl",
                    atrasada ? "bg-red-50/60" : "hover:bg-gray-50/60",
                    a.status === "concluido" ? "opacity-60" : "",
                  ].join(" ")}
                >
                  {/* Conteúdo principal */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{a.titulo}</p>
                    {a.descricao && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">{a.descricao}</p>
                    )}
                    <p className="mt-1 text-[11px] text-gray-300">Criado em {formatData(a.created_at.slice(0, 10))}</p>

                    {/* Metadados em linha */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {a.responsavel && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="text-gray-400">👤</span>{a.responsavel}
                        </span>
                      )}
                      {a.prazo && (
                        <span className={`flex items-center gap-1 text-xs ${atrasada ? "font-semibold text-red-600" : "text-gray-500"}`}>
                          <span className="text-gray-400">📅</span>{formatData(a.prazo)}
                          {atrasada && <span className="text-red-500">· atrasada</span>}
                        </span>
                      )}
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[a.status]}`}>
                        {labelObraAcaoStatus(a.status)}
                      </span>
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${PRIORIDADE_BADGE[a.prioridade]}`}>
                        {labelObraAcaoPrioridade(a.prioridade)}
                      </span>
                    </div>
                  </div>

                  {/* Botões de ação — ícones compactos */}
                  <div className="flex shrink-0 items-center gap-1 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {a.status !== "concluido" ? (
                      <button type="button" onClick={() => handleConcluir(a)} disabled={isBusy} title="Concluir"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-40">
                        {isBusy ? <SpinIcon /> : <CheckIcon />}
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleReabrir(a)} disabled={isBusy} title="Reabrir"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40">
                        {isBusy ? <SpinIcon /> : <ReopenIcon />}
                      </button>
                    )}
                    <button type="button" onClick={() => abrirEditar(a)} title="Editar"
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-folk">
                      <EditIcon />
                    </button>
                    {confirmExcluir === a.id ? (
                      <span className="flex items-center gap-1">
                        <button type="button" onClick={() => handleExcluir(a)} disabled={excluindoId === a.id}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                          {excluindoId === a.id ? "..." : "Confirmar"}
                        </button>
                        <button type="button" onClick={() => setConfirmExcluir(null)}
                          className="rounded-lg px-2 py-1 text-[11px] text-gray-400 hover:text-gray-600">×</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmExcluir(a.id)} title="Excluir"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Modal Nova / Editar ação ── */}
      {modal.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-bold text-gray-900">
                {modal.editando ? "Editar ação" : "Nova ação"}
              </h3>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={LABEL}>Título *</label>
                  <input type="text" value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                    placeholder="O que precisa ser feito" className={INPUT} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={LABEL}>Como</label>
                  <input type="text" value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                    placeholder="Como será realizado" className={INPUT} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Responsável *</label>
                  <input type="text" value={form.responsavel} onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))}
                    placeholder="Nome do responsável" className={INPUT} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Prazo *</label>
                  <input type="date" value={form.prazo} onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value }))} className={INPUT} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Status</label>
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ObraAcaoStatus }))} className={INPUT}>
                    {OBRA_ACAO_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Prioridade</label>
                  <select value={form.prioridade} onChange={(e) => setForm((p) => ({ ...p, prioridade: e.target.value as ObraAcaoPrioridade }))} className={INPUT}>
                    {OBRA_ACAO_PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={LABEL}>Observação</label>
                  <input type="text" value={form.observacao} onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                    placeholder="Notas rápidas (opcional)" className={INPUT} />
                </div>
                {erroForm && <div className="sm:col-span-2"><Alert status="error" message={erroForm} /></div>}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={fecharModal} disabled={salvando}
                className="rounded-2xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 disabled:opacity-60">
                Cancelar
              </button>
              <button type="button" onClick={handleSalvar} disabled={salvando}
                className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Ícones SVG ────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ReopenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function SpinIcon() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />;
}
