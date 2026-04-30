"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  listarCrises, criarCrise, editarCrise, excluirCrise,
  listarLogsCrise, uploadCartaArquivo, removerCartaArquivo, promoverCriseParaPerdido,
  listarCrisisActions, criarCrisisAction, editarCrisisAction, excluirCrisisAction,
  calcularEncerramentoBR, calcularEncerramentoISO, diasParaEncerramento,
  formatarEventoCrise, formatMoeda,
  TIPOS_SERVICO, NIVEIS_RISCO, MOTIVOS_PERDA,
  labelTipoServico, labelNivelRisco, formatData,
  type CriseItem, type EventoHistorico,
  type TipoServico, type NivelRisco, type MotivoPerda,
  type CriseEditPayload,
  type CrisisAction, type CrisisActionStatus, type CrisisActionPayload,
} from "@/lib/operacional";
import { formatarCNPJ } from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

// ── Badge da carta ───────────────────────────────────────────

function getCartaBadge(c: CriseItem): { label: string; cls: string } {
  if (!c.apresentou_carta_cancelamento)
    return { label: "Sem carta", cls: "bg-gray-100 text-gray-500 border-gray-200" };
  if (!c.data_aviso || !c.prazo_aviso_dias)
    return { label: "Com carta", cls: "bg-blue-50 text-blue-600 border-blue-200" };
  const dias = diasParaEncerramento(c.data_aviso, c.prazo_aviso_dias);
  if (dias < 0)  return { label: "Vencido",              cls: "bg-gray-200 text-gray-600 border-gray-300" };
  if (dias <= 7) return { label: `Encerra em ${dias}d`,  cls: "bg-red-100 text-red-700 border-red-200" };
  if (dias <= 30) return { label: `Encerra em ${dias}d`, cls: "bg-yellow-100 text-yellow-700 border-yellow-200" };
  return           { label: `Encerra em ${dias}d`,       cls: "bg-green-100 text-green-700 border-green-200" };
}

// ── Estilos de risco ─────────────────────────────────────────

const RISCO_BADGE: Record<NivelRisco, string> = {
  alto:      "bg-red-100 text-red-700 border-red-200",
  medio:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  baixo:     "bg-green-100 text-green-700 border-green-200",
  revertido: "bg-green-50 text-green-700 border-green-200",
};

const RISCO_ROW: Record<NivelRisco, string> = {
  alto:      "border-l-4 border-l-red-400",
  medio:     "border-l-4 border-l-yellow-400",
  baixo:     "border-l-4 border-l-green-400",
  revertido: "border-l-4 border-l-green-300",
};

// ── Helpers ──────────────────────────────────────────────────

function formatLogTs(s: string): string {
  const d = new Date(s);
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

// ── Tipos de formulário ──────────────────────────────────────

interface FormState {
  cnpj: string;
  cliente: string;
  tipo_servico: TipoServico;
  risco: NivelRisco;
  valor_contrato: string;
  apresentou_carta_cancelamento: boolean;
  data_aviso: string;
  prazo_aviso_dias: string;
}

const FORM_VAZIO: FormState = {
  cnpj: "",
  cliente: "",
  tipo_servico: "portaria_remota",
  risco: "medio",
  valor_contrato: "",
  apresentou_carta_cancelamento: false,
  data_aviso: "",
  prazo_aviso_dias: "",
};

interface AcaoFormState {
  what: string;
  how: string;
  who: string;
  when_date: string;
  status: CrisisActionStatus;
}

const ACAO_FORM_VAZIO: AcaoFormState = {
  what: "", how: "", who: "", when_date: "", status: "PENDENTE",
};

const STATUS_BADGE: Record<CrisisActionStatus, string> = {
  PENDENTE:     "bg-gray-100 text-gray-600",
  EM_ANDAMENTO: "bg-amber-100 text-amber-700",
  CONCLUIDO:    "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<CrisisActionStatus, string> = {
  PENDENTE:     "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO:    "Concluído",
};

interface FormPromoverState {
  data_aviso: string;
  data_encerramento: string;
  valor_contrato: string;
  motivo_perda: MotivoPerda;
  observacoes: string;
}

const INPUT =
  "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full disabled:opacity-60 disabled:cursor-not-allowed";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

// ── Props ─────────────────────────────────────────────────────

interface GestaoCriseProps {
  onNavigarParaClientePerdido: (id: string) => void;
}

// ── Componente principal ─────────────────────────────────────

export default function GestaoCrise({ onNavigarParaClientePerdido }: GestaoCriseProps) {
  const [crises, setCrises]               = useState<CriseItem[]>([]);
  const [carregando, setCarregando]       = useState(true);
  const [erro, setErro]                   = useState<string | null>(null);
  const [view, setView]                   = useState<"list" | "form">("list");
  const [editando, setEditando]           = useState<CriseItem | null>(null);
  const [form, setForm]                   = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando]           = useState(false);
  const [erroForm, setErroForm]           = useState<string | null>(null);
  const [excluindo, setExcluindo]         = useState<string | null>(null);
  const [filtroRisco, setFiltroRisco]     = useState<NivelRisco | "">("");
  const [logs, setLogs]                   = useState<EventoHistorico[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);
  const [arquivoNovo, setArquivoNovo]     = useState<File | null>(null);
  const [removendoArq, setRemovendoArq]   = useState(false);

  // Modal: Promover a Cliente Perdido
  const [modalPromover, setModalPromover]         = useState<CriseItem | null>(null);
  const [formPromover, setFormPromover]           = useState<FormPromoverState>({
    data_aviso: "", data_encerramento: "", valor_contrato: "",
    motivo_perda: "qualidade_servico", observacoes: "",
  });
  const [salvandoPromover, setSalvandoPromover]   = useState(false);
  const [erroPromover, setErroPromover]           = useState<string | null>(null);

  // Modal: Histórico
  const [modalHistorico, setModalHistorico]           = useState<CriseItem | null>(null);
  const [historico, setHistorico]                     = useState<EventoHistorico[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // Crisis Actions
  const [crisisActions, setCrisisActions]             = useState<CrisisAction[]>([]);
  const [carregandoAcoes, setCarregandoAcoes]         = useState(false);
  const [modalAcao, setModalAcao]                     = useState<{ aberto: boolean; editandoAcao: CrisisAction | null }>({ aberto: false, editandoAcao: null });
  const [formAcao, setFormAcao]                       = useState<AcaoFormState>(ACAO_FORM_VAZIO);
  const [salvandoAcao, setSalvandoAcao]               = useState(false);
  const [erroAcao, setErroAcao]                       = useState<string | null>(null);
  const [excluindoAcao, setExcluindoAcao]             = useState<string | null>(null);
  const [confirmacaoExcluirAcaoId, setConfirmacaoExcluirAcaoId] = useState<string | null>(null);

  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false);
  const [cnpjAviso, setCnpjAviso]       = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await listarCrises();
      setCrises(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  async function carregarLogs(id: string) {
    setCarregandoLogs(true);
    try {
      const raw = await listarLogsCrise(id);
      setLogs(raw.map(formatarEventoCrise));
    } catch {
      setLogs([]);
    } finally {
      setCarregandoLogs(false);
    }
  }

  async function carregarAcoes(criseId: string) {
    setCarregandoAcoes(true);
    try {
      setCrisisActions(await listarCrisisActions(criseId));
    } catch {
      setCrisisActions([]);
    } finally {
      setCarregandoAcoes(false);
    }
  }

  function abrirModalNovaAcao() {
    setFormAcao(ACAO_FORM_VAZIO);
    setErroAcao(null);
    setModalAcao({ aberto: true, editandoAcao: null });
  }

  function abrirModalEditarAcao(a: CrisisAction) {
    setFormAcao({ what: a.what, how: a.how, who: a.who, when_date: a.when_date, status: a.status });
    setErroAcao(null);
    setModalAcao({ aberto: true, editandoAcao: a });
  }

  async function handleSalvarAcao() {
    if (!formAcao.what.trim() || !formAcao.who.trim() || !formAcao.when_date) {
      setErroAcao("Preencha os campos obrigatórios: O que, Quem e Quando.");
      return;
    }
    if (!editando) return;
    setSalvandoAcao(true);
    setErroAcao(null);
    try {
      const payload: CrisisActionPayload = {
        what: formAcao.what.trim(),
        how: formAcao.how.trim(),
        who: formAcao.who.trim(),
        when_date: formAcao.when_date,
        status: formAcao.status,
      };
      if (modalAcao.editandoAcao) {
        await editarCrisisAction(modalAcao.editandoAcao.id, payload);
      } else {
        await criarCrisisAction(editando.id, payload);
      }
      setModalAcao({ aberto: false, editandoAcao: null });
      await carregarAcoes(editando.id);
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : "Erro ao salvar ação.");
    } finally {
      setSalvandoAcao(false);
    }
  }

  async function handleExcluirAcao(id: string) {
    if (!editando) return;
    setExcluindoAcao(id);
    try {
      await excluirCrisisAction(id);
      await carregarAcoes(editando.id);
    } catch {
      // silently ignore
    } finally {
      setExcluindoAcao(null);
      setConfirmacaoExcluirAcaoId(null);
    }
  }

  async function buscarCNPJ(cnpjRaw: string) {
    const digits = cnpjRaw.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setBuscandoCNPJ(true); setCnpjAviso(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) { setCnpjAviso("CNPJ não encontrado. Preencha os dados manualmente."); return; }
      const json = await res.json();
      const razao = (json.razao_social as string | undefined)?.trim() ?? "";
      const fantasia = (json.nome_fantasia as string | undefined)?.trim() ?? "";
      setForm((p) => ({
        ...p,
        cliente: razao || p.cliente,
      }));
      if (fantasia) setCnpjAviso(`Nome Fantasia: ${fantasia}`);
      markDirty();
    } catch {
      setCnpjAviso("CNPJ não encontrado. Preencha os dados manualmente.");
    } finally {
      setBuscandoCNPJ(false);
    }
  }

  function abrirFormNovo() {
    setEditando(null); setForm(FORM_VAZIO); setArquivoNovo(null);
    setErroForm(null); setLogs([]); setCnpjAviso(null); markClean(); setView("form");
  }

  function abrirFormEditar(c: CriseItem) {
    setEditando(c);
    setForm({
      cnpj: c.cnpj ?? "",
      cliente: c.cliente,
      tipo_servico: c.tipo_servico,
      risco: c.risco,
      valor_contrato: c.valor_contrato > 0 ? String(c.valor_contrato) : "",
      apresentou_carta_cancelamento: c.apresentou_carta_cancelamento,
      data_aviso: c.data_aviso ?? "",
      prazo_aviso_dias: c.prazo_aviso_dias != null ? String(c.prazo_aviso_dias) : "",
    });
    setArquivoNovo(null);
    setErroForm(null);
    setCrisisActions([]);
    markClean();
    setView("form");
    carregarLogs(c.id);
    carregarAcoes(c.id);
  }

  function cancelar() {
    guardCancel(() => {
      setView("list"); setEditando(null); setErroForm(null);
      setLogs([]); setArquivoNovo(null); setCrisisActions([]); setCnpjAviso(null);
    });
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v })); markDirty();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente.trim()) { setErroForm("Informe o nome do cliente."); return; }
    setSalvando(true);
    setErroForm(null);
    try {
      const payload: CriseEditPayload = {
        cnpj: form.cnpj.replace(/\D/g, ""),
        cliente: form.cliente.trim(),
        tipo_servico: form.tipo_servico,
        risco: form.risco,
        acoes: editando?.acoes ?? "",
        valor_contrato: parseFloat(form.valor_contrato.replace(",", ".")) || 0,
        apresentou_carta_cancelamento: form.apresentou_carta_cancelamento,
        data_aviso: form.apresentou_carta_cancelamento && form.data_aviso ? form.data_aviso : null,
        prazo_aviso_dias:
          form.apresentou_carta_cancelamento && form.prazo_aviso_dias
            ? parseInt(form.prazo_aviso_dias, 10) || null
            : null,
      };

      let criseId: string;
      if (editando) {
        await editarCrise(editando.id, payload, editando);
        criseId = editando.id;
      } else {
        criseId = await criarCrise(payload);
      }

      if (arquivoNovo) await uploadCartaArquivo(criseId, arquivoNovo);

      markClean(); setView("list"); setEditando(null); await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id: string) {
    setExcluindo(id);
    try { await excluirCrise(id); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao excluir."); }
    finally { setExcluindo(null); }
  }

  async function handleRemoverArquivo() {
    if (!editando?.carta_nome) return;
    setRemovendoArq(true);
    try {
      await removerCartaArquivo(editando.id, editando.carta_nome);
      setEditando({ ...editando, carta_url: null, carta_nome: null });
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao remover arquivo.");
    } finally {
      setRemovendoArq(false);
    }
  }

  function abrirModalPromover(c: CriseItem) {
    const hoje = new Date().toISOString().split("T")[0];
    setFormPromover({
      data_aviso: c.data_aviso ?? hoje,
      data_encerramento:
        c.data_aviso && c.prazo_aviso_dias
          ? calcularEncerramentoISO(c.data_aviso, c.prazo_aviso_dias)
          : "",
      valor_contrato: c.valor_contrato > 0 ? String(c.valor_contrato) : "",
      motivo_perda: "qualidade_servico",
      observacoes: c.acoes.trim(),
    });
    setErroPromover(null);
    setModalPromover(c);
  }

  async function handleConfirmarPromover() {
    if (!modalPromover) return;
    if (!formPromover.data_aviso || !formPromover.data_encerramento) {
      setErroPromover("Preencha a data de aviso e a data de encerramento.");
      return;
    }
    setSalvandoPromover(true);
    setErroPromover(null);
    try {
      const novoId = await promoverCriseParaPerdido(modalPromover, {
        data_aviso: formPromover.data_aviso,
        data_encerramento: formPromover.data_encerramento,
        valor_contrato: parseFloat(formPromover.valor_contrato.replace(",", ".")) || 0,
        motivo_perda: formPromover.motivo_perda,
        observacoes: formPromover.observacoes.trim(),
      });
      setModalPromover(null);
      await carregar();
      onNavigarParaClientePerdido(novoId);
    } catch (e) {
      setErroPromover(e instanceof Error ? e.message : "Erro ao promover.");
    } finally {
      setSalvandoPromover(false);
    }
  }

  async function abrirHistorico(c: CriseItem) {
    setModalHistorico(c);
    setCarregandoHistorico(true);
    try {
      const raw = await listarLogsCrise(c.id);
      setHistorico(raw.map(formatarEventoCrise));
    } catch {
      setHistorico([]);
    } finally {
      setCarregandoHistorico(false);
    }
  }

  const encerramentoPrevisto = (() => {
    if (!form.apresentou_carta_cancelamento || !form.data_aviso || !form.prazo_aviso_dias) return null;
    const prazo = parseInt(form.prazo_aviso_dias, 10);
    if (isNaN(prazo) || prazo <= 0) return null;
    return calcularEncerramentoBR(form.data_aviso, prazo);
  })();

  // ── Formulário ──────────────────────────────────────────────

  if (view === "form") {
    const bloqueadoRiscoAcoes = editando?.promovido_para_perdido ?? false;

    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">
            ← Voltar
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {editando ? "Editar crise" : "Nova crise"}
          </h2>
        </div>

        {bloqueadoRiscoAcoes && (
          <div className="mb-4">
            <Alert status="warning" message="Crise promovida a Cliente Perdido — nível de risco não editável." />
          </div>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* CNPJ com lookup automático */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>
                CNPJ
                {buscandoCNPJ && <span className="ml-2 font-normal normal-case text-gray-400">Buscando...</span>}
              </label>
              <input
                type="text"
                value={formatarCNPJ(form.cnpj)}
                onChange={(e) => set("cnpj", e.target.value)}
                onBlur={(e) => buscarCNPJ(e.target.value)}
                placeholder="00.000.000/0000-00"
                className={INPUT}
              />
              {cnpjAviso && (
                <p className={`text-[11px] ${cnpjAviso.startsWith("Nome") ? "text-gray-500" : "text-amber-600"}`}>
                  {cnpjAviso}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Cliente (Razão Social) *</label>
              <input
                type="text" value={form.cliente}
                onChange={(e) => set("cliente", e.target.value)}
                required placeholder="Nome do cliente" className={INPUT}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Tipo de serviço</label>
              <select value={form.tipo_servico} onChange={(e) => set("tipo_servico", e.target.value as TipoServico)} className={INPUT}>
                {TIPOS_SERVICO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Nível de risco</label>
              <select
                value={form.risco}
                onChange={(e) => set("risco", e.target.value as NivelRisco)}
                disabled={bloqueadoRiscoAcoes}
                className={INPUT}
              >
                {NIVEIS_RISCO.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Valor do contrato (R$)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.valor_contrato}
                onChange={(e) => set("valor_contrato", e.target.value)}
                placeholder="0,00"
                className={INPUT}
              />
            </div>

            {/* ── Carta de cancelamento ── */}
            <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gray-50/40 p-4 flex flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.apresentou_carta_cancelamento}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      apresentou_carta_cancelamento: checked,
                      data_aviso: checked ? prev.data_aviso : "",
                      prazo_aviso_dias: checked ? prev.prazo_aviso_dias : "",
                    }));
                    markDirty();
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-folk accent-folk"
                />
                <span className="text-sm font-medium text-gray-700">
                  Cliente apresentou carta de cancelamento?
                </span>
              </label>

              {form.apresentou_carta_cancelamento && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>Data do aviso</label>
                    <input
                      type="date" value={form.data_aviso}
                      onChange={(e) => set("data_aviso", e.target.value)}
                      className={INPUT}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>Prazo de aviso (dias)</label>
                    <input
                      type="number" min="1" step="1"
                      value={form.prazo_aviso_dias}
                      onChange={(e) => set("prazo_aviso_dias", e.target.value)}
                      placeholder="Ex: 30"
                      className={INPUT}
                    />
                  </div>
                  {encerramentoPrevisto && (
                    <p className="sm:col-span-2 text-sm text-gray-600">
                      Encerramento previsto:{" "}
                      <span className="font-semibold text-gray-900">{encerramentoPrevisto}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Arquivo da carta */}
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Arquivo da carta (PDF)</label>
                {editando?.carta_url ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={editando.carta_url}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-folk hover:underline"
                    >
                      📎 {editando.carta_nome ?? "carta.pdf"}
                    </a>
                    <button
                      type="button"
                      onClick={handleRemoverArquivo}
                      disabled={removendoArq}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {removendoArq ? "Removendo..." : "Remover"}
                    </button>
                  </div>
                ) : arquivoNovo ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">📎 {arquivoNovo.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setArquivoNovo(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-fit rounded-lg border border-dashed border-gray-300 px-4 py-2 text-xs text-gray-500 hover:border-folk/40 hover:text-folk"
                  >
                    + Anexar PDF
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setArquivoNovo(f); markDirty(); }
                  }}
                />
              </div>
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
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar crise"}
              </button>
              <button
                type="button" onClick={cancelar}
                className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Card>

        {/* ── Ações estruturadas ── */}
        {editando && (() => {
          const hoje = new Date().toISOString().split("T")[0];
          const total = crisisActions.length;
          const concluidas = crisisActions.filter((a) => a.status === "CONCLUIDO").length;
          const atrasadas  = crisisActions.filter((a) => a.when_date < hoje && a.status !== "CONCLUIDO").length;
          return (
            <Card className="mt-4 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Ações</h3>
                <button
                  type="button"
                  onClick={abrirModalNovaAcao}
                  className="rounded-xl bg-folk-gradient px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
                >
                  + Adicionar ação
                </button>
              </div>

              {total > 0 && (
                <div className="mb-4 flex flex-wrap gap-4 rounded-xl bg-gray-50 px-4 py-2.5 text-xs">
                  <span className="text-gray-500">
                    Total: <span className="font-semibold text-gray-700">{total}</span>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-500">
                    Concluídas:{" "}
                    <span className="font-semibold text-green-600">
                      {Math.round((concluidas / total) * 100)}%
                    </span>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-500">
                    Atrasadas:{" "}
                    <span className={`font-semibold ${atrasadas > 0 ? "text-red-600" : "text-gray-700"}`}>
                      {Math.round((atrasadas / total) * 100)}%
                    </span>
                  </span>
                </div>
              )}

              {carregandoAcoes && <p className="text-sm text-gray-400">Carregando...</p>}

              {!carregandoAcoes && total === 0 && (
                <p className="text-sm text-gray-400">Nenhuma ação registrada ainda.</p>
              )}

              {!carregandoAcoes && total > 0 && (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-2.5">O que</th>
                        <th className="px-4 py-2.5">Como</th>
                        <th className="px-4 py-2.5">Quem</th>
                        <th className="px-4 py-2.5">Quando</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {crisisActions.map((a) => {
                        const atrasada = a.when_date < hoje && a.status !== "CONCLUIDO";
                        return (
                          <tr
                            key={a.id}
                            className={[
                              "border-b border-gray-100 last:border-0",
                              atrasada ? "bg-red-50" : "hover:bg-gray-50/50",
                            ].join(" ")}
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">{a.what}</td>
                            <td className="px-4 py-3 text-gray-500">{a.how || "—"}</td>
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
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => abrirModalEditarAcao(a)}
                                  className="text-xs font-semibold text-gray-500 hover:text-folk"
                                >
                                  Editar
                                </button>
                                {confirmacaoExcluirAcaoId === a.id ? (
                                  <span className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleExcluirAcao(a.id)}
                                      disabled={excluindoAcao === a.id}
                                      className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                                    >
                                      {excluindoAcao === a.id ? "..." : "Confirmar"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmacaoExcluirAcaoId(null)}
                                      className="text-xs text-gray-400 hover:text-gray-600"
                                    >
                                      Cancelar
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmacaoExcluirAcaoId(a.id)}
                                    className="text-xs font-semibold text-red-400 hover:text-red-600"
                                  >
                                    Excluir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })()}

        {/* ── Modal: Nova / Editar ação ── */}
        {modalAcao.aberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-bold text-gray-900">
                  {modalAcao.editandoAcao ? "Editar ação" : "Nova ação"}
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4 px-6 py-5">
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>O que *</label>
                  <input
                    type="text"
                    value={formAcao.what}
                    onChange={(e) => setFormAcao((p) => ({ ...p, what: e.target.value }))}
                    placeholder="Descrição da ação"
                    className={INPUT}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Como</label>
                  <input
                    type="text"
                    value={formAcao.how}
                    onChange={(e) => setFormAcao((p) => ({ ...p, how: e.target.value }))}
                    placeholder="Como será realizada"
                    className={INPUT}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Quem *</label>
                  <input
                    type="text"
                    value={formAcao.who}
                    onChange={(e) => setFormAcao((p) => ({ ...p, who: e.target.value }))}
                    placeholder="Responsável"
                    className={INPUT}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>Quando *</label>
                    <input
                      type="date"
                      value={formAcao.when_date}
                      onChange={(e) => setFormAcao((p) => ({ ...p, when_date: e.target.value }))}
                      className={INPUT}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>Status *</label>
                    <select
                      value={formAcao.status}
                      onChange={(e) => setFormAcao((p) => ({ ...p, status: e.target.value as CrisisActionStatus }))}
                      className={INPUT}
                    >
                      <option value="PENDENTE">Pendente</option>
                      <option value="EM_ANDAMENTO">Em andamento</option>
                      <option value="CONCLUIDO">Concluído</option>
                    </select>
                  </div>
                </div>
                {erroAcao && <Alert status="error" message={erroAcao} />}
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setModalAcao({ aberto: false, editandoAcao: null })}
                  disabled={salvandoAcao}
                  className="rounded-2xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarAcao}
                  disabled={salvandoAcao}
                  className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  {salvandoAcao ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {editando && (
          <Card className="mt-4 p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">Histórico de alterações</h3>
            {carregandoLogs && <p className="text-sm text-gray-400">Carregando...</p>}
            {!carregandoLogs && logs.length === 0 && (
              <p className="text-sm text-gray-400">Nenhuma alteração registrada ainda.</p>
            )}
            {!carregandoLogs && logs.length > 0 && (
              <div>
                {logs.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="mt-0.5 text-base leading-none">{ev.icone}</span>
                      {i < logs.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                    </div>
                    <div className={`${i < logs.length - 1 ? "pb-4" : ""} min-w-0`}>
                      <p className="text-[11px] text-gray-400 mb-0.5">
                        {formatLogTs(ev.created_at)}
                        {ev.autor_nome && <span className="ml-1">· {ev.autor_nome}</span>}
                      </p>
                      <p className="text-xs font-semibold text-gray-700">{ev.titulo}</p>
                      {ev.descricao && <p className="text-sm text-gray-500">{ev.descricao}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  // ── Listagem ────────────────────────────────────────────────

  const ativas = crises.filter((c) => !c.promovido_para_perdido && c.risco !== "revertido");
  const emAviso = ativas.filter((c) => c.apresentou_carta_cancelamento);
  const stats = {
    alto:  ativas.filter((c) => c.risco === "alto"),
    medio: ativas.filter((c) => c.risco === "medio"),
    baixo: ativas.filter((c) => c.risco === "baixo"),
  };
  const totalValor = (arr: CriseItem[]) => arr.reduce((s, c) => s + (c.valor_contrato ?? 0), 0);

  const crisesExibidas = filtroRisco
    ? crises.filter((c) => c.risco === filtroRisco)
    : crises;

  return (
    <div>
      {/* ── Painel de resumo ── */}
      {!carregando && ativas.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            { label: "Risco Alto",  items: stats.alto,  cls: "border-red-200 bg-red-50",      txt: "text-red-700" },
            { label: "Risco Médio", items: stats.medio, cls: "border-yellow-200 bg-yellow-50", txt: "text-yellow-700" },
            { label: "Risco Baixo", items: stats.baixo, cls: "border-green-200 bg-green-50",   txt: "text-green-700" },
            { label: "Em Aviso",    items: emAviso,     cls: "border-blue-200 bg-blue-50",     txt: "text-blue-700" },
          ] as const).map(({ label, items, cls, txt }) => (
            <div key={label} className={`rounded-2xl border px-4 py-3 ${cls}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${txt} mb-1`}>{label}</p>
              <p className={`text-2xl font-bold ${txt}`}>{items.length}</p>
              {totalValor(items as CriseItem[]) > 0 && (
                <p className={`text-xs font-medium ${txt} mt-0.5 opacity-80`}>
                  {formatMoeda(totalValor(items as CriseItem[]))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filtro por risco */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(
          [
            ["",         "Todos"],
            ["alto",     "Alto"],
            ["medio",    "Médio"],
            ["baixo",    "Baixo"],
            ["revertido","Revertido"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFiltroRisco(value as NivelRisco | "")}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              filtroRisco === value
                ? "border-folk bg-folk text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-folk/40 hover:text-folk"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cabeçalho + botão novo */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {carregando ? "Carregando..." : `${crisesExibidas.length} registro${crisesExibidas.length !== 1 ? "s" : ""}`}
        </p>
        <button
          onClick={abrirFormNovo}
          className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
        >
          + Nova crise
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && crisesExibidas.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
          Nenhuma crise registrada.
        </div>
      )}

      {crisesExibidas.length > 0 && (
        <div className="flex flex-col gap-3">
          {crisesExibidas.map((c) => {
            const cartaBadge      = getCartaBadge(c);
            const estaPromovido   = c.promovido_para_perdido;
            const estaRevertido   = c.risco === "revertido";
            const bloqueadoPromover = estaPromovido || estaRevertido;

            return (
              <div
                key={c.id}
                className={[
                  "rounded-2xl border border-gray-200 bg-white shadow-sm",
                  RISCO_ROW[c.risco],
                  estaPromovido ? "opacity-60" : estaRevertido ? "opacity-75" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900">{c.cliente}</p>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${RISCO_BADGE[c.risco]}`}>
                        {labelNivelRisco(c.risco)}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cartaBadge.cls}`}>
                        {cartaBadge.label}
                      </span>
                      {estaPromovido && (
                        <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                          Promovido a Cliente Perdido
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400">
                      {labelTipoServico(c.tipo_servico)}
                      {c.valor_contrato > 0 && (
                        <span className="ml-2 font-semibold text-gray-600">{formatMoeda(c.valor_contrato)}</span>
                      )}
                      {c.cnpj && (
                        <span className="ml-2">{formatarCNPJ(c.cnpj)}</span>
                      )}
                    </p>

                    {/* Datas da carta */}
                    {c.apresentou_carta_cancelamento && c.data_aviso && (
                      <p className="mt-1 text-xs text-gray-500">
                        Aviso: {formatData(c.data_aviso)}
                        {c.prazo_aviso_dias != null && (
                          <> · Prazo: {c.prazo_aviso_dias} dias</>
                        )}
                      </p>
                    )}

                    {c.acoes && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{c.acoes}</p>
                    )}

                    {/* Link cross-tab para promoted items */}
                    {estaPromovido && c.cliente_perdido_id && (
                      <button
                        onClick={() => onNavigarParaClientePerdido(c.cliente_perdido_id!)}
                        className="mt-2 text-xs font-medium text-folk hover:underline"
                      >
                        Ver na aba Clientes Perdidos →
                      </button>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      onClick={() => abrirHistorico(c)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk"
                    >
                      Histórico
                    </button>
                    <button
                      onClick={() => abrirFormEditar(c)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => abrirModalPromover(c)}
                      disabled={bloqueadoPromover}
                      title={estaPromovido ? "Já marcado como contrato perdido" : estaRevertido ? "Crise revertida" : ""}
                      className="rounded-lg border border-folk/30 px-3 py-1.5 text-xs font-semibold text-folk transition-colors hover:bg-folk/5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Contrato Perdido
                    </button>
                    <button
                      onClick={() => handleExcluir(c.id)}
                      disabled={excluindo === c.id || estaPromovido}
                      title={estaPromovido ? "Não é possível excluir um registro promovido a contrato perdido" : ""}
                      className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {excluindo === c.id ? "..." : "Excluir"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* ── Modal: Promover a Cliente Perdido ── */}
      {modalPromover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-bold text-gray-900">Promover a Cliente Perdido</h3>
              <p className="mt-0.5 text-sm text-gray-500">{modalPromover.cliente}</p>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Data do aviso *</label>
                <input
                  type="date" value={formPromover.data_aviso}
                  onChange={(e) => setFormPromover((p) => ({ ...p, data_aviso: e.target.value }))}
                  className={INPUT}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Data de encerramento *</label>
                <input
                  type="date" value={formPromover.data_encerramento}
                  onChange={(e) => setFormPromover((p) => ({ ...p, data_encerramento: e.target.value }))}
                  className={INPUT}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Tipo de serviço</label>
                <input
                  type="text"
                  value={labelTipoServico(modalPromover.tipo_servico)}
                  disabled
                  className={INPUT}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Valor do contrato (R$)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={formPromover.valor_contrato}
                  onChange={(e) => setFormPromover((p) => ({ ...p, valor_contrato: e.target.value }))}
                  placeholder="0,00"
                  className={INPUT}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className={LABEL}>Motivo da perda</label>
                <select
                  value={formPromover.motivo_perda}
                  onChange={(e) => setFormPromover((p) => ({ ...p, motivo_perda: e.target.value as MotivoPerda }))}
                  className={INPUT}
                >
                  {MOTIVOS_PERDA.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className={LABEL}>Observações</label>
                <textarea
                  value={formPromover.observacoes}
                  onChange={(e) => setFormPromover((p) => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Detalhes do cancelamento..."
                  rows={3}
                  className={`${INPUT} resize-none`}
                />
              </div>
              {erroPromover && (
                <div className="sm:col-span-2">
                  <Alert status="error" message={erroPromover} />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setModalPromover(null)}
                disabled={salvandoPromover}
                className="rounded-2xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarPromover}
                disabled={salvandoPromover}
                className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                {salvandoPromover ? "Salvando..." : "Confirmar promoção"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Histórico de movimentações ── */}
      {modalHistorico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Histórico de movimentações</h3>
                <p className="mt-0.5 text-sm text-gray-500">{modalHistorico.cliente}</p>
              </div>
              <button
                onClick={() => setModalHistorico(null)}
                className="text-xl leading-none text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              {carregandoHistorico && <p className="text-sm text-gray-400">Carregando...</p>}
              {!carregandoHistorico && historico.length === 0 && (
                <p className="text-sm text-gray-400">Nenhuma movimentação registrada.</p>
              )}
              {!carregandoHistorico && historico.length > 0 && (
                <div>
                  {historico.map((ev, i) => (
                    <div key={ev.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-0.5 text-base leading-none">{ev.icone}</span>
                        {i < historico.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                      </div>
                      <div className={`${i < historico.length - 1 ? "pb-4" : ""} min-w-0`}>
                        <p className="text-[11px] text-gray-400 mb-0.5">
                          {formatLogTs(ev.created_at)}
                          {ev.autor_nome && <span className="ml-1">· {ev.autor_nome}</span>}
                        </p>
                        <p className="text-xs font-semibold text-gray-700">{ev.titulo}</p>
                        {ev.descricao && <p className="text-sm text-gray-500">{ev.descricao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
