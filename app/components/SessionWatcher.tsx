"use client";

import { useEffect } from "react";
import { supabase, registrarMetrica } from "@/lib/supabase";

const AUTH_PATHS = new Set(["/login", "/signup", "/pendente", "/recusado", "/inativo"]);

// Throttle: evita chamadas repetidas em eventos rápidos (ex: focus + visibilitychange juntos)
let lastCheckAt = 0;
const CHECK_THROTTLE_MS = 30_000; // no máximo uma verificação a cada 30 segundos

// IMPORTANTE: não chamamos refreshSession() aqui.
// O Supabase auto-refresh cuida da renovação via timer interno.
// Chamar refreshSession() adquire o Navigator LockManager — o mesmo lock que
// cada query ao banco precisa para obter o token. Fazê-lo fire-and-forget pode
// bloquear todas as queries por até 30 segundos (tempo do fetchWithTimeout).
async function checkSession(): Promise<void> {
  const now = Date.now();
  if (now - lastCheckAt < CHECK_THROTTLE_MS) {
    console.log("[SessionWatcher] verificação suprimida por throttle");
    return;
  }
  lastCheckAt = now;

  if (AUTH_PATHS.has(window.location.pathname)) return;

  console.log("[SessionWatcher] getSession iniciado");
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log("[SessionWatcher] getSession concluído —", {
      hasSession: !!session,
      expiresIn: session?.expires_at
        ? session.expires_at - Math.floor(Date.now() / 1000) + "s"
        : "—",
      error: error?.message ?? null,
    });

    if (!session) {
      console.warn("[SessionWatcher] sessão inválida — redirecionando para /login");
      registrarMetrica("sessao_invalida");
      window.location.href = "/login";
    }
    // Não chamamos refreshSession() — o auto-refresh do Supabase é responsável por isso.
    // Chamar refreshSession() aqui adquiriria o Navigator Lock e bloquearia queries do banco.
  } catch (err) {
    console.warn("[SessionWatcher] getSession lançou exceção:", err);
    // Falha silenciosa — o próximo evento tentará novamente
  }
  console.log("[SessionWatcher] terminou");
}

export default function SessionWatcher() {
  // Redireciona imediatamente quando o Supabase encerra a sessão
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[SessionWatcher] onAuthStateChange —", { event, hasSession: !!session });
      if (event === "SIGNED_OUT" && !AUTH_PATHS.has(window.location.pathname)) {
        console.warn("[SessionWatcher] SIGNED_OUT detectado — redirecionando para /login");
        registrarMetrica("sessao_encerrada");
        window.location.href = "/login";
      }
      if (event === "TOKEN_REFRESHED") {
        console.log("[SessionWatcher] TOKEN_REFRESHED — sessão renovada automaticamente");
        registrarMetrica("sessao_renovada");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Verifica sessão ao retornar à aba ou reconectar a rede.
  // O evento "focus" foi REMOVIDO intencionalmente: dispara com demasiada frequência
  // (ex: clique no endereço do browser) e cada disparo adquire o Navigator Lock,
  // concorrendo com as queries do banco.
  useEffect(() => {
    function onVisible() {
      console.log("[SessionWatcher] visibility:", document.visibilityState);
      if (document.visibilityState === "visible") checkSession();
    }
    function onOnline() {
      console.log("[SessionWatcher] online");
      checkSession();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
