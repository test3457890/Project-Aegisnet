import { Smile, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useMockAppState } from "../../state/mockAppState";
import { logQaEvent } from "../../qa/qaEvents";
import {
  EMOJI_ACCEPTED_TYPES,
  EMOJI_BLOCKED_HINT,
  EMOJI_MAX_SLOTS,
  loadEmoji,
  NetworkEmoji,
  saveEmoji,
  validateEmojiFile,
} from "../../state/networkPrototypeSettings";

export function NetworkEmojiTab({ network, isOwner }: { network: any; isOwner: boolean }) {
  const { me } = useMockAppState();
  const [emoji, setEmoji] = useState<NetworkEmoji[]>(() => loadEmoji(network.id));
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const persist = (next: NetworkEmoji[]) => {
    setEmoji(next);
    saveEmoji(network.id, next);
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    setError("");

    const verdict = validateEmojiFile(file);
    if (!verdict.ok) {
      logQaEvent({ type: "network.emoji.rejected", userId: me.id, networkId: network.id, success: false, reason: verdict.reason });
      setError(
        verdict.reason === "blocked-file-type"
          ? "That file type is blocked for safety. SVG, HTML, scripts, and executables are not allowed."
          : verdict.reason === "too-large"
            ? "Emoji images must be 512 KB or smaller."
            : "Unsupported file type. Use PNG, JPG, WebP, or GIF.",
      );
      return;
    }
    if (emoji.length >= EMOJI_MAX_SLOTS) {
      setError(`All ${EMOJI_MAX_SLOTS} custom emoji slots are used. Delete one to upload another.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_]/gi, "_").toLowerCase() || "emoji";
      const item: NetworkEmoji = {
        id: `emoji_${Date.now()}`,
        name: baseName.slice(0, 24),
        dataUrl,
        uploadedBy: me.name,
        uploadedAt: new Date().toISOString(),
      };
      persist([item, ...emoji]);
      logQaEvent({ type: "network.emoji.uploaded", userId: me.id, networkId: network.id, success: true });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
        <Smile size={18} className="text-accent-primary" />
        Network Emoji &amp; Stickers
      </h2>

      <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-text-secondary">
        <strong>Local-only prototype:</strong> custom emoji are stored in this browser and are not
        synced to other members yet. {EMOJI_BLOCKED_HINT}
      </p>

      {isOwner && (
        <div className="rounded-2xl border border-dashed border-border-default bg-surface-card p-6 text-center">
          <Upload size={22} className="mx-auto mb-2 text-text-muted" />
          <p className="text-sm font-bold text-text-primary">Upload a custom emoji</p>
          <p className="mt-1 text-xs text-text-muted">
            Accepted: PNG, JPG, WebP, GIF (max 512 KB). Blocked: SVG, HTML, scripts, executables.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 rounded-xl bg-accent-primary px-5 py-2 text-sm font-bold text-white hover:bg-accent-hover"
          >
            Choose image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={EMOJI_ACCEPTED_TYPES.join(",")}
            onChange={handleFile}
            className="hidden"
            aria-label="Upload emoji image"
          />
          {error && <p role="alert" className="mt-3 text-xs font-bold text-danger">{error}</p>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">Custom emoji</h3>
        <span className="text-xs font-bold text-text-muted">{emoji.length} / {EMOJI_MAX_SLOTS} slots used</span>
      </div>

      {emoji.length === 0 ? (
        <p className="rounded-2xl border border-border-default bg-surface-card p-6 text-center text-sm text-text-secondary">
          No custom emoji yet. {isOwner ? "Upload one above to try the prototype." : "The Network owner can upload emoji here."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {emoji.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-card p-3">
              <img src={item.dataUrl} alt={`Custom emoji ${item.name}`} className="h-10 w-10 rounded-lg object-contain bg-background-secondary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text-primary">:{item.name}:</p>
                <p className="truncate text-xs text-text-muted">By {item.uploadedBy} · {new Date(item.uploadedAt).toLocaleDateString()}</p>
              </div>
              {isOwner && (
                confirmDeleteId === item.id ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => { persist(emoji.filter((entry) => entry.id !== item.id)); setConfirmDeleteId(null); logQaEvent({ type: "network.emoji.removed", userId: me.id, networkId: network.id, success: true }); }}
                      className="rounded-lg bg-danger px-2.5 py-1 text-[11px] font-bold text-white"
                    >
                      Delete
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-border-default px-2.5 py-1 text-[11px] font-bold text-text-secondary">
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(item.id)}
                    aria-label={`Delete emoji ${item.name}`}
                    className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-text-muted">
        Stickers are planned. Using custom emoji inside the message composer is a follow-up — uploads here prove out safe file handling first.
      </p>
    </div>
  );
}
