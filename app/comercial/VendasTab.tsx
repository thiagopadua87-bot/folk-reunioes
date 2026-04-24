"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarVendas, criarVenda, editarVenda, excluirVenda, criarObraAPartirDaVenda, marcarPipelineConvertido, registrarOrigemVenda,
  TIPOS_VENDA, SERVICOS_COMERCIAL, labelTipoVenda, formatMoeda, formatData,
  type Venda, type VendaPayload, type TipoVenda, type FiltrosVendas, type PreenchimentoVenda,
} from "@/lib/comercial";
import { listarVendedores, type Vendedor } from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

const TIPO_BADGE: Record<TipoVenda, string> = {
  recorrente:   "bg-folk/10 text-folk border-folk/20",
  venda_direta: "bg-purple-100 text-purple-700 border-purple-200",
};

interface FormState {
  data_fechamento: string;
  vendedor_id: string;
  cnpj: string;
  cliente: string;
  valor: string;
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
  valor: "",
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
    data_fechamento: new Date().toISOString().slice(0, 10),
    vendedor_id:     p.vendedor_id ?? "",
    cnpj:            "",
    cliente:         p.cliente,
    valor:           String(p.valor || ""),
    servicos:        p.servicos,
    tipo_venda:      "recorrente",
    indicado_por:    p.indicado_por,
    observacoes:     p.observacoes,
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
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [excluindo, setExcluindo]     = useState<string | null>(null);
  const [enviando, setEnviando]       = useState<string | null>(null);
  const [visualizando, setVisualizando] = useState<Venda | null>(null);
  const [filtros, setFiltros] = useState<FiltrosVendas>({ dataInicio: "", dataFim: "", tipoVenda: "" });
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false);
  const [erroCNPJ, setErroCNPJ]         = useState<string | null>(null);
  const [arquivo, setArquivo]           = useState<File | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const [lista, vends] = await Promise.all([
        listarVendas({ dataInicio: filtros.dataInicio || undefined, dataFim: filtros.dataFim || undefined, tipoVenda: filtros.tipoVenda || undefined }),
        listarVendedores({ ativo: true }),
      ]);
      setRegistros(lista);
      setVendedores(vends);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally { setCarregando(false); }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  function abrirNovo() { setEditando(null); setForm(FORM_VAZIO); setErroForm(null); setErroCNPJ(null); setArquivo(null); markClean(); setView("form"); }
  function abrirEditar(r: Venda) {
    setEditando(r);
    setForm({ data_fechamento: r.data_fechamento, vendedor_id: r.vendedor_id ?? "", cnpj: r.cnpj ? formatarCNPJ(r.cnpj) : "", cliente: r.cliente, valor: String(r.valor), servicos: r.servicos ?? [], tipo_venda: r.tipo_venda, indicado_por: r.indicado_por, observacoes: r.observacoes });
    setErroForm(null); setErroCNPJ(null); setArquivo(null); markClean(); setView("form");
  }
  function cancelar() { guardCancel(() => { setView("list"); setEditando(null); setErroForm(null); setErroCNPJ(null); setArquivo(null); onPreenchimentoUsado?.(); }); }
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
    if (!form.data_fechamento || !form.cliente) { setErroForm("Preencha todos os campos obrigatórios."); return; }
    setSalvando(true); setErroForm(null);
    try {
      const payload: VendaPayload = {
        data_fechamento: form.data_fechamento,
        vendedor_id:     form.vendedor_id || null,
        cnpj:            form.cnpj.replace(/\D/g, ""),
        cliente:         form.cliente.trim(),
        valor:           parseFloat(form.valor.replace(",", ".")) || 0,
        tipo_venda:      form.tipo_venda,
        indicado_por:    form.indicado_por.trim(),
        observacoes:     form.observacoes.trim(),
        pipeline_id:     preenchimento?.pipeline_id ?? (editando?.pipeline_id ?? null),
      };
      if (editando) {
        await editarVenda(editando.id, payload, form.servicos, arquivo);
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
    } finally { setSalvando(false); }
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

  const total = registros.reduce((acc, r) => acc + r.valor, 0);

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
              <label className={LABEL}>Valor (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" className={INPUT} />
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
              <div><dt className={LABEL}>Valor</dt><dd className="mt-0.5 text-sm font-semibold text-gray-800">{formatMoeda(visualizando.valor)}</dd></div>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Fechamento — de</label>
            <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros((f) => ({ ...f, dataInicio: e.target.value }))} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Fechamento — até</label>
            <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Tipo de venda</label>
            <select value={filtros.tipoVenda} onChange={(e) => setFiltros((f) => ({ ...f, tipoVenda: e.target.value as TipoVenda | "" }))} className={INPUT}>
              <option value="">Todos</option>
              {TIPOS_VENDA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{carregando ? "Carregando..." : `${registros.length} venda${registros.length !== 1 ? "s" : ""}`}</p>
          {registros.length > 0 && (
            <p className="text-sm font-semibold text-gray-700">Total: <span className="text-folk">{formatMoeda(total)}</span></p>
          )}
        </div>
        <button onClick={abrirNovo} className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]">
          + Nova venda
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && registros.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">Nenhuma venda registrada.</div>
      )}

      {registros.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fechamento</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Vendedor</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Serviços</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Valor</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Anexo</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Projetos</th>
                <th className="py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pl-6 pr-4 text-sm text-gray-500">{formatData(r.data_fechamento)}</td>
                  <td className="py-3 pr-4">
                    <p className="text-sm font-medium text-gray-900">{r.cliente}</p>
                    {r.cnpj && <p className="text-xs text-gray-400">{formatarCNPJ(r.cnpj)}</p>}
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-500">{r.vendedor_nome || "—"}</td>
                  <td className="py-3 pr-4">
                    {r.servicos?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.servicos.map((s) => (
                          <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{s}</span>
                        ))}
                      </div>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="py-3 pr-4 text-sm font-semibold text-gray-800">{formatMoeda(r.valor)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TIPO_BADGE[r.tipo_venda]}`}>
                        {labelTipoVenda(r.tipo_venda)}
                      </span>
                      {r.pipeline_id && (
                        <span className="text-[10px] font-semibold text-folk/70">via Pipeline</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {r.arquivo_url ? (
                      <a href={r.arquivo_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk"
                        title={r.arquivo_nome ?? ""}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                        Baixar
                      </a>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="py-3 pr-4">
                    {r.enviado_para_projetos ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        ✓ Enviado
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEnviarParaProjetos(r)}
                        disabled={enviando === r.id}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        {enviando === r.id ? "Enviando..." : "→ Projetos"}
                      </button>
                    )}
                  </td>
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <button onClick={() => setVisualizando(r)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700">Ver</button>
                      <button onClick={() => abrirEditar(r)} className="rounded-lg border border-folk/20 px-2.5 py-1 text-xs font-semibold text-folk transition-colors hover:border-folk/50 hover:bg-folk/5">Editar</button>
                      <button onClick={() => handleExcluir(r.id)} disabled={excluindo === r.id} className="rounded-lg border border-red-100 px-2.5 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50">
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
