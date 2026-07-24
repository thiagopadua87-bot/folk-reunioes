"use client";

import { useState, useEffect } from "react";
import {
  type RegraComposicaoRow, type RegraComposicaoPayload,
  type Kit, type ItemCatalogo,
  listarRegras, criarRegra, editarRegra,
} from "@/lib/engenharia-comercial/catalogo";
import { getKits, getItens } from "@/lib/engenharia-comercial/lookups";
import {
  INPUT, LABEL,
  Badge, BadgeAtivo, FilterBar, DataTable, FormLayout, Field, AtivoField, CrudHeader,
  SaveBanner, useCrudLoader,
  type ColumnDef,
} from "./components/CrudInfra";

// ── Constantes ────────────────────────────────────────────────

const CONDICAO_CAMPOS = [
  { value: "cameras",          label: "Nº de câmeras" },
  { value: "acessos",          label: "Nº de acessos" },
  { value: "portarias",        label: "Nº de portarias" },
  { value: "hd_necessario_tb", label: "HD necessário (TB)" },
  { value: "bandwidth_mbps",   label: "Banda (Mbps)" },
  { value: "usuarios",         label: "Nº de usuários" },
  { value: "portas",           label: "Nº de portas" },
];

const OPERADORES = [">", "<", ">=", "<=", "=", "!="] as const;

const ACOES = [
  { value: "adicionar_produto",    label: "Adicionar produto" },
  { value: "substituir_produto",   label: "Substituir produto" },
  { value: "adicionar_quantidade", label: "Adicionar quantidade" },
  { value: "remover_produto",      label: "Remover produto" },
];
const ACAO_COLORS: Record<string, string> = {
  adicionar_produto:    "green",
  substituir_produto:   "amber",
  adicionar_quantidade: "blue",
  remover_produto:      "red",
};

const EMPTY: RegraComposicaoPayload = {
  kit_id: null, nome: "", descricao: "",
  condicao_campo: "cameras", condicao_operador: ">", condicao_valor: 0,
  acao: "adicionar_produto", produto_id: null, produto_substituido_id: null,
  quantidade: 1, prioridade: 50, ativo: true,
};

// ── Colunas ───────────────────────────────────────────────────

const COLUMNS: ColumnDef<RegraComposicaoRow>[] = [
  { key: "prioridade", label: "Prio.", render: (r) => <span className="font-mono text-xs text-gray-500">{r.prioridade}</span> },
  { key: "nome",       label: "Nome" },
  { key: "condicao",   label: "Condição", sortable: false, render: (r) => (
    <span className="font-mono text-xs text-gray-600">{r.condicao_campo} {r.condicao_operador} {r.condicao_valor}</span>
  )},
  { key: "acao",    label: "Ação",    sortable: false, render: (r) => (
    <Badge label={ACOES.find((a) => a.value === r.acao)?.label ?? r.acao} color={ACAO_COLORS[r.acao] ?? "gray"} />
  )},
  { key: "kit",     label: "Kit",     sortable: false, render: (r) => <span className="text-xs text-gray-500">{r.ec_kits?.nome ?? "—"}</span> },
  { key: "produto", label: "Produto", sortable: false, render: (r) => <span className="text-xs text-gray-600">{r.produto?.nome ?? "—"}</span> },
  { key: "ativo",   label: "Status",  sortable: false, render: (r) => <BadgeAtivo ativo={r.ativo} /> },
];

// ── Tab ───────────────────────────────────────────────────────

export default function RegrasTab() {
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState<boolean | null>(null);

  const { data: lista, loading, error: erro, reload: carregar } = useCrudLoader(
    () => listarRegras({ busca: busca || undefined, ativo: ativo ?? undefined }),
    [busca, ativo],
  );

  const [kits, setKits]   = useState<Kit[]>([]);
  const [itens, setItens] = useState<ItemCatalogo[]>([]);

  useEffect(() => {
    Promise.all([getKits(), getItens()])
      .then(([k, i]) => { setKits(k); setItens(i); })
      .catch(() => {});
  }, []);

  const [view, setView]         = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<RegraComposicaoRow | null>(null);
  const [form, setForm]         = useState<RegraComposicaoPayload>(EMPTY);
  const [salvando, setSalvando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  function abrirNovo() {
    setEditando(null); setForm(EMPTY); setFormErro(null); setView("form");
  }

  function abrirEditar(row: RegraComposicaoRow) {
    setEditando(row);
    setForm({ kit_id: row.kit_id, nome: row.nome, descricao: row.descricao, condicao_campo: row.condicao_campo, condicao_operador: row.condicao_operador, condicao_valor: row.condicao_valor, acao: row.acao, produto_id: row.produto_id, produto_substituido_id: row.produto_substituido_id, quantidade: row.quantidade, prioridade: row.prioridade, ativo: row.ativo });
    setFormErro(null); setView("form");
  }

  async function toggleAtivo(row: RegraComposicaoRow) {
    try { await editarRegra(row.id, { ativo: !row.ativo }); carregar(); }
    catch (e) { void e; }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormErro("Nome é obrigatório."); return; }
    setSalvando(true); setFormErro(null);
    try {
      if (editando) await editarRegra(editando.id, form);
      else await criarRegra(form);
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

  function set(field: keyof RegraComposicaoPayload, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const precisaProduto    = form.acao !== "remover_produto";
  const precisaSubstituto = form.acao === "substituir_produto";

  if (view === "form") return (
    <FormLayout
      title={editando ? `Editar: ${editando.nome}` : "Nova Regra de Composição"}
      onBack={() => setView("list")}
      onSubmit={salvar}
      salvando={salvando}
      erro={formErro}
      isNew={!editando}
    >
      <Field label="Nome" required>
        <input className={INPUT} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome descritivo da regra" required />
      </Field>
      <Field label="Prioridade">
        <input className={INPUT} type="number" min={1} value={form.prioridade} onChange={(e) => set("prioridade", parseInt(e.target.value) || 50)} />
      </Field>

      <div className="sm:col-span-2">
        <p className={`mb-3 ${LABEL}`}>Condição</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Campo</label>
            <select className={INPUT} value={form.condicao_campo} onChange={(e) => set("condicao_campo", e.target.value)}>
              {CONDICAO_CAMPOS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Operador</label>
            <select className={INPUT} value={form.condicao_operador} onChange={(e) => set("condicao_operador", e.target.value as RegraComposicaoPayload["condicao_operador"])}>
              {OPERADORES.map((op) => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Valor</label>
            <input className={INPUT} type="number" step="0.01" value={form.condicao_valor} onChange={(e) => set("condicao_valor", parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      <div className="sm:col-span-2">
        <p className={`mb-3 ${LABEL}`}>Ação</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Tipo de ação</label>
            <select className={INPUT} value={form.acao} onChange={(e) => set("acao", e.target.value as RegraComposicaoPayload["acao"])}>
              {ACOES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          {precisaProduto && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Produto alvo</label>
              <select className={INPUT} value={form.produto_id ?? ""} onChange={(e) => set("produto_id", e.target.value || null)}>
                <option value="">Selecione...</option>
                {itens.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
          )}
          {precisaSubstituto && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Produto a substituir</label>
              <select className={INPUT} value={form.produto_substituido_id ?? ""} onChange={(e) => set("produto_substituido_id", e.target.value || null)}>
                <option value="">Selecione...</option>
                {itens.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Quantidade</label>
            <input className={INPUT} type="number" min={0} step="0.5" value={form.quantidade} onChange={(e) => set("quantidade", parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      <Field label="Kit associado (opcional)">
        <select className={INPUT} value={form.kit_id ?? ""} onChange={(e) => set("kit_id", e.target.value || null)}>
          <option value="">Qualquer kit</option>
          {kits.map((k) => <option key={k.id} value={k.id}>{k.nome}</option>)}
        </select>
      </Field>
      <Field label="Descrição">
        <input className={INPUT} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Quando esta regra se aplica..." />
      </Field>
      <AtivoField checked={form.ativo} onChange={(v) => set("ativo", v)} />
    </FormLayout>
  );

  return (
    <div>
      <SaveBanner show={saved} />
      <FilterBar busca={busca} onBuscaChange={setBusca} ativo={ativo} onAtivoChange={setAtivo} placeholder="Pesquisar regra..." />
      <CrudHeader total={lista.length} loading={loading} onNovo={abrirNovo} novoLabel="Nova Regra" canEdit />
      <DataTable data={lista} columns={COLUMNS} loading={loading} error={erro} emptyMessage="Nenhuma regra de composição encontrada." onEdit={abrirEditar} onToggle={toggleAtivo} />
    </div>
  );
}
