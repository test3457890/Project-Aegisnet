import { Download, ImageOff } from "lucide-react";
import { useEffect, useState } from "react";
import { MockMessage } from "../../data/mockChats";
import { downloadPrototypeFile, getPrototypeFile } from "../../storage/prototypeFileStore";
import { API_URL } from "../../api/client";
import { ImageLightbox } from "../ui/ImageLightbox";
import { logQaEvent } from "../../qa/qaEvents";

type Attachment = NonNullable<MockMessage["attachment"]>;

export function StoredMediaPreview({
  attachment,
  className,
  expandable = false,
}: {
  attachment: Attachment;
  className?: string;
  /** When true, clicking the image opens a full-size lightbox preview. */
  expandable?: boolean;
}) {
  const [url, setUrl] = useState(attachment.url);
  const [missing, setMissing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setUrl(attachment.url);
    setMissing(false);

    if (attachment.storageScope === "api-local" && attachment.safeUrl && !attachment.url) {
      setUrl(`${API_URL}${attachment.safeUrl}`);
      return;
    }

    if (attachment.url || !attachment.storageId) return;

    let active = true;
    let objectUrl = "";
    getPrototypeFile(attachment.storageId)
      .then((file) => {
        if (!active || !file) {
          if (active) setMissing(true);
          return;
        }
        objectUrl = URL.createObjectURL(file.blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setMissing(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.storageId, attachment.url]);

  if (!url) {
    return (
      <div className={`flex min-h-28 items-center justify-center rounded-xl bg-background-primary/20 px-4 py-6 text-center text-xs font-semibold ${className || ""}`}>
        <div>
          <ImageOff size={22} className="mx-auto mb-2 opacity-70" />
          {missing || attachment.storageId
            ? "Media data is no longer available in this browser."
            : "Media preview is unavailable after local storage cleanup."}
        </div>
      </div>
    );
  }

  const alt = attachment.name || "Shared media";
  const { preferences } = useMockAppState();
  const blurClass = preferences.lowBandwidthMode ? " blur-md" : "";

  if (!expandable) {
    return <img src={url} alt={alt} className={(className || "") + blurClass} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLightboxOpen(true);
          // Metadata only — never the image contents.
          logQaEvent({ type: "image.preview.opened", success: true });
        }}
        aria-label={`Open larger preview of ${alt}`}
        className="block cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-xl"
      >
        <img src={url} alt={alt} className={(className || "") + blurClass} />
      </button>
      {lightboxOpen && <ImageLightbox src={url} alt={alt} onClose={() => setLightboxOpen(false)} />}
    </>
  );
}

export function PrototypeDownloadButton({
  attachment,
  compact = false,
}: {
  attachment: { storageId?: string; name?: string; storageScope?: string; safeUrl?: string; };
  compact?: boolean;
}) {
  const [status, setStatus] = useState("");

  if (!attachment.storageId && !attachment.safeUrl) {
    return <span className="text-[10px] opacity-65">Metadata only</span>;
  }

  const handleDownload = async () => {
    try {
      if (attachment.storageScope === "api-local" && attachment.safeUrl) {
        setStatus("Downloading...");
        const link = document.createElement("a");
        link.href = `${API_URL}${attachment.safeUrl}`;
        link.download = attachment.name || "aegisnet-file";
        link.target = "_blank";
        link.click();
        setStatus("Downloaded");
        window.setTimeout(() => setStatus(""), 1200);
        return;
      }

      setStatus("Preparing...");
      await downloadPrototypeFile(attachment.storageId!, attachment.name || "aegisnet-file");
      setStatus("Downloaded");
      window.setTimeout(() => setStatus(""), 1200);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "This local file is unavailable.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={`rounded-lg border border-current/20 font-bold hover:bg-current/10 flex items-center justify-center gap-1.5 ${compact ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-xs"}`}
      title={status || "Download local file"}
    >
      <Download size={compact ? 12 : 15} />
      {status || "Download"}
    </button>
  );
}
