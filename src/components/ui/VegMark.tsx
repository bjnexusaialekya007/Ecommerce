export function VegMark({ veg }: { veg: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      role="img"
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
      className="shrink-0"
    >
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="2"
        fill="none"
        stroke={veg ? 'var(--veg)' : 'var(--nonveg)'}
        strokeWidth="1.75"
      />
      {veg ? (
        <circle cx="8" cy="8" r="4" fill="var(--veg)" />
      ) : (
        <polygon points="8,3.5 12.5,12 3.5,12" fill="var(--nonveg)" />
      )}
    </svg>
  );
}
