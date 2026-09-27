interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: 'w-7 h-7', icon: 14, text: 'text-base' },
  md: { box: 'w-8 h-8', icon: 17, text: 'text-lg' },
  lg: { box: 'w-10 h-10', icon: 22, text: 'text-xl' },
};

export function Logo({ size = 'md', showWordmark = true, className = '' }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className={`${s.box} relative flex items-center justify-center rounded-lg bg-ink-900 shadow-sm ring-1 ring-white/10`}>
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-teal-400"
        >
          <path
            d="M12 2L3 7V12C3 17.52 6.84 22.14 12 23C17.16 22.14 21 17.52 21 12V7L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />
          <path
            d="M9 12L11 14L15 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-teal-400 ring-2 ring-ink-900" />
      </div>
      {showWordmark && (
        <span className={`font-semibold tracking-tight text-ink-900 ${s.text}`}>
          Manak<span className="text-teal-600">Setu</span>
        </span>
      )}
    </div>
  );
}
