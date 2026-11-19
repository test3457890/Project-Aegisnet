import { FormEvent, useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";

/**
 * Local convenience lock for Lockdown Mode.
 *
 * Honest scope: this hides the screen behind a local PIN. It is NOT encryption and
 * NOT account security. It does not protect data from anyone with device access and
 * technical skill — it guards against casual over-the-shoulder viewing only.
 */
export function LockScreen() {
  const { unlockApp } = useMockAppState();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (unlockApp(pin)) {
      setPin("");
      setError("");
    } else {
      setError("That PIN did not match. Try again.");
      setPin("");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App locked"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background-primary/95 p-6 backdrop-blur-xl"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border-default bg-surface-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
          <Lock size={30} />
        </div>
        <h1 className="text-xl font-bold text-text-primary">AegisNet is locked</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Enter your local PIN to return to the app.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label htmlFor="lock-pin" className="sr-only">Local unlock PIN</label>
          <input
            id="lock-pin"
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="Enter PIN"
            className="w-full rounded-xl border border-border-default bg-background-secondary px-4 py-3 text-center text-lg tracking-[0.4em] text-text-primary focus:border-accent-primary focus:outline-none"
          />
          {error && (
            <p role="alert" className="text-xs font-medium text-danger-readable">{error}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-accent-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-secondary"
          >
            Unlock
          </button>
        </form>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-900/30 bg-amber-900/10 p-3 text-left">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-[11px] leading-relaxed text-text-muted">
            This is a local convenience lock, not encryption. It hides the screen from casual viewing
            and does not protect your data if the device itself is compromised.
          </p>
        </div>
      </div>
    </div>
  );
}
