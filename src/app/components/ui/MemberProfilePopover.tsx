import * as Popover from "@radix-ui/react-popover";
import { MockUser } from "../../data/mockUsers";
import { X, ShieldCheck, Mail, UserRound, Check } from "lucide-react";
import { ReactNode, useState } from "react";
import { useNavigate } from "react-router";
import { useMockAppState } from "../../state/mockAppState";
import { mutualNetworks, trustLevelInfo } from "../../state/trust";
import { logQaEvent } from "../../qa/qaEvents";
import { AvatarLightbox } from "./AvatarLightbox";
import { loadProtectedSettings } from "../../state/networkPrototypeSettings";
import { PROTECTED_CATEGORIES, SUPERVISOR_ROLES } from "../../data/protectedRoles";

interface MemberProfilePopoverProps {
  user: MockUser;
  children: ReactNode;
  align?: "center" | "end" | "start";
  side?: "top" | "right" | "bottom" | "left";
  networkId?: string;
}

export function MemberProfilePopover({ user, children, align = "center", side = "right", networkId }: MemberProfilePopoverProps) {
  const [open, setOpen] = useState(false);
  const { createDirectChat, me, networkProfiles, networks, trustedContacts, preferences, updateNetworkMemberRoles } = useMockAppState();
  const navigate = useNavigate();

  const isMe = user.id === me.id;
  const networkProfile = isMe && networkId ? networkProfiles[networkId] : undefined;
  const displayName = networkProfile?.displayName || user.name;

  const network = networkId ? networks[networkId] : undefined;
  const networkRoles = network?.memberRoles?.[user.id] || [];
  const trustRecord = !isMe ? trustedContacts[user.id] : undefined;
  const sharedNetworkCount = !isMe ? mutualNetworks(me.id, user.id, networks).length : 0;

  const protectedSettings = networkId ? loadProtectedSettings(networkId) : undefined;
  const userProtectedCategories = network?.memberProtectedCategories?.[user.id] || [];
  const userSupervisorRoles = network?.memberSupervisorRoles?.[user.id] || [];

  const orgNodes = network?.orgNodes || [];
  const assignedNodes = orgNodes.filter(n => n.assignedMemberId === user.id);

  const isNetworkOwner = network?.ownerId === me.id;
  const myNetworkRoles = network?.memberRoles?.[me.id] || [];
  const myRoles = (network?.roles || []).filter(r => myNetworkRoles.includes(r.id));
  const isNetworkAdmin = isNetworkOwner || myRoles.some(r => r.permissions?.includes("manage_roles") || r.name === "Admin");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      logQaEvent({
        type: "profile.card.opened",
        userId: me.id,
        targetUserId: user.id,
        networkId,
        success: true,
      });
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          aria-label={`View profile for ${displayName}`}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary rounded-xl"
          onClick={(e) => {
            // preventDefault stops parent links (sidebar rows) from navigating,
            // but it also makes Radix skip its own toggle — so toggle manually.
            e.preventDefault();
            handleOpenChange(!open);
          }}
        >
          {children}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          side={side}
          sideOffset={8}
          className="z-50 w-80 rounded-2xl border border-border-default bg-surface-card p-0 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
          onInteractOutside={() => setOpen(false)}
          onEscapeKeyDown={() => setOpen(false)}
        >
          <div className="h-20 bg-accent-primary/20 w-full" />
          
          <div className="relative px-4 pb-4">
            <button 
              onClick={() => setOpen(false)} 
              className="absolute right-2 top-2 rounded-full p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary"
            >
              <X size={16} />
            </button>
            
            <div className="flex -mt-10 mb-3 items-end justify-between">
              <div className="relative">
                <AvatarLightbox user={user} className="rounded-2xl">
                  <div className={`flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-4 border-surface-card ${user.avatarColor} text-white font-black text-2xl overflow-hidden`}>
                    {user.profilePictureUrl && !preferences.lowBandwidthMode ? (
                      <img src={user.profilePictureUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : user.initials}
                  </div>
                </AvatarLightbox>
                <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-surface-card ${user.status === "online" ? "bg-success" : user.status === "away" ? "bg-warning" : user.status === "busy" ? "bg-danger" : "bg-text-muted"}`} />
              </div>
            </div>

            <div className="space-y-1 mb-4">
              <h3 className="text-xl font-bold text-text-primary">{displayName}</h3>
              {displayName !== user.name && (
                <p className="text-xs font-medium text-text-secondary">AKA: {user.name}</p>
              )}
              <p className="text-sm font-semibold text-text-muted">
                {user.username ? `@${user.username}` : `@${user.name.toLowerCase().replace(/\s+/g, '')}`}
              </p>
            </div>

            {(user.statusMessage || user.bio) && (
              <div className="mb-4 rounded-lg bg-background-primary p-3 space-y-2">
                {user.statusMessage && (
                  <p className="text-sm text-text-primary font-medium">{user.statusMessage}</p>
                )}
                {user.bio && (
                  <p className="text-xs text-text-secondary leading-relaxed">{user.bio}</p>
                )}
              </div>
            )}

            <div className="mb-4 space-y-2">
              <h4 className="text-xs font-bold uppercase text-text-muted">Roles</h4>
              <div className="flex flex-wrap gap-2">
                {networkRoles.map(rId => {
                  const role = network?.roles?.find(r => r.id === rId);
                  if (!role) return null;
                  return (
                    <span key={rId} className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: `${role.color}20`, color: role.color }}>
                      {role.name}
                    </span>
                  );
                })}
                {networkRoles.length === 0 && (
                  <span className="inline-flex items-center rounded-md bg-surface-hover px-2 py-1 text-xs font-semibold text-text-primary">
                    {user.role || "Member"}
                  </span>
                )}
                {trustRecord && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success" title="Local prototype trust label — not identity verification">
                    <ShieldCheck size={12} />
                    {trustLevelInfo(trustRecord.level).label}
                  </span>
                )}
              </div>
              
              {protectedSettings?.enabled && protectedSettings.showPolicyBadge && (userProtectedCategories.length > 0 || userSupervisorRoles.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {userProtectedCategories.map(cId => {
                    const cat = PROTECTED_CATEGORIES.find(c => c.id === cId);
                    if (!cat) return null;
                    return (
                      <span key={cId} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${cat.badgeColor}`} title={cat.description}>
                        {cat.name}
                      </span>
                    );
                  })}
                  {userSupervisorRoles.map(sId => {
                    const sup = SUPERVISOR_ROLES.find(s => s.id === sId);
                    if (!sup) return null;
                    return (
                      <span key={sId} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold bg-amber-600/20 text-amber-600" title={sup.description}>
                        <ShieldCheck size={12} />
                        {sup.name}
                      </span>
                    );
                  })}
                </div>
              )}
              
              {!isMe && (
                <p className="text-[11px] text-text-muted">
                  {sharedNetworkCount} Mutual Network{sharedNetworkCount === 1 ? "" : "s"}
                </p>
              )}
            </div>

            {assignedNodes.length > 0 && (
              <div className="mb-4 space-y-2 border-t border-border-default pt-3">
                <h4 className="text-xs font-bold uppercase text-text-muted">Chain of Command</h4>
                <p className="text-[10px] text-text-muted mb-2 italic">Duty position and reporting chain are Network labels and may not reflect official external records.</p>
                {assignedNodes.map(node => {
                  const parentNode = orgNodes.find(n => n.id === node.parentId);
                  const childNodes = orgNodes.filter(n => n.parentId === node.id);
                  
                  return (
                    <div key={node.id} className="text-sm bg-background-primary p-2 rounded">
                      <div className="font-bold">{node.name} {node.isActing && <span className="text-[10px] font-normal text-text-muted">(Acting)</span>}</div>
                      <div className="text-xs text-text-secondary">Type: {node.type}</div>
                      
                      {parentNode && (
                        <div className="text-xs text-text-secondary mt-1">
                          <strong>Reports to:</strong> {parentNode.name}
                        </div>
                      )}
                      {childNodes.length > 0 && (
                        <div className="text-xs text-text-secondary mt-1">
                          <strong>Direct Reports:</strong> {childNodes.map(c => c.name).join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {networkId && isNetworkAdmin && network?.roles && network.roles.length > 0 && (
              <div className="mb-4 space-y-2 border-t border-border-default pt-3">
                <h4 className="text-xs font-bold uppercase text-text-muted">Manage Roles (Admin)</h4>
                <div className="space-y-1">
                  {network.roles.map(role => {
                    const hasRole = networkRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => {
                          const nextRoles = hasRole
                            ? networkRoles.filter(id => id !== role.id)
                            : [...networkRoles, role.id];
                          updateNetworkMemberRoles(networkId, user.id, nextRoles);
                        }}
                        className="flex w-full items-center justify-between rounded p-2 text-sm hover:bg-surface-hover text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-3 h-3 rounded-full ${role.color || "bg-accent-primary"}`}></span>
                          <span className="font-medium text-text-primary">{role.name}</span>
                        </div>
                        {hasRole && <Check size={16} className="text-accent-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setOpen(false);
                  createDirectChat(user.id);
                }}
                className="flex-1 rounded-xl bg-accent-primary px-3 py-2 text-sm font-bold text-white hover:bg-accent-hover flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                Message
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate(`/app/profile/${user.id}`);
                }}
                className="rounded-xl border border-border-default bg-surface-card px-3 py-2 text-sm font-bold text-text-primary hover:bg-surface-hover flex items-center justify-center gap-2"
                title="View full profile"
              >
                <UserRound size={16} />
                Profile
              </button>
            </div>
            
            <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-text-muted">
              Member since {user.memberSince || "2026"}
            </p>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
