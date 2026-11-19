import { FileText, Image as ImageIcon, Paperclip, Send, Smile, X, Radio, Mic, Sticker, ShieldAlert } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { MockMessage } from "../../data/mockChats";
import { useMockAppState } from "../../state/mockAppState";
import { deletePrototypeFile, storePrototypeFile } from "../../storage/prototypeFileStore";
import { MediaLightbox } from "../ui/MediaLightbox";
import {
  createMockGifAttachment,
  formatBytes,
  getFileExtension,
  IMAGE_EXTENSIONS,
  readFileAsDataUrl,
  SUPPORTED_EXTENSIONS,
  validatePrototypeFile,
} from "../../utils/files";
import { createDocumentThumbnail } from "../../utils/documentThumbnail";
import { wsClient } from "../../api/wsClient";
import { logQaEvent } from "../../qa/qaEvents";
import { evaluateDirectMessagePolicy } from "../../state/protectedPolicy";
import { loadProtectedSettings } from "../../state/networkPrototypeSettings";

function getTopicForTarget(targetId: string) {
  const roomMatch = targetId.match(/^network:([^:]+):room:(.+)$/);
  return roomMatch ? `room:${roomMatch[2]}` : `chat:${targetId}`;
}

interface MessageComposerProps {
  targetId: string;
  placeholder?: string;
}

const mockGifs = [
  { label: "ON MY WAY", color: "#2563eb" },
  { label: "SOUNDS GOOD", color: "#059669" },
  { label: "NICE!", color: "#7c3aed" },
  { label: "SEE YOU SOON", color: "#db2777" },
];

export function MessageComposer({ targetId, placeholder = "Write a message..." }: MessageComposerProps) {
  const { sendMessage, drafts, setDraft, isBackendConnected, me } = useMockAppState();
  const [text, setText] = useState(drafts[targetId] || "");
  const [attachment, setAttachment] = useState<MockMessage["attachment"]>();
  const [error, setError] = useState("");
  const [transportMode, setTransportMode] = useState("Auto");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [previewLightbox, setPreviewLightbox] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAttachmentRef = useRef<MockMessage["attachment"]>();
  const typingTimerRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);

  const [policyWarning, setPolicyWarning] = useState<{ title: string; message: string; action: "warn" | "convert" | "block" } | null>(null);

  const canSend = Boolean(text.trim() || attachment);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setAttachment({
        type: "file",
        url: "",
        name: "Voice Note.m4a",
        size: 24500,
        mimeType: "audio/mp4",
      });
    } else {
      setIsRecording(true);
      setError("");
    }
  };

  const selectFile = async (event: ChangeEvent<HTMLInputElement>, imageOnly: boolean) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const looksLikeImage = imageOnly || file.type.startsWith("image/");
    if (looksLikeImage) {
      // Metadata only — never file names or contents.
      logQaEvent({ type: "image.upload.attempted", userId: me.id });
    }

    const validationError = validatePrototypeFile(file, imageOnly);
    if (validationError) {
      setError(validationError);
      if (looksLikeImage) {
        logQaEvent({ type: "image.upload.failed", userId: me.id, success: false, reason: "validation-rejected" });
      }
      return;
    }

    try {
      if (attachment?.storageId) {
        deletePrototypeFile(attachment.storageId).catch(() => undefined);
      }
      const extension = getFileExtension(file.name);
      const isImage = IMAGE_EXTENSIONS.includes(extension as typeof IMAGE_EXTENSIONS[number]);
      const previewUrl = isImage ? await readFileAsDataUrl(file) : "";
      const thumbnailUrl = isImage ? undefined : await createDocumentThumbnail(file);
      let storageId: string | undefined;
      try {
        storageId = await storePrototypeFile(file);
      } catch {
        storageId = undefined;
      }

      setAttachment({
        type: isImage ? (extension === "gif" ? "gif" : "image") : "file",
        url: previewUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type || `application/${extension}`,
        storageId,
        thumbnailUrl,
      });
      setError(storageId ? "" : "The attachment can be sent, but local download storage is unavailable in this browser.");
      setShowGifPicker(false);
      if (isImage) {
        logQaEvent({ type: "image.upload.succeeded", userId: me.id, success: true });
      }
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "The attachment could not be prepared.");
      if (looksLikeImage) {
        logQaEvent({ type: "image.upload.failed", userId: me.id, success: false, reason: "prepare-error" });
      }
    }
  };

  const chooseMockGif = (label: string, color: string) => {
    if (attachment?.storageId) {
      deletePrototypeFile(attachment.storageId).catch(() => undefined);
    }
    setAttachment(createMockGifAttachment(label, color));
    setShowGifPicker(false);
    setError("");
  };

  const { chatList, networks } = useMockAppState();

  const handleSend = () => {
    if (!canSend) return;

    // Protected Communications Check
    const chat = chatList[targetId];
    if (chat && chat.type === "direct") {
      const otherUser = chat.participants.find(id => id !== me.id);
      if (otherUser) {
        const policy = evaluateDirectMessagePolicy(me.id, otherUser, networks, loadProtectedSettings);
        if (policy.action !== "allow" && !policyWarning) {
          setPolicyWarning({
            title: policy.action === "block" ? "Message Blocked" : "Protected Communication Notice",
            message: policy.reason || "This action is restricted by network policy.",
            action: policy.action
          });
          logQaEvent({
            type: "room.access.denied",
            userId: me.id,
            targetUserId: otherUser,
            reason: `policy-${policy.action}`,
            success: false,
          });
          return; // Do not send yet, preserve draft text
        }
      }
    }

    if (policyWarning?.action === "block") {
      setPolicyWarning(null); // Just clear the warning if they try again after being blocked
      return; // Still block
    }
    if (policyWarning?.action === "convert") {
      // Future feature: convert DM to supervised thread. For now, we simulate it by allowing it but we would flag the chat.
      // We don't have a way to mutate the chat from here easily without a new context method.
      // So we just allow it for the prototype, and clear the warning.
    }

    sendMessage(targetId, text, attachment);
    if (typingActiveRef.current) {
      wsClient.send("typing:stop", { targetId, userId: me.id }, getTopicForTarget(targetId));
      typingActiveRef.current = false;
    }
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    pendingAttachmentRef.current = undefined;
    setText("");
    setDraft(targetId, "");
    setAttachment(undefined);
    setError("");
    setShowGifPicker(false);
    setPolicyWarning(null);
  };

  useEffect(() => {
    setText(drafts[targetId] || "");
    setAttachment(undefined);
    setError("");
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (typingActiveRef.current) wsClient.send("typing:stop", { targetId, userId: me.id }, getTopicForTarget(targetId));
      typingActiveRef.current = false;
    };
  }, [targetId]);

  useEffect(() => {
    pendingAttachmentRef.current = attachment;
  }, [attachment]);

  useEffect(() => () => {
    const storageId = pendingAttachmentRef.current?.storageId;
    if (storageId) deletePrototypeFile(storageId).catch(() => undefined);
  }, []);

  const insertEmoji = (emoji: string) => {
    handleTextChange(text + emoji);
    setShowEmoji(false);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    setDraft(targetId, value);
    if (!isBackendConnected) return;

    if (!value.trim()) {
      if (typingActiveRef.current) wsClient.send("typing:stop", { targetId, userId: me.id }, getTopicForTarget(targetId));
      typingActiveRef.current = false;
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      return;
    }

    if (!typingActiveRef.current) {
      wsClient.send("typing:start", { targetId, userId: me.id }, getTopicForTarget(targetId));
      typingActiveRef.current = true;
    }
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      wsClient.send("typing:stop", { targetId, userId: me.id }, getTopicForTarget(targetId));
      typingActiveRef.current = false;
    }, 1200);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative space-y-2">
      {showEmoji && (
        <div className="absolute bottom-full left-0 mb-3 w-72 rounded-2xl border border-border-default bg-surface-card p-3 shadow-2xl z-30">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-text-primary">Emoji</p>
            <button type="button" onClick={() => setShowEmoji(false)} className="p-1.5 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary" aria-label="Close emoji picker">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {["😀","😂","😊","😉","😍","😎","🤔","😴","👍","👎","🙏","👏","🙌","💪","🔥","✨","✅","❌","⚠️","❤️","🎉","🚀","📍","📎","🗺️","⛺","🥾","🚗","☀️","🌧️","🆘","🛡️"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="rounded-lg p-1.5 text-lg hover:bg-surface-hover"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {showGifPicker && (
        <div className="absolute bottom-full left-0 mb-3 w-72 rounded-2xl border border-border-default bg-surface-card p-3 shadow-2xl z-30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-text-primary">Local GIF picker</p>
              <p className="text-[11px] text-text-muted">Prototype cards, no external service</p>
            </div>
            <button
              type="button"
              onClick={() => setShowGifPicker(false)}
              className="p-1.5 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary"
              aria-label="Close GIF picker"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {mockGifs.map((gif, index) => (
              <button
                key={gif.label}
                type="button"
                onClick={() => chooseMockGif(gif.label, gif.color)}
                className="relative aspect-video overflow-hidden rounded-xl text-white text-[11px] font-black tracking-wide shadow-sm hover:ring-2 hover:ring-accent-primary"
                style={{ backgroundColor: gif.color }}
              >
                <span
                  className="absolute inset-y-0 w-10 rounded-full bg-white/20 animate-pulse"
                  style={{ left: `${10 + index * 8}%` }}
                />
                <span className="relative">{gif.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {attachment && (
        <div className="flex items-center gap-3 rounded-2xl border border-accent-primary/30 bg-accent-primary/10 p-3">
          {attachment.type === "image" || attachment.type === "gif" ? (
            <>
              <button 
                type="button" 
                onClick={() => setPreviewLightbox(true)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-xl cursor-zoom-in"
              >
                <img
                  src={attachment.url}
                  alt="Attachment preview"
                  className="h-16 w-20 rounded-xl object-cover border border-border-default hover:opacity-90 transition-opacity"
                />
              </button>
              {previewLightbox && <MediaLightbox attachment={attachment} onClose={() => setPreviewLightbox(false)} />}
            </>
          ) : (
            <div className="h-12 w-12 rounded-xl bg-surface-card border border-border-default flex items-center justify-center text-accent-primary">
              <FileText size={22} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text-primary">{attachment.name || "Local GIF"}</p>
            <p className="text-xs text-text-muted">
              {attachment.type.toUpperCase()}
              {attachment.size ? ` • ${formatBytes(attachment.size)}` : " • Prototype media"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (attachment.storageId) {
                deletePrototypeFile(attachment.storageId).catch(() => undefined);
              }
              setAttachment(undefined);
            }}
            className="p-2 rounded-xl text-text-muted hover:text-danger hover:bg-danger/10"
            aria-label="Remove attachment"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger-readable">
          {error}
        </div>
      )}

      {policyWarning && (
        <div className={`rounded-xl border p-4 space-y-3 ${
          policyWarning.action === "block" ? "border-danger/30 bg-danger/10" : "border-amber-500/30 bg-amber-500/10"
        }`}>
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className={policyWarning.action === "block" ? "text-danger-readable" : "text-amber-600 dark:text-amber-400"} />
            <p className={`text-sm font-bold ${policyWarning.action === "block" ? "text-danger-readable" : "text-amber-600 dark:text-amber-400"}`}>
              {policyWarning.title}
            </p>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {policyWarning.message}
          </p>
          {policyWarning.action !== "block" && (
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => {
                  setPolicyWarning(null);
                  handleSend();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600/20 text-amber-700 dark:text-amber-400 hover:bg-amber-600/30"
              >
                Acknowledge & Send
              </button>
              <button
                type="button"
                onClick={() => setPolicyWarning(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:bg-surface-hover"
              >
                Cancel
              </button>
            </div>
          )}
          {policyWarning.action === "block" && (
            <button
              type="button"
              onClick={() => setPolicyWarning(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-danger/20 text-danger-readable hover:bg-danger/30"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
      
      {transportMode.includes("planned") && (
        <div role="alert" className="rounded-xl border border-amber-900/30 bg-amber-900/10 px-3 py-2 text-xs font-medium text-amber-500">
          This transport mode is planned and not active in the current prototype. Falling back to Local/Internet.
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
        className="flex items-end gap-2 rounded-3xl border border-border-default bg-background-secondary p-2 shadow-sm focus-within:ring-2 focus-within:ring-accent-primary/30"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={SUPPORTED_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
          onChange={(event) => selectFile(event, false)}
        />
        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          accept={IMAGE_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
          onChange={(event) => selectFile(event, true)}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 shrink-0 rounded-full text-text-secondary hover:text-accent-primary hover:bg-surface-hover"
          aria-label="Attach file"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>

        <div className="relative group shrink-0 flex items-center pr-1 border-r border-border-default mr-1">
          <select 
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value)}
            className="appearance-none bg-transparent py-2.5 pl-2 pr-6 text-xs font-medium text-text-secondary focus:outline-none hover:text-text-primary cursor-pointer max-w-[80px] truncate"
            title="Select Transport Mode"
          >
            {([
              ["Auto", "Auto Transport"],
              ["Internet", "Internet"],
              ["Local Network", "Local Network"],
              ["Radio Relay planned", "Radio Relay (Planned)"],
              ["Cellular planned", "Cellular (Planned)"],
              ["Satellite planned", "Satellite (Planned)"],
              ["Mesh planned", "Mesh Network (Planned)"],
            ] as const).map(([value, label]) => (
              // Explicit colors so the native dropdown menu is always readable (no white-on-white).
              <option key={value} value={value} style={{ backgroundColor: "var(--surface-card)", color: "var(--text-primary)" }}>{label}</option>
            ))}
          </select>
          <Radio size={14} className="absolute right-1 text-text-muted pointer-events-none" />
        </div>

        <textarea
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none"
          placeholder={placeholder}
          aria-label="Message"
        />

        <button
          type="button"
          onClick={() => { setShowEmoji((open) => !open); setShowGifPicker(false); }}
          className="p-2.5 shrink-0 rounded-full text-text-secondary hover:text-accent-primary hover:bg-surface-hover"
          aria-label="Choose Emoji"
          title="Choose Emoji"
        >
          <Smile size={20} />
        </button>
        <button
          type="button"
          onClick={() => setShowGifPicker((open) => !open)}
          className="p-2.5 shrink-0 rounded-full text-text-secondary hover:text-accent-primary hover:bg-surface-hover"
          aria-label="Choose GIF"
          title="Choose GIF"
        >
          <Sticker size={20} />
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="p-2.5 shrink-0 rounded-full text-text-secondary hover:text-accent-primary hover:bg-surface-hover"
          aria-label="Attach image"
          title="Attach image"
        >
          <ImageIcon size={20} />
        </button>
        <button
          type="button"
          onClick={toggleRecording}
          className={`p-2.5 shrink-0 rounded-full ${isRecording ? "text-danger animate-pulse bg-danger/10" : "text-text-secondary hover:text-accent-primary hover:bg-surface-hover"}`}
          aria-label="Voice Note"
          title="Voice Note"
        >
          <Mic size={20} />
        </button>
        <button
          type="submit"
          disabled={!canSend}
          className="h-10 w-10 shrink-0 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:bg-accent-secondary"
          aria-label="Send message"
          title="Send message"
        >
          <Send size={17} />
        </button>
      </form>
      <p className="px-3 text-[10px] text-text-muted">Enter sends • Shift + Enter adds a new line</p>
    </div>
  );
}
