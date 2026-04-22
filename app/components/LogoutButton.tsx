"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className={className ?? "rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-folk/30 hover:text-folk"}
    >
      Sair
    </button>
  );
}
