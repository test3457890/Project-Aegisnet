import { Check, Search, Users, UserCheck, UserX, X, Network } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useMockAppState, hasNetworkPermission } from "../../state/mockAppState";
import { trustLevelInfo } from "../../state/trust";
import { MemberProfilePopover } from "../ui/MemberProfilePopover";
import { logQaEvent } from "../../qa/qaEvents";
import {
  JoinRequest,
  loadJoinRequests,
  loadSafetySettings,
  reviewJoinRequest,
  saveJoinRequests,
  saveSafetySettings,
} from "../../state/networkPrototypeSettings";

type MemberView = "all" | "pending" | "approved" | "rejected";

const VIEWS: { id: MemberView; label: string }[] = [
  { id: "all", label: "All Members" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

function AdminNoteEditor({ networkId, userId, currentNote }: { networkId: string, userId: string, currentNote?: string }) {
  const { updateAdminNote } = useMockAppState();
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(currentNote || "");

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateAdminNote(networkId, userId, note);
    setIsEditing(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateAdminNote(networkId, userId, "");
    setNote("");
    setIsEditing(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  return (
    <div className="mt-4 border-t border-border-default pt-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-danger flex items-center gap-1">
          Admin Notes
        </span>
        {!isEditing && (
          <button onClick={handleEdit} className="text-xs text-accent-primary hover:underline font-bold">
            {currentNote ? "Edit" : "Add Note"}
          </button>
        )}
      </div>
      <div className="mb-2 text-[10px] text-danger/80 font-bold uppercase tracking-wide">
        WARNING: Not for HIPAA/HR data. Local prototype only.
      </div>
      {isEditing ? (
        <div className="space-y-2" onClick={e => e.stopPropagation()}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full text-xs rounded border border-border-default bg-background-secondary p-2 outline-none focus:border-accent-primary"
            rows={3}
            placeholder="Private admin notes..."
          />
          <div className="flex justify-end gap-2">
            <button onClick={handleClear} className="text-xs text-text-muted hover:text-danger">Clear</button>
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} className="text-xs text-text-muted">Cancel</button>
            <button onClick={handleSave} className="text-xs text-accent-primary font-bold">Save</button>
          </div>
        </div>
      ) : (
        currentNote ? <p className="text-xs text-text-secondary whitespace-pre-wrap">{currentNote}</p> : null
      )}
    </div>
  );
}

export function NetworkMembersTab({ network, isOwner }: { network: any, isOwner: boolean }) {
  const { users, me, networkProfiles, trustedContacts } = useMockAppState();
  const navigate = useNavigate();
  const [view, setView] = useState<MemberView>("all");
  const [search, setSearch] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState("all");
  const [sortMode, setSortMode] = useState("name");
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>(() => loadJoinRequests(network.id));
  const [safety, setSafety] = useState(() => loadSafetySettings(network.id));

  const memberIds: string[] = network.memberIds || [network.ownerId];
  const query = search.trim().toLowerCase();
  const filteredMemberIds = memberIds.filter((userId: string) => {
    if (!query && lifecycleFilter === "all") return true;
    const person = users[userId] || (userId === me.id ? me : null);
    if (!person) return false;
    
    let matchQuery = true;
    if (query) {
      matchQuery = person.name.toLowerCase().includes(query) || (person.username || "").toLowerCase().includes(query);
    }
    
    let matchLifecycle = true;
    if (lifecycleFilter !== "all") {
      const status = network.memberLifecycle?.[userId] || "active"; // Default to active if unset
      matchLifecycle = status === lifecycleFilter;
    }
    
    return matchQuery && matchLifecycle;
  });

  const getPrimaryNode = (userId: string) => {
    return network.orgNodes?.find((n: any) => n.assignedMemberId === userId);
  };

  filteredMemberIds.sort((a, b) => {
    const pA = users[a] || (a === me.id ? me : null);
    const pB = users[b] || (b === me.id ? me : null);
    const nameA = pA?.name || "";
    const nameB = pB?.name || "";

    const nodeA = getPrimaryNode(a);
    const nodeB = getPrimaryNode(b);

    if (sortMode === "duty") {
      const dutyA = nodeA?.name || "ZZZ";
      const dutyB = nodeB?.name || "ZZZ";
      if (dutyA !== dutyB) return dutyA.localeCompare(dutyB);
    } else if (sortMode === "chain") {
      const typeWeight: Record<string, number> = { "network_command": 1, "department": 2, "team": 3, "flight": 4, "group": 5, "staff_section": 6, "duty_position": 7, "mission_position": 8 };
      const wA = nodeA ? (typeWeight[nodeA.type] || 50) : 99;
      const wB = nodeB ? (typeWeight[nodeB.type] || 50) : 99;
      if (wA !== wB) return wA - wB;
    }
    return nameA.localeCompare(nameB);
  });

  const handleReview = (requestId: string, decision: "approved" | "rejected") => {
    const next = reviewJoinRequest(joinRequests, requestId, decision);
    setJoinRequests(next);
    saveJoinRequests(network.id, next);
  };

  const handleApprovalToggle = (checked: boolean) => {
    const next = { ...safety, requireJoinApproval: checked };
    setSafety(next);
    saveSafetySettings(network.id, next);
    logQaEvent({ type: "network.safety.setting.changed", userId: me.id, networkId: network.id, reason: `requireJoinApproval:${checked ? "on" : "off"}`, success: true });
  };

  const requestsFor = (status: JoinRequest["status"]) => joinRequests.filter((request) => request.status === status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Users size={18} className="text-accent-primary" />
            Network Roster
          </h2>
          <div className="text-xs font-bold text-text-muted">
            {memberIds.length} Member{memberIds.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/app/network/${network.id}/org-tree`)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-surface-card border border-border-default rounded hover:bg-surface-hover">
            <Network size={14} /> View Org Tree
          </button>
          {hasNetworkPermission(network, me.id, "manage_roles") && (
            <button onClick={() => navigate(`/app/network/${network.id}/admin/org-tree`)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-surface-card border border-border-default rounded hover:bg-surface-hover">
              Edit Org Tree
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-text-muted -mt-2">
        Click any member to open their profile in this Network. Moderation actions stay on the Moderation tab so they can't be misclicked here.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex gap-1 rounded-xl border border-border-default bg-background-secondary p-1" aria-label="Member views">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                view === item.id ? "bg-surface-selected text-text-primary" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {item.label}
              {item.id === "pending" && requestsFor("pending").length > 0 && (
                <span className="ml-1.5 rounded-full bg-accent-primary/20 px-1.5 text-[10px] text-accent-readable">{requestsFor("pending").length}</span>
              )}
            </button>
          ))}
        </nav>
        {view === "all" && (
          <>
            <label className="relative flex-1 min-w-44">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by display name or username"
                aria-label="Search members"
                className="w-full rounded-xl border border-border-default bg-background-secondary py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </label>
            <select
              value={lifecycleFilter}
              onChange={(e) => setLifecycleFilter(e.target.value)}
              className="rounded-xl border border-border-default bg-background-secondary py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="limited">Limited</option>
              <option value="suspended">Suspended</option>
              <option value="removed">Removed</option>
            </select>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="rounded-xl border border-border-default bg-background-secondary py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="name">Sort by Name</option>
              <option value="duty">Sort by Duty Position</option>
              <option value="chain">Sort by Chain of Command</option>
            </select>
          </>
        )}
      </div>

      {view === "all" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredMemberIds.length === 0 && (
            <p className="col-span-full rounded-xl border border-border-default bg-surface-card p-6 text-center text-sm text-text-secondary">
              No members match that search.
            </p>
          )}
          {filteredMemberIds.map((userId: string) => {
            const person = users[userId] || (userId === me.id ? me : null);
            if (!person) return null;

            const isUserOwner = userId === network.ownerId;
            const userRoles = network.memberRoles?.[userId] || [];
            const nickname = userId === me.id ? networkProfiles[network.id]?.displayName : undefined;
            const trustRecord = userId !== me.id ? trustedContacts[userId] : undefined;
            const adminNote = network.adminNotes?.[userId];
            const lifecycleStatus = network.memberLifecycle?.[userId] || "active";

            return (
              <div key={userId} className="flex flex-col gap-2">
                <MemberProfilePopover user={person} networkId={network.id} side="right">
                <div
                  data-testid={`roster-member-${userId}`}
                  onClickCapture={() => {
                    logQaEvent({ type: "roster.member.clicked", userId: me.id, targetUserId: userId, networkId: network.id, success: true });
                  }}
                  className="flex w-full flex-col gap-3 rounded-xl border border-border-default bg-surface-card p-4 transition-colors hover:border-accent-primary/50 hover:bg-surface-hover"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 mt-1 shrink-0 rounded-full text-sm font-bold text-white flex items-center justify-center overflow-hidden ${person.profilePictureUrl ? "" : (person.avatarColor || "bg-indigo-600")}`}>
                      {person.profilePictureUrl ? <img src={person.profilePictureUrl} alt="" className="h-full w-full object-cover" /> : person.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-text-primary">
                        {nickname || person.name} {userId === me.id && "(You)"}
                      </p>
                      {nickname && <p className="truncate text-xs text-text-muted">Display name: {person.name}</p>}
                      <p className="truncate text-xs text-text-muted">
                        {person.username ? `@${person.username}` : `@${person.name.toLowerCase().replace(/\s+/g, '')}`}
                        <span className="ml-2 capitalize">· {person.status}</span>
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {getPrimaryNode(userId) && (
                          <span className="rounded bg-background-tertiary px-1.5 py-0.5 text-[10px] font-bold text-text-primary border border-border-default">
                            {getPrimaryNode(userId).name}
                          </span>
                        )}
                        {isUserOwner && <span className="rounded bg-accent-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-readable">Owner</span>}
                        {userRoles.map((rId: string) => {
                          const role = network.roles?.find((r: any) => r.id === rId);
                          if (!role) return null;
                          return <span key={rId} className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${role.color}20`, color: role.color }}>{role.name}</span>;
                        })}
                        {!isUserOwner && userRoles.length === 0 && <span className="text-[10px] text-text-muted">Member</span>}
                        {trustRecord && (
                          <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                            {trustLevelInfo(trustRecord.level).label}
                          </span>
                        )}
                        {lifecycleStatus !== "active" && (
                          <span className="rounded bg-background-tertiary px-1.5 py-0.5 text-[10px] font-bold text-text-secondary border border-border-default capitalize">
                            {lifecycleStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-text-muted">View Profile</span>
                  </div>
                </div>
                </MemberProfilePopover>
                {hasNetworkPermission(network, me.id, "manage_members") && (
                  <AdminNoteEditor networkId={network.id} userId={userId} currentNote={adminNote} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {view !== "all" && (
        <div className="space-y-3">
          {hasNetworkPermission(network, me.id, "manage_members") && view === "pending" && (
            <label className="flex items-center justify-between gap-4 rounded-xl border border-border-default bg-surface-card p-4">
              <span>
                <span className="block text-sm font-bold text-text-primary">Require approval for new members</span>
                <span className="block text-xs text-text-muted">Manual verification — local-only prototype setting, not backend-enforced.</span>
              </span>
              <input
                type="checkbox"
                checked={safety.requireJoinApproval}
                onChange={(event) => handleApprovalToggle(event.target.checked)}
                className="h-5 w-5 accent-[var(--accent-primary)]"
              />
            </label>
          )}
          {requestsFor(view as JoinRequest["status"]).length === 0 ? (
            <p className="rounded-xl border border-border-default bg-surface-card p-6 text-center text-sm text-text-secondary">
              No {view} applications. New join applications appear here in this local prototype.
            </p>
          ) : (
            requestsFor(view as JoinRequest["status"]).map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-surface-card p-4">
                <div>
                  <p className="text-sm font-bold text-text-primary">{request.displayName}</p>
                  <p className="text-xs text-text-muted">
                    Applied {new Date(request.requestedAt).toLocaleDateString()}
                    {request.reviewedAt && ` · Reviewed ${new Date(request.reviewedAt).toLocaleDateString()}`}
                  </p>
                  {request.answers && Object.entries(request.answers).length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-bold text-text-primary">Answers:</p>
                      {Object.entries(request.answers).map(([q, a], i) => (
                        <div key={i} className="text-xs">
                          <p className="font-semibold text-text-muted">{q}</p>
                          <p className="text-text-primary mt-0.5">{a}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {view === "pending" && hasNetworkPermission(network, me.id, "manage_members") ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(request.id, "approved")}
                      className="flex items-center gap-1.5 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-bold text-success hover:bg-success/25"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleReview(request.id, "rejected")}
                      className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/20"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                ) : (
                  <span className={`flex items-center gap-1.5 text-xs font-bold ${request.status === "approved" ? "text-success" : request.status === "rejected" ? "text-danger" : "text-text-muted"}`}>
                    {request.status === "approved" ? <UserCheck size={14} /> : request.status === "rejected" ? <UserX size={14} /> : null}
                    {request.status}
                  </span>
                )}
              </div>
            ))
          )}
          <p className="text-xs text-text-muted">
            Join applications are local prototype data. Approving here does not add real accounts — there is no remote join flow yet.
          </p>
        </div>
      )}
    </div>
  );
}
