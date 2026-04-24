"use client";

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// ── Tipos ────────────────────────────────────────────────────

interface UnsavedChangesCtx {
  isDirty: boolean;
  markDirty: () => void;
  markClean: () => void;
  guardCancel: (onConfirm: () => void) => void;
  guardNavigate: (href: string) => void;
}

// ── Contexto ─────────────────────────────────────────────────

const Ctx = createContext<UnsavedChangesCtx>({
  isDirty: false,
  markDirty: () => {},
  markClean: () => {},
  guardCancel: (fn) => fn(),
  guardNavigate: () => {},
});

export function useUnsavedChanges() {
  return useContext(Ctx);
}

// ── Provider ─────────────────────────────────────────────────

interface Pending { action: () => void }

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [pending, setPending]  = useState<Pending | null>(null);
  const router = useRouter();

  const markDirty = useCallback(() => setIsDirty(true), []);
  const markClean = useCallback(() => setIsDirty(false), []);

  // Intercepta saída do navegador (F5, fechar aba, URL manual)
  useEffect(() => {
    function handle(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [isDirty]);

  const guardCancel = useCallback((onConfirm: () => void) => {
    if (!isDirty) { onConfirm(); return; }
    setPending({ action: onConfirm });
  }, [isDirty]);

  const guardNavigate = useCallback((href: string) => {
    if (!isDirty) { router.push(href); return; }
    setPending({ action: () => router.push(href) });
  }, [isDirty, router]);

  function handleConfirm() {
    setIsDirty(false);
    pending?.action();
    setPending(null);
  }

  function handleDismiss() {
    setPending(null);
  }

  return (
    <Ctx.Provider value={{ isDirty, markDirty, markClean, guardCancel, guardNavigate }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={handleDismiss}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900">
              Você tem alterações não salvas
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Deseja sair sem salvar ou continuar editando?
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={handleDismiss}
                className="rounded-2xl bg-folk-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
              >
                Continuar editando
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300"
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
