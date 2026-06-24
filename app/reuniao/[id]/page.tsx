"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
import { supabase } from "@/lib/supabase";
import {
  buscarReuniao, atualizarReuniao, finalizarReuniao, reabrirReuniao,
  listarParticipantes, adicionarParticipante, atualizarPresenca, removerParticipante,
  listarAcoes, criarAcao, editarAcao, excluirAcao,
  listarPendencias, formatData, formatNumeroAcao,
  type ReuniaoV2, type ReuniaoParticipante, type ReuniaoAcao,
  type AcaoPayload, type AcaoStatus, type AcaoPrioridade,
} from "@/lib/reunioes-v2";

// ── Estilos ───────────────────────────────────────────────────

const INPUT =
  "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full disabled:opacity-60 disabled:cursor-not-allowed";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

// ── Status ────────────────────────────────────────────────────

const STATUS_BADGE: Record<AcaoStatus, string> = {
  NAO_INICIADO: "bg-gray-100 text-gray-600",
  EM_ANDAMENTO: "bg-amber-100 text-amber-700",
  CONCLUIDO:    "bg-green-100 text-green-700",
  CANCELADO:    "bg-gray-100 text-gray-400",
};

const STATUS_LABEL: Record<AcaoStatus, string> = {
  NAO_INICIADO: "Não iniciado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO:    "Concluído",
  CANCELADO:    "Cancelado",
};

const STATUS_OPTIONS: AcaoStatus[] = ["NAO_INICIADO", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO"];

// ── Prioridade ────────────────────────────────────────────────

const PRIORIDADE_BADGE: Record<AcaoPrioridade, string> = {
  BAIXA:   "bg-blue-50 text-blue-500",
  NORMAL:  "",
  ALTA:    "bg-orange-100 text-orange-700",
  CRITICA: "bg-red-100 text-red-700 font-bold",
};

const PRIORIDADE_LABEL: Record<AcaoPrioridade, string> = {
  BAIXA:   "Baixa",
  NORMAL:  "Normal",
  ALTA:    "Alta",
  CRITICA: "Crítica",
};

const PRIORIDADE_OPTIONS: AcaoPrioridade[] = ["BAIXA", "NORMAL", "ALTA", "CRITICA"];

// ── Form state ────────────────────────────────────────────────

interface AcaoFormState {
  what: string;
  how: string;
  who: string;
  when_date: string;
  status: AcaoStatus;
  prioridade: AcaoPrioridade;
  observacoes: string;
  origem_acao_id: string;
}

const ACAO_VAZIA: AcaoFormState = {
  what: "", how: "", who: "", when_date: "",
  status: "NAO_INICIADO", prioridade: "NORMAL",
  observacoes: "", origem_acao_id: "",
};

type PendenciaComOrigem = ReuniaoAcao & { reuniao_titulo: string; reuniao_data: string };

// ── Página ────────────────────────────────────────────────────

export default function ReuniaoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { markDirty, markClean, guardNavigate } = useUnsavedChanges();

  // Dados
  const [reuniao, setReuniao]             = useState<ReuniaoV2 | null>(null);
  const [participantes, setParticipantes] = useState<ReuniaoParticipante[]>([]);
  const [acoes, setAcoes]                 = useState<ReuniaoAcao[]>([]);
  const [pendencias, setPendencias]       = useState<PendenciaComOrigem[]>([]);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [nomeUsuario, setNomeUsuario]     = useState("");
  const [carregando, setCarregando]       = useState(true);
  const [erro, setErro]                   = useState<string | null>(null);

  // Campos do cabeçalho (editáveis)
  const [titulo, setTitulo]               = useState("");
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFim, setHorarioFim]       = useState("");
  const [responsavel, setResponsavel]     = useState("");
  const [observacoes, setObservacoes]     = useState("");
  const [salvandoCampo, setSalvandoCampo] = useState(false);

  // Participantes
  const [novoParticipante, setNovoParticipante]         = useState("");
  const [adicionando, setAdicionando]                   = useState(false);
  const [removendoParticipante, setRemovendoParticipante] = useState<string | null>(null);

  // Pendências: update inline
  const [atualizandoPendencia, setAtualizandoPendencia] = useState<string | null>(null);

  // Ações: filtro de prioridade
  const [filtroPrioridade, setFiltroPrioridade] = useState<AcaoPrioridade | "">("");

  // Modal: Ação
  const [modalAcao, setModalAcao]             = useState(false);
  const [editandoAcao, setEditandoAcao]       = useState<ReuniaoAcao | null>(null);
  const [formAcao, setFormAcao]               = useState<AcaoFormState>(ACAO_VAZIA);
  const [salvandoAcao, setSalvandoAcao]       = useState(false);
  const [erroAcao, setErroAcao]               = useState<string | null>(null);
  const [excluindoAcao, setExcluindoAcao]     = useState<string | null>(null);
  const [confirmExcluirAcao, setConfirmExcluirAcao] = useState<string | null>(null);

  // Modal: Finalizar
  const [modalFinalizar, setModalFinalizar]   = useState(false);
  const [finalizando, setFinalizando]         = useState(false);

  // Modal: Reabrir (admin)
  const [modalReabrir, setModalReabrir]       = useState(false);
  const [motivoReabertura, setMotivoReabertura] = useState("");
  const [reabrindo, setReabrindo]             = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Carga inicial ─────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [r, p, a, pend] = await Promise.all([
        buscarReuniao(id),
        listarParticipantes(id),
        listarAcoes(id),
        listarPendencias(id),
      ]);
      setReuniao(r);
      setTitulo(r.titulo);
      setHorarioInicio(r.horario_inicio ?? "");
      setHorarioFim(r.horario_fim ?? "");
      setResponsavel(r.responsavel);
      setObservacoes(r.observacoes_gerais);
      setParticipantes(p);
      setAcoes(a);
      setPendencias(pend);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar reunião.");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

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
      setIsAdmin(profile?.role === "admin");
    }
    init();
  }, []);

  const finalizada = reuniao?.status === "finalizada";

  // ── Auto-save campos do cabeçalho ─────────────────────────────

  async function salvarCampo(payload: Parameters<typeof atualizarReuniao>[1]) {
    if (!reuniao) return;
    setSalvandoCampo(true);
    try {
      await atualizarReuniao(reuniao.id, payload);
      markClean();
    } catch { /* silently ignore */ }
    finally { setSalvandoCampo(false); }
  }

  function onBlurTitulo()       { if (titulo !== reuniao?.titulo) salvarCampo({ titulo }); }
  function onBlurResponsavel()  { if (responsavel !== reuniao?.responsavel) salvarCampo({ responsavel }); }
  function onBlurHorarioInicio() {
    const val = horarioInicio || null;
    if (val !== reuniao?.horario_inicio) salvarCampo({ horario_inicio: val });
  }
  function onBlurHorarioFim() {
    const val = horarioFim || null;
    if (val !== reuniao?.horario_fim) salvarCampo({ horario_fim: val });
  }
  function onBlurObservacoes() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (observacoes !== reuniao?.observacoes_gerais) salvarCampo({ observacoes_gerais: observacoes });
    }, 600);
  }

  // ── Participantes ─────────────────────────────────────────────

  async function handleAdicionarParticipante(e: React.FormEvent) {
    e.preventDefault();
    if (!novoParticipante.trim() || !reuniao) return;
    setAdicionando(true);
    try {
      const p = await adicionarParticipante(reuniao.id, novoParticipante.trim());
      setParticipantes((prev) => [...prev, p]);
      setNovoParticipante("");
    } catch { /* silently ignore */ }
    finally { setAdicionando(false); }
  }

  async function handleTogglePresenca(p: ReuniaoParticipante) {
    await atualizarPresenca(p.id, !p.presente);
    setParticipantes((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, presente: !p.presente } : x))
    );
  }

  async function handleRemoverParticipante(pId: string) {
    setRemovendoParticipante(pId);
    try {
      await removerParticipante(pId);
      setParticipantes((prev) => prev.filter((x) => x.id !== pId));
    } catch { /* silently ignore */ }
    finally { setRemovendoParticipante(null); }
  }

  // ── Pendências herdadas ───────────────────────────────────────

  async function handleAtualizarStatusPendencia(acao: PendenciaComOrigem, novoStatus: AcaoStatus) {
    setAtualizandoPendencia(acao.id);
    try {
      await editarAcao(
        acao.id,
        { what: acao.what, how: acao.how, who: acao.who, when_date: acao.when_date,
          status: novoStatus, prioridade: acao.prioridade, observacoes: acao.observacoes,
          origem_acao_id: acao.origem_acao_id },
        acao
      );
      setPendencias((prev) =>
        prev.map((p) => (p.id === acao.id ? { ...p, status: novoStatus } : p))
      );
    } catch { /* silently ignore */ }
    finally { setAtualizandoPendencia(null); }
  }

  // ── Ações ─────────────────────────────────────────────────────

  function abrirModalNovaAcao() {
    setFormAcao(ACAO_VAZIA);
    setEditandoAcao(null);
    setErroAcao(null);
    setModalAcao(true);
  }

  function abrirModalEditarAcao(a: ReuniaoAcao) {
    setFormAcao({
      what: a.what, how: a.how, who: a.who,
      when_date: a.when_date, status: a.status,
      prioridade: a.prioridade, observacoes: a.observacoes,
      origem_acao_id: a.origem_acao_id ?? "",
    });
    setEditandoAcao(a);
    setErroAcao(null);
    setModalAcao(true);
  }

  async function handleSalvarAcao() {
    if (!formAcao.what.trim() || !formAcao.who.trim() || !formAcao.when_date) {
      setErroAcao("Preencha os campos obrigatórios: O que, Responsável e Prazo.");
      return;
    }
    if (!reuniao) return;
    setSalvandoAcao(true);
    setErroAcao(null);
    try {
      const payload: AcaoPayload = {
        what:           formAcao.what.trim(),
        how:            formAcao.how.trim(),
        who:            formAcao.who.trim(),
        when_date:      formAcao.when_date,
        status:         formAcao.status,
        prioridade:     formAcao.prioridade,
        observacoes:    formAcao.observacoes.trim(),
        origem_acao_id: formAcao.origem_acao_id || null,
      };
      if (editandoAcao) {
        await editarAcao(editandoAcao.id, payload, editandoAcao);
      } else {
        await criarAcao(reuniao.id, payload);
      }
      setModalAcao(false);
      setAcoes(await listarAcoes(reuniao.id));
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : "Erro ao salvar ação.");
    } finally {
      setSalvandoAcao(false);
    }
  }

  async function handleExcluirAcao(acaoId: string) {
    setExcluindoAcao(acaoId);
    try {
      await excluirAcao(acaoId);
      setAcoes((prev) => prev.filter((a) => a.id !== acaoId));
    } catch { /* silently ignore */ }
    finally {
      setExcluindoAcao(null);
      setConfirmExcluirAcao(null);
    }
  }

  // ── Finalizar / Reabrir ───────────────────────────────────────

  async function handleFinalizar() {
    if (!reuniao) return;
    setFinalizando(true);
    try {
      await finalizarReuniao(reuniao.id);
      setReuniao((prev) => prev
        ? { ...prev, status: "finalizada", finalizada_at: new Date().toISOString() }
        : prev);
      setModalFinalizar(false);
      markClean();
    } catch { /* silently ignore */ }
    finally { setFinalizando(false); }
  }

  async function handleReabrir() {
    if (!reuniao || !motivoReabertura.trim()) return;
    setReabrindo(true);
    try {
      await reabrirReuniao(reuniao.id, motivoReabertura.trim(), nomeUsuario);
      setReuniao((prev) => prev
        ? { ...prev, status: "ativa", reaberta_em: new Date().toISOString() }
        : prev);
      setModalReabrir(false);
      setMotivoReabertura("");
    } catch { /* silently ignore */ }
    finally { setReabrindo(false); }
  }

  // ── Indicadores ───────────────────────────────────────────────

  const hoje       = new Date().toISOString().split("T")[0];
  const totalAcoes = acoes.length;
  const concluidas = acoes.filter((a) => a.status === "CONCLUIDO").length;
  const emAndamento = acoes.filter((a) => a.status === "EM_ANDAMENTO").length;
  const atrasadas  = acoes.filter(
    (a) => a.when_date < hoje && a.status !== "CONCLUIDO" && a.status !== "CANCELADO"
  ).length;

  // Ações filtradas por prioridade
  const acoesFiltradas = filtroPrioridade
    ? acoes.filter((a) => a.prioridade === filtroPrioridade)
    : acoes;

  // Opções de origem disponíveis no modal (pendências + ações da reunião atual, exceto a que está sendo editada)
  const origemOpcoes: { id: string; label: string }[] = [
    ...pendencias.map((p) => ({
      id: p.id,
      label: `${formatNumeroAcao(p.numero_seq)} (${p.reuniao_titulo}) — ${p.what.slice(0, 40)}`,
    })),
    ...acoes
      .filter((a) => !editandoAcao || a.id !== editandoAcao.id)
      .map((a) => ({
        id: a.id,
        label: `${formatNumeroAcao(a.numero_seq)} — ${a.what.slice(0, 40)}`,
      })),
  ];

  // ── Render ────────────────────────────────────────────────────

  if (carregando) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
      </main>
    );
  }

  if (erro || !reuniao) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Alert status="error" message={erro ?? "Reunião não encontrada."} />
        <button onClick={() => router.push("/reuniao")} className="mt-4 text-sm text-folk hover:underline">
          ← Voltar
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">

      {/* ── Top bar ── */}
      <div className="mb-5 flex items-start gap-3">
        <button
          onClick={() => guardNavigate("/reuniao")}
          className="mt-1 shrink-0 text-sm text-gray-400 hover:text-gray-600"
        >
          ← Reuniões
        </button>

        <div className="flex-1 min-w-0">
          {finalizada ? (
            <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
          ) : (
            <input
              type="text"
              value={titulo}
              onChange={(e) => { setTitulo(e.target.value); markDirty(); }}
              onBlur={onBlurTitulo}
              className="w-full rounded-xl border-transparent bg-transparent px-0 text-2xl font-bold text-gray-900 outline-none focus:border-gray-200 focus:bg-gray-50 focus:px-3 transition-all"
              placeholder="Título da reunião"
            />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            finalizada ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"
          }`}>
            {finalizada ? "Finalizada" : "Ativa"}
          </span>
          {salvandoCampo && <span className="text-xs text-gray-400">Salvando...</span>}
          {!finalizada && (
            <button
              onClick={() => setModalFinalizar(true)}
              className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
            >
              Finalizar reunião
            </button>
          )}
          {finalizada && isAdmin && (
            <button
              onClick={() => { setMotivoReabertura(""); setModalReabrir(true); }}
              className="rounded-2xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300"
            >
              Reabrir
            </button>
          )}
          {finalizada && (
            <button
              onClick={() => router.push(`/reuniao/${id}/ata`)}
              className="rounded-2xl border border-folk/30 px-5 py-2 text-sm font-semibold text-folk hover:border-folk/50"
            >
              Ver Ata
            </button>
          )}
        </div>
      </div>

      {/* ── Cabeçalho ── */}
      <Card className="mb-4 px-5 py-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className={LABEL}>Data</span>
            <span className="text-sm font-medium text-gray-800 capitalize">
              {new Date(reuniao.data).toLocaleDateString("pt-BR", {
                weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
              })}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Início</label>
            <input type="time" value={horarioInicio} disabled={finalizada}
              onChange={(e) => { setHorarioInicio(e.target.value); markDirty(); }}
              onBlur={onBlurHorarioInicio} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Fim</label>
            <input type="time" value={horarioFim} disabled={finalizada}
              onChange={(e) => { setHorarioFim(e.target.value); markDirty(); }}
              onBlur={onBlurHorarioFim} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-4">
            <label className={LABEL}>Responsável pelos registros</label>
            <input type="text" value={responsavel} disabled={finalizada}
              onChange={(e) => { setResponsavel(e.target.value); markDirty(); }}
              onBlur={onBlurResponsavel} placeholder="Nome do responsável" className={INPUT} />
          </div>
        </div>
      </Card>

      {/* ── Participantes ── */}
      <Card className="mb-4 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800">
            Participantes
            {participantes.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">{participantes.length}</span>
            )}
          </h2>
        </div>

        {participantes.length === 0 && finalizada && (
          <p className="px-5 py-4 text-sm text-gray-400">Nenhum participante registrado.</p>
        )}

        {participantes.length > 0 && (
          <div className="divide-y divide-gray-50">
            {participantes.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-sm font-medium text-gray-800">{p.nome}</span>
                <div className="flex items-center gap-2">
                  {finalizada ? (
                    <span className={`text-xs font-semibold ${p.presente ? "text-green-600" : "text-gray-400"}`}>
                      {p.presente ? "Presente" : "Ausente"}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleTogglePresenca(p)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          p.presente ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600"
                        }`}
                      >
                        Presente
                      </button>
                      <button
                        onClick={() => handleTogglePresenca(p)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          !p.presente ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        }`}
                      >
                        Ausente
                      </button>
                      <button
                        onClick={() => handleRemoverParticipante(p.id)}
                        disabled={removendoParticipante === p.id}
                        className="ml-1 text-xs text-gray-300 hover:text-red-500 disabled:opacity-40"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!finalizada && (
          <form onSubmit={handleAdicionarParticipante} className="flex items-center gap-2 border-t border-gray-100 px-5 py-3">
            <input
              type="text" value={novoParticipante}
              onChange={(e) => setNovoParticipante(e.target.value)}
              placeholder="Nome do participante..."
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10"
            />
            <button
              type="submit" disabled={adicionando || !novoParticipante.trim()}
              className="rounded-xl bg-folk-gradient px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {adicionando ? "..." : "+ Adicionar"}
            </button>
          </form>
        )}
      </Card>

      {/* ── Pendências Herdadas ── */}
      {pendencias.length > 0 && (
        <Card className="mb-4 overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-800">
              Pendências Herdadas
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {pendencias.length}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5">Origem</th>
                  <th className="px-4 py-2.5">O que</th>
                  <th className="px-4 py-2.5">Como</th>
                  <th className="px-4 py-2.5">Responsável</th>
                  <th className="px-4 py-2.5">Prazo</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendencias.map((p) => {
                  const atrasada = p.when_date < hoje && p.status !== "CONCLUIDO" && p.status !== "CANCELADO";
                  return (
                    <tr key={p.id} className={["border-b border-gray-100 last:border-0", atrasada ? "bg-red-50/60" : ""].join(" ")}>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div className="font-medium text-gray-700">{p.reuniao_titulo}</div>
                        <div>{formatData(p.reuniao_data.split("T")[0])}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.what}</td>
                      <td className="px-4 py-3 text-gray-500">{p.how || "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{p.who}</td>
                      <td className="px-4 py-3">
                        <span className={atrasada ? "font-semibold text-red-600" : "text-gray-700"}>
                          {formatData(p.when_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!finalizada ? (
                          <select
                            value={p.status}
                            disabled={atualizandoPendencia === p.id}
                            onChange={(e) => handleAtualizarStatusPendencia(p, e.target.value as AcaoStatus)}
                            className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs outline-none focus:border-folk"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[p.status]}`}>
                            {STATUS_LABEL[p.status]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Ações da Reunião ── */}
      <Card className="mb-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800">Ações da Reunião</h2>
          {!finalizada && (
            <button
              onClick={abrirModalNovaAcao}
              className="rounded-xl bg-folk-gradient px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
            >
              + Adicionar ação
            </button>
          )}
        </div>

        {/* Indicadores */}
        {totalAcoes > 0 && (
          <div className="flex flex-wrap items-center gap-4 border-b border-gray-50 bg-gray-50/50 px-5 py-2.5 text-xs">
            <span className="text-gray-500">
              Total: <span className="font-semibold text-gray-700">{totalAcoes}</span>
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">
              Concluídas: <span className="font-semibold text-green-600">
                {Math.round((concluidas / totalAcoes) * 100)}%
              </span>
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">
              Em andamento: <span className="font-semibold text-amber-600">
                {Math.round((emAndamento / totalAcoes) * 100)}%
              </span>
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">
              Atrasadas: <span className={`font-semibold ${atrasadas > 0 ? "text-red-600" : "text-gray-700"}`}>
                {atrasadas}
              </span>
            </span>
          </div>
        )}

        {/* Filtro por prioridade */}
        {totalAcoes > 0 && (
          <div className="flex items-center gap-2 border-b border-gray-50 px-5 py-2.5">
            <span className="text-xs text-gray-400">Prioridade:</span>
            {(["", "CRITICA", "ALTA", "NORMAL", "BAIXA"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFiltroPrioridade(p as AcaoPrioridade | "")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  filtroPrioridade === p
                    ? "bg-folk/10 text-folk"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {p === "" ? "Todas" : PRIORIDADE_LABEL[p as AcaoPrioridade]}
              </button>
            ))}
          </div>
        )}

        {totalAcoes === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            {finalizada
              ? "Nenhuma ação foi registrada nesta reunião."
              : "Nenhuma ação registrada ainda. Clique em \"+ Adicionar ação\" para começar."}
          </p>
        )}

        {acoesFiltradas.length === 0 && totalAcoes > 0 && (
          <p className="px-5 py-6 text-center text-sm text-gray-400">
            Nenhuma ação com prioridade {PRIORIDADE_LABEL[filtroPrioridade as AcaoPrioridade]}.
          </p>
        )}

        {acoesFiltradas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5 w-16">Código</th>
                  <th className="px-4 py-2.5">O que</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Como / Discussão</th>
                  <th className="px-4 py-2.5">Prioridade</th>
                  <th className="px-4 py-2.5">Responsável</th>
                  <th className="px-4 py-2.5">Prazo</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {acoesFiltradas.map((a) => {
                  const atrasada = a.when_date < hoje && a.status !== "CONCLUIDO" && a.status !== "CANCELADO";
                  const origemAcao = a.origem_acao_id
                    ? acoes.find((x) => x.id === a.origem_acao_id)
                      ?? pendencias.find((x) => x.id === a.origem_acao_id)
                    : null;
                  return (
                    <tr
                      key={a.id}
                      className={["border-b border-gray-100 last:border-0", atrasada ? "bg-red-50" : "hover:bg-gray-50/40"].join(" ")}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-400">{formatNumeroAcao(a.numero_seq)}</span>
                        {origemAcao && (
                          <div className="mt-0.5 text-[10px] text-gray-400">
                            ↑ {formatNumeroAcao(origemAcao.numero_seq)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {a.what}
                        {a.observacoes && (
                          <p className="mt-0.5 text-xs font-normal text-gray-400 truncate max-w-[200px]">{a.observacoes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{a.how || "—"}</td>
                      <td className="px-4 py-3">
                        {a.prioridade !== "NORMAL" ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORIDADE_BADGE[a.prioridade]}`}>
                            {PRIORIDADE_LABEL[a.prioridade]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{a.who}</td>
                      <td className="px-4 py-3">
                        <span className={atrasada ? "font-semibold text-red-600" : "text-gray-700"}>
                          {formatData(a.when_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[a.status]}`}>
                          {STATUS_LABEL[a.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!finalizada && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => abrirModalEditarAcao(a)}
                              className="text-xs font-semibold text-gray-500 hover:text-folk"
                            >
                              Editar
                            </button>
                            {isAdmin && (
                              confirmExcluirAcao === a.id ? (
                                <span className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleExcluirAcao(a.id)}
                                    disabled={excluindoAcao === a.id}
                                    className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                                  >
                                    {excluindoAcao === a.id ? "..." : "Confirmar"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmExcluirAcao(null)}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                  >
                                    Cancelar
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setConfirmExcluirAcao(a.id)}
                                  className="text-xs font-semibold text-gray-400 hover:text-red-600"
                                >
                                  Excluir
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Observações Gerais ── */}
      <Card className="mb-8 px-5 py-4">
        <label className={`${LABEL} block mb-2`}>Observações Gerais</label>
        <textarea
          value={observacoes} disabled={finalizada} rows={4}
          onChange={(e) => { setObservacoes(e.target.value); markDirty(); }}
          onBlur={onBlurObservacoes}
          placeholder="Observações, informes gerais ou pontos adicionais da reunião..."
          className={INPUT}
        />
      </Card>

      {/* ── Modal: Nova / Editar Ação ── */}
      {modalAcao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-gray-100 bg-white px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">
                {editandoAcao ? `Editar ${formatNumeroAcao(editandoAcao.numero_seq)}` : "Nova ação"}
              </h2>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>O que *</label>
                <input
                  type="text" autoFocus
                  value={formAcao.what}
                  onChange={(e) => setFormAcao((p) => ({ ...p, what: e.target.value }))}
                  placeholder="Descreva a ação a ser executada"
                  className={INPUT}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Como / Discussão</label>
                <textarea
                  value={formAcao.how} rows={3}
                  onChange={(e) => setFormAcao((p) => ({ ...p, how: e.target.value }))}
                  placeholder="Como será executado, contexto, encaminhamento..."
                  className={INPUT}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Responsável *</label>
                  <input
                    type="text"
                    value={formAcao.who}
                    onChange={(e) => setFormAcao((p) => ({ ...p, who: e.target.value }))}
                    placeholder="Nome do responsável"
                    className={INPUT}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Prazo *</label>
                  <input
                    type="date"
                    value={formAcao.when_date}
                    onChange={(e) => setFormAcao((p) => ({ ...p, when_date: e.target.value }))}
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Status</label>
                  <select
                    value={formAcao.status}
                    onChange={(e) => setFormAcao((p) => ({ ...p, status: e.target.value as AcaoStatus }))}
                    className={INPUT}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Prioridade</label>
                  <select
                    value={formAcao.prioridade}
                    onChange={(e) => setFormAcao((p) => ({ ...p, prioridade: e.target.value as AcaoPrioridade }))}
                    className={INPUT}
                  >
                    {PRIORIDADE_OPTIONS.map((p) => (
                      <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {origemOpcoes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Originada de (rastreabilidade)</label>
                  <select
                    value={formAcao.origem_acao_id}
                    onChange={(e) => setFormAcao((p) => ({ ...p, origem_acao_id: e.target.value }))}
                    className={INPUT}
                  >
                    <option value="">— Nenhuma —</option>
                    {origemOpcoes.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Observações</label>
                <textarea
                  value={formAcao.observacoes} rows={2}
                  onChange={(e) => setFormAcao((p) => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Notas adicionais..."
                  className={INPUT}
                />
              </div>

              {erroAcao && <Alert status="error" message={erroAcao} />}

              <div className="flex gap-3">
                <button
                  onClick={handleSalvarAcao} disabled={salvandoAcao}
                  className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {salvandoAcao ? "Salvando..." : editandoAcao ? "Salvar alterações" : "Adicionar ação"}
                </button>
                <button
                  onClick={() => setModalAcao(false)}
                  className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Finalizar ── */}
      {modalFinalizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Finalizar Reunião</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-600">Deseja finalizar esta reunião?</p>
              <ul className="mt-3 space-y-1 text-sm text-gray-500">
                <li>• A ata será gerada automaticamente</li>
                <li>• Nenhuma nova ação poderá ser adicionada</li>
                <li>• A reunião ficará somente leitura</li>
              </ul>
            </div>
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={handleFinalizar} disabled={finalizando}
                className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {finalizando ? "Finalizando..." : "Finalizar Reunião"}
              </button>
              <button
                onClick={() => setModalFinalizar(false)}
                className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reabrir (admin) ── */}
      {modalReabrir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Reabrir Reunião</h2>
            </div>
            <div className="flex flex-col gap-4 px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Motivo da reabertura *</label>
                <textarea
                  value={motivoReabertura} rows={3} autoFocus
                  onChange={(e) => setMotivoReabertura(e.target.value)}
                  placeholder="Informe o motivo..."
                  className={INPUT}
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={handleReabrir}
                disabled={reabrindo || !motivoReabertura.trim()}
                className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {reabrindo ? "Reabrindo..." : "Reabrir"}
              </button>
              <button
                onClick={() => setModalReabrir(false)}
                className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
