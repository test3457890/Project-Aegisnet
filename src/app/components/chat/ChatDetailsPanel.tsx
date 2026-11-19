import { FileText, MailOpen, ShieldCheck, Users, Clock, Info, X } from "lucide-react";
import { MockUser } from "../../data/mockUsers";
import { useMockAppState } from "../../state/mockAppState";
import { formatBytes } from "../../utils/files";
import { DISAPPEAR_OPTIONS } from "../../utils/privacy";
import { PrototypeDownloadButton, StoredMediaPreview } from "./StoredAttachment";
import { MemberProfilePopover } from "../ui/MemberProfilePopover";
import { ChatAppearancePanel } from "./ChatAppearancePanel";

interface ChatDetailsPanelProps {
  title: string;
  subtitle: string;
  members: MockUser[];
  targetId: string;
  contextLabel?: string;
}

export function ChatDetailsPanel({ title, subtitle, members, targetId, contextLabel = "Private prototype session" }: ChatDetailsPanelProps) {
  const {
    messages,
    markConversationUnread,
    notificationPreferences,
    setNotificationPreference,
    conversationExpiry,
    setConversationExpiry,
    disappearDefaultSeconds,
    isRightPanelCollapsed,
    toggleRightPanel,
    preferences,
  } = useMockAppState();
  const currentPref = notificationPreferences[targetId] || "all";
  const expirySeconds = conversationExpiry[targetId] ?? disappearDefaultSeconds;
  const disappearSelectId = `disappearing-messages-${targetId}`;
  
  const networkIdMatch = targetId.match(/^network:([^:]+):/);
  const currentNetworkId = networkIdMatch ? networkIdMatch[1] : undefined;
  const { networkProfiles, me } = useMockAppState();

  const sharedItems = (messages[targetId] || [])
    .filter((message) => message.attachment)
    .map((message) => message.attachment!)
    .slice()
    .reverse()
    .slice(0, 8);

  if (isRightPanelCollapsed) return null;

  return (
    <aside className="hidden xl:flex h-full w-72 shrink-0 flex-col border-l border-border-default bg-surface-card">
      <div className="border-b border-border-default p-5 relative">
        <button onClick={toggleRightPanel} className="absolute right-3 top-3 p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary rounded-lg" title="Close Details Panel"><X size={18} /></button>
        <div className="h-14 w-14 rounded-2xl bg-accent-primary/15 text-accent-readable flex items-center justify-center font-black">
          {title.slice(0, 2).toUpperCase()}
        </div>
        <h3 className="mt-4 text-lg font-bold text-text-primary">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{subtitle}</p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto scrollbar-clean p-4">
        <section>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <ShieldCheck size={14} className="text-success" />
            Security preview
          </h4>
          <div className="rounded-xl border border-border-default bg-background-secondary p-3">
            <p className="text-sm font-semibold text-text-primary">{contextLabel}</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">Encryption-ready design. Production encryption is not implemented in this prototype.</p>
            
            <div className="mt-4 border-t border-border-default pt-3">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={disappearSelectId} className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                  <Clock size={14} className="text-text-muted" />
                  Disappearing Messages
                </label>
                <select
                  id={disappearSelectId}
                  value={expirySeconds}
                  onChange={(event) => setConversationExpiry(targetId, Number(event.target.value))}
                  className="shrink-0 rounded border border-border-default bg-background-primary px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  {DISAPPEAR_OPTIONS.map((option) => (
                    <option key={option.seconds} value={option.seconds}>{option.label}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
                Removes messages from this device only after the set time. This is not encryption and cannot delete copies on anyone else&apos;s device.
              </p>
            </div>

            <div className="mt-3 border-t border-border-default pt-3">
              <span className="text-xs font-semibold text-text-primary block mb-2">Notifications</span>
              <div className="flex bg-surface-selected rounded-lg p-1">
                <button 
                  onClick={() => setNotificationPreference(targetId, "all")}
                  className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-colors ${currentPref === "all" ? "bg-accent-secondary text-white" : "text-text-secondary hover:text-text-primary"}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setNotificationPreference(targetId, "mentions")}
                  className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-colors ${currentPref === "mentions" ? "bg-accent-secondary text-white" : "text-text-secondary hover:text-text-primary"}`}
                >
                  Mentions
                </button>
                <button 
                  onClick={() => setNotificationPreference(targetId, "muted")}
                  className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-colors ${currentPref === "muted" ? "bg-accent-secondary text-white" : "text-text-secondary hover:text-text-primary"}`}
                >
                  Muted
                </button>
              </div>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => markConversationUnread(targetId)}
          className="w-full rounded-xl border border-border-default px-3 py-2 text-xs font-bold text-text-secondary hover:bg-surface-hover flex items-center justify-center gap-2"
        >
          <MailOpen size={14} />
          Mark as unread
        </button>

        <section>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <Users size={14} />
            Members • {members.length}
          </h4>
          <div className="space-y-2">
            {members.map((member) => {
              const networkProfile = currentNetworkId && member.id === me.id ? networkProfiles[currentNetworkId] : undefined;
              const displayName = networkProfile?.displayName || member.name;
              
              return (
                <MemberProfilePopover key={member.id} user={member} networkId={currentNetworkId} side="left">
                  <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-hover w-full text-left">
                    <div className={`h-9 w-9 shrink-0 rounded-full text-xs font-bold text-white flex items-center justify-center ${(member.profilePictureUrl && !preferences.lowBandwidthMode) ? '' : member.avatarColor} overflow-hidden`}>
                      {member.profilePictureUrl && !preferences.lowBandwidthMode ? (
                        <img src={member.profilePictureUrl} alt={member.name} className="h-full w-full object-cover" />
                      ) : member.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{displayName}</p>
                      <p className="truncate text-[11px] capitalize text-text-muted">{member.role || member.status}</p>
                    </div>
                    <div className={`h-2.5 w-2.5 rounded-full ${member.status === "online" ? "bg-success" : member.status === "away" ? "bg-warning" : "bg-text-muted"}`} />
                  </div>
                </MemberProfilePopover>
              );
            })}
          </div>
        </section>

        <section>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <FileText size={14} />
            Shared items
          </h4>
          {sharedItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-default p-3 text-xs leading-relaxed text-text-muted">
              Photos, GIFs, and files shared in this conversation will appear here. Use the image button in the composer to share one.
            </p>
          ) : (
            <div className="space-y-2">
              {sharedItems.map((attachment, index) => (
                <article key={`${attachment.storageId || attachment.name || "attachment"}-${index}`} className="overflow-hidden rounded-xl border border-border-default bg-background-secondary">
                  {attachment.type === "image" || attachment.type === "gif" ? (
                    <StoredMediaPreview attachment={attachment} className="h-28 w-full object-cover" expandable />
                  ) : (
                    <div className="flex items-center gap-2 p-3">
                      <FileText size={18} className="shrink-0 text-accent-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-text-primary">{attachment.name || "Attached file"}</p>
                        <p className="text-[10px] text-text-muted">{formatBytes(attachment.size || 0)}</p>
                      </div>
                      <PrototypeDownloadButton attachment={attachment} compact />
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <ChatAppearancePanel targetId={targetId} />
      </div>
    </aside>
  );
}
