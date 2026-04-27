"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  listarVendas, criarVenda, editarVenda, excluirVenda, criarObraAPartirDaVenda, marcarPipelineConvertido, registrarOrigemVenda,
  listarLogsVenda,
  TIPOS_VENDA, SERVICOS_COMERCIAL, labelTipoVenda, formatMoeda, formatData,
  type Venda, type VendaPayload, type VendaLog, type TipoVenda, type FiltrosVendas, type PreenchimentoVenda,
} from "@/lib/comercial";
import { listarVendedores, type Vendedor } from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

const CAMPO_CONFIG: Record<string, { label: string; dot: string }> = {
  data_fechamento:  { label: "Data de fechamento", dot: "bg-blue-400" },
  cliente:          { label: "Cliente",            dot: "bg-gray-500" },
  cnpj:             { label: "CNPJ",               dot: "bg-gray-400" },
  vendedor:         { label: "Vendedor",            dot: "bg-blue-400" },
  valor_implantacao: { label: "Valor de implantação", dot: "bg-green-500" },
  valor_mensal:      { label: "Valor mensal",         dot: "bg-emerald-400" },
  tipo_venda:       { label: "Tipo de venda",       dot: "bg-purple-400" },
  indicado_por:     { label: "Indicado por",        dot: "bg-amber-400" },
  observacoes:      { label: "Observações",         dot: "bg-amber-300" },
  servico_adicionado: { label: "Serviço adicionado", dot: "bg-folk" },
  servico_removido:   { label: "Serviço removido",   dot: "bg-red-400" },
  arquivo:          { label: "Anexo",               dot: "bg-gray-400" },
};

function formatLogTs(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " +
         d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatLogMsg(log: VendaLog): string {
  switch (log.campo) {
    case "servico_adicionado": return log.valor_novo;
    case "servico_removido":   return log.valor_anterior;
    default: return `${log.valor_anterior} → ${log.valor_novo}`;
  }
}

const TIPO_BADGE: Record<TipoVenda, string> = {
  recorrente:   "bg-folk/10 text-folk border-folk/20",
  venda_direta: "bg-purple-100 text-purple-700 border-purple-200",
};

interface FormState {
  data_fechamento: string;
  vendedor_id: string;
  cnpj: string;
  cliente: string;
  valor_implantacao: string;
  valor_mensal: string;
  servicos: string[];
  tipo_venda: TipoVenda;
  indicado_por: string;
  observacoes: string;
}

const FORM_VAZIO: FormState = {
  data_fechamento: "",
  vendedor_id: "",
  cnpj: "",
  cliente: "",
  valor_implantacao: "",
  valor_mensal: "",
  servicos: [],
  tipo_venda: "recorrente",
  indicado_por: "",
  observacoes: "",
};

function formatarCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2)  return d;
  if (d.length <= 5)  return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8)  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

function CheckboxServicos({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  function toggle(s: string) {
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {SERVICOS_COMERCIAL.map((s) => {
        const checked = value.includes(s);
        return (
          <button key={s} type="button" onClick={() => toggle(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${checked ? "border-folk bg-folk text-white" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-folk/40 hover:text-folk"}`}>
            {s}
          </button>
        );
      })}
    </div>
  );
}

interface VendasTabProps {
  preenchimento?: PreenchimentoVenda | null;
  onPreenchimentoUsado?: () => void;
}

function formDePreenchimento(p: PreenchimentoVenda): FormState {
  return {
    data_fechamento:   new Date().toISOString().slice(0, 10),
    vendedor_id:       p.vendedor_id ?? "",
    cnpj:              "",
    cliente:           p.cliente,
    valor_implantacao: String(p.valor_implantacao || ""),
    valor_mensal:      String(p.valor_mensal || ""),
    servicos:          p.servicos,
    tipo_venda:        "recorrente",
    indicado_por:      p.indicado_por,
    observacoes:       p.observacoes,
  };
}

export default function VendasTab({ preenchimento, onPreenchimentoUsado }: VendasTabProps) {
  const [registros, setRegistros] = useState<Venda[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "form">(preenchimento ? "form" : "list");
  const [editando, setEditando] = useState<Venda | null>(null);
  const [form, setForm] = useState<FormState>(preenchimento ? formDePreenchimento(preenchimento) : FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [excluindo, setExcluindo]     = useState<string | null>(null);
  const [enviando, setEnviando]       = useState<string | null>(null);
  const [visualizando, setVisualizando] = useState<Venda | null>(null);
  const [filtros, setFiltros] = useState<FiltrosVendas>({ dataInicio: "", dataFim: "", tipoVenda: "", cliente: "" });
  const [pagina, setPagina]       = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [total, setTotal]         = useState(0);
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false);
  const [erroCNPJ, setErroCNPJ]         = useState<string | null>(null);
  const [arquivo, setArquivo]           = useState<File | null>(null);
  const [logs, setLogs]                 = useState<VendaLog[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);

  const reqIdRef = useRef(0);

  const carregar = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setCarregando(true); setErro(null);
    try {
      const [pagina_dados, vends] = await Promise.all([
        listarVendas({ dataInicio: filtros.dataInicio || undefined, dataFim: filtros.dataFim || undefined, tipoVenda: filtros.tipoVenda || undefined, cliente: filtros.cliente || undefined, pagina, porPagina }),
        listarVendedores({ ativo: true }),
      ]);
      if (reqId !== reqIdRef.current) return;
      setRegistros(pagina_dados.registros);
      setTotal(pagina_dados.total);
      setVendedores(vends);
    } catch (e) {
      if (reqId !== reqIdRef.current) return;
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      if (reqId === reqIdRef.current) setCarregando(false);
    }
  }, [filtros, pagina, porPagina]);

  useEffect(() => { carregar(); }, [carregar]);

  function setFiltrosEResetar(fn: (f: FiltrosVendas) => FiltrosVendas) {
    setPagina(1);
    setFiltros(fn);
  }

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  async function carregarLogs(id: string) {
    setCarregandoLogs(true);
    try { setLogs(await listarLogsVenda(id)); }
    catch { setLogs([]); }
    finally { setCarregandoLogs(false); }
  }

  function abrirNovo() { setEditando(null); setForm(FORM_VAZIO); setErroForm(null); setErroCNPJ(null); setArquivo(null); setLogs([]); markClean(); setView("form"); }
  function abrirEditar(r: Venda) {
    setEditando(r);
    setForm({ data_fechamento: r.data_fechamento, vendedor_id: r.vendedor_id ?? "", cnpj: r.cnpj ? formatarCNPJ(r.cnpj) : "", cliente: r.cliente, valor_implantacao: String(r.valor_implantacao), valor_mensal: String(r.valor_mensal), servicos: r.servicos ?? [], tipo_venda: r.tipo_venda, indicado_por: r.indicado_por, observacoes: r.observacoes });
    setErroForm(null); setErroCNPJ(null); setArquivo(null); markClean(); setView("form"); carregarLogs(r.id);
  }
  function cancelar() { guardCancel(() => { setView("list"); setEditando(null); setErroForm(null); setErroCNPJ(null); setArquivo(null); setLogs([]); onPreenchimentoUsado?.(); }); }
  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((p) => ({ ...p, [k]: v })); markDirty(); }

  async function buscarRazaoSocial(cnpjMascarado: string) {
    const digits = cnpjMascarado.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setBuscandoCNPJ(true); setErroCNPJ(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error("CNPJ não encontrado.");
      const data = await res.json();
      const razao = (data.razao_social as string) ?? "";
      if (razao) setForm((p) => ({ ...p, cliente: razao }));
    } catch (e) {
      setErroCNPJ(e instanceof Error ? e.message : "Erro ao buscar CNPJ.");
    } finally {
      setBuscandoCNPJ(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (salvandoRef.current) return;
    if (!form.data_fechamento || !form.cliente) { setErroForm("Preencha todos os campos obrigatórios."); return; }
    salvandoRef.current = true;
    setSalvando(true); setErroForm(null);
    try {
      const payload: VendaPayload = {
        data_fechamento: form.data_fechamento,
        vendedor_id:     form.vendedor_id || null,
        cnpj:            form.cnpj.replace(/\D/g, ""),
        cliente:         form.cliente.trim(),
        valor_implantacao: parseFloat(form.valor_implantacao.replace(",", ".")) || 0,
        valor_mensal:      parseFloat(form.valor_mensal.replace(",", ".")) || 0,
        tipo_venda:      form.tipo_venda,
        indicado_por:    form.indicado_por.trim(),
        observacoes:     form.observacoes.trim(),
        pipeline_id:     preenchimento?.pipeline_id ?? (editando?.pipeline_id ?? null),
      };
      if (editando) {
        await editarVenda(editando.id, payload, form.servicos, arquivo, editando, vendedores);
      } else {
        const vendaId = await criarVenda(payload, form.servicos, arquivo);
        if (preenchimento?.pipeline_id) {
          await marcarPipelineConvertido(preenchimento.pipeline_id, vendaId);
          registrarOrigemVenda(vendaId, preenchimento.pipeline_id).catch(() => {});
          onPreenchimentoUsado?.();
        }
      }
      markClean(); setView("list"); setEditando(null); await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { salvandoRef.current = false; setSalvando(false); }
  }

  async function handleExcluir(id: string) {
    setExcluindo(id);
    try { await excluirVenda(id); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao excluir."); }
    finally { setExcluindo(null); }
  }

  async function handleEnviarParaProjetos(venda: Venda) {
    setEnviando(venda.id);
    try {
      await criarObraAPartirDaVenda(venda);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar para projetos.");
    } finally {
      setEnviando(null);
    }
  }

  const totalImplantacao = registros.reduce((acc, r) => acc + r.valor_implantacao, 0);
  const totalMensal      = registros.reduce((acc, r) => acc + r.valor_mensal, 0);
  const totalPaginas     = Math.ceil(total / porPagina);

  if (view === "form") {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>
          <h2 className="text-lg font-bold text-gray-900">{editando ? "Editar venda" : "Nova venda"}</h2>
        </div>
        {preenchimento && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-folk/20 bg-folk/5 px-4 py-3 text-sm text-folk">
            <span className="font-semibold">Pipeline →</span>
            <span>Formulário pré-preenchido a partir da proposta de <strong>{preenchimento.cliente}</strong>. Revise e confirme.</span>
          </div>
        )}
        {editando?.pipeline_id && !preenchimento && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-folk/20 bg-folk/5 px-4 py-3 text-sm text-folk">
            <span className="font-semibold">Pipeline →</span>
            <span>Esta venda foi originada a partir de uma proposta do pipeline.</span>
          </div>
        )}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Data de fechamento *</label>
              <input type="date" value={form.data_fechamento} onChange={(e) => set("data_fechamento", e.target.value)} required className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Tipo de venda</label>
              <select value={form.tipo_venda} onChange={(e) => set("tipo_venda", e.target.value as TipoVenda)} className={INPUT}>
                {TIPOS_VENDA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>CNPJ <span className="font-normal normal-case text-gray-400">(opcional)</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) => {
                    const masked = formatarCNPJ(e.target.value);
                    set("cnpj", masked);
                    if (masked.replace(/\D/g, "").length === 14) buscarRazaoSocial(masked);
                    else setErroCNPJ(null);
                  }}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className={INPUT}
                />
                {buscandoCNPJ && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Buscando...</span>
                )}
              </div>
              {erroCNPJ && <p className="text-xs text-red-500">{erroCNPJ}</p>}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Cliente *</label>
              <input type="text" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} required placeholder="Nome do cliente" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Vendedor</label>
              <select value={form.vendedor_id} onChange={(e) => set("vendedor_id", e.target.value)} className={INPUT}>
                <option value="">Selecione...</option>
                {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Indicado por</label>
              <input type="text" value={form.indicado_por} onChange={(e) => set("indicado_por", e.target.value)} placeholder="Nome do indicador" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Implantação (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor_implantacao} onChange={(e) => set("valor_implantacao", e.target.value)} placeholder="0,00" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Mensal (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor_mensal} onChange={(e) => set("valor_mensal", e.target.value)} placeholder="0,00" className={INPUT} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className={LABEL}>Serviços</label>
              <CheckboxServicos value={form.servicos} onChange={(v) => set("servicos", v)} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Observações</label>
              <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} placeholder="Informações adicionais sobre a venda..." className={`${INPUT} resize-none`} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Anexo <span className="font-normal normal-case text-gray-400">(PDF ou Excel)</span></label>
              {editando?.arquivo_url && !arquivo && (
                <div className="mb-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-xs text-gray-500 flex-1 truncate">Atual: {editando.arquivo_nome}</span>
                  <a href={editando.arquivo_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-folk hover:underline shrink-0">Abrir</a>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 transition-colors hover:border-folk/40 hover:bg-folk/5">
                <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                <span className="flex-1">{arquivo ? arquivo.name : "Selecionar arquivo..."}</span>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  className="sr-only"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                />
              </label>
              {arquivo && (
                <button type="button" onClick={() => setArquivo(null)} className="self-start text-xs text-red-400 hover:text-red-600">
                  Remover arquivo selecionado
                </button>
              )}
            </div>
            {erroForm && <div className="sm:col-span-2"><Alert status="error" message={erroForm} /></div>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={salvando} className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60">
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Registrar venda"}
              </button>
              <button type="button" onClick={cancelar} className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300">Cancelar</button>
            </div>
          </form>
        </Card>

        {editando && (
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">Histórico de alterações</h3>
            {carregandoLogs && <p className="text-sm text-gray-400">Carregando...</p>}
            {!carregandoLogs && logs.length === 0 && (
              <p className="text-sm text-gray-400">Nenhuma alteração registrada ainda.</p>
            )}
            {!carregandoLogs && logs.length > 0 && (
              <div>
                {logs.map((log, i) => {
                  const cfg = CAMPO_CONFIG[log.campo] ?? { label: log.campo, dot: "bg-gray-300" };
                  return (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                        {i < logs.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                      </div>
                      <div className={`${i < logs.length - 1 ? "pb-4" : ""} min-w-0`}>
                        <p className="text-[11px] text-gray-400 mb-0.5">
                          {formatLogTs(log.created_at)}
                          {log.autor_nome && <span className="ml-1">· {log.autor_nome}</span>}
                        </p>
                        <p className="text-xs font-semibold text-gray-500">{cfg.label}</p>
                        <p className="text-sm text-gray-700">{formatLogMsg(log)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div>
      {visualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setVisualizando(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Detalhes da venda</h3>
              <button onClick={() => setVisualizando(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">✕</button>
            </div>
            <dl className="flex flex-col gap-3">
              <div><dt className={LABEL}>Cliente</dt><dd className="mt-0.5 text-sm text-gray-800">{visualizando.cliente}</dd></div>
              {visualizando.cnpj && <div><dt className={LABEL}>CNPJ</dt><dd className="mt-0.5 text-sm text-gray-800">{formatarCNPJ(visualizando.cnpj)}</dd></div>}
              <div><dt className={LABEL}>Fechamento</dt><dd className="mt-0.5 text-sm text-gray-800">{formatData(visualizando.data_fechamento)}</dd></div>
              <div><dt className={LABEL}>Tipo</dt><dd className="mt-0.5"><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TIPO_BADGE[visualizando.tipo_venda]}`}>{labelTipoVenda(visualizando.tipo_venda)}</span></dd></div>
              {visualizando.valor_implantacao > 0 && <div><dt className={LABEL}>Implantação</dt><dd className="mt-0.5 text-sm font-semibold text-gray-800">{formatMoeda(visualizando.valor_implantacao)}</dd></div>}
              {visualizando.valor_mensal > 0 && <div><dt className={LABEL}>Mensal</dt><dd className="mt-0.5 text-sm font-semibold text-emerald-700">{formatMoeda(visualizando.valor_mensal)}/mês</dd></div>}
              {visualizando.vendedor_nome && <div><dt className={LABEL}>Vendedor</dt><dd className="mt-0.5 text-sm text-gray-800">{visualizando.vendedor_nome}</dd></div>}
              {visualizando.indicado_por && <div><dt className={LABEL}>Indicado por</dt><dd className="mt-0.5 text-sm text-gray-800">{visualizando.indicado_por}</dd></div>}
              {visualizando.servicos?.length > 0 && (
                <div><dt className={LABEL}>Serviços</dt><dd className="mt-1 flex flex-wrap gap-1">{visualizando.servicos.map((s) => <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{s}</span>)}</dd></div>
              )}
              {visualizando.observacoes && <div><dt className={LABEL}>Observações</dt><dd className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">{visualizando.observacoes}</dd></div>}
              {visualizando.arquivo_url && (
                <div><dt className={LABEL}>Anexo</dt><dd className="mt-0.5"><a href={visualizando.arquivo_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-folk hover:underline">{visualizando.arquivo_nome || "Baixar arquivo"}</a></dd></div>
              )}
            </dl>
          </div>
        </div>
      )}

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <label className={LABEL}>Buscar cliente</label>
            <input
              type="text"
              value={filtros.cliente ?? ""}
              onChange={(e) => setFiltrosEResetar((f) => ({ ...f, cliente: e.target.value }))}
              placeholder="Nome do cliente..."
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Fechamento — de</label>
            <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltrosEResetar((f) => ({ ...f, dataInicio: e.target.value }))} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Fechamento — até</label>
            <input type="date" value={filtros.dataFim} onChange={(e) => setFiltrosEResetar((f) => ({ ...f, dataFim: e.target.value }))} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Tipo de venda</label>
            <select value={filtros.tipoVenda} onChange={(e) => setFiltrosEResetar((f) => ({ ...f, tipoVenda: e.target.value as TipoVenda | "" }))} className={INPUT}>
              <option value="">Todos</option>
              {TIPOS_VENDA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </Card>


      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{carregando ? "Carregando..." : `${total} venda${total !== 1 ? "s" : ""}`}</p>
          {registros.length > 0 && (
            <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
              {totalImplantacao > 0 && <span>Implantação: <span className="text-folk">{formatMoeda(totalImplantacao)}</span></span>}
              {totalImplantacao > 0 && totalMensal > 0 && <span className="text-gray-300">·</span>}
              {totalMensal > 0 && <span>MRR: <span className="text-emerald-600">{formatMoeda(totalMensal)}/mês</span></span>}
            </div>
          )}
        </div>
        <button onClick={abrirNovo} className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]">
          + Nova venda
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && total === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">Nenhuma venda registrada.</div>
      )}

      {registros.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-24 py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Data</th>
                <th className="py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</th>
                <th className="py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Serviços</th>
                <th className="w-40 py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Valor</th>
                <th className="w-28 py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                <th className="w-32 py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="w-44 py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pl-5 pr-3 text-xs text-gray-500 whitespace-nowrap">{formatData(r.data_fechamento)}</td>
                  <td className="py-3 pr-3">
                    <p className="text-sm font-medium text-gray-900 break-words">{r.cliente}</p>
                    {r.vendedor_nome && <p className="text-xs text-gray-400">{r.vendedor_nome}</p>}
                    {r.cnpj && <p className="text-xs text-gray-400">{formatarCNPJ(r.cnpj)}</p>}
                  </td>
                  <td className="py-3 pr-3">
                    {r.servicos?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.servicos.map((s) => (
                          <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{s}</span>
                        ))}
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="py-3 pr-3">
                    {r.valor_implantacao > 0 && <p className="text-sm font-semibold text-gray-800">{formatMoeda(r.valor_implantacao)}</p>}
                    {r.valor_mensal > 0 && <p className="text-xs font-semibold text-emerald-600">{formatMoeda(r.valor_mensal)}/mês</p>}
                    {!r.valor_implantacao && !r.valor_mensal && <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${TIPO_BADGE[r.tipo_venda]}`}>
                      {labelTipoVenda(r.tipo_venda)}
                    </span>
                    {r.pipeline_id && <p className="mt-0.5 text-[10px] font-semibold text-folk/70">via Pipeline</p>}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-1">
                      {r.enviado_para_projetos ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">✓ Projetos</span>
                      ) : (
                        <button
                          onClick={() => handleEnviarParaProjetos(r)}
                          disabled={enviando === r.id}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 disabled:opacity-50"
                        >
                          {enviando === r.id ? "..." : "→ Projetos"}
                        </button>
                      )}
                      {r.arquivo_url && (
                        <a href={r.arquivo_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-folk"
                          title={r.arquivo_nome ?? ""}>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                          Anexo
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button onClick={() => setVisualizando(r)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700">Ver</button>
                      <button onClick={() => abrirEditar(r)} className="rounded-lg border border-folk/20 px-2 py-1 text-xs font-semibold text-folk transition-colors hover:border-folk/50 hover:bg-folk/5">Editar</button>
                      <button onClick={() => handleExcluir(r.id)} disabled={excluindo === r.id} className="rounded-lg border border-red-100 px-2 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50">
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

      {total > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>
              Mostrando {Math.min((pagina - 1) * porPagina + 1, total)}–{Math.min(pagina * porPagina, total)} de {total} registro{total !== 1 ? "s" : ""}
            </span>
            <span className="text-gray-300">·</span>
            <label className="flex items-center gap-1.5">
              <span>Exibir</span>
              <select
                value={porPagina}
                onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-700 outline-none focus:border-folk"
              >
                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPagina(p as number)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      pagina === p
                        ? "border-folk bg-folk text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
