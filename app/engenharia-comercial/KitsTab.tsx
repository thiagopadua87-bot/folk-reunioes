"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type Kit, type KitPayload, type KitItem, type KitItemPayload, type ItemCatalogo,
  listarKits, criarKit, editarKit,
  listarKitItens, criarKitItem, editarKitItem, excluirKitItem,
} from "@/lib/engenharia-comercial/catalogo";
import { getCategorias, getItens } from "@/lib/engenharia-comercial/lookups";
import type { CategoriaProduto } from "@/lib/engenharia-comercial/catalogo";
import {
  INPUT, LABEL, FOLK_BTN, GHOST_BTN,
  BadgeAtivo, FilterBar, DataTable, FormLayout, Field, AtivoField, CrudHeader,
  SaveBanner, SubListSkeleton, useCrudLoader,
  type ColumnDef,
} from "./components/CrudInfra";

// ── Constantes ────────────────────────────────────────────────

const FATORES = [
  { value: "fixo",         label: "Fixo" },
  { value: "por_camera",   label: "Por câmera" },
  { value: "por_acesso",   label: "Por acesso" },
  { value: "por_portaria", label: "Por portaria" },
  { value: "por_unidade",  label: "Por unidade" },
  { value: "por_ponto",    label: "Por ponto" },
  { value: "por_porta",    label: "Por porta" },
  { value: "por_usuario",  label: "Por usuário" },
];

const EMPTY_KIT: KitPayload = {
  nome: "", descricao: "", categoria: "",
  vigencia_inicio: new Date().toISOString().slice(0, 10),
  vigencia_fim: null, ativo: true, observacoes: "",
};

// ── Sub-editor: Itens do Kit ──────────────────────────────────

function KitItensEditor({ kitId, itens }: { kitId: string; itens: ItemCatalogo[] }) {
  const [kitItens, setKitItens] = useState<KitItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editandoKI, setEditandoKI] = useState<KitItem | null>(null);
  const [form, setForm]         = useState<KitItemPayload>({ kit_id: kitId, item_id: "", quantidade_base: 1, fator_multiplicacao: "fixo", observacoes: "", ordem: 0 });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try { setKitItens(await listarKitItens(kitId)); }
    catch { /* falha silenciosa no sub-editor */ }
    finally { setLoading(false); }
  }, [kitId]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovo() {
    setEditandoKI(null);
    setForm({ kit_id: kitId, item_id: "", quantidade_base: 1, fator_multiplicacao: "fixo", observacoes: "", ordem: kitItens.length });
    setErro(null); setShowForm(true);
  }

  function abrirEditar(ki: KitItem) {
    setEditandoKI(ki);
    setForm({ kit_id: ki.kit_id, item_id: ki.item_id, quantidade_base: ki.quantidade_base, fator_multiplicacao: ki.fator_multiplicacao, observacoes: ki.observacoes, ordem: ki.ordem });
    setErro(null); setShowForm(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.item_id) { setErro("Selecione um item."); return; }
    setSalvando(true); setErro(null);
    try {
      if (editandoKI) await editarKitItem(editandoKI.id, form);
      else await criarKitItem(form);
      setShowForm(false); carregar();
    } catch (e) { setErro((e as Error).message); }
    finally { setSalvando(false); }
  }

  async function excluir(id: string) {
    if (!confirm("Remover este item do kit?")) return;
    try { await excluirKitItem(id); carregar(); }
    catch (e) { setErro((e as Error).message); }
  }

  function set(field: keyof KitItemPayload, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Itens do Kit</h3>
        <button onClick={abrirNovo} className={FOLK_BTN}>+ Adicionar Item</button>
      </div>

      {showForm && (
        <form onSubmit={salvar} className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-3">
              <label className={LABEL}>Item do Catálogo *</label>
              <select className={INPUT} value={form.item_id} onChange={(e) => set("item_id", e.target.value)} disabled={!!editandoKI} required>
                <option value="">Selecione...</option>
                {itens.map((i) => <option key={i.id} value={i.id}>{i.nome}{i.codigo ? ` (${i.codigo})` : ""}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Quantidade Base</label>
              <input className={INPUT} type="number" min={1} step="0.5" value={form.quantidade_base} onChange={(e) => set("quantidade_base", parseFloat(e.target.value) || 1)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Fator de Multiplicação</label>
              <select className={INPUT} value={form.fator_multiplicacao} onChange={(e) => set("fator_multiplicacao", e.target.value)}>
                {FATORES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Ordem</label>
              <input className={INPUT} type="number" min={0} value={form.ordem} onChange={(e) => set("ordem", parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-3">
              <label className={LABEL}>Observações</label>
              <input className={INPUT} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Notas sobre este item no kit..." />
            </div>
          </div>
          {erro && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</div>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={salvando} className={FOLK_BTN}>{salvando ? "Salvando..." : (editandoKI ? "Salvar" : "Adicionar")}</button>
            <button type="button" onClick={() => setShowForm(false)} className={GHOST_BTN}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <SubListSkeleton rows={3} /> : kitItens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          Nenhum item adicionado ao kit ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["#", "Item", "Cód.", "Qtd. Base", "Fator", "Observações", ""].map((h) => (
                  <th key={h} className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kitItens.map((ki) => (
                <tr key={ki.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  <td className="py-3 pl-5 pr-3 font-mono text-xs text-gray-400">{ki.ordem}</td>
                  <td className="py-3 pr-3 font-medium text-gray-800">{ki.ec_catalogo_itens?.nome ?? ki.item_id}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-gray-500">{ki.ec_catalogo_itens?.codigo ?? "—"}</td>
                  <td className="py-3 pr-3 text-gray-700">{ki.quantidade_base} {ki.ec_catalogo_itens?.unidade ?? ""}</td>
                  <td className="py-3 pr-3 text-xs text-gray-500">{FATORES.find((f) => f.value === ki.fator_multiplicacao)?.label ?? ki.fator_multiplicacao}</td>
                  <td className="py-3 pr-3 text-xs text-gray-500">{ki.observacoes || "—"}</td>
                  <td className="py-3 pr-5">
                    <div className="flex gap-2">
                      <button onClick={() => abrirEditar(ki)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-folk/30 hover:text-folk">Editar</button>
                      <button onClick={() => excluir(ki.id)} className="rounded-lg border border-red-100 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Excluir</button>
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

const COLUMNS: ColumnDef<Kit>[] = [
  { key: "nome",      label: "Nome" },
  { key: "categoria", label: "Categoria", render: (r) => <span className="text-gray-600">{r.categoria || "—"}</span> },
  { key: "vigencia_inicio", label: "Vigência", render: (r) => (
    <span className="text-xs text-gray-500">{r.vigencia_inicio}{r.vigencia_fim ? ` → ${r.vigencia_fim}` : ""}</span>
  )},
  { key: "descricao", label: "Descrição", render: (r) => <span className="text-xs text-gray-400">{r.descricao || "—"}</span> },
  { key: "ativo",     label: "Status",    sortable: false, render: (r) => <BadgeAtivo ativo={r.ativo} /> },
];

export default function KitsTab() {
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState<boolean | null>(null);

  const { data: lista, loading, error: erro, reload: carregar } = useCrudLoader(
    () => listarKits({ busca: busca || undefined, ativo: ativo ?? undefined }),
    [busca, ativo],
  );

  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [itens, setItens]           = useState<ItemCatalogo[]>([]);

  useEffect(() => {
    Promise.all([getCategorias(), getItens()])
      .then(([c, i]) => { setCategorias(c); setItens(i); })
      .catch(() => {});
  }, []);

  const [view, setView]         = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<Kit | null>(null);
  const [form, setForm]         = useState<KitPayload>(EMPTY_KIT);
  const [salvando, setSalvando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  function abrirNovo() {
    setEditando(null); setForm(EMPTY_KIT); setFormErro(null); setView("form");
  }

  function abrirEditar(row: Kit) {
    setEditando(row);
    setForm({ nome: row.nome, descricao: row.descricao, categoria: row.categoria, vigencia_inicio: row.vigencia_inicio, vigencia_fim: row.vigencia_fim, ativo: row.ativo, observacoes: row.observacoes });
    setFormErro(null); setView("form");
  }

  async function toggleAtivo(row: Kit) {
    try { await editarKit(row.id, { ativo: !row.ativo }); carregar(); }
    catch (e) { void e; }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormErro("Nome é obrigatório."); return; }
    setSalvando(true); setFormErro(null);
    try {
      if (editando) {
        await editarKit(editando.id, form);
        // Atualiza campos locais sem perder editando.id (para manter sub-editor ativo)
        setEditando((prev) => prev ? { ...prev, ...form } : null);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        carregar();
      } else {
        // Após criar, entra em modo edição para que usuário possa adicionar itens imediatamente
        const { id } = await criarKit(form);
        const novoKit: Kit = { ...form, id, created_at: "", updated_at: "" };
        setEditando(novoKit);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        carregar();
      }
    } catch (e) {
      setFormErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  function set(field: keyof KitPayload, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (view === "form") return (
    <div>
      <SaveBanner show={saved} />
      <FormLayout
        title={editando ? `Editar: ${form.nome}` : "Novo Kit"}
        onBack={() => setView("list")}
        onSubmit={salvar}
        salvando={salvando}
        erro={formErro}
        isNew={!editando}
        extra={editando ? <KitItensEditor kitId={editando.id} itens={itens} /> : undefined}
      >
        <Field label="Nome" required>
          <input className={INPUT} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Kit CFTV Básico" required />
        </Field>
        <Field label="Categoria">
          <select className={INPUT} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
            <option value="">Selecione...</option>
            {categorias.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
        </Field>
        <Field label="Início de Vigência" required>
          <input className={INPUT} type="date" value={form.vigencia_inicio} onChange={(e) => set("vigencia_inicio", e.target.value)} required />
        </Field>
        <Field label="Fim de Vigência">
          <input className={INPUT} type="date" value={form.vigencia_fim ?? ""} onChange={(e) => set("vigencia_fim", e.target.value || null)} />
        </Field>
        <Field label="Descrição" span2>
          <textarea className={`${INPUT} resize-none`} rows={2} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
        </Field>
        <Field label="Observações" span2>
          <textarea className={`${INPUT} resize-none`} rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
        </Field>
        <AtivoField checked={form.ativo} onChange={(v) => set("ativo", v)} />
      </FormLayout>
    </div>
  );

  return (
    <div>
      <SaveBanner show={saved} />
      <FilterBar busca={busca} onBuscaChange={setBusca} ativo={ativo} onAtivoChange={setAtivo} placeholder="Pesquisar kit..." />
      <CrudHeader total={lista.length} loading={loading} onNovo={abrirNovo} novoLabel="Novo Kit" canEdit />
      <DataTable data={lista} columns={COLUMNS} loading={loading} error={erro} emptyMessage="Nenhum kit encontrado." onEdit={abrirEditar} onToggle={toggleAtivo} />
    </div>
  );
}
