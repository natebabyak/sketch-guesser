export function SketchGuesser({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 2 2" className={className}>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="25%" stopColor="#fff" />
          <stop offset="75%" stopColor="#7d7dff" />
        </linearGradient>
      </defs>
      <path
        d="M 0 1 C 0 1, 1 1, 1 0 C 1 0, 1 1, 2 1 C 2 1, 1 1, 1 2 C 1 2, 1 1, 0 1"
        fill="url(#gradient)"
      />
    </svg>
  );
}
