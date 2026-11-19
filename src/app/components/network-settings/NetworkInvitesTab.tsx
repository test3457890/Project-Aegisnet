import { Check, Copy, Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMockAppState } from "../../state/mockAppState";
import { loadSafetySettings } from "../../state/networkPrototypeSettings";

const EXPIRY_OPTIONS = ["Never", "24 hours", "7 days", "30 days"];

export function NetworkInvitesTab({ network, isOwner }: { network: any; isOwner: boolean }) {
  const { invitations, createInvitation, revokeInvitation } = useMockAppState();
  const safety = loadSafetySettings(network.id);

  const [expiresLabel, setExpiresLabel] = useState("7 days");
  const [maxUses, setMaxUses] = useState<number>(0);
  const [requireApproval, setRequireApproval] = useState(safety.inviteRequireApproval);
  const [onboardingQuestions, setOnboardingQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const networkInvites = invitations.filter(
    (invitation) => invitation.targetType === "network" && invitation.targetId === network.id,
  );

  const inviteLink = (code: string) => `aegisnet://invite/${code}`;

  const handleCreate = () => {
    createInvitation("network", network.id, {
      expiresLabel,
      maxUses: maxUses || undefined,
      requireApproval,
      onboardingQuestions: onboardingQuestions.length > 0 ? onboardingQuestions : undefined,
    });
  };

  const handleCopy = (invitationId: string, code: string) => {
    navigator.clipboard.writeText(inviteLink(code));
    setCopiedId(invitationId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
        <LinkIcon size={18} className="text-accent-primary" />
        Invite to Network
      </h2>

      <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-text-secondary">
        <strong>Local-only prototype:</strong> invite codes are generated and stored in this browser.
        There is no remote delivery — share codes manually, and redeem them with “Join Network.”
        <br/><br/>
        <strong className="text-success">Backend-backed:</strong> Expiration and max-use values are enforced by the backend.
      </p>

      {isOwner && (
        <div className="space-y-4 rounded-2xl border border-border-default bg-surface-card p-5">
          <h3 className="text-sm font-bold text-text-primary">Create an invite</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-text-muted" htmlFor="invite-expiry">Expiration (Backend-backed)</label>
              <select
                id="invite-expiry"
                value={expiresLabel}
                onChange={(event) => setExpiresLabel(event.target.value)}
                className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary"
              >
                {EXPIRY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-text-muted" htmlFor="invite-max-uses">Max uses (0 = unlimited, Backend-backed)</label>
              <input
                id="invite-max-uses"
                type="number"
                min={0}
                max={100}
                value={maxUses}
                onChange={(event) => setMaxUses(Math.max(0, Number(event.target.value) || 0))}
                className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(event) => setRequireApproval(event.target.checked)}
            />
            Require approval — invited people wait in Members → Pending
          </label>
          {!requireApproval && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-2.5 text-xs font-semibold text-danger">
              Bypass approval is on: anyone with this invite would skip manual review. Use carefully.
            </p>
          )}

          {requireApproval && (
            <div className="space-y-3 pt-3 border-t border-border-default">
              <div>
                <h4 className="text-sm font-bold text-text-primary">Onboarding Questions</h4>
                <p className="text-xs text-text-muted mt-0.5">Require users to answer questions when joining.</p>
              </div>
              <p className="rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-[11px] leading-relaxed text-warning">
                <strong>Warning:</strong> Invite onboarding questions help Network admins review requests. They do not verify legal identity, age, employment, background check status, clearance, or organization membership. Do not request sensitive information unless you have a valid policy reason.
              </p>
              
              <div className="space-y-2">
                {onboardingQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 bg-background-secondary px-3 py-2 rounded-xl text-sm border border-border-default">
                    <span className="flex-1 min-w-0 truncate">{q}</span>
                    <button 
                      onClick={() => setOnboardingQuestions(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-text-muted hover:text-danger shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="e.g. Why do you need access?"
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newQuestion.trim()) {
                      e.preventDefault();
                      setOnboardingQuestions(prev => [...prev, newQuestion.trim()]);
                      setNewQuestion("");
                    }
                  }}
                  className="flex-1 rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
                <button
                  onClick={() => {
                    if (newQuestion.trim()) {
                      setOnboardingQuestions(prev => [...prev, newQuestion.trim()]);
                      setNewQuestion("");
                    }
                  }}
                  disabled={!newQuestion.trim()}
                  className="rounded-xl bg-surface-hover px-3 py-2 text-sm font-bold text-text-primary hover:bg-surface-selected disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 rounded-xl bg-accent-primary px-5 py-2 text-sm font-bold text-white hover:bg-accent-hover"
            >
              <Plus size={15} /> Generate invite
            </button>
          </div>
        </div>
      )}

      <h3 className="text-sm font-bold text-text-primary">Active invites</h3>
      {networkInvites.length === 0 ? (
        <p className="rounded-2xl border border-border-default bg-surface-card p-6 text-center text-sm text-text-secondary">
          No active invites for this Network. {isOwner ? "Generate one above." : "Ask the owner for an invite code."}
        </p>
      ) : (
        <ul className="space-y-2">
          {networkInvites.map((invitation) => (
            <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-surface-card p-4">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-bold text-text-primary">{inviteLink(invitation.code)}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Created {new Date(invitation.createdAt).toLocaleDateString()}
                  {invitation.expiresLabel && ` · Expires: ${invitation.expiresLabel}`}
                  {invitation.maxUses ? ` · Max uses: ${invitation.maxUses}` : " · Unlimited uses"}
                  {invitation.onboardingQuestions?.length ? ` · ${invitation.onboardingQuestions.length} Questions` : ""}
                  {invitation.requireApproval === false && <span className="ml-1 font-bold text-danger"> · Bypasses approval</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => handleCopy(invitation.id, invitation.code)}
                  className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-hover"
                >
                  {copiedId === invitation.id ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === invitation.id ? "Copied" : "Copy"}
                </button>
                {isOwner && (
                  confirmRevokeId === invitation.id ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-danger">Revoke?</span>
                      <button
                        onClick={() => { revokeInvitation(invitation.id); setConfirmRevokeId(null); }}
                        className="rounded-lg bg-danger px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        Yes
                      </button>
                      <button onClick={() => setConfirmRevokeId(null)} className="rounded-lg border border-border-default px-2.5 py-1 text-[11px] font-bold text-text-secondary">
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmRevokeId(invitation.id)}
                      aria-label="Revoke invite"
                      className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
