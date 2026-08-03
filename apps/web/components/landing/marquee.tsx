const ITEMS = [
  "No lock-in",
  "Named reviewer",
  "On-time close guarantee",
  "Your data is yours",
  "No auto-renewal traps",
  "Human sign-off, every close",
  "Books that survive anything",
];

export function Marquee() {
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div
      className="overflow-hidden border-y border-line bg-cream-light py-5"
      aria-label="What Kept stands for"
    >
      <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap">
        {loop.map((item, i) => (
          <span key={i} className="flex items-center gap-10" aria-hidden={i >= ITEMS.length}>
            <span className="font-display text-2xl text-ink">{item}</span>
            <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  );
}
