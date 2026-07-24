"use client";

import { useState } from "react";
import {
  type Fornecedor, type FornecedorPayload,
  listarFornecedores, criarFornecedor, editarFornecedor,
} from "@/lib/engenharia-comercial/catalogo";
import {
  INPUT,
  BadgeAtivo, FilterBar, DataTable, FormLayout, Field, AtivoField, CrudHeader, SaveBanner,
  useCrudLoader,
  type ColumnDef,
} from "./components/CrudInfra";

const EMPTY: FornecedorPayload = {
  nome: "", cnpj: "", contato: "", email: "", telefone: "", observacoes: "", ativo: true,
};

const COLUMNS: ColumnDef<Fornecedor>[] = [
  { key: "nome",    label: "Nome" },
  { key: "cnpj",    label: "CNPJ",    render: (r) => <span className="text-gray-500">{r.cnpj || "—"}</span> },
  { key: "contato", label: "Contato", render: (r) => <span className="text-gray-600">{r.contato || "—"}</span> },
  { key: "email",   label: "E-mail",  render: (r) => r.email ? (
    <a href={`mailto:${r.email}`} className="text-xs text-folk hover:underline">{r.email}</a>
  ) : <span className="text-gray-400">—</span> },
  { key: "ativo", label: "Status", sortable: false, render: (r) => <BadgeAtivo ativo={r.ativo} /> },
];

export default function FornecedoresTab() {
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState<boolean | null>(null);

  const { data: lista, loading, error: erro, reload: carregar } = useCrudLoader(
    () => listarFornecedores({ busca: busca || undefined, ativo: ativo ?? undefined }),
    [busca, ativo],
  );

  const [view, setView]         = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [form, setForm]         = useState<FornecedorPayload>(EMPTY);
  const [salvando, setSalvando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  function abrirNovo() {
    setEditando(null); setForm(EMPTY); setFormErro(null); setView("form");
  }

  function abrirEditar(row: Fornecedor) {
    setEditando(row);
    setForm({ nome: row.nome, cnpj: row.cnpj, contato: row.contato, email: row.email, telefone: row.telefone, observacoes: row.observacoes, ativo: row.ativo });
    setFormErro(null); setView("form");
  }

  async function toggleAtivo(row: Fornecedor) {
    try { await editarFornecedor(row.id, { ativo: !row.ativo }); carregar(); }
    catch (e) { void e; }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormErro("Nome é obrigatório."); return; }
    setSalvando(true); setFormErro(null);
    try {
      if (editando) await editarFornecedor(editando.id, form);
      else await criarFornecedor(form);
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

  function set(field: keyof FornecedorPayload, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (view === "form") return (
    <FormLayout
      title={editando ? `Editar: ${editando.nome}` : "Novo Fornecedor"}
      onBack={() => setView("list")}
      onSubmit={salvar}
      salvando={salvando}
      erro={formErro}
      isNew={!editando}
    >
      <Field label="Nome" required>
        <input className={INPUT} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Razão social ou nome fantasia" required />
      </Field>
      <Field label="CNPJ">
        <input className={INPUT} value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
      </Field>
      <Field label="Contato">
        <input className={INPUT} value={form.contato} onChange={(e) => set("contato", e.target.value)} placeholder="Nome do responsável" />
      </Field>
      <Field label="Telefone">
        <input className={INPUT} value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(00) 00000-0000" />
      </Field>
      <Field label="E-mail" span2>
        <input className={INPUT} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contato@fornecedor.com" />
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
      <FilterBar busca={busca} onBuscaChange={setBusca} ativo={ativo} onAtivoChange={setAtivo} placeholder="Pesquisar fornecedor..." />
      <CrudHeader total={lista.length} loading={loading} onNovo={abrirNovo} novoLabel="Novo Fornecedor" canEdit />
      <DataTable
        data={lista} columns={COLUMNS} loading={loading} error={erro}
        emptyMessage="Nenhum fornecedor encontrado."
        onEdit={abrirEditar} onToggle={toggleAtivo}
      />
    </div>
  );
}
