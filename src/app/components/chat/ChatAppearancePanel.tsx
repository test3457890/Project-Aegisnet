import { Paintbrush, RotateCcw } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";
import {
  bubbleStyle,
  CHAT_COLOR_PRESETS,
  CHAT_WALLPAPER_PRESETS,
  isCustomized,
  wallpaperStyle,
} from "../../state/chatAppearance";
import { logQaEvent } from "../../qa/qaEvents";
import { storePrototypeFile, deletePrototypeFile } from "../../storage/prototypeFileStore";
import { useWallpaperUrl } from "../../hooks/useWallpaperUrl";
import { useState, useRef } from "react";

/**
 * Per-chat color and wallpaper customization — LOCAL-ONLY prototype.
 * Curated presets only (no uploads), so readability and privacy stay safe.
 */
export function ChatAppearancePanel({ targetId }: { targetId: string }) {
  const { me, chatAppearance, updateChatAppearance, resetChatAppearance } = useMockAppState();
  const appearance = chatAppearance[targetId];
  const customUrl = useWallpaperUrl(appearance?.customWallpaperHash);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickColor = (colorId: string) => {
    updateChatAppearance(targetId, { colorId });
    logQaEvent({
      type: colorId === "default" ? "chat.color.reset" : "chat.color.changed",
      userId: me.id,
      reason: `color:${colorId}`,
      success: true,
    });
  };

  const pickWallpaper = (wallpaperId: string) => {
    updateChatAppearance(targetId, { wallpaperId });
    logQaEvent({
      type: wallpaperId === "none" ? "chat.wallpaper.reset" : "chat.wallpaper.changed",
      userId: me.id,
      reason: `wallpaper:${wallpaperId}`,
      success: true,
    });
  };

  const handleResetAll = async () => {
    if (appearance?.customWallpaperHash) {
      await deletePrototypeFile(appearance.customWallpaperHash).catch(() => {});
    }
    resetChatAppearance(targetId);
    logQaEvent({ type: "chat.color.reset", userId: me.id, reason: "reset-all", success: true });
    logQaEvent({ type: "chat.wallpaper.reset", userId: me.id, reason: "reset-all", success: true });
  };

  const handleCustomUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check type locally
    if (!file.type.startsWith("image/")) {
      alert("Only images are allowed for wallpapers.");
      return;
    }
    
    setIsUploading(true);
    try {
      if (appearance?.customWallpaperHash) {
        await deletePrototypeFile(appearance.customWallpaperHash).catch(() => {});
      }
      const hash = await storePrototypeFile(file);
      updateChatAppearance(targetId, { customWallpaperHash: hash, wallpaperId: "none" });
      logQaEvent({
        type: "chat.wallpaper.custom_uploaded",
        userId: me.id,
        success: true,
      });
    } catch (err) {
      alert("Failed to save wallpaper locally.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section>
      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
        <Paintbrush size={14} />
        Chat appearance
      </h4>

      {/* Live preview */}
      <div
        className="mb-3 rounded-xl border border-border-default bg-background-primary p-3"
        style={wallpaperStyle(appearance, () => customUrl)}
        aria-hidden="true"
      >
        <div className="flex flex-col gap-1.5">
          <div className="max-w-[75%] self-start rounded-2xl rounded-bl-sm border border-border-default bg-surface-card px-3 py-1.5 text-xs text-text-primary">
            Preview message
          </div>
          <div
            className="max-w-[75%] self-end rounded-2xl rounded-br-sm bg-accent-secondary px-3 py-1.5 text-xs text-white"
            style={bubbleStyle(appearance)}
          >
            Your reply
          </div>
        </div>
      </div>

      <p className="mb-1.5 text-[11px] font-bold text-text-secondary">Your message color</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {CHAT_COLOR_PRESETS.map((preset) => {
          const selected = (appearance?.colorId ?? "default") === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => pickColor(preset.id)}
              title={preset.label}
              aria-label={`Message color: ${preset.label}`}
              aria-pressed={selected}
              className={`h-8 w-8 rounded-full border border-border-default transition-transform ${selected ? "ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-card scale-110" : "hover:scale-105"}`}
              style={{ backgroundColor: preset.bubble || "var(--accent-secondary)" }}
            />
          );
        })}
      </div>

      <p className="mb-1.5 text-[11px] font-bold text-text-secondary">Wallpaper</p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {CHAT_WALLPAPER_PRESETS.map((preset) => {
          const selected = (appearance?.wallpaperId ?? "none") === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => pickWallpaper(preset.id)}
              aria-label={`Wallpaper: ${preset.label}`}
              aria-pressed={selected}
              className={`flex h-14 items-end justify-center rounded-xl border bg-background-primary p-1 text-[10px] font-bold transition-colors ${selected ? "border-accent-primary text-accent-readable" : "border-border-default text-text-muted hover:border-accent-primary/50"}`}
              style={{ backgroundImage: preset.backgroundImage, backgroundSize: preset.backgroundSize }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="mb-3">
        <p className="mb-1.5 text-[11px] font-bold text-text-secondary">Custom Wallpaper (Local Storage)</p>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleCustomUpload}
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-border-default bg-surface-card px-3 py-2 text-xs font-bold text-text-primary hover:bg-surface-hover"
          >
            {isUploading ? "Saving..." : "Upload local image"}
          </button>
          {appearance?.customWallpaperHash && (
            <button
              type="button"
              className="text-xs text-danger-readable hover:underline"
              onClick={async () => {
                await deletePrototypeFile(appearance.customWallpaperHash!);
                updateChatAppearance(targetId, { customWallpaperHash: undefined });
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <label className="mb-3 flex items-center justify-between gap-3 text-xs font-semibold text-text-primary">
        <span>Dim wallpaper (keeps dark themes readable)</span>
        <input
          type="checkbox"
          checked={Boolean(appearance?.dimWallpaper)}
          onChange={(event) => updateChatAppearance(targetId, { dimWallpaper: event.target.checked })}
          className="h-4 w-4 accent-[var(--accent-primary)]"
        />
      </label>

      {isCustomized(appearance) && (
        <button
          type="button"
          onClick={handleResetAll}
          className="mb-2 flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-hover"
        >
          <RotateCcw size={13} />
          Reset to theme default
        </button>
      )}

      <p className="text-[10px] leading-relaxed text-text-muted">
        Local-only: appearance applies on this device and is not shared with other people.
        Custom images are saved safely in your browser's local database and do not sync to the backend.
      </p>
    </section>
  );
}
