"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function FolkIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="9" fill="#F05A28" />
      <path d="M10 10h16v4H14v4h10v4H14v8h-4V10z" fill="white" />
    </svg>
  );
}

export default function HomePage() {
  const [nome, setNome] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("nome").eq("id", user.id).single()
        .then(({ data }) => { if (data?.nome) setNome(data.nome); });
    });
  }, []);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const dataFormatada = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 lg:min-h-screen">
      <div className="text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <FolkIcon />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          {nome ? `${saudacao}, ${nome}` : saudacao}
        </h1>
        <p className="mt-2 text-sm capitalize text-gray-400">{dataFormatada}</p>
        <p className="mt-6 text-sm text-gray-400">
          Selecione um módulo no menu lateral para começar.
        </p>
      </div>
    </main>
  );
}
