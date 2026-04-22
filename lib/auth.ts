import { supabase } from "./supabase";

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
