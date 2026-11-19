import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";
import { logQaEvent } from "../../qa/qaEvents";
import {
  loadProtectedSettings,
  saveProtectedSettings,
  NetworkProtectedSettings,
} from "../../state/networkPrototypeSettings";
import { PROTECTED_CATEGORIES, SUPERVISOR_ROLES } from "../../data/protectedRoles";

export function NetworkProtectedCommunicationsEditor({ network, isOwner }: { network: any; isOwner: boolean }) {
  const { me } = useMockAppState();
  const [settings, setSettings] = useState<NetworkProtectedSettings>(() => loadProtectedSettings(network.id));

  const update = <K extends keyof NetworkProtectedSettings>(key: K, value: NetworkProtectedSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveProtectedSettings(network.id, next);
    logQaEvent({
      type: "network.safety.setting.changed",
      userId: me.id,
      networkId: network.id,
      reason: `protected_${key}:${String(value).slice(0, 30)}`,
      success: true,
    });
  };

  const Toggle = ({ id, title, body, checked, disabled, onChange }: { id: string; title: string; body: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) => (
    <label className={`flex items-start justify-between gap-4 rounded-xl border border-border-default bg-surface-card p-4 ${disabled ? "opacity-60" : ""}`}>
      <span>
        <span className="block text-sm font-bold text-text-primary">{title}</span>
        <span className="block text-xs leading-relaxed text-text-muted mt-1">{body}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || !isOwner}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent-primary)]"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
        <h3 className="text-sm font-bold text-warning-readable flex items-center gap-2">
          <ShieldAlert size={16} />
          Protected Communications Prototype
        </h3>
        <p className="text-xs leading-relaxed text-text-secondary">
          Protected Communications is a prototype policy-control feature. It helps Networks model supervised communication rules, but it is <strong>not a legal compliance system</strong>, production safety guarantee, or substitute for official policy review. It does not enforce COPPA, FERPA, HIPAA, or HR laws.
        </p>
      </div>

      <Toggle
        id="protectedEnabled"
        title="Enable Protected Communications"
        body="Activates supervised messaging, warnings, and policy enforcement for selected member categories."
        checked={settings.enabled}
        onChange={(c) => update("enabled", c)}
      />

      {settings.enabled && (
        <div className="space-y-4 rounded-xl border border-border-default p-4 bg-background-secondary/50">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-text-primary">Policy Template</label>
            <p className="text-xs text-text-muted">Select a preset template or use Custom to configure your own rules.</p>
            <select
              value={settings.template}
              disabled={!isOwner}
              onChange={(e) => update("template", e.target.value as any)}
              className="w-full rounded-xl border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary focus:outline-none"
            >
              <option value="youth">Youth Programs (Cadets, Scouts)</option>
              <option value="school">School / University (Students)</option>
              <option value="intern">Internship / Trainee Program</option>
              <option value="corporate">Corporate (Junior Staff)</option>
              <option value="volunteer">Volunteer Group</option>
              <option value="custom">Custom Policy</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-text-primary">Messaging Policy Mode</label>
            <select
              value={settings.mode}
              disabled={!isOwner}
              onChange={(e) => update("mode", e.target.value as any)}
              className="w-full rounded-xl border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary focus:outline-none"
            >
              <option value="off">Off (No restrictions)</option>
              <option value="warning-only">Warning Only (Informational banners)</option>
              <option value="require-second-person">Require Second Person (Any adult/supervisor)</option>
              <option value="require-supervisor">Require Designated Supervisor</option>
              <option value="convert-to-supervised-thread">Convert DMs to Supervised Threads</option>
              <option value="block">Block Private Messaging Entirely</option>
              <option value="custom">Custom Sequential Rules</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-text-primary">Protected Categories</label>
            <p className="text-xs text-text-muted">Select which categories fall under this policy.</p>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-border-default bg-surface-card p-2 space-y-1">
              {PROTECTED_CATEGORIES.map(cat => (
                <label key={cat.id} className="flex items-center gap-2 px-2 py-1 hover:bg-surface-hover rounded">
                  <input
                    type="checkbox"
                    checked={settings.protectedCategories.includes(cat.id)}
                    disabled={!isOwner}
                    onChange={(e) => {
                      const next = e.target.checked 
                        ? [...settings.protectedCategories, cat.id]
                        : settings.protectedCategories.filter(id => id !== cat.id);
                      update("protectedCategories", next);
                    }}
                    className="accent-primary"
                  />
                  <span className="text-sm text-text-primary">{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-text-primary">Supervisor / Reviewer Roles</label>
            <p className="text-xs text-text-muted">Select which roles act as supervisors.</p>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-border-default bg-surface-card p-2 space-y-1">
              {SUPERVISOR_ROLES.map(role => (
                <label key={role.id} className="flex items-center gap-2 px-2 py-1 hover:bg-surface-hover rounded">
                  <input
                    type="checkbox"
                    checked={settings.supervisorRoles.includes(role.id)}
                    disabled={!isOwner}
                    onChange={(e) => {
                      const next = e.target.checked 
                        ? [...settings.supervisorRoles, role.id]
                        : settings.supervisorRoles.filter(id => id !== role.id);
                      update("supervisorRoles", next);
                    }}
                    className="accent-primary"
                  />
                  <span className="text-sm text-text-primary">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
