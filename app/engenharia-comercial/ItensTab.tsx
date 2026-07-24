"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type ItemCatalogo, type ItemCatalogoPayload,
  type CategoriaProduto, type Fabricante, type Fornecedor,
  type ProdutoFornecedor, type ProdutoFornecedorPayload,
  listarItens, criarItem, editarItem,
  listarPrecosPorItem, upsertProdutoFornecedor, editarProdutoFornecedor, excluirProdutoFornecedor,
} from "@/lib/engenharia-comercial/catalogo";
import { getCategorias, getFabricantes, getFornecedores } from "@/lib/engenharia-comercial/lookups";
import {
  INPUT, LABEL, FOLK_BTN, GHOST_BTN,
  Badge, BadgeAtivo, FilterBar, DataTable, FormLayout, Field, AtivoField, CrudHeader,
  SaveBanner, SubListSkeleton, useCrudLoader,
  type ColumnDef,
} from "./components/CrudInfra";

// ── Constantes ────────────────────────────────────────────────

const TIPOS = ["produto", "servico", "licenca", "assinatura"] as const;
const TIPO_LABELS: Record<string, string> = { produto: "Produto", servico: "Serviço", licenca: "Licença", assinatura: "Assinatura" };
const TIPO_COLORS: Record<string, string> = { produto: "blue", servico: "purple", licenca: "amber", assinatura: "folk" };

const EMPTY_ITEM: ItemCatalogoPayload = {
  tipo: "produto", categoria_id: "", fabricante_id: null, codigo: "", nome: "",
  descricao: "", unidade: "un", recorrente: false, dados_especificos: {},
  vigencia_inicio: null, vigencia_fim: null, ativo: true,
};

const EMPTY_PF: ProdutoFornecedorPayload = {
  item_id: "", fornecedor_id: "", codigo_fornecedor: "",
  ultimo_preco: 0, data_ultimo_preco: null,
  prazo_entrega_dias: 0, preferencial: false, observacoes: "", ativo: true,
};

// ── Colunas da lista ──────────────────────────────────────────

const COLUMNS: ColumnDef<ItemCatalogo>[] = [
  { key: "codigo",    label: "Código",     render: (r) => <span className="font-mono text-xs text-gray-500">{r.codigo || "—"}</span> },
  { key: "nome",      label: "Nome" },
  { key: "tipo",      label: "Tipo",       render: (r) => <Badge label={TIPO_LABELS[r.tipo]} color={TIPO_COLORS[r.tipo]} /> },
  { key: "categoria", label: "Categoria",  render: (r) => <span className="text-sm text-gray-600">{r.ec_categorias_produto?.nome ?? "—"}</span> },
  { key: "fabricante",label: "Fabricante", render: (r) => <span className="text-xs text-gray-500">{r.ec_fabricantes?.nome ?? "—"}</span> },
  { key: "unidade",   label: "Un.",        render: (r) => <span className="text-xs text-gray-500">{r.unidade}</span> },
  { key: "recorrente",label: "Recorrente", sortable: false, render: (r) => r.recorrente ? <Badge label="Mensal" color="folk" /> : null },
  { key: "ativo",     label: "Status",     sortable: false, render: (r) => <BadgeAtivo ativo={r.ativo} /> },
];

// ── Sub-editor: Produto × Fornecedor ─────────────────────────

function ProdutoFornecedorEditor({ itemId, fornecedores }: { itemId: string; fornecedores: Fornecedor[] }) {
  const [precos, setPrecos]       = useState<ProdutoFornecedor[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editandoPF, setEditandoPF] = useState<ProdutoFornecedor | null>(null);
  const [form, setForm]           = useState<ProdutoFornecedorPayload>({ ...EMPTY_PF, item_id: itemId });
  const [salvando, setSalvando]   = useState(false);
  const [erro, setErro]           = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try { setPrecos(await listarPrecosPorItem(itemId)); }
    catch { /* falha silenciosa no sub-editor */ }
    finally { setLoading(false); }
  }, [itemId]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovoPF() {
    setEditandoPF(null); setForm({ ...EMPTY_PF, item_id: itemId }); setErro(null); setShowForm(true);
  }

  function abrirEditarPF(pf: ProdutoFornecedor) {
    setEditandoPF(pf);
    setForm({ item_id: pf.item_id, fornecedor_id: pf.fornecedor_id, codigo_fornecedor: pf.codigo_fornecedor, ultimo_preco: pf.ultimo_preco, data_ultimo_preco: pf.data_ultimo_preco, prazo_entrega_dias: pf.prazo_entrega_dias, preferencial: pf.preferencial, observacoes: pf.observacoes, ativo: pf.ativo });
    setErro(null); setShowForm(true);
  }

  async function salvarPF(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fornecedor_id) { setErro("Selecione um fornecedor."); return; }
    setSalvando(true); setErro(null);
    try {
      if (editandoPF) await editarProdutoFornecedor(editandoPF.id, form);
      else await upsertProdutoFornecedor(form);
      setShowForm(false); carregar();
    } catch (e) { setErro((e as Error).message); }
    finally { setSalvando(false); }
  }

  async function excluir(id: string) {
    if (!confirm("Remover este fornecedor do item?")) return;
    try { await excluirProdutoFornecedor(id); carregar(); }
    catch (e) { setErro((e as Error).message); }
  }

  function set(field: keyof ProdutoFornecedorPayload, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Fornecedores e Preços</h3>
        <button onClick={abrirNovoPF} className={FOLK_BTN}>+ Adicionar Fornecedor</button>
      </div>

      {showForm && (
        <form onSubmit={salvarPF} className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Fornecedor *</label>
              <select className={INPUT} value={form.fornecedor_id} onChange={(e) => set("fornecedor_id", e.target.value)} disabled={!!editandoPF} required>
                <option value="">Selecione...</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Cód. Fornecedor</label>
              <input className={INPUT} value={form.codigo_fornecedor} onChange={(e) => set("codigo_fornecedor", e.target.value)} placeholder="SKU fornecedor" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Preço (R$) *</label>
              <input className={INPUT} type="number" min={0} step="0.01" value={form.ultimo_preco} onChange={(e) => set("ultimo_preco", parseFloat(e.target.value) || 0)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Data do Preço</label>
              <input className={INPUT} type="date" value={form.data_ultimo_preco ?? ""} onChange={(e) => set("data_ultimo_preco", e.target.value || null)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Prazo Entrega (dias)</label>
              <input className={INPUT} type="number" min={0} value={form.prazo_entrega_dias} onChange={(e) => set("prazo_entrega_dias", parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex items-end gap-3 pb-1">
              <input type="checkbox" id="pf-pref" checked={form.preferencial} onChange={(e) => set("preferencial", e.target.checked)} className="h-4 w-4 accent-folk" />
              <label htmlFor="pf-pref" className="text-sm text-gray-700">Preferencial</label>
            </div>
          </div>
          {erro && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</div>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={salvando} className={FOLK_BTN}>{salvando ? "Salvando..." : (editandoPF ? "Salvar" : "Adicionar")}</button>
            <button type="button" onClick={() => setShowForm(false)} className={GHOST_BTN}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <SubListSkeleton rows={2} /> : precos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          Nenhum fornecedor cadastrado para este item.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Fornecedor", "Cód.", "Preço", "Data", "Prazo", "Pref.", "Status", ""].map((h) => (
                  <th key={h} className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {precos.map((pf) => (
                <tr key={pf.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  <td className="py-3 pl-5 pr-3 font-medium text-gray-800">{pf.ec_fornecedores?.nome ?? "—"}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-gray-500">{pf.codigo_fornecedor || "—"}</td>
                  <td className="py-3 pr-3 font-semibold text-gray-800">R$ {pf.ultimo_preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 pr-3 text-xs text-gray-500">{pf.data_ultimo_preco ?? "—"}</td>
                  <td className="py-3 pr-3 text-gray-500">{pf.prazo_entrega_dias ? `${pf.prazo_entrega_dias}d` : "—"}</td>
                  <td className="py-3 pr-3">{pf.preferencial ? <Badge label="Sim" color="green" /> : <span className="text-gray-400">—</span>}</td>
                  <td className="py-3 pr-3"><BadgeAtivo ativo={pf.ativo} /></td>
                  <td className="py-3 pr-5">
                    <div className="flex gap-2">
                      <button onClick={() => abrirEditarPF(pf)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-folk/30 hover:text-folk">Editar</button>
                      <button onClick={() => excluir(pf.id)} className="rounded-lg border border-red-100 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Excluir</button>
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

// ── Tab principal ─────────────────────────────────────────────

export default function ItensTab() {
  const [busca, setBusca]             = useState("");
  const [ativo, setAtivo]             = useState<boolean | null>(null);
  const [filtroTipo, setFiltroTipo]   = useState("");
  const [filtroCateg, setFiltroCateg] = useState("");

  const { data: lista, loading, error: erro, reload: carregar } = useCrudLoader(
    () => listarItens({ busca: busca || undefined, ativo: ativo ?? undefined, tipo: filtroTipo || undefined, categoria_id: filtroCateg || undefined }),
    [busca, ativo, filtroTipo, filtroCateg],
  );

  const [categorias, setCategorias]   = useState<CategoriaProduto[]>([]);
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  useEffect(() => {
    Promise.all([getCategorias(), getFabricantes(), getFornecedores()])
      .then(([c, f, fo]) => { setCategorias(c); setFabricantes(f); setFornecedores(fo); })
      .catch(() => {});
  }, []);

  const [view, setView]         = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<ItemCatalogo | null>(null);
  const [form, setForm]         = useState<ItemCatalogoPayload>(EMPTY_ITEM);
  const [salvando, setSalvando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  function abrirNovo() {
    setEditando(null); setForm(EMPTY_ITEM); setFormErro(null); setView("form");
  }

  function abrirEditar(row: ItemCatalogo) {
    setEditando(row);
    setForm({ tipo: row.tipo, categoria_id: row.categoria_id, fabricante_id: row.fabricante_id, codigo: row.codigo, nome: row.nome, descricao: row.descricao, unidade: row.unidade, recorrente: row.recorrente, dados_especificos: row.dados_especificos, vigencia_inicio: row.vigencia_inicio, vigencia_fim: row.vigencia_fim, ativo: row.ativo });
    setFormErro(null); setView("form");
  }

  async function toggleAtivo(row: ItemCatalogo) {
    try { await editarItem(row.id, { ativo: !row.ativo }); carregar(); }
    catch (e) { void e; }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormErro("Nome é obrigatório."); return; }
    if (!form.categoria_id) { setFormErro("Categoria é obrigatória."); return; }
    setSalvando(true); setFormErro(null);
    try {
      if (editando) await editarItem(editando.id, form);
      else await criarItem(form);
      setView("list");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      carregar();
    } catch (e) {
      setFormErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  function set(field: keyof ItemCatalogoPayload, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const extraFiltros = (
    <>
      <div className="w-40">
        <select className={INPUT} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
        </select>
      </div>
      <div className="w-48">
        <select className={INPUT} value={filtroCateg} onChange={(e) => setFiltroCateg(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
    </>
  );

  if (view === "form") return (
    <FormLayout
      title={editando ? `Editar: ${editando.nome}` : "Novo Item do Catálogo"}
      onBack={() => setView("list")}
      onSubmit={salvar}
      salvando={salvando}
      erro={formErro}
      isNew={!editando}
      extra={editando ? <ProdutoFornecedorEditor itemId={editando.id} fornecedores={fornecedores} /> : (
        <p className="mt-4 text-xs text-gray-400">Salve o item para cadastrar fornecedores e preços.</p>
      )}
    >
      <Field label="Tipo" required>
        <select className={INPUT} value={form.tipo} onChange={(e) => set("tipo", e.target.value)} required>
          {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
        </select>
      </Field>
      <Field label="Categoria" required>
        <select className={INPUT} value={form.categoria_id} onChange={(e) => set("categoria_id", e.target.value)} required>
          <option value="">Selecione...</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <Field label="Código">
        <input className={INPUT} value={form.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="SKU ou código interno" />
      </Field>
      <Field label="Nome" required>
        <input className={INPUT} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome do item" required />
      </Field>
      <Field label="Fabricante">
        <select className={INPUT} value={form.fabricante_id ?? ""} onChange={(e) => set("fabricante_id", e.target.value || null)}>
          <option value="">Sem fabricante</option>
          {fabricantes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </Field>
      <Field label="Unidade">
        <input className={INPUT} value={form.unidade} onChange={(e) => set("unidade", e.target.value)} placeholder="un, m, h, licença..." />
      </Field>
      <Field label="Descrição" span2>
        <textarea className={`${INPUT} resize-none`} rows={2} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
      </Field>
      <Field label="Início de Vigência">
        <input className={INPUT} type="date" value={form.vigencia_inicio ?? ""} onChange={(e) => set("vigencia_inicio", e.target.value || null)} />
      </Field>
      <Field label="Fim de Vigência">
        <input className={INPUT} type="date" value={form.vigencia_fim ?? ""} onChange={(e) => set("vigencia_fim", e.target.value || null)} />
      </Field>
      <div className="flex items-center gap-5 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.recorrente} onChange={(e) => set("recorrente", e.target.checked)} className="h-4 w-4 accent-folk" />
          Cobrança recorrente (mensal)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.ativo} onChange={(e) => set("ativo", e.target.checked)} className="h-4 w-4 accent-folk" />
          Ativo
        </label>
      </div>
    </FormLayout>
  );

  return (
    <div>
      <SaveBanner show={saved} />
      <FilterBar busca={busca} onBuscaChange={setBusca} ativo={ativo} onAtivoChange={setAtivo} placeholder="Pesquisar por nome ou código..." extra={extraFiltros} />
      <CrudHeader total={lista.length} loading={loading} onNovo={abrirNovo} novoLabel="Novo Item" canEdit />
      <DataTable data={lista} columns={COLUMNS} loading={loading} error={erro} emptyMessage="Nenhum item encontrado." onEdit={abrirEditar} onToggle={toggleAtivo} />
    </div>
  );
}
