type BrandMarkProps = {
  className?: string;
  size?: number;
  title?: string;
};

/** Favicon-aligned hang tag + check + sparkle mark */
export function BrandMark({
  className = "",
  size = 32,
  title = "フリマリスト Sold",
}: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <rect width="64" height="64" rx="12" fill="#001F3F" />
      {/* Hang tag */}
      <path
        d="M32 10 L48 22 V50 C48 52.2 46.2 54 44 54 H20 C17.8 54 16 52.2 16 50 V22 L32 10 Z"
        fill="#FFFFFF"
        stroke="#D4AF37"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Hole */}
      <circle cx="32" cy="24" r="3.2" fill="#001F3F" stroke="#D4AF37" strokeWidth="2" />
      {/* Check */}
      <path
        d="M24 36.5 L29.2 41.5 L41 28.5"
        stroke="#D4AF37"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sparkles */}
      <path
        d="M12 20 L13.2 23.2 L16.4 24.4 L13.2 25.6 L12 28.8 L10.8 25.6 L7.6 24.4 L10.8 23.2 Z"
        fill="#D4AF37"
      />
      <path
        d="M52 16 L53 19 L56 20 L53 21 L52 24 L51 21 L48 20 L51 19 Z"
        fill="#D4AF37"
      />
      <path
        d="M54 34 L54.7 36 L56.7 36.7 L54.7 37.4 L54 39.4 L53.3 37.4 L51.3 36.7 L53.3 36 Z"
        fill="#D4AF37"
      />
    </svg>
  );
}
