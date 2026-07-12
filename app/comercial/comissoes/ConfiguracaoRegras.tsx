"use client";

import { useState } from "react";
import {
  type ComissaoRegra, type TipoServicoRegra,
  TIPO_SERVICO_REGRA, salvarRegraAction,
} from "@/lib/comissoes";

interface Props {
  regras:       ComissaoRegra[];
  onRecarregar: () => void;
}

const FORM_VAZIO: Omit<ComissaoRegra, "id" | "created_at" | "updated_at"> = {
  nome:                       "",
  tipo_servico:               "demais",
  percentual_consultor:       0,
  percentual_consultor_impl:  0,
  percentual_gerente:         0,
  percentual_gerente_proprio: 0,
  percentual_indicador:       0,
  meses_recorrencia:          1,
  ativo:                      true,
  vigencia_inicio:            null,
  vigencia_fim:               null,
  observacoes:                "",
};

const INPUT  = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL  = "text-xs font-semibold uppercase tracking-wide text-gray-500";
const NUM_IN = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10 w-full text-right";

function PercField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={LABEL}>{label}</label>
      <div className="relative">
        <input
          type="number" min={0} max={100} step={0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={NUM_IN}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
      </div>
    </div>
  );
}

export default function ConfiguracaoRegras({ regras, onRecarregar }: Props) {
  const [editando, setEditando] = useState<ComissaoRegra | null>(null);
  const [form, setForm]         = useState<Omit<ComissaoRegra, "id" | "created_at" | "updated_at">>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setErro(null);
    setShowForm(true);
  }

  function abrirEditar(r: ComissaoRegra) {
    setEditando(r);
    setForm({
      nome:                       r.nome,
      tipo_servico:               r.tipo_servico,
      percentual_consultor:       r.percentual_consultor,
      percentual_consultor_impl:  r.percentual_consultor_impl,
      percentual_gerente:         r.percentual_gerente,
      percentual_gerente_proprio: r.percentual_gerente_proprio,
      percentual_indicador:       r.percentual_indicador,
      meses_recorrencia:          r.meses_recorrencia,
      ativo:                      r.ativo,
      vigencia_inicio:            r.vigencia_inicio,
      vigencia_fim:               r.vigencia_fim,
      observacoes:                r.observacoes,
    });
    setErro(null);
    setShowForm(true);
  }

  function cancelar() { setShowForm(false); setEditando(null); setErro(null); }
  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome) { setErro("Nome é obrigatório."); return; }
    setSalvando(true);
    setErro(null);
    const payload = editando ? { ...form, id: editando.id } : form;
    const result  = await salvarRegraAction(payload);
    setSalvando(false);
    if (!result.ok) { setErro(result.error ?? "Erro ao salvar."); return; }
    setShowForm(false);
    onRecarregar();
  }

  const tipoLabel = (v: TipoServicoRegra) => TIPO_SERVICO_REGRA.find((t) => t.value === v)?.label ?? v;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Regras de Comissionamento</h3>
          <p className="text-xs text-gray-500">Configure os percentuais aplicados a cada tipo de serviço</p>
        </div>
        {!showForm && (
          <button
            onClick={abrirNovo}
            className="rounded-2xl bg-folk px-4 py-2 text-sm font-semibold text-white hover:bg-folk/90 transition-colors"
          >
            + Nova Regra
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-folk/20 bg-folk/5 p-5 space-y-4">
          <h4 className="font-bold text-gray-800">{editando ? "Editar Regra" : "Nova Regra"}</h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Nome</label>
              <input type="text" value={form.nome} onChange={(e) => set("nome", e.target.value)} className={INPUT} placeholder="ex: Portaria Remota 2026" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Tipo de Serviço</label>
              <select value={form.tipo_servico} onChange={(e) => set("tipo_servico", e.target.value as TipoServicoRegra)} className={INPUT}>
                {TIPO_SERVICO_REGRA.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PercField label="Consultor (% MRR)"          value={form.percentual_consultor}       onChange={(v) => set("percentual_consultor",       v)} />
            <PercField label="Consultor (% Implantação)"  value={form.percentual_consultor_impl}  onChange={(v) => set("percentual_consultor_impl",  v)} />
            <PercField label="Gerente (venda consultor)"  value={form.percentual_gerente}         onChange={(v) => set("percentual_gerente",         v)} />
            <PercField label="Gerente (venda própria)"    value={form.percentual_gerente_proprio} onChange={(v) => set("percentual_gerente_proprio", v)} />
            <PercField label="Indicador (% MRR)"          value={form.percentual_indicador}       onChange={(v) => set("percentual_indicador",       v)} />
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Meses Recorrência</label>
              <input type="number" min={1} max={12} value={form.meses_recorrencia} onChange={(e) => set("meses_recorrencia", parseInt(e.target.value) || 1)} className={NUM_IN} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Vigência início</label>
              <input type="date" value={form.vigencia_inicio ?? ""} onChange={(e) => set("vigencia_inicio", e.target.value || null)} className={INPUT} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Vigência fim</label>
              <input type="date" value={form.vigencia_fim ?? ""} onChange={(e) => set("vigencia_fim", e.target.value || null)} className={INPUT} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={LABEL}>Observações</label>
            <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2} className={INPUT} />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="ativo-regra"
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => set("ativo", e.target.checked)}
              className="accent-folk h-4 w-4"
            />
            <label htmlFor="ativo-regra" className="text-sm text-gray-700">Regra ativa</label>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={salvando} className="rounded-2xl bg-folk px-5 py-2 text-sm font-semibold text-white hover:bg-folk/90 disabled:opacity-60 transition-colors">
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={cancelar} className="rounded-2xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabela de regras */}
      {regras.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma regra cadastrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-100">
                <th className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Nome / Tipo</th>
                <th className="py-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Consultor MRR</th>
                <th className="py-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Consultor Impl.</th>
                <th className="py-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Gerente</th>
                <th className="py-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Indicador</th>
                <th className="py-3 pr-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Meses</th>
                <th className="py-3 pr-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="py-3 pr-5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500" />
              </tr>
            </thead>
            <tbody>
              {regras.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 pl-5 pr-3">
                    <p className="font-semibold text-gray-800">{r.nome}</p>
                    <p className="text-xs text-gray-500">{tipoLabel(r.tipo_servico)}</p>
                  </td>
                  <td className="py-3 pr-3 text-right text-gray-700">{r.percentual_consultor}%</td>
                  <td className="py-3 pr-3 text-right text-gray-700">{r.percentual_consultor_impl}%</td>
                  <td className="py-3 pr-3 text-right text-gray-700">
                    <span title="Quando consultor vende">{r.percentual_gerente}%</span>
                    <span className="mx-1 text-gray-400">/</span>
                    <span title="Quando gerente vende" className="text-folk">{r.percentual_gerente_proprio}%</span>
                  </td>
                  <td className="py-3 pr-3 text-right text-gray-700">{r.percentual_indicador}%</td>
                  <td className="py-3 pr-3 text-center text-gray-700">{r.meses_recorrencia}x</td>
                  <td className="py-3 pr-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${r.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {r.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="py-3 pr-5 text-right">
                    <button
                      onClick={() => abrirEditar(r)}
                      className="text-xs font-semibold text-folk hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 space-y-1">
        <p className="font-semibold text-gray-700">Regras de aplicação:</p>
        <p>• Se a venda contém "Portaria Remota" nos serviços → aplica regra <em>portaria_remota</em></p>
        <p>• Se é Venda Direta → aplica regra <em>venda_direta</em> (só % sobre implantação)</p>
        <p>• Demais recorrentes → aplica regra <em>demais</em></p>
        <p>• Gerente: coluna "/" separa "quando consultor vende" / "quando gerente vende por conta própria"</p>
      </div>
    </div>
  );
}
