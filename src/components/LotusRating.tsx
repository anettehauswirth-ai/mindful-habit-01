import { useState } from "react";
import { Lotus } from "@/components/Lotus";

type Props = {
  /** Current rating: 1-5 or null (unrated). */
  value: number | null;
  /** Called with the next rating. Click the current rating again to clear. */
  onChange: (next: number | null) => void;
  /** Render without click handlers or hover preview. */
  readOnly?: boolean;
  /** Diameter of each lotus icon. */
  size?: number;
  /** Accessible label for the group (e.g. "Rate this mantra"). */
  ariaLabel?: string;
};

/**
 * 5-lotus rating widget. Each petal lights up when its position ≤ current (or
 * hovered) rating. Click a lit lotus at the current rating to clear it. The
 * group is keyboard-focusable and announces itself as a radio group.
 */
export function LotusRating({
  value,
  onChange,
  readOnly = false,
  size = 20,
  ariaLabel = "Rating",
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  // Preview hovered rating if interactive, otherwise show the stored value.
  const display = !readOnly && hover !== null ? hover : (value ?? 0);

  return (
    <div
      role={readOnly ? "img" : "radiogroup"}
      aria-label={
        readOnly ? `${ariaLabel}: ${value ?? "unrated"}` : ariaLabel
      }
      className="inline-flex items-center gap-1"
      onMouseLeave={() => !readOnly && setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const lit = n <= display;
        if (readOnly) {
          return (
            <span
              key={n}
              className={lit ? "" : "opacity-25"}
              aria-hidden="true"
            >
              <Lotus size={size} glow={lit} />
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} lotus${n === 1 ? "" : "es"}`}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            onClick={() => onChange(value === n ? null : n)}
            className={`transition-opacity duration-150 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              lit ? "opacity-100" : "opacity-30 hover:opacity-60"
            }`}
          >
            <Lotus size={size} glow={lit} />
          </button>
        );
      })}
    </div>
  );
}
