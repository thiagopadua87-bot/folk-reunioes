"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type EventoHistorico = {
  id:          string;
  evento:      string;
  descricao:   string;
  versaoId:    string;
  userId:      string;
  createdAt:   string;
};

const EVENTO_LABEL: Record<string, string> = {
  criada:               "Versão criada",
  calculada:            "Cálculo realizado",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovacao_concedida:  "Aprovação concedida",
  aprovacao_negada:     "Aprovação negada",
  enviada:              "Enviada ao cliente",
  aprovada_cliente:     "Aprovada pelo cliente",
  recusada:             "Recusada pelo cliente",
  convertida_venda:     "Convertida em venda",
  editada:              "Editada",
};

const EVENTO_COR: Record<string, string> = {
  criada:               "bg-blue-100 text-blue-700",
  calculada:            "bg-folk/10 text-folk",
  aguardando_aprovacao: "bg-amber-100 text-amber-700",
  aprovacao_concedida:  "bg-green-100 text-green-700",
  aprovacao_negada:     "bg-red-100 text-red-700",
  enviada:              "bg-indigo-100 text-indigo-700",
  aprovada_cliente:     "bg-emerald-100 text-emerald-700",
  recusada:             "bg-red-100 text-red-700",
  convertida_venda:     "bg-green-200 text-green-800",
  editada:              "bg-gray-100 text-gray-600",
};

async function buscarHistorico(propostaId: string): Promise<EventoHistorico[]> {
  const { data, error } = await supabase
    .from("ec_historico_versoes")
    .select("id, evento, descricao, versao_id, user_id, created_at")
    .eq("proposta_id", propostaId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => {
    const d = r as Record<string, unknown>;
    return {
      id:        d.id as string,
      evento:    d.evento as string,
      descricao: d.descricao as string,
      versaoId:  d.versao_id as string,
      userId:    d.user_id as string,
      createdAt: d.created_at as string,
    };
  });
}

export function HistoricoTab({ propostaId }: { propostaId: string }) {
  const [eventos, setEventos]   = useState<EventoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]         = useState<string | null>(null);

  useEffect(() => {
    setCarregando(true); setErro(null);
    buscarHistorico(propostaId)
      .then(setEventos)
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false));
  }, [propostaId]);

  if (carregando) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar histórico: {erro}
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center">
        <p className="text-2xl">📋</p>
        <p className="mt-2 text-sm font-semibold text-gray-600">Sem eventos registrados</p>
        <p className="mt-1 text-xs text-gray-400">
          As alterações de status e ações serão registradas automaticamente aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Histórico de eventos
          <span className="ml-2 text-xs font-normal text-gray-400">({eventos.length})</span>
        </h3>
      </div>

      <div className="divide-y divide-gray-50">
        {eventos.map((ev) => {
          const corClass = EVENTO_COR[ev.evento] ?? "bg-gray-100 text-gray-600";
          const label    = EVENTO_LABEL[ev.evento] ?? ev.evento;
          const data     = new Date(ev.createdAt).toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          });

          return (
            <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${corClass}`}>
                {label}
              </span>
              <div className="min-w-0 flex-1">
                {ev.descricao && (
                  <p className="text-sm text-gray-700">{ev.descricao}</p>
                )}
              </div>
              <time className="shrink-0 text-xs text-gray-400">{data}</time>
            </div>
          );
        })}
      </div>
    </div>
  );
}
