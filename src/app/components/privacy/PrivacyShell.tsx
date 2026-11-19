import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { EyeOff, Shield, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import { useMockAppState } from "../../state/mockAppState";
import { hidesPreviews } from "../../utils/privacy";

/**
 * Renders the always-on privacy posture chip plus the "blur when you switch away"
 * obscure overlay used by Shield and Lockdown modes. All behaviour is local and
 * cosmetic — it hides content from casual viewing and makes no security claims.
 */
export function PrivacyShell({ hideChip = false }: { hideChip?: boolean }) {
  const { privacyMode, lockPinSet, lockApp } = useMockAppState();
  const [windowHidden, setWindowHidden] = useState(false);
  const [manualObscure, setManualObscure] = useState(false);

  const active = hidesPreviews(privacyMode);

  useEffect(() => {
    if (!active) {
      setWindowHidden(false);
      return;
    }
    const onBlur = () => setWindowHidden(true);
    const onFocus = () => setWindowHidden(false);
    const onVisibility = () => setWindowHidden(document.visibilityState === "hidden");

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  // Leaving a preview-hiding mode should drop any lingering manual obscure.
  useEffect(() => {
    if (!active) setManualObscure(false);
  }, [active]);

  const obscured = active && (windowHidden || manualObscure);

  const hideNow = () => {
    // In Lockdown with a PIN, the panic action engages the full lock screen.
    if (privacyMode === "lockdown" && lockPinSet) {
      lockApp();
      return;
    }
    setManualObscure(true);
  };

  return (
    <>
      {active && !hideChip && (
        <div className="pointer-events-none fixed bottom-20 right-4 z-[120] flex flex-col items-end gap-2 md:bottom-4">
          <NavLink
            to="/app/settings"
            className={clsx(
              "pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-lg backdrop-blur",
              privacyMode === "lockdown"
                ? "border-amber-500/40 bg-amber-900/30 text-amber-300"
                : "border-accent-primary/40 bg-accent-primary/15 text-accent-readable",
            )}
            title="Privacy posture — open settings"
          >
            {privacyMode === "lockdown" ? <ShieldAlert size={13} /> : <Shield size={13} />}
            {privacyMode === "lockdown" ? "Lockdown" : "Shield"}
          </NavLink>
          <button
            type="button"
            onClick={hideNow}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border-default bg-surface-card px-3 py-1.5 text-[11px] font-bold text-text-secondary shadow-lg backdrop-blur hover:text-text-primary"
            title="Hide the screen now"
          >
            <EyeOff size={13} /> Hide now
          </button>
        </div>
      )}

      {obscured && (
        <div
          className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-4 bg-background-primary/90 backdrop-blur-2xl"
          role="status"
          aria-label="Screen hidden for privacy"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
            <EyeOff size={30} />
          </div>
          <p className="text-sm font-bold text-text-primary">Hidden for privacy</p>
          <p className="max-w-xs px-6 text-center text-xs text-text-muted">
            Previews are hidden while {privacyMode === "lockdown" ? "Lockdown" : "Shield"} Mode is on.
          </p>
          <button
            type="button"
            onClick={() => setManualObscure(false)}
            className="rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-secondary"
          >
            Show content
          </button>
        </div>
      )}
    </>
  );
}
