export default function LogoFolk() {
  return (
    <div className="flex items-center gap-3">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="9" fill="#F05A28" />
        <path
          d="M10 10h16v4H14v4h10v4H14v8h-4V10z"
          fill="white"
        />
      </svg>
      <div className="leading-tight">
        <div className="text-base font-bold tracking-tight text-gray-900">Folk</div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-folk">
          Portaria Remota
        </div>
      </div>
    </div>
  );
}
