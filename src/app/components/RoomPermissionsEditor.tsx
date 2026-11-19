import { useEffect, useState } from "react";
import { ShieldAlert, Lock, Check } from "lucide-react";
import { useMockAppState } from "../state/mockAppState";
import { logQaEvent } from "../qa/qaEvents";
import type { RoomVisibility } from "../data/mockNetworks";

interface Props {
  networkId: string;
  roomId: string;
  onClose?: () => void;
}

export function RoomPermissionsEditor({ networkId, roomId, onClose }: Props) {
  const { me, networks, updateRoomVisibility } = useMockAppState();

  const network = networks[networkId];
  const room = network?.rooms.flatMap((s) => s.items).find((r) => r.id === roomId);

  const [visibility, setVisibility] = useState<RoomVisibility>(
    (room?.visibility as RoomVisibility) ?? "public",
  );
  const [allowedRoles, setAllowedRoles] = useState<string[]>(room?.allowedRoles ?? []);
  const [saved, setSaved] = useState(false);

  // Determine if current user is owner or admin
  const isOwner = network?.ownerId === me.id;
  const userRoleIds = network?.memberRoles?.[me.id] ?? [];
  const userRoles = (network?.roles ?? []).filter((r) => userRoleIds.includes(r.id));
  const isAdmin = userRoles.some(
    (r) => (r as any).permissions?.includes("manage_rooms") || r.name === "Admin",
  );
  const canEdit = isOwner || isAdmin;

  useEffect(() => {
    logQaEvent({ type: "room.permissions.opened", networkId, roomId, userId: me.id });
  }, [networkId, roomId, me.id]);

  const handleRoleToggle = (roleId: string) => {
    setAllowedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
    setSaved(false);
  };

  const handleSave = () => {
    const effectiveAllowedRoles = showRoleSelector ? allowedRoles : [];
    updateRoomVisibility(networkId, roomId, visibility, effectiveAllowedRoles);
    setSaved(true);
    logQaEvent({ type: "room.permissions.updated", networkId, roomId, userId: me.id });
  };

  const showRoleSelector = visibility === "restricted" || visibility === "opsec";

  return (
    <div className="bg-surface-card border border-border-default rounded-2xl p-5 space-y-5 text-text-primary">
      {/* Title */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" aria-hidden />
        <h2 className="text-base font-semibold">Room Permissions</h2>
      </div>

      {/* Prototype warning banner */}
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-200 flex gap-2">
        <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" aria-hidden />
        <p>
          Room permissions are <strong>prototype access controls</strong> unless backend enforcement
          is enabled. Restricted Rooms help organize access in this prototype. They are{" "}
          <strong>not a production security boundary</strong> yet.
        </p>
      </div>

      {!canEdit ? (
        <p className="text-sm text-text-secondary">
          Only Network owners and admins can edit Room permissions.
        </p>
      ) : (
        <>
          {/* Visibility select */}
          <div className="space-y-2">
            <label
              htmlFor="room-visibility-select"
              className="block text-sm font-medium text-text-secondary"
            >
              Visibility
            </label>
            <select
              id="room-visibility-select"
              value={visibility}
              onChange={(e) => {
                setVisibility(e.target.value as RoomVisibility);
                setSaved(false);
              }}
              className="w-full rounded-xl bg-surface-card border border-border-default text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="public">Public — Everyone can view</option>
              <option value="private">Private — Members only</option>
              <option value="restricted">Restricted — Selected roles only</option>
              <option value="opsec">OPSEC-style Restricted — Selected roles only (OPSEC label)</option>
            </select>
          </div>

          {/* Role multi-select (only for restricted / opsec) */}
          {showRoleSelector && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">Allowed roles</p>
              {!network?.roles || network.roles.length === 0 ? (
                <p className="text-xs text-text-secondary italic">
                  No roles have been created for this Network yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {network.roles.map((role) => {
                    const checked = allowedRoles.includes(role.id);
                    return (
                      <label
                        key={role.id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer hover:bg-surface-card/60 transition-colors"
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            checked
                              ? "bg-amber-500 border-amber-500"
                              : "border-border-default bg-transparent"
                          }`}
                          aria-hidden
                        >
                          {checked && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => handleRoleToggle(role.id)}
                          aria-label={`Allow role ${role.name}`}
                        />
                        <span
                          className="text-sm font-medium px-2 py-0.5 rounded-full text-white text-xs"
                          style={{ backgroundColor: role.color }}
                        >
                          {role.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Save feedback */}
          {saved && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <Check className="w-4 h-4" aria-hidden />
              <span>Saved (local prototype only)</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-1">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm text-text-secondary border border-border-default hover:bg-surface-card/60 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black transition-colors"
            >
              Save permissions
            </button>
          </div>
        </>
      )}
    </div>
  );
}
