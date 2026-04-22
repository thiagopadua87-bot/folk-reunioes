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

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
