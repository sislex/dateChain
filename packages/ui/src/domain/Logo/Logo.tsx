export interface LogoProps {
  size?: number;
  title?: string;
}

/** Flame logo mark with the brand gradient. */
export function Logo({ size = 40, title = "dateChain" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="dc-flame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FD267A" />
          <stop offset="100%" stopColor="#FF6036" />
        </linearGradient>
      </defs>
      <path
        fill="url(#dc-flame)"
        d="M12 2c1 3-1 4.5-2.5 6C8 9.5 7 11 7 13a5 5 0 0 0 10 0c0-2-1-3.5-2-5 2 1 3 3 3 5a6 6 0 0 1-12 0c0-4 3-6 6-11z"
      />
    </svg>
  );
}
