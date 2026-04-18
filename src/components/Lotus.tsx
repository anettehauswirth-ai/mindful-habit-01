import lotus from "@/assets/lotus.png";

type Props = {
  size?: number;
  className?: string;
  alt?: string;
  glow?: boolean;
};

export function Lotus({ size = 32, className = "", alt = "Lotus", glow = false }: Props) {
  return (
    <img
      src={lotus}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={className}
      style={{
        filter: glow
          ? "drop-shadow(0 0 8px oklch(0.82 0.12 85 / 0.6))"
          : "drop-shadow(0 2px 6px oklch(0 0 0 / 0.4))",
      }}
    />
  );
}
