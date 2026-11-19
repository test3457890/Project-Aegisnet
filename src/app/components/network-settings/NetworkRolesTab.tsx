import { Plus, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMockAppState } from "../../state/mockAppState";
import { logQaEvent } from "../../qa/qaEvents";

/** Permission catalog shown in previews. UI-level only — not backend-enforced. */
export const ROLE_PERMISSIONS = [
  { id: "view_rooms", label: "View Rooms" },
  { id: "send_messages", label: "Send Messages" },
  { id: "manage_rooms", label: "Manage Rooms" },
  { id: "manage_members", label: "Manage Members" },
  { id: "manage_roles", label: "Manage Roles" },
  { id: "manage_invites", label: "Manage Invites" },
  { id: "manage_bots", label: "Manage Bots" },
  { id: "manage_emoji", label: "Manage Emoji" },
  { id: "view_audit_metadata", label: "View Audit Metadata" },
  { id: "use_voice_rooms", label: "Use Voice Rooms" },
  { id: "use_video_rooms", label: "Use Video Rooms" },
  { id: "upload_files", label: "Upload Files" },
  { id: "access_vault", label: "Access Vault" },
];

const ROLE_COLORS = ["#6366f1", "#22c55e", "#eab308", "#ef4444", "#06b6d4", "#ec4899", "#a855f7", "#f97316"];

export function NetworkRolesTab({ network, isOwner }: { network: any; isOwner: boolean }) {
  const { me, createNetworkRole, deleteNetworkRole } = useMockAppState();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(ROLE_COLORS[0]);
  const [permissions, setPermissions] = useState<string[]>(["view_rooms", "send_messages"]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const roles: { id: string; name: string; color: string; permissions: string[] }[] = network.roles || [];
  const memberRoles: Record<string, string[]> = network.memberRoles || {};

  const membersWithRole = (roleId: string) =>
    Object.values(memberRoles).filter((roleIds) => roleIds.includes(roleId)).length;

  const togglePermission = (id: string) => {
    setPermissions((previous) =>
      previous.includes(id) ? previous.filter((p) => p !== id) : [...previous, id],
    );
  };

  const handleCreate = () => {
    const clean = name.trim();
    if (!clean) return;
    createNetworkRole(network.id, clean, color, permissions);
    logQaEvent({ type: "network.role.created", userId: me.id, networkId: network.id, success: true });
    setName("");
    setPermissions(["view_rooms", "send_messages"]);
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Shield size={18} className="text-accent-primary" />
          Roles
        </h2>
        {isOwner && (
          <button
            onClick={() => setCreating((previous) => !previous)}
            className="flex items-center gap-1.5 rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover"
          >
            <Plus size={15} /> {creating ? "Close" : "Create role"}
          </button>
        )}
      </div>

      <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-text-secondary">
        <strong>Prototype-only:</strong> roles and permissions shape what this UI shows, but they are
        not enforced by a production backend yet.
      </p>

      {creating && (
        <div className="space-y-4 rounded-2xl border border-border-default bg-surface-card p-5">
          <div>
            <label className="mb-1 block text-xs font-bold text-text-muted" htmlFor="role-name">Role name</label>
            <input
              id="role-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Coordinator"
              maxLength={32}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-text-muted">Color</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_COLORS.map((option) => (
                <button
                  key={option}
                  onClick={() => setColor(option)}
                  aria-label={`Role color ${option}`}
                  className={`h-7 w-7 rounded-full transition-transform ${color === option ? "ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-card scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
          </div>
          <fieldset>
            <legend className="mb-1 text-xs font-bold text-text-muted">Permissions (UI preview only)</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {ROLE_PERMISSIONS.map((permission) => (
                <label key={permission.id} className="flex items-center gap-2 rounded-lg bg-background-secondary px-2.5 py-1.5 text-xs font-semibold text-text-primary">
                  <input
                    type="checkbox"
                    checked={permissions.includes(permission.id)}
                    onChange={() => togglePermission(permission.id)}
                  />
                  {permission.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="rounded-xl bg-accent-primary px-5 py-2 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              Create role
            </button>
          </div>
        </div>
      )}

      {roles.length === 0 && !creating ? (
        <div className="rounded-2xl border border-border-default bg-surface-card p-8 text-center">
          <p className="text-sm font-bold text-text-primary">No roles yet</p>
          <p className="mt-1 text-xs text-text-secondary">
            {isOwner
              ? "Create a role to organize members and preview permissions."
              : "The Network owner has not created any roles yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="rounded-2xl border border-border-default bg-surface-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: role.color }} />
                  <span className="rounded-md px-2 py-1 text-sm font-bold" style={{ backgroundColor: `${role.color}20`, color: role.color }}>
                    {role.name}
                  </span>
                  <span className="text-xs text-text-muted">
                    {membersWithRole(role.id)} member{membersWithRole(role.id) === 1 ? "" : "s"}
                  </span>
                </div>
                {isOwner && (
                  confirmDeleteId === role.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-danger">Delete this role?</span>
                      <button
                        onClick={() => { deleteNetworkRole(network.id, role.id); setConfirmDeleteId(null); }}
                        className="rounded-lg bg-danger px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-border-default px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-surface-hover"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(role.id)}
                      aria-label={`Delete role ${role.name}`}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  )
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.permissions.length === 0 ? (
                  <span className="text-xs text-text-muted">No permissions selected</span>
                ) : (
                  role.permissions.map((permissionId) => {
                    const known = ROLE_PERMISSIONS.find((p) => p.id === permissionId);
                    return (
                      <span key={permissionId} className="rounded bg-background-secondary px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                        {known?.label || permissionId}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-muted">
        Assign or remove roles per member on the Moderation tab. Role assignments are saved locally in this prototype.
      </p>
    </div>
  );
}
