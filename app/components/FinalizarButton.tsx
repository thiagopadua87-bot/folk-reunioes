"use client";

interface FinalizarButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

export default function FinalizarButton({ onClick, loading, disabled }: FinalizarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`w-full rounded-2xl px-6 py-4 text-base font-semibold text-white shadow-md transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${loading ? "bg-folk-dark" : "bg-folk-gradient"}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Salvando...
        </span>
      ) : (
        "Finalizar Reunião"
      )}
    </button>
  );
}
