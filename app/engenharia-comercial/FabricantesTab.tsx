"use client";

import { useState } from "react";
import {
  type Fabricante, type FabricantePayload,
  listarFabricantes, criarFabricante, editarFabricante,
} from "@/lib/engenharia-comercial/catalogo";
import {
  INPUT,
  BadgeAtivo, FilterBar, DataTable, FormLayout, Field, AtivoField, CrudHeader, SaveBanner,
  useCrudLoader,
  type ColumnDef,
} from "./components/CrudInfra";

const EMPTY: FabricantePayload = {
  nome: "", pais_origem: "", website: "", observacoes: "", ativo: true,
};

const COLUMNS: ColumnDef<Fabricante>[] = [
  { key: "nome",         label: "Nome" },
  { key: "pais_origem",  label: "País" },
  { key: "website",      label: "Website", render: (r) => r.website ? (
    <a href={r.website} target="_blank" rel="noreferrer" className="text-xs text-folk hover:underline">{r.website}</a>
  ) : <span className="text-gray-400">—</span> },
  { key: "ativo", label: "Status", sortable: false, render: (r) => <BadgeAtivo ativo={r.ativo} /> },
];

export default function FabricantesTab() {
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState<boolean | null>(null);

  const { data: lista, loading, error: erro, reload: carregar } = useCrudLoader(
    () => listarFabricantes({ busca: busca || undefined, ativo: ativo ?? undefined }),
    [busca, ativo],
  );

  const [view, setView]         = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<Fabricante | null>(null);
  const [form, setForm]         = useState<FabricantePayload>(EMPTY);
  const [salvando, setSalvando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  function abrirNovo() {
    setEditando(null); setForm(EMPTY); setFormErro(null); setView("form");
  }

  function abrirEditar(row: Fabricante) {
    setEditando(row);
    setForm({ nome: row.nome, pais_origem: row.pais_origem, website: row.website, observacoes: row.observacoes, ativo: row.ativo });
    setFormErro(null); setView("form");
  }

  async function toggleAtivo(row: Fabricante) {
    try { await editarFabricante(row.id, { ativo: !row.ativo }); carregar(); }
    catch (e) { /* erro ignorado na lista */ void e; }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormErro("Nome é obrigatório."); return; }
    setSalvando(true); setFormErro(null);
    try {
      if (editando) await editarFabricante(editando.id, form);
      else await criarFabricante(form);
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

  function set(field: keyof FabricantePayload, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (view === "form") return (
    <FormLayout
      title={editando ? `Editar: ${editando.nome}` : "Novo Fabricante"}
      onBack={() => setView("list")}
      onSubmit={salvar}
      salvando={salvando}
      erro={formErro}
      isNew={!editando}
    >
      <Field label="Nome" required>
        <input className={INPUT} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Hikvision" required />
      </Field>
      <Field label="País de Origem">
        <input className={INPUT} value={form.pais_origem} onChange={(e) => set("pais_origem", e.target.value)} placeholder="Ex: China" />
      </Field>
      <Field label="Website" span2>
        <input className={INPUT} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
      </Field>
      <Field label="Observações" span2>
        <textarea className={`${INPUT} resize-none`} rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
      </Field>
      <AtivoField checked={form.ativo} onChange={(v) => set("ativo", v)} />
    </FormLayout>
  );

  return (
    <div>
      <SaveBanner show={saved} />
      <FilterBar busca={busca} onBuscaChange={setBusca} ativo={ativo} onAtivoChange={setAtivo} placeholder="Pesquisar fabricante..." />
      <CrudHeader total={lista.length} loading={loading} onNovo={abrirNovo} novoLabel="Novo Fabricante" canEdit />
      <DataTable
        data={lista} columns={COLUMNS} loading={loading} error={erro}
        emptyMessage="Nenhum fabricante encontrado."
        onEdit={abrirEditar} onToggle={toggleAtivo}
      />
    </div>
  );
}
