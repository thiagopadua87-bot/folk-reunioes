"use client";

import { usePathname } from "next/navigation";

const AUTH_PATHS = ["/login", "/signup", "/pendente", "/recusado", "/comercial/tv"];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noSidebar = AUTH_PATHS.includes(pathname);

  return (
    <div className={noSidebar ? "" : "pt-14 lg:pt-0 lg:pl-[220px]"}>
      {children}
    </div>
  );
}
