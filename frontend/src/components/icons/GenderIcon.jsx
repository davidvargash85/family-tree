/**
 * Mars (♂) and Venus (♀) symbols as SVG.
 * Use when lucide-react does not provide Mars/Venus (e.g. before 0.475).
 */

export function GenderIcon({ variant, size = 18 }) {
  const s = size;
  if (variant === "male") {
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="10" cy="6" r="4" />
        <path d="M14 14l6-6M20 8v6h-6" />
      </svg>
    );
  }
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="6" r="4" />
      <path d="M12 10v8M8 14h8" />
    </svg>
  );
}
