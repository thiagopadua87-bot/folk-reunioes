"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarTerceirizados, criarTerceirizado, editarTerceirizado,
  listarTecnicos, validarCPF, formatarCPF,
  type Terceirizado, type TerceirizadoPayload, type FiltrosTerceirizados, type Tecnico,
} from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";

const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

interface FormState {
  nome_empresa: string;
  contato: string;
  telefone: string;
  email: string;
  cpf: string;
  tecnico_responsavel_id: string;
  tipo_servico: string;
  ativo: boolean;
}

const FORM_VAZIO: FormState = {
  nome_empresa: "", contato: "", telefone: "", email: "",
  cpf: "", tecnico_responsavel_id: "", tipo_servico: "", ativo: true,
};

export default function TerceirizadosTab() {
  const [registros, setRegistros] = useState<Terceirizado[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<Terceirizado | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosTerceirizados>({ busca: "", ativo: null });

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const [lista, tecList] = await Promise.all([
        listarTerceirizados({ busca: filtros.busca || undefined, ativo: filtros.ativo ?? undefined }),
        listarTecnicos({ ativo: true }),
      ]);
      setRegistros(lista);
      setTecnicos(tecList);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally { setCarregando(false); }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovo() { setEditando(null); setForm(FORM_VAZIO); setErroForm(null); setView("form"); }
  function abrirEditar(r: Terceirizado) {
    setEditando(r);
    setForm({ nome_empresa: r.nome_empresa, contato: r.contato, telefone: r.telefone, email: r.email, cpf: r.cpf, tecnico_responsavel_id: r.tecnico_responsavel_id ?? "", tipo_servico: r.tipo_servico, ativo: r.ativo });
    setErroForm(null); setView("form");
  }
  function cancelar() { setView("list"); setEditando(null); setErroForm(null); }
  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome_empresa.trim()) { setErroForm("Nome da empresa é obrigatório."); return; }
    if (form.cpf && !validarCPF(form.cpf)) { setErroForm("CPF inválido. Informe 11 dígitos."); return; }
    setSalvando(true); setErroForm(null);
    try {
      const payload: TerceirizadoPayload = {
        nome_empresa:           form.nome_empresa.trim(),
        contato:                form.contato.trim(),
        telefone:               form.telefone.trim(),
        email:                  form.email.trim(),
        cpf:                    form.cpf.trim(),
        tecnico_responsavel_id: form.tecnico_responsavel_id || null,
        tipo_servico:           form.tipo_servico.trim(),
        ativo:                  form.ativo,
      };
      if (editando) await editarTerceirizado(editando.id, payload);
      else           await criarTerceirizado(payload);
      setView("list"); setEditando(null); await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  async function toggleAtivo(r: Terceirizado) {
    try {
      await editarTerceirizado(r.id, {
        nome_empresa: r.nome_empresa, contato: r.contato, telefone: r.telefone,
        email: r.email, cpf: r.cpf, tecnico_responsavel_id: r.tecnico_responsavel_id,
        tipo_servico: r.tipo_servico, ativo: !r.ativo,
      });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  if (view === "form") {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>
          <h2 className="text-lg font-bold text-gray-900">{editando ? "Editar terceirizado" : "Novo terceirizado"}</h2>
        </div>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Nome da empresa *</label>
              <input type="text" value={form.nome_empresa} onChange={(e) => set("nome_empresa", e.target.value)} required placeholder="Razão social ou nome fantasia" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Contato</label>
              <input type="text" value={form.contato} onChange={(e) => set("contato", e.target.value)} placeholder="Nome do responsável" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Telefone</label>
              <input type="tel" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(00) 00000-0000" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>E-mail</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemplo.com" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>CPF</label>
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => set("cpf", formatarCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className={INPUT}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Técnico responsável</label>
              <select value={form.tecnico_responsavel_id} onChange={(e) => set("tecnico_responsavel_id", e.target.value)} className={INPUT}>
                <option value="">Nenhum</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Tipo de serviço</label>
              <input type="text" value={form.tipo_servico} onChange={(e) => set("tipo_servico", e.target.value)} placeholder="Ex: Instalação, Manutenção..." className={INPUT} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <input type="checkbox" id="ativo-ter" checked={form.ativo} onChange={(e) => set("ativo", e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-folk" />
              <label htmlFor="ativo-ter" className="text-sm text-gray-700">Ativo</label>
            </div>
            {erroForm && <div className="sm:col-span-2"><Alert status="error" message={erroForm} /></div>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={salvando} className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60">
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar terceirizado"}
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
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Buscar</label>
            <input type="text" value={filtros.busca} onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))} placeholder="Empresa ou contato..." className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Status</label>
            <select value={filtros.ativo == null ? "" : String(filtros.ativo)} onChange={(e) => setFiltros((f) => ({ ...f, ativo: e.target.value === "" ? null : e.target.value === "true" }))} className={INPUT}>
              <option value="">Todos</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{carregando ? "Carregando..." : `${registros.length} terceirizado${registros.length !== 1 ? "s" : ""}`}</p>
        <button onClick={abrirNovo} className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]">
          + Novo terceirizado
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && registros.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">Nenhum terceirizado cadastrado.</div>
      )}

      {registros.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Empresa</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Contato</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Técnico responsável</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo de serviço</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 pl-6 pr-4 text-sm font-medium text-gray-900">{r.nome_empresa}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">{r.contato || "—"}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">{r.tecnico_nome || "—"}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">{r.tipo_servico || "—"}</td>
                  <td className="py-3.5 pr-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${r.ativo ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {r.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="py-3.5 pr-6">
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirEditar(r)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk">Editar</button>
                      <button onClick={() => toggleAtivo(r)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${r.ativo ? "border-amber-100 text-amber-600 hover:bg-amber-50" : "border-green-100 text-green-600 hover:bg-green-50"}`}>
                        {r.ativo ? "Inativar" : "Ativar"}
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
