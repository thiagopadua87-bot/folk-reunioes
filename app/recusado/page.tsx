import LogoFolk from "@/app/components/LogoFolk";
import LogoutButton from "@/app/components/LogoutButton";

export default function RecusadoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[--background] px-4">
      <div className="mb-8">
        <LogoFolk />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
        <div className="mb-4 text-5xl">🚫</div>
        <h1 className="mb-3 text-xl font-bold text-red-800">Acesso negado</h1>
        <p className="text-sm text-red-700 leading-relaxed">
          O seu cadastro não foi aprovado. Entre em contato com o administrador caso acredite que isso seja um erro.
        </p>

        <div className="mt-8">
          <LogoutButton className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100" />
        </div>
      </div>
    </div>
  );
}
