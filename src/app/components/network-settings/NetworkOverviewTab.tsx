import { CalendarDays, Crown, ShieldCheck, Users, AlertTriangle } from "lucide-react";
import { useMockAppState } from "../../state/mockAppState";
import { logQaEvent } from "../../qa/qaEvents";
import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Camera, X } from "lucide-react";

export function NetworkOverviewTab({ network, isOwner }: { network: any, isOwner: boolean }) {
  const { users, me } = useMockAppState();
  const memberCount = network.memberIds?.length || 1;
  const owner = network.ownerId
    ? (users[network.ownerId] || (network.ownerId === me.id ? me : null))
    : null;
  const onlineCount = (network.memberIds || [network.ownerId])
    .map((userId: string) => users[userId] || (userId === me.id ? me : null))
    .filter((person: any) => person?.status === "online").length;

  const { archivedNetworkIds, setNetworkArchived, leaveNetwork, deleteNetwork, setNetworkAccessLevel } = useMockAppState();
  const navigate = useNavigate();
  const isArchived = archivedNetworkIds.includes(network.id);
  
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { updateNetworkIcon, renameNetwork } = useMockAppState();
  const [isEditingNetwork, setIsEditingNetwork] = useState(false);
  const [editNetworkName, setEditNetworkName] = useState(network.name);

  const handleArchive = () => {
    try {
      setNetworkArchived(network.id, !isArchived);
      logQaEvent({ type: isArchived ? "network.restore.succeeded" : "network.archive.succeeded", userId: me.id, networkId: network.id, success: true });
      setConfirmArchive(false);
      if (!isArchived) navigate("/app"); // go to dashboard if archived
    } catch {
      logQaEvent({ type: isArchived ? "network.restore.failed" : "network.archive.failed", userId: me.id, networkId: network.id, success: false });
    }
  };

  const handleLeave = () => {
    if (window.confirm(`Are you sure you want to leave ${network.name}?`)) {
      leaveNetwork(network.id);
      navigate("/app");
    }
  };

  const handleDelete = () => {
    if (deleteName !== network.name) return;
    try {
      logQaEvent({ type: "network.delete.attempted", userId: me.id, networkId: network.id });
      deleteNetwork(network.id);
      logQaEvent({ type: "network.delete.succeeded", userId: me.id, networkId: network.id, success: true });
      navigate("/app");
    } catch {
      logQaEvent({ type: "network.delete.failed", userId: me.id, networkId: network.id, success: false });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Only PNG, JPG, and WebP images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        updateNetworkIcon(network.id, event.target.result as string);
        logQaEvent({ type: "network.icon.changed", userId: me.id, networkId: network.id, success: true });
      }
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNetworkName = () => {
    if (editNetworkName.trim() && editNetworkName.trim() !== network.name) {
      renameNetwork(network.id, editNetworkName.trim());
      logQaEvent({ type: "network.rename.succeeded", userId: me.id, networkId: network.id, success: true });
    }
    setIsEditingNetwork(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-default bg-surface-card p-6 flex flex-col md:flex-row items-start gap-6">
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl text-3xl font-black text-white flex items-center justify-center ${!network.iconUrl ? network.color : "bg-background-secondary border border-border-default"}`}>
            {network.iconUrl ? (
              <img src={network.iconUrl} alt="Network Icon" className="h-full w-full object-cover" />
            ) : (
              network.initials
            )}
          </div>
          {isOwner && (
            <div className="flex flex-col items-center gap-1">
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleImageUpload} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg bg-surface-hover px-2.5 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-selected transition-colors"
              >
                <Camera size={13} /> {network.iconUrl ? "Change Icon" : "Upload Icon"}
              </button>
              {network.iconUrl && (
                <button 
                  onClick={() => {
                    updateNetworkIcon(network.id, null);
                    logQaEvent({ type: "network.icon.removed", userId: me.id, networkId: network.id, success: true });
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-danger-readable hover:underline"
                >
                  <X size={12} /> Remove
                </button>
              )}
            </div>
          )}
          {error && <p className="text-[11px] text-danger-readable max-w-[96px] text-center leading-tight">{error}</p>}
        </div>

        <div className="flex-1 text-center md:text-left mt-2 md:mt-0 w-full">
          {isEditingNetwork && isOwner ? (
            <div className="flex items-center gap-2 max-w-sm mx-auto md:mx-0">
              <input
                value={editNetworkName}
                onChange={(e) => setEditNetworkName(e.target.value)}
                autoFocus
                className="flex-1 rounded-lg border border-border-default bg-background-secondary px-3 py-1.5 text-lg font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNetworkName();
                  if (e.key === "Escape") {
                    setEditNetworkName(network.name);
                    setIsEditingNetwork(false);
                  }
                }}
              />
              <button onClick={handleSaveNetworkName} className="rounded-lg bg-accent-primary px-3 py-1.5 text-sm font-bold text-white hover:bg-accent-hover">Save</button>
            </div>
          ) : (
            <div className="group flex items-center justify-center md:justify-start gap-2">
              <h2 className="text-2xl font-bold text-text-primary">{network.name}</h2>
              {isOwner && (
                <button 
                  onClick={() => setIsEditingNetwork(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-text-primary transition-opacity rounded-md hover:bg-surface-hover"
                  aria-label="Rename network"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
              )}
            </div>
          )}
          <p className="mt-2 text-sm text-text-secondary">
            {network.description || "A private prototype Network."}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <span className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-xs font-bold text-success">
              <ShieldCheck size={16} />
              Self-Declared Local Prototype
            </span>
            {isOwner && (
              <span className="flex items-center gap-2 rounded-lg border border-accent-primary/25 bg-accent-primary/5 px-3 py-2 text-xs font-bold text-accent-readable">
                <Crown size={14} />
                You own this Network
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border-default bg-surface-card p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <Users size={14} /> Members
          </p>
          <p className="mt-2 text-2xl font-black text-text-primary">{memberCount}</p>
          <p className="text-xs text-text-muted">{onlineCount} online (prototype presence)</p>
        </div>
        <div className="rounded-2xl border border-border-default bg-surface-card p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <Crown size={14} /> Owner
          </p>
          {owner ? (
            <div className="mt-2 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ${owner.avatarColor}`}>{owner.initials}</span>
              <span className="text-sm font-bold text-text-primary">{owner.name}{owner.id === me.id ? " (You)" : ""}</span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">Shared prototype Network</p>
          )}
        </div>
        <div className="rounded-2xl border border-border-default bg-surface-card p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <CalendarDays size={14} /> Established
          </p>
          <p className="mt-2 text-sm font-bold text-text-primary">{network.createdAt ? new Date(network.createdAt).toLocaleDateString() : "2026 (prototype)"}</p>
          <p className="text-xs text-text-muted">Network Profile data is local-only</p>
        </div>
      </div>

      {isOwner && (
        <section className="mt-8 overflow-hidden rounded-3xl border border-border-default bg-surface-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border-default px-5 py-4">
            <ShieldCheck size={19} className="text-text-primary" />
            <h2 className="text-base font-bold text-text-primary">Network Access Level</h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-text-secondary">Configure who can see and join this prototype network.</p>
            <label className="sr-only" htmlFor="access-level">Access Level</label>
            <select
              id="access-level"
              value={network.accessLevel || "open"}
              onChange={(e) => {
                if (setNetworkAccessLevel) {
                  setNetworkAccessLevel(network.id, e.target.value);
                  logQaEvent({ type: "network.access_level.changed", networkId: network.id, level: e.target.value });
                }
              }}
              className="w-full rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="open">Open Prototype Network (Visible, join directly)</option>
              <option value="private">Private Network (Visible, requires approval)</option>
              <option value="restricted">Restricted Network (Hidden, invite only)</option>
              <option value="opsec">OPSEC Restricted Network (Hidden, strict vetting)</option>
              <option value="mission">Mission-only Network (Temporary, closed scope)</option>
              <option value="archived">Archived Network (Read-only)</option>
            </select>
            
            {(network.accessLevel === "restricted" || network.accessLevel === "opsec") && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20 p-4">
                <AlertTriangle className="text-accent-readable shrink-0 mt-0.5" size={18} />
                <p className="text-sm font-semibold text-accent-readable">
                  Restricted Network helps organize access in this prototype. It is not a production security boundary yet.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mt-8 overflow-hidden rounded-3xl border border-danger/30 bg-danger/5 shadow-sm">
        <div className="flex items-center gap-3 border-b border-danger/20 px-5 py-4">
          <AlertTriangle size={19} className="text-danger" />
          <h2 className="text-base font-bold text-danger">Danger Zone</h2>
        </div>
        <div className="flex flex-col gap-4 p-5 divide-y divide-danger/10">
          
          {isOwner ? (
            <>
              <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{isArchived ? "Restore Network" : "Archive Network"}</h3>
                  <p className="mt-1 max-w-lg text-xs leading-relaxed text-text-secondary">
                    {isArchived 
                      ? "Restoring brings this Network back to your active sidebar." 
                      : "Archiving hides this Network from your sidebar. Data is kept locally."}
                  </p>
                </div>
                {confirmArchive ? (
                  <div className="flex items-center gap-2">
                    <button onClick={handleArchive} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700">Confirm {isArchived ? "Restore" : "Archive"}</button>
                    <button onClick={() => setConfirmArchive(false)} className="rounded-xl border border-border-default bg-surface-card px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surface-hover">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => {
                    logQaEvent({ type: isArchived ? "network.restore.attempted" : "network.archive.attempted", userId: me.id, networkId: network.id });
                    setConfirmArchive(true);
                  }} className="rounded-xl border border-amber-600/30 px-5 py-2.5 text-sm font-bold text-amber-500 hover:bg-amber-600/10 shrink-0">
                    {isArchived ? "Restore Network" : "Archive Network"}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Delete Network</h3>
                  <p className="mt-1 max-w-lg text-xs leading-relaxed text-text-secondary">Permanently delete this Network, all its rooms, and all its messages. This cannot be undone.</p>
                </div>
                {showDeletePrompt ? (
                  <div className="flex flex-col gap-2 w-full max-w-xs shrink-0">
                    <label className="text-xs font-bold text-danger">Type "{network.name}" to confirm</label>
                    <input 
                      value={deleteName} 
                      onChange={e => setDeleteName(e.target.value)} 
                      placeholder={network.name}
                      className="w-full rounded-xl border border-danger/30 bg-background-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-danger"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <button 
                        onClick={handleDelete} 
                        disabled={deleteName !== network.name}
                        className="flex-1 rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm Delete
                      </button>
                      <button onClick={() => { setShowDeletePrompt(false); setDeleteName(""); }} className="rounded-xl border border-border-default bg-surface-card px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surface-hover">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowDeletePrompt(true)} className="rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 shrink-0">
                    Delete Network
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Leave Network</h3>
                <p className="mt-1 max-w-lg text-xs leading-relaxed text-text-secondary">Remove yourself from this Network. You will lose access to all rooms.</p>
              </div>
              <button onClick={handleLeave} className="rounded-xl border border-danger/30 px-5 py-2.5 text-sm font-bold text-danger hover:bg-danger/10 shrink-0">
                Leave Network
              </button>
            </div>
          )}
          
        </div>
      </section>
    </div>
  );
}
