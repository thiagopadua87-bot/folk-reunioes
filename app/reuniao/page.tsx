"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/app/components/ui";
import {
  listarReunioes, criarReuniao, excluirReuniao,
  formatData,
  type ReuniaoV2,
} from "@/lib/reunioes-v2";
import { supabase } from "@/lib/supabase";

const INPUT =
  "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full disabled:opacity-60 disabled:cursor-not-allowed";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

interface ReuniaoComContagem extends ReuniaoV2 {
  total_acoes: number;
  acoes_pendentes: number;
}

function formatDataReuniao(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ReunioesPage() {
  const router = useRouter();
  const [reunioes, setReunioes] = useState<ReuniaoComContagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [modalNova, setModalNova] = useState(false);
  const [form, setForm] = useState({
    titulo: "Reunião Semanal",
    data: new Date().toISOString().split("T")[0],
    horario_inicio: "",
    responsavel: "",
  });
  const [criando, setCriando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [confirmacaoExcluir, setConfirmacaoExcluir] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarReunioes();

      const ids = lista.map((r) => r.id);
      if (ids.length === 0) {
        setReunioes([]);
        return;
      }

      const { data: acoesData } = await supabase
        .from("reuniao_acoes")
        .select("reuniao_id, status")
        .in("reuniao_id", ids);

      const contagemMap: Record<string, { total: number; pendentes: number }> = {};
      for (const a of acoesData ?? []) {
        if (!contagemMap[a.reuniao_id]) contagemMap[a.reuniao_id] = { total: 0, pendentes: 0 };
        contagemMap[a.reuniao_id].total++;
        if (a.status === "PENDENTE" || a.status === "EM_ANDAMENTO") {
          contagemMap[a.reuniao_id].pendentes++;
        }
      }

      setReunioes(
        lista.map((r) => ({
          ...r,
          total_acoes: contagemMap[r.id]?.total ?? 0,
          acoes_pendentes: contagemMap[r.id]?.pendentes ?? 0,
        }))
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar reuniões.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setIsAdmin(profile?.role === "admin");
    }
    checkAdmin();
  }, []);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) { setErroForm("Informe o título da reunião."); return; }
    if (!form.data) { setErroForm("Informe a data da reunião."); return; }
    setCriando(true);
    setErroForm(null);
    try {
      const id = await criarReuniao({
        titulo: form.titulo.trim(),
        data: new Date(form.data + "T12:00:00").toISOString(),
        horario_inicio: form.horario_inicio || undefined,
        responsavel: form.responsavel.trim(),
      });
      setModalNova(false);
      router.push(`/reuniao/${id}`);
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao criar reunião.");
    } finally {
      setCriando(false);
    }
  }

  async function handleExcluir(id: string) {
    setExcluindo(id);
    try {
      await excluirReuniao(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir.");
    } finally {
      setExcluindo(null);
      setConfirmacaoExcluir(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reuniões</h1>
          <p className="mt-1 text-sm text-gray-500">Registro e acompanhamento de encaminhamentos</p>
        </div>
        <button
          onClick={() => {
            setForm({ titulo: "Reunião Semanal", data: new Date().toISOString().split("T")[0], horario_inicio: "", responsavel: "" });
            setErroForm(null);
            setModalNova(true);
          }}
          className="rounded-2xl bg-folk-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
        >
          + Nova Reunião
        </button>
      </div>

      {erro && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {erro}
        </div>
      )}

      {carregando && (
        <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
      )}

      {!carregando && reunioes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
          <p className="text-sm text-gray-400">Nenhuma reunião registrada ainda.</p>
          <p className="mt-1 text-xs text-gray-300">Clique em &quot;+ Nova Reunião&quot; para começar.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {reunioes.map((r) => (
          <Card key={r.id} className="border-l-4 border-l-folk/30 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-gray-900">{r.titulo}</h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.status === "finalizada"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {r.status === "finalizada" ? "Finalizada" : "Ativa"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500 capitalize">
                  {formatDataReuniao(r.data)}
                  {r.responsavel && ` · ${r.responsavel}`}
                  {r.total_acoes > 0 && (
                    <>
                      {" · "}
                      <span className="text-gray-700">{r.total_acoes} {r.total_acoes === 1 ? "ação" : "ações"}</span>
                      {r.acoes_pendentes > 0 && (
                        <span className="ml-1 text-amber-600">({r.acoes_pendentes} pendente{r.acoes_pendentes !== 1 ? "s" : ""})</span>
                      )}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/reuniao/${r.id}`)}
                  className="rounded-xl border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/40 hover:text-folk"
                >
                  Abrir
                </button>
                {isAdmin && (
                  confirmacaoExcluir === r.id ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExcluir(r.id)}
                        disabled={excluindo === r.id}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {excluindo === r.id ? "..." : "Confirmar"}
                      </button>
                      <button
                        onClick={() => setConfirmacaoExcluir(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmacaoExcluir(r.id)}
                      className="text-xs font-semibold text-gray-400 hover:text-red-600"
                    >
                      Excluir
                    </button>
                  )
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Nova Reunião */}
      {modalNova && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Nova Reunião</h2>
            </div>
            <form onSubmit={handleCriar} className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Reunião Semanal"
                  className={INPUT}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Data *</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                    className={INPUT}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Horário início</label>
                  <input
                    type="time"
                    value={form.horario_inicio}
                    onChange={(e) => setForm((p) => ({ ...p, horario_inicio: e.target.value }))}
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Responsável pelos registros</label>
                <input
                  type="text"
                  value={form.responsavel}
                  onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))}
                  placeholder="Nome de quem registra a ata"
                  className={INPUT}
                />
              </div>

              {erroForm && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
                  {erroForm}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={criando}
                  className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {criando ? "Criando..." : "Criar Reunião"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalNova(false)}
                  className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
