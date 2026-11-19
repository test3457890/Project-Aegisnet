import { X, FileText, Download } from "lucide-react";
import { useEffect } from "react";
import { MockMessage } from "../../data/mockChats";
import { formatBytes } from "../../utils/files";
import { PrototypeDownloadButton } from "../chat/StoredAttachment";

interface MediaLightboxProps {
  attachment: NonNullable<MockMessage["attachment"]>;
  onClose: () => void;
}

export function MediaLightbox({ attachment, onClose }: MediaLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media Lightbox"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close lightbox"
        className="absolute right-4 top-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-accent-primary"
      >
        <X size={24} />
      </button>

      <div
        className="relative max-h-full max-w-full overflow-hidden flex flex-col items-center justify-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {(attachment.type === "image" || attachment.type === "gif") ? (
          <img
            src={attachment.url}
            alt={attachment.name || "Preview"}
            className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-surface-card p-8 shadow-2xl">
            <div className="mb-4 h-20 w-20 flex items-center justify-center rounded-2xl bg-background-primary/30">
              <FileText size={40} className="text-accent-primary" />
            </div>
            <p className="text-lg font-bold text-text-primary">{attachment.name || "Attached file"}</p>
            <p className="mt-1 text-sm text-text-muted">{attachment.mimeType || "File"} • {formatBytes(attachment.size || 0)}</p>
            <div className="mt-6">
              <PrototypeDownloadButton attachment={attachment} />
            </div>
          </div>
        )}
        
        {attachment.name && (attachment.type === "image" || attachment.type === "gif") && (
          <div className="absolute bottom-4 left-4 rounded-xl bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-md flex items-center gap-3">
            <span className="max-w-[200px] sm:max-w-md truncate font-medium">{attachment.name}</span>
            {attachment.size && <span className="text-xs opacity-70">{formatBytes(attachment.size)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
