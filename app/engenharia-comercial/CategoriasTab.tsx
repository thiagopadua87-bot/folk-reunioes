"use client";

import { useState } from "react";
import {
  type CategoriaProduto, type CategoriaProdutoPayload,
  listarCategorias, criarCategoria, editarCategoria,
} from "@/lib/engenharia-comercial/catalogo";
import {
  INPUT,
  BadgeAtivo, FilterBar, DataTable, FormLayout, Field, AtivoField, CrudHeader, SaveBanner,
  useCrudLoader,
  type ColumnDef,
} from "./components/CrudInfra";

const EMPTY: CategoriaProdutoPayload = {
  nome: "", descricao: "", icone: "", ordem: 0, ativo: true,
};

const COLUMNS: ColumnDef<CategoriaProduto>[] = [
  { key: "ordem", label: "#", render: (r) => <span className="font-mono text-xs text-gray-400">{r.ordem}</span> },
  { key: "icone", label: "Ícone", sortable: false, render: (r) => <span className="text-xl">{r.icone || "📦"}</span> },
  { key: "nome",  label: "Nome" },
  { key: "descricao", label: "Descrição", render: (r) => <span className="text-xs text-gray-500">{r.descricao || "—"}</span> },
  { key: "ativo", label: "Status", sortable: false, render: (r) => <BadgeAtivo ativo={r.ativo} /> },
];

export default function CategoriasTab() {
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState<boolean | null>(null);

  const { data: lista, loading, error: erro, reload: carregar } = useCrudLoader(
    () => listarCategorias({ busca: busca || undefined, ativo: ativo ?? undefined }),
    [busca, ativo],
  );

  const [view, setView]         = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<CategoriaProduto | null>(null);
  const [form, setForm]         = useState<CategoriaProdutoPayload>(EMPTY);
  const [salvando, setSalvando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  function abrirNovo() {
    setEditando(null); setForm(EMPTY); setFormErro(null); setView("form");
  }

  function abrirEditar(row: CategoriaProduto) {
    setEditando(row);
    setForm({ nome: row.nome, descricao: row.descricao, icone: row.icone, ordem: row.ordem, ativo: row.ativo });
    setFormErro(null); setView("form");
  }

  async function toggleAtivo(row: CategoriaProduto) {
    try { await editarCategoria(row.id, { ativo: !row.ativo }); carregar(); }
    catch (e) { void e; }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormErro("Nome é obrigatório."); return; }
    setSalvando(true); setFormErro(null);
    try {
      if (editando) await editarCategoria(editando.id, form);
      else await criarCategoria(form);
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

  function set(field: keyof CategoriaProdutoPayload, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (view === "form") return (
    <FormLayout
      title={editando ? `Editar: ${editando.nome}` : "Nova Categoria"}
      onBack={() => setView("list")}
      onSubmit={salvar}
      salvando={salvando}
      erro={formErro}
      isNew={!editando}
    >
      <Field label="Nome" required>
        <input className={INPUT} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Câmeras" required />
      </Field>
      <Field label="Ícone (emoji)">
        <input className={INPUT} value={form.icone} onChange={(e) => set("icone", e.target.value)} placeholder="📦" maxLength={4} />
      </Field>
      <Field label="Ordem">
        <input className={INPUT} type="number" value={form.ordem} onChange={(e) => set("ordem", Number(e.target.value))} min={0} />
      </Field>
      <Field label="Descrição" span2>
        <textarea className={`${INPUT} resize-none`} rows={2} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Descrição da categoria..." />
      </Field>
      <AtivoField checked={form.ativo} onChange={(v) => set("ativo", v)} />
    </FormLayout>
  );

  return (
    <div>
      <SaveBanner show={saved} />
      <FilterBar busca={busca} onBuscaChange={setBusca} ativo={ativo} onAtivoChange={setAtivo} placeholder="Pesquisar categoria..." />
      <CrudHeader total={lista.length} loading={loading} onNovo={abrirNovo} novoLabel="Nova Categoria" canEdit />
      <DataTable
        data={lista} columns={COLUMNS} loading={loading} error={erro}
        emptyMessage="Nenhuma categoria encontrada."
        onEdit={abrirEditar} onToggle={toggleAtivo}
      />
    </div>
  );
}
