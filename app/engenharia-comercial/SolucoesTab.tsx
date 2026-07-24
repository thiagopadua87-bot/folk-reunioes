"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type Solucao, type SolucaoPayload, type SolucaoKit, type SolucaoKitPayload, type Kit,
  listarSolucoes, criarSolucao, editarSolucao,
  listarSolucaoKits, criarSolucaoKit, excluirSolucaoKit,
} from "@/lib/engenharia-comercial/catalogo";
import { getCategorias, getKits } from "@/lib/engenharia-comercial/lookups";
import type { CategoriaProduto } from "@/lib/engenharia-comercial/catalogo";
import {
  INPUT, LABEL, FOLK_BTN, GHOST_BTN,
  Badge, BadgeAtivo, FilterBar, DataTable, FormLayout, Field, AtivoField, CrudHeader,
  SaveBanner, SubListSkeleton, useCrudLoader,
  type ColumnDef,
} from "./components/CrudInfra";

// ── Constantes ────────────────────────────────────────────────

const SEGMENTOS = [
  { value: "basico",        label: "Básico",       color: "gray" },
  { value: "intermediario", label: "Intermediário", color: "blue" },
  { value: "premium",       label: "Premium",       color: "folk" },
  { value: "ultra",         label: "Ultra",         color: "purple" },
] as const;

const EMPTY_SOLUCAO: SolucaoPayload = {
  nome: "", descricao: "", categoria: "", tecnologia: "", segmento: "intermediario", ativo: true,
};

// ── Sub-editor: Kits da Solução ───────────────────────────────

function SolucaoKitsEditor({ solucaoId, kits }: { solucaoId: string; kits: Kit[] }) {
  const [solucaoKits, setSolucaoKits] = useState<SolucaoKit[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState<SolucaoKitPayload>({ solucao_id: solucaoId, kit_id: "", ordem: 0 });
  const [salvando, setSalvando]       = useState(false);
  const [erro, setErro]               = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try { setSolucaoKits(await listarSolucaoKits(solucaoId)); }
    catch { /* falha silenciosa no sub-editor */ }
    finally { setLoading(false); }
  }, [solucaoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const kitsUsados = new Set(solucaoKits.map((sk) => sk.kit_id));
  const kitsDisp   = kits.filter((k) => !kitsUsados.has(k.id) && k.ativo);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kit_id) { setErro("Selecione um kit."); return; }
    setSalvando(true); setErro(null);
    try {
      await criarSolucaoKit(form);
      setShowForm(false);
      setForm({ solucao_id: solucaoId, kit_id: "", ordem: solucaoKits.length });
      carregar();
    } catch (e) { setErro((e as Error).message); }
    finally { setSalvando(false); }
  }

  async function excluir(id: string) {
    if (!confirm("Remover este kit da solução?")) return;
    try { await excluirSolucaoKit(id); carregar(); }
    catch (e) { setErro((e as Error).message); }
  }

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Kits da Solução</h3>
        {kitsDisp.length > 0 && (
          <button onClick={() => { setShowForm(true); setForm({ solucao_id: solucaoId, kit_id: "", ordem: solucaoKits.length }); setErro(null); }} className={FOLK_BTN}>
            + Adicionar Kit
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={salvar} className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <label className={LABEL}>Kit *</label>
              <select className={INPUT} value={form.kit_id} onChange={(e) => setForm((f) => ({ ...f, kit_id: e.target.value }))} required>
                <option value="">Selecione...</option>
                {kitsDisp.map((k) => <option key={k.id} value={k.id}>{k.nome}</option>)}
              </select>
            </div>
            <div className="flex w-28 flex-col gap-1.5">
              <label className={LABEL}>Ordem</label>
              <input className={INPUT} type="number" min={0} value={form.ordem} onChange={(e) => setForm((f) => ({ ...f, ordem: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          {erro && <div className="mt-2 text-xs text-red-600">{erro}</div>}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={salvando} className={FOLK_BTN}>{salvando ? "Salvando..." : "Adicionar"}</button>
            <button type="button" onClick={() => setShowForm(false)} className={GHOST_BTN}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <SubListSkeleton rows={2} /> : solucaoKits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          Nenhum kit associado a esta solução.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["#", "Kit", "Categoria", ""].map((h) => (
                  <th key={h} className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {solucaoKits.map((sk) => (
                <tr key={sk.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  <td className="py-3 pl-5 pr-3 font-mono text-xs text-gray-400">{sk.ordem}</td>
                  <td className="py-3 pr-3 font-medium text-gray-800">{sk.ec_kits?.nome ?? sk.kit_id}</td>
                  <td className="py-3 pr-3 text-sm text-gray-500">{sk.ec_kits?.categoria ?? "—"}</td>
                  <td className="py-3 pr-5">
                    <button onClick={() => excluir(sk.id)} className="rounded-lg border border-red-100 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Remover</button>
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

const COLUMNS: ColumnDef<Solucao>[] = [
  { key: "nome",       label: "Nome" },
  { key: "categoria",  label: "Categoria",  render: (r) => <span className="text-gray-600">{r.categoria || "—"}</span> },
  { key: "tecnologia", label: "Tecnologia", render: (r) => <span className="text-xs text-gray-500">{r.tecnologia || "—"}</span> },
  { key: "segmento",   label: "Segmento",   render: (r) => {
    const s = SEGMENTOS.find((s) => s.value === r.segmento);
    return s ? <Badge label={s.label} color={s.color} /> : null;
  }},
  { key: "ativo", label: "Status", sortable: false, render: (r) => <BadgeAtivo ativo={r.ativo} /> },
];

export default function SolucoesTab() {
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState<boolean | null>(null);

  const { data: lista, loading, error: erro, reload: carregar } = useCrudLoader(
    () => listarSolucoes({ busca: busca || undefined, ativo: ativo ?? undefined }),
    [busca, ativo],
  );

  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [kits, setKits]             = useState<Kit[]>([]);

  useEffect(() => {
    Promise.all([getCategorias(), getKits()])
      .then(([c, k]) => { setCategorias(c); setKits(k); })
      .catch(() => {});
  }, []);

  const [view, setView]         = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<Solucao | null>(null);
  const [form, setForm]         = useState<SolucaoPayload>(EMPTY_SOLUCAO);
  const [salvando, setSalvando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  function abrirNovo() {
    setEditando(null); setForm(EMPTY_SOLUCAO); setFormErro(null); setView("form");
  }

  function abrirEditar(row: Solucao) {
    setEditando(row);
    setForm({ nome: row.nome, descricao: row.descricao, categoria: row.categoria, tecnologia: row.tecnologia, segmento: row.segmento, ativo: row.ativo });
    setFormErro(null); setView("form");
  }

  async function toggleAtivo(row: Solucao) {
    try { await editarSolucao(row.id, { ativo: !row.ativo }); carregar(); }
    catch (e) { void e; }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormErro("Nome é obrigatório."); return; }
    setSalvando(true); setFormErro(null);
    try {
      if (editando) {
        await editarSolucao(editando.id, form);
        setEditando((prev) => prev ? { ...prev, ...form } : null);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        carregar();
      } else {
        // Após criar, entra em modo edição para associar kits imediatamente
        const { id } = await criarSolucao(form);
        const nova: Solucao = { ...form, id, created_at: "", updated_at: "" };
        setEditando(nova);
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

  function set(field: keyof SolucaoPayload, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (view === "form") return (
    <div>
      <SaveBanner show={saved} />
      <FormLayout
        title={editando ? `Editar: ${form.nome}` : "Nova Solução"}
        onBack={() => setView("list")}
        onSubmit={salvar}
        salvando={salvando}
        erro={formErro}
        isNew={!editando}
        extra={editando ? <SolucaoKitsEditor solucaoId={editando.id} kits={kits} /> : undefined}
      >
        <Field label="Nome" required>
          <input className={INPUT} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: CFTV Residencial Básico" required />
        </Field>
        <Field label="Segmento" required>
          <select className={INPUT} value={form.segmento} onChange={(e) => set("segmento", e.target.value as SolucaoPayload["segmento"])} required>
            {SEGMENTOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Categoria">
          <select className={INPUT} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
            <option value="">Selecione...</option>
            {categorias.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
        </Field>
        <Field label="Tecnologia">
          <input className={INPUT} value={form.tecnologia} onChange={(e) => set("tecnologia", e.target.value)} placeholder="Ex: IP, HDCVI, Fibra..." />
        </Field>
        <Field label="Descrição" span2>
          <textarea className={`${INPUT} resize-none`} rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
        </Field>
        <AtivoField checked={form.ativo} onChange={(v) => set("ativo", v)} />
      </FormLayout>
    </div>
  );

  return (
    <div>
      <SaveBanner show={saved} />
      <FilterBar busca={busca} onBuscaChange={setBusca} ativo={ativo} onAtivoChange={setAtivo} placeholder="Pesquisar solução..." />
      <CrudHeader total={lista.length} loading={loading} onNovo={abrirNovo} novoLabel="Nova Solução" canEdit />
      <DataTable data={lista} columns={COLUMNS} loading={loading} error={erro} emptyMessage="Nenhuma solução encontrada." onEdit={abrirEditar} onToggle={toggleAtivo} />
    </div>
  );
}
