import { Eye, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { MockUser } from "../../data/mockUsers";
import { useMockAppState } from "../../state/mockAppState";
import { logQaEvent } from "../../qa/qaEvents";

interface AvatarLightboxProps {
  user: MockUser;
  /** The avatar element to render as the clickable trigger. */
  children: ReactNode;
  className?: string;
}

/**
 * Click-to-expand profile photo preview.
 * - Closes on Escape, the close button, or clicking outside the image.
 * - Falls back to large initials when no photo is set.
 * - In Lockdown Mode the photo is tap-to-reveal (matches the existing privacy pattern).
 * - Photo contents are never logged; only a metadata QA event is recorded.
 */
export function AvatarLightbox({ user, children, className }: AvatarLightboxProps) {
  const { privacyMode, me, preferences } = useMockAppState();
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const lockdownMasked = privacyMode === "lockdown" && !revealed;
  const lowBandwidth = preferences.lowBandwidthMode;

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleOpen = () => {
    setRevealed(false);
    setOpen(true);
    logQaEvent({
      type: "avatar.preview.opened",
      userId: me.id,
      targetUserId: user.id,
      success: true,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`View larger profile photo for ${user.name}`}
        className={`cursor-zoom-in rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary ${className ?? ""}`}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
          data-testid="avatar-lightbox"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Profile photo for ${user.name}`}
            className="relative flex flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close photo preview"
              className="absolute -top-3 -right-3 z-10 rounded-full border border-border-default bg-surface-card p-2 text-text-primary shadow-lg hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <X size={18} />
            </button>

            {lockdownMasked ? (
              <button
                onClick={() => setRevealed(true)}
                className="flex h-72 w-72 flex-col items-center justify-center gap-3 rounded-3xl border border-border-default bg-surface-card text-text-secondary hover:bg-surface-hover sm:h-80 sm:w-80"
              >
                <Eye size={28} />
                <span className="text-sm font-bold">Lockdown Mode — tap to reveal photo</span>
                <span className="max-w-[220px] text-xs text-text-muted">
                  Previews are hidden while Lockdown is active.
                </span>
              </button>
            ) : user.profilePictureUrl && !lowBandwidth ? (
              <img
                src={user.profilePictureUrl}
                alt={`Profile photo of ${user.name}`}
                className="max-h-[70vh] max-w-[85vw] rounded-3xl border border-border-default object-contain shadow-2xl sm:max-w-md"
              />
            ) : (
              <div
                aria-label={`No photo set for ${user.name} — showing initials`}
                className={`flex h-72 w-72 items-center justify-center rounded-3xl text-7xl font-black text-white shadow-2xl sm:h-80 sm:w-80 ${user.avatarColor || "bg-indigo-600"}`}
              >
                {user.initials || user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="mt-3 text-sm font-bold text-white">{user.name}</p>
            <p className="text-xs text-white/70">Esc or click outside to close</p>
          </div>
        </div>
      )}
    </>
  );
}
