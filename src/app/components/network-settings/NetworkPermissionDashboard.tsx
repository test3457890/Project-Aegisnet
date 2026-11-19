import { CheckCircle2, XCircle, AlertTriangle, ShieldAlert, Lock, Target, ClipboardList, Hash, Mic, Video, FolderLock, Megaphone, ActivitySquare } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";
import { useEffect } from "react";
import { logQaEvent } from "../../qa/qaEvents";
import { canViewRoom, MockRoom, RoomVisibility } from "../../data/mockNetworks";

function RoomTypeIcon({ type }: { type: MockRoom["type"] }) {
  const cls = "shrink-0 text-text-muted";
  switch (type) {
    case "mission":      return <Target size={14} className={cls} />;
    case "planning":     return <ClipboardList size={14} className={cls} />;
    case "voice":        return <Mic size={14} className={cls} />;
    case "video":        return <Video size={14} className={cls} />;
    case "vault":        return <FolderLock size={14} className={cls} />;
    case "announcement": return <Megaphone size={14} className={cls} />;
    case "check-in":     return <ActivitySquare size={14} className={cls} />;
    default:             return <Hash size={14} className={cls} />;
  }
}

export function NetworkPermissionDashboard({ networkId }: { networkId: string }) {
  const { me, networks } = useMockAppState();

  useEffect(() => {
    logQaEvent({ type: "permission.dashboard.opened", userId: me.id, networkId });
  }, [networkId, me.id]);

  const roles = [
    { name: "Owner", isBackendBacked: true },
    { name: "Admin", isBackendBacked: true },
    { name: "Normal Member", isBackendBacked: true },
    { name: "Pending Member", isBackendBacked: false },
    { name: "Rejected User", isBackendBacked: false },
    { name: "Guest", isBackendBacked: false },
  ];

  const permissions = [
    { label: "Can view Network", states: [true, true, true, false, false, true] },
    { label: "Can view Rooms", states: [true, true, true, false, false, false] },
    { label: "Can send messages", states: [true, true, true, false, false, false] },
    { label: "Can invite people", states: [true, true, false, false, false, false] },
    { label: "Can approve members", states: [true, true, false, false, false, false] },
    { label: "Can manage roles", states: [true, true, false, false, false, false] },
    { label: "Can manage safety settings", states: [true, true, false, false, false, false] },
    { label: "Can archive/delete Network", states: [true, false, false, false, false, false] },
    { label: "Can view audit metadata", states: [true, true, false, false, false, false] },
    { label: "Can access Mission Rooms", states: [true, true, true, false, false, false] },
    { label: "Can view Planning Rooms (restricted)", states: [true, true, false, false, false, false] },
    { label: "Can view OPSEC-style Rooms", states: [true, true, false, false, false, false] },
    { label: "Can edit Room permissions", states: [true, true, false, false, false, false] },
  ];

  const network = networks[networkId];
  const allRooms: MockRoom[] = network
    ? network.rooms.flatMap((section) => section.items)
    : [];
  const restrictedRooms = allRooms.filter(
    (room) => room.visibility === "restricted" || room.visibility === "opsec",
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-default bg-surface-card p-6">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <ShieldAlert size={20} className="text-accent-readable" />
          Role & Permission Testing
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          This dashboard shows what each user type can see or do in this prototype.
          Some capabilities are local UI filtering only and not yet enforced by the backend.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-3 px-4 font-bold text-text-secondary whitespace-nowrap min-w-[200px]">Capability</th>
                {roles.map((role) => (
                  <th key={role.name} className="py-3 px-4 font-bold text-text-primary whitespace-nowrap">
                    {role.name}
                    {!role.isBackendBacked && (
                      <span className="block mt-1 text-[10px] uppercase tracking-wider text-accent-readable border border-accent-readable/30 rounded px-1 w-max">
                        Local Only
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm, rowIndex) => (
                <tr key={perm.label} className="border-b border-border-default last:border-0 hover:bg-surface-hover/50">
                  <td className="py-3 px-4 font-medium text-text-primary">
                    {perm.label}
                  </td>
                  {perm.states.map((state, colIndex) => (
                    <td key={colIndex} className="py-3 px-4 text-center">
                      {state ? (
                        <CheckCircle2 size={18} className="text-success mx-auto" aria-label="Yes" />
                      ) : (
                        <XCircle size={18} className="text-text-muted opacity-30 mx-auto" aria-label="No" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20 p-4">
          <AlertTriangle className="text-accent-readable shrink-0 mt-0.5" size={18} />
          <p className="text-sm font-semibold text-accent-readable">
            Prototype Warning: Visibility of pending/rejected users and guests is managed entirely via local UI filtering. Do not rely on this for OPSEC or sensitive data isolation.
          </p>
        </div>
      </div>

      {/* Restricted Rooms Overview card */}
      <div className="rounded-2xl border border-border-default bg-surface-card p-6">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Lock size={20} className="text-accent-readable" />
          Restricted Rooms in this Network
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Read-only summary of rooms with access controls. Owners can see all rooms. Prototype access controls only.
        </p>

        {restrictedRooms.length === 0 ? (
          <p className="mt-6 text-center text-sm text-text-muted">No restricted rooms configured.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {restrictedRooms.map((room) => {
              const allowedRoleNames: string[] = (room.allowedRoles || []).map((rid) => {
                const role = network?.roles?.find((r) => r.id === rid);
                return role?.name ?? rid;
              });
              return (
                <div
                  key={room.id}
                  className="flex flex-wrap items-start gap-3 rounded-xl border border-border-default bg-background-secondary p-3"
                >
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <RoomTypeIcon type={room.type} />
                    <span className="truncate text-sm font-semibold text-text-primary">{room.name}</span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      room.visibility === "opsec"
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {room.visibility}
                  </span>
                  <div className="w-full pl-5">
                    {allowedRoleNames.length === 0 ? (
                      <span className="text-xs text-text-muted">Allowed roles: <em>none specified</em></span>
                    ) : (
                      <span className="text-xs text-text-muted">
                        Allowed roles:{" "}
                        <span className="font-semibold text-text-primary">{allowedRoleNames.join(", ")}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
