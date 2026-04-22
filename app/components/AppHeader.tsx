"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import LogoFolk from "./LogoFolk";
import LogoutButton from "./LogoutButton";
import { supabase } from "@/lib/supabase";

const NAV_BASE = [
  { label: "Início",       href: "/" },
  { label: "Comercial",    href: "/comercial" },
  { label: "Projetos",     href: "/projetos" },
  { label: "Operacional",  href: "/operacional" },
  { label: "Cadastros",    href: "/cadastros" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setIsAdmin(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navItems = isAdmin
    ? [...NAV_BASE, { label: "Admin", href: "/admin" }]
    : NAV_BASE;

  const isAuthPage = ["/login", "/signup", "/pendente", "/recusado"].includes(pathname);
  const isTVPage = pathname === "/comercial/tv";
  if (isAuthPage || isTVPage) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <LogoFolk />

        <nav className="flex items-center gap-1">
          {navItems.map(({ label, href }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-folk/10 text-folk"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                }`}
              >
                {label}
              </Link>
            );
          })}

          {user && (
            <div className="ml-3 flex items-center gap-3 border-l border-gray-200 pl-3">
              <span className="hidden max-w-[160px] truncate text-xs text-gray-400 sm:block">
                {user.email}
              </span>
              <LogoutButton />
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
