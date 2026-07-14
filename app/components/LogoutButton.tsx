"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const [saindo, setSaindo] = useState(false);

  async function handleLogout() {
    if (saindo) return;
    setSaindo(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignora erro de rede — sessão local já foi limpa
    }
    // Redireciona via window.location para garantir reload completo e limpar estado
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      disabled={saindo}
      className={className ?? "rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-folk/30 hover:text-folk disabled:opacity-50"}
    >
      {saindo ? "Saindo..." : "Sair"}
    </button>
  );
}
