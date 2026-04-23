import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

/**
 * Fullscreen focus-image viewer. Closes on the X button (upper left), the
 * ESC key, or clicking the dark backdrop. The image itself uses
 * `object-contain` so it scales to fit the viewport while preserving its
 * aspect ratio. Renders nothing when `src` is null.
 */
export function FocusImageViewer({ src, alt = "Focus image", onClose }: Props) {
  useEffect(() => {
    if (!src) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    // Lock body scroll while open so the page doesn't scroll behind the modal.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center animate-bloom"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          // Prevent the backdrop click handler from also firing.
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close focus image (Esc)"
        title="Close (Esc)"
        className="absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <X className="h-5 w-5" />
      </button>

      <img
        src={src}
        alt={alt}
        // The wrapper centers the image; object-contain keeps proportions
        // intact while filling as much of the viewport as possible.
        className="max-h-screen max-w-screen w-auto h-auto object-contain select-none"
        draggable={false}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
