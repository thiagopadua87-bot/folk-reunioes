import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith("https://")) {
  throw new Error(
    `[Supabase] NEXT_PUBLIC_SUPABASE_URL inválida: "${supabaseUrl}". ` +
      "Verifique o arquivo .env.local e reinicie o servidor."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY não definida. " +
      "Verifique o arquivo .env.local e reinicie o servidor."
  );
}

// ── Métricas de diagnóstico ───────────────────────────────────
// Armazenadas em localStorage com chave por data (folk_metrics_YYYY-MM-DD).
// Para ler no console do browser: window.__folkMetrics()
// Eventos rastreados: fetch_timeout | fetch_lento | fetch_erro | sessao_renovada
//                     sessao_invalida | sessao_encerrada

type MetricKey =
  | "fetch_timeout"
  | "fetch_lento"
  | "fetch_erro"
  | "sessao_renovada"
  | "sessao_invalida"
  | "sessao_encerrada";

function storageKey(): string {
  return `folk_metrics_${new Date().toISOString().slice(0, 10)}`;
}

export function registrarMetrica(evento: MetricKey): void {
  if (typeof window === "undefined") return;
  try {
    const key = storageKey();
    const raw = localStorage.getItem(key);
    const data: Record<string, number> = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    data[evento] = (data[evento] ?? 0) + 1;
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* localStorage indisponível */ }
}

function exposeMetrics(): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>).__folkMetrics = () => {
    const hoje = storageKey();
    const raw = localStorage.getItem(hoje);
    const data: Record<string, number> = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    console.table({ data: hoje.replace("folk_metrics_", ""), ...data });
    return data;
  };
}

if (typeof window !== "undefined") exposeMetrics();

// ── Fetch com timeout ─────────────────────────────────────────
// 30 segundos — qualquer chamada que ultrapasse isso indica rede travada ou
// sessão inválida. Garante que `finally { setCarregando(false) }` sempre dispare.

const FETCH_TIMEOUT_MS = 30_000;
const SLOW_LOG_THRESHOLD_MS = 5_000;

function sanitizeUrl(url: RequestInfo | URL): string {
  return url.toString().replace(/https?:\/\/[^/]+/, "").split("?")[0];
}

function fetchWithTimeout(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();

  const id = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  // Propaga sinal externo caso o chamador já use AbortController
  if (init?.signal) {
    init.signal.addEventListener("abort", () => controller.abort(init.signal!.reason), { once: true });
  }

  return fetch(url, { ...init, signal: controller.signal })
    .then((res) => {
      const ms = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - start);
      if (ms > SLOW_LOG_THRESHOLD_MS) {
        console.warn("[Folk] Requisição lenta:", { endpoint: sanitizeUrl(url), ms });
        registrarMetrica("fetch_lento");
      }
      return res;
    })
    .catch((err: unknown) => {
      if (timedOut) {
        console.warn("[Folk] Timeout de requisição (30s):", sanitizeUrl(url));
        registrarMetrica("fetch_timeout");
        throw new Error("Tempo limite excedido. Verifique sua conexão e tente novamente.");
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("aborted")) {
        console.warn("[Folk] Erro de rede:", { endpoint: sanitizeUrl(url), erro: msg });
        registrarMetrica("fetch_erro");
      }
      throw err;
    })
    .finally(() => clearTimeout(id));
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
});
