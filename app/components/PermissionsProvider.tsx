"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchUserPermissions,
  FULL_ACCESS,
  type PermissionsMap,
  type ScreenKey,
  type ScreenPermission,
} from "@/lib/permissions";

// ── Contexto ──────────────────────────────────────────────────

interface PermissionsContextValue {
  isAdmin:  boolean;
  loading:  boolean;
  perm:     (key: ScreenKey) => ScreenPermission;
  reload:   () => void;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  isAdmin: false,
  loading: true,
  perm:    () => FULL_ACCESS,
  reload:  () => {},
});

// ── Hooks públicos ────────────────────────────────────────────

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function usePermission(key: ScreenKey): ScreenPermission {
  return useContext(PermissionsContext).perm(key);
}

// ── Provider ──────────────────────────────────────────────────

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [isAdmin, setIsAdmin]         = useState(false);
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); setPermissions({}); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        setIsAdmin(true);
        setPermissions({});
        return;
      }

      setIsAdmin(false);
      setPermissions(await fetchUserPermissions(user.id));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, [load]);

  function perm(key: ScreenKey): ScreenPermission {
    if (isAdmin) return FULL_ACCESS;
    // Sem registro = acesso total (padrão liberado)
    return permissions[key] ?? FULL_ACCESS;
  }

  return (
    <PermissionsContext.Provider value={{ isAdmin, loading, perm, reload: load }}>
      {children}
    </PermissionsContext.Provider>
  );
}

// ── Tela de acesso negado ─────────────────────────────────────

export function AccessDenied() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="text-4xl">🔒</p>
        <p className="mt-3 text-base font-semibold text-gray-700">Acesso restrito</p>
        <p className="mt-1 text-sm text-gray-400">
          Você não tem permissão para visualizar esta tela.
        </p>
      </div>
    </div>
  );
}
