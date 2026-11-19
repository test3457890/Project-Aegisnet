import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useMockAppState } from "../../state/mockAppState";
import { logQaEvent } from "../../qa/qaEvents";
import {
  loadSafetySettings,
  NetworkSafetySettings,
  saveSafetySettings,
  loadRestrictedSettings,
  NetworkRestrictedSettings,
  saveRestrictedSettings,
} from "../../state/networkPrototypeSettings";
import { NetworkProtectedCommunicationsEditor } from "./NetworkProtectedCommunicationsEditor";

export function NetworkSafetyTab({ network, isOwner }: { network: any; isOwner: boolean }) {
  const { me, isBackendConnected } = useMockAppState();
  const [settings, setSettings] = useState<NetworkSafetySettings>(() => loadSafetySettings(network.id));

  const update = (key: keyof NetworkSafetySettings, value: boolean | NetworkSafetySettings["verificationLevel"]) => {
    const next = { ...settings, [key]: value } as NetworkSafetySettings;
    setSettings(next);
    saveSafetySettings(network.id, next);
    logQaEvent({
      type: "network.safety.setting.changed",
      userId: me.id,
      networkId: network.id,
      reason: `${key}:${String(value)}`,
      success: true,
    });
  };

  const [restrictedSettings, setRestrictedSettings] = useState<NetworkRestrictedSettings>(() => loadRestrictedSettings(network.id));

  const updateRestricted = (key: keyof NetworkRestrictedSettings, value: boolean) => {
    const next = { ...restrictedSettings, [key]: value } as NetworkRestrictedSettings;
    setRestrictedSettings(next);
    saveRestrictedSettings(network.id, next);
    logQaEvent({
      type: "network.restricted.setting.changed",
      userId: me.id,
      networkId: network.id,
      reason: `${key}:${String(value)}`,
      success: true,
    });
  };

  const Toggle = ({ id, title, body, checked, disabled, onChange }: { id: string; title: string; body: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) => (
    <label className={`flex items-center justify-between gap-4 rounded-xl border border-border-default bg-surface-card p-4 ${disabled ? "opacity-60" : ""}`}>
      <span>
        <span className="block text-sm font-bold text-text-primary">{title}</span>
        <span className="block text-xs leading-relaxed text-text-muted">{body}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || !isOwner}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 accent-[var(--accent-primary)]"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
        <ShieldCheck size={18} className="text-accent-primary" />
        Safety Setup
      </h2>

      <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-text-secondary">
        <strong>Local-only prototype settings:</strong> these switches are saved in this browser and
        shape the prototype UI. They are not production moderation or production security, and they
        are not enforced by the backend. Attachment safety is the exception below.
      </p>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-text-primary mt-4">Restricted Access (OPSEC Controls)</h3>
        <p className="text-xs text-text-muted mb-2">Prototype UI filtering only. Backend authorization is planned but not enforced for these toggles.</p>
        <Toggle
          id="isRestricted"
          title="Enable Restricted Network Mode"
          body="Visual label marking this network as OPSEC-restricted."
          checked={restrictedSettings.isRestricted}
          onChange={(c) => updateRestricted("isRestricted", c)}
        />
        <Toggle
          id="hideFromNonMembers"
          title="Hide from non-members"
          body="Hides this network from public discovery lists. Local UI filtering."
          checked={restrictedSettings.hideFromNonMembers}
          onChange={(c) => updateRestricted("hideFromNonMembers", c)}
        />
        <Toggle
          id="hideMemberList"
          title="Hide member list from non-admins"
          body="Normal members will not see the complete roster. Local UI filtering."
          checked={restrictedSettings.hideMemberList}
          onChange={(c) => updateRestricted("hideMemberList", c)}
        />

        <div className="mt-8 mb-4 border-t border-border-default pt-6">
          <NetworkProtectedCommunicationsEditor network={network} isOwner={isOwner} />
        </div>

        <h3 className="text-sm font-bold text-text-primary mt-6 pt-4 border-t border-border-default">Standard Safety</h3>
        
        <Toggle
          id="requireJoinApproval"
          title="Require approval for new members"
          body="New join applications wait in Members → Pending for manual review. Manual verification, local-only."
          checked={settings.requireJoinApproval}
          onChange={(c) => update("requireJoinApproval", c)}
        />
        <Toggle
          id="showMembersInRoomList"
          title="Show members in Room list"
          body="Display the member panel next to Room conversations. Local display preference."
          checked={settings.showMembersInRoomList}
          onChange={(c) => update("showMembersInRoomList", c)}
        />
        <Toggle
          id="inviteRequireApproval"
          title="Invite safety: invited people need approval"
          body="Invites created on the Invites tab default to requiring join approval. Local-only label."
          checked={settings.inviteRequireApproval}
          onChange={(c) => update("inviteRequireApproval", c)}
        />
        <Toggle
          id="botApprovalRequired"
          title="Bot approval required"
          body="Only the owner can add prototype bots. Real bots do not execute yet either way."
          checked={settings.botApprovalRequired}
          onChange={(c) => update("botApprovalRequired", c)}
        />
        <Toggle
          id="attachmentSafetyStrict"
          title="Attachment safety"
          body={isBackendConnected
            ? "Backend-backed: the local API already rejects executables, scripts, HTML, and SVG uploads."
            : "Backend-backed when connected: the local API rejects executables, scripts, HTML, and SVG uploads. Currently offline — frontend checks still apply."}
          checked={settings.attachmentSafetyStrict}
          onChange={(c) => update("attachmentSafetyStrict", c)}
        />

        <div className="rounded-xl border border-border-default bg-surface-card p-4">
          <label className="block text-sm font-bold text-text-primary" htmlFor="verification-level">Verification level</label>
          <p className="mt-0.5 text-xs text-text-muted">How new members are screened. Only manual review exists in this prototype.</p>
          <select
            id="verification-level"
            value={settings.verificationLevel}
            disabled={!isOwner}
            onChange={(event) => update("verificationLevel", event.target.value as NetworkSafetySettings["verificationLevel"])}
            className="mt-2 w-full max-w-xs rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary"
          >
            <option value="none">None — anyone with an invite joins</option>
            <option value="manual-review">Manual review (prototype)</option>
          </select>
        </div>

        <div className="rounded-xl border border-border-default bg-surface-card p-4 opacity-60">
          <p className="text-sm font-bold text-text-primary">Two-person approval for destructive moderator actions</p>
          <p className="mt-0.5 text-xs text-text-muted">Planned future setting — not implemented.</p>
        </div>

        <div className="rounded-xl border border-border-default bg-surface-card p-4 opacity-60">
          <p className="text-sm font-bold text-text-primary">Sensitive content filter</p>
          <p className="mt-0.5 text-xs text-text-muted">Placeholder — no automated content scanning exists in this prototype.</p>
        </div>

        <div className="rounded-xl border border-success/25 bg-success/5 p-4">
          <p className="text-sm font-bold text-text-primary">AegisNet Guard status</p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
            {isBackendConnected
              ? "Backend-backed: the prototype backend gateway screens requests for path traversal, oversized payloads, and dangerous upload types."
              : "The prototype backend gateway (AegisNet Guard) screens requests when the backend is connected. Currently in browser-local fallback."}
            {" "}This is prototype hardening, not production security.
          </p>
        </div>
      </div>

      {!isOwner && (
        <p className="text-xs text-text-muted">Only the Network owner can change these settings.</p>
      )}
    </div>
  );
}
