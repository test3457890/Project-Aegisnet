import { X } from "lucide-react";
import { useEffect } from "react";

/**
 * Full-screen image preview for shared media.
 * Closes on Escape, the close button, or clicking outside the image.
 * Image contents are never logged — callers may log a metadata-only QA event.
 */
export function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      role="presentation"
      data-testid="image-lightbox"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        className="relative flex max-h-full flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close image preview"
          className="absolute -top-3 -right-3 z-10 rounded-full border border-border-default bg-surface-card p-2 text-text-primary shadow-lg hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          <X size={18} />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-h-[82vh] max-w-[90vw] rounded-2xl border border-border-default object-contain shadow-2xl"
        />
        <p className="mt-3 max-w-md truncate text-xs font-bold text-white/80">{alt}</p>
        <p className="text-[11px] text-white/60">Esc or click outside to close</p>
      </div>
    </div>
  );
}
