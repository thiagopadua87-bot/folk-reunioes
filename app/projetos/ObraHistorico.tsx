"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { listarLogsObra, formatarEventoObra, type EventoObra } from "@/lib/projetos";
import { Card } from "@/app/components/ui";

function formatLogTs(s: string): string {
  const d = new Date(s);
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

interface Props {
  obraId: string;
  refreshKey?: number;
}

export default function ObraHistorico({ obraId, refreshKey = 0 }: Props) {
  const [logs, setLogs]           = useState<Awaited<ReturnType<typeof listarLogsObra>>>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try { setLogs(await listarLogsObra(obraId)); }
    catch { setLogs([]); }
    finally { setCarregando(false); }
  }, [obraId]);

  useEffect(() => { carregar(); }, [carregar, refreshKey]);

  const eventos: EventoObra[] = useMemo(() => logs.map(formatarEventoObra), [logs]);

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-800">Histórico</h3>

      {carregando && <p className="text-sm text-gray-400">Carregando...</p>}
      {!carregando && eventos.length === 0 && (
        <p className="text-sm text-gray-400">Nenhuma alteração registrada ainda.</p>
      )}

      {!carregando && eventos.length > 0 && (
        <div>
          {eventos.map((ev, i) => (
            <div key={ev.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-0.5 shrink-0 text-base leading-none">{ev.icone}</span>
                {i < eventos.length - 1 && <div className="my-1 w-px flex-1 bg-gray-100" />}
              </div>
              <div className={`${i < eventos.length - 1 ? "pb-4" : ""} min-w-0`}>
                <p className="mb-0.5 text-[11px] text-gray-400">
                  {formatLogTs(ev.created_at)}
                  {ev.autor_nome && <span className="ml-1">· {ev.autor_nome}</span>}
                </p>
                <p className="text-xs font-semibold text-gray-700">{ev.titulo}</p>
                {ev.descricao && (
                  <p className="break-words text-sm text-gray-500">{ev.descricao}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
