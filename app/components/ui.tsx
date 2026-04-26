import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={`border-b border-gray-100 px-6 py-4${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

interface AlertProps {
  status: "success" | "error" | "warning";
  message: string;
}

export function Alert({ status, message }: AlertProps) {
  const cls =
    status === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "warning"
      ? "border-yellow-200 bg-yellow-50 text-yellow-700"
      : "border-red-200 bg-red-50 text-red-700";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${cls}`}>
      {message}
    </div>
  );
}
