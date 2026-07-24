"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave<T>(
  saver: (data: T) => Promise<void>,
  onSaved?: () => void,
  delay = 800
) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const timerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const schedule = useCallback(
    (data: T) => {
      clearTimeout(timerRef.current);
      clearTimeout(idleTimer.current);
      setStatus("saving");
      timerRef.current = setTimeout(async () => {
        try {
          await saver(data);
          setStatus("saved");
          onSaved?.();
          idleTimer.current = setTimeout(() => setStatus("idle"), 2000);
        } catch {
          setStatus("error");
        }
      }, delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saver, delay]
  );

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      clearTimeout(idleTimer.current);
    },
    []
  );

  return { schedule, status };
}

export function AutoSaveIndicator({ status }: { status: AutoSaveStatus }) {
  if (status === "idle") return null;
  const map = {
    saving: { text: "Salvando...", cls: "text-gray-400" },
    saved:  { text: "✓ Salvo",    cls: "text-green-600" },
    error:  { text: "✗ Erro ao salvar", cls: "text-red-500" },
  } as const;
  const { text, cls } = map[status];
  return <span className={`text-xs font-medium ${cls}`}>{text}</span>;
}
