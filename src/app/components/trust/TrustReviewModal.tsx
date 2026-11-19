import { ShieldCheck, ShieldQuestion, X } from "lucide-react";
import { useEffect, useState } from "react";
import { MockUser } from "../../data/mockUsers";
import { useMockAppState } from "../../state/mockAppState";
import {
  PLANNED_TRUST_LEVELS,
  TRUST_LEVELS,
  TRUST_PROTOTYPE_WARNING,
  TrustLevel,
} from "../../state/trust";

interface TrustReviewModalProps {
  user: MockUser;
  open: boolean;
  onClose: () => void;
}

/**
 * Trust Review — local prototype only.
 * Lets the user pick a trust level and add a private local note.
 * Makes NO claims of cryptographic, device, government, or organization verification.
 */
export function TrustReviewModal({ user, open, onClose }: TrustReviewModalProps) {
  const { trustedContacts, setTrustLevel, removeTrustedContact } = useMockAppState();
  const record = trustedContacts[user.id];

  const [level, setLevel] = useState<TrustLevel>(record?.level ?? "known");
  const [reason, setReason] = useState(record?.reason ?? "");
  const [note, setNote] = useState(record?.note ?? "");
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (open) {
      setLevel(record?.level ?? "known");
      setReason(record?.reason ?? "");
      setNote(record?.note ?? "");
      setConfirmRemove(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user.id]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    setTrustLevel(user.id, level, { reason, note });
    onClose();
  };

  const handleRemove = () => {
    removeTrustedContact(user.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Review trust for ${user.name}`}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-clean rounded-2xl border border-border-default bg-surface-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <ShieldQuestion size={19} className="text-accent-primary" />
            Review Trust — {user.name}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close trust review"
            className="rounded-full p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-text-secondary">
            <p className="font-bold text-text-primary mb-1">What Trusted Contact means here</p>
            <p>{TRUST_PROTOTYPE_WARNING}</p>
            <p className="mt-2">
              It does <strong>not</strong> mean cryptographic identity verification, device trust,
              government ID checks, or organization-issued verification. Those are planned future
              work and are not implemented.
            </p>
          </div>

          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              Trust level (local-only)
            </legend>
            <div className="space-y-2">
              {TRUST_LEVELS.map((info) => (
                <label
                  key={info.level}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    level === info.level
                      ? "border-accent-primary bg-accent-primary/10"
                      : "border-border-default bg-background-secondary hover:bg-surface-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name="trust-level"
                    value={info.level}
                    checked={level === info.level}
                    onChange={() => setLevel(info.level)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-bold text-text-primary">{info.label}</span>
                    <span className="block text-xs text-text-secondary">{info.description}</span>
                  </span>
                </label>
              ))}
              {PLANNED_TRUST_LEVELS.map((planned) => (
                <div
                  key={planned.level}
                  className="flex items-start gap-3 rounded-xl border border-border-default bg-background-secondary p-3 opacity-50"
                  aria-disabled="true"
                >
                  <input type="radio" disabled className="mt-1" />
                  <span className="text-sm font-bold text-text-muted">{planned.label}</span>
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1" htmlFor="trust-reason">
              Why do you trust this person? (short reason, local-only)
            </label>
            <input
              id="trust-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. family, neighbor, met at work"
              maxLength={80}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1" htmlFor="trust-note">
              Private note (stored on this device only — never shared, logged, or exported)
            </label>
            <textarea
              id="trust-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional — e.g. verified in person at the June meetup"
              maxLength={300}
              className="min-h-[70px] w-full resize-none rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          {record && (
            <div className="rounded-xl bg-background-secondary p-3 text-xs text-text-secondary space-y-1">
              <p>Marked trusted by: <span className="font-bold text-text-primary">You</span></p>
              <p>First trusted: {new Date(record.trustedAt).toLocaleDateString()}</p>
              <p>Last reviewed: {new Date(record.lastReviewedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default px-5 py-4">
          {record ? (
            confirmRemove ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-danger">Remove trust label?</span>
                <button
                  onClick={handleRemove}
                  className="rounded-lg bg-danger px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                >
                  Yes, remove
                </button>
                <button
                  onClick={() => setConfirmRemove(false)}
                  className="rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-hover"
                >
                  Keep
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRemove(true)}
                className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10"
              >
                Remove Trusted Contact
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-border-default px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-2 text-sm font-bold text-white hover:bg-accent-hover"
            >
              <ShieldCheck size={15} />
              Save trust level
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
