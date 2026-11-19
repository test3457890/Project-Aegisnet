import { Check, CheckCheck, EyeOff, FileText, Image as ImageIcon, Lock, SmilePlus, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { useMockAppState } from "../../state/mockAppState";
import { formatBytes } from "../../utils/files";
import { MockMessage } from "../../data/mockChats";
import { formatTimeLeft, hidesPreviews, isExpired, PrivacyMode } from "../../utils/privacy";
import { PrototypeDownloadButton, StoredMediaPreview } from "./StoredAttachment";
import { bubbleStyle } from "../../state/chatAppearance";
import { MemberProfilePopover } from "../ui/MemberProfilePopover";
import { wsClient, SyncEvent } from "../../api/wsClient";

function useTypingIndicator(targetId: string) {
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const { users, me } = useMockAppState();
  
  useEffect(() => {
    const handleTyping = (event: SyncEvent) => {
      if ((event.eventType === "typing:start" || event.eventType === "typing:stop") && event.actorId !== me.id) {
         setTypingUserIds(prev => {
           const next = new Set(prev);
           if (event.eventType === "typing:start") {
             next.add(event.actorId);
           } else {
             next.delete(event.actorId);
           }
           return next;
         });
         
         if (event.eventType === "typing:start") {
           // Auto expire after 5 seconds to prevent stuck indicators
           setTimeout(() => {
             setTypingUserIds(prev => {
               const next = new Set(prev);
               next.delete(event.actorId);
               return next;
             });
           }, 5000);
         }
      }
    };
    
    wsClient.on("typing:start", handleTyping);
    wsClient.on("typing:stop", handleTyping);
    return () => {
      wsClient.off("typing:start", handleTyping);
      wsClient.off("typing:stop", handleTyping);
    };
  }, [me.id]);

  return Array.from(typingUserIds).map(id => users[id] || { id, name: "Someone", initials: "?" });
}

/** Media that stays covered until tapped while a privacy mode hides previews. */
function RevealableMedia({
  attachment,
  privacyMode,
  className,
}: {
  attachment: NonNullable<MockMessage["attachment"]>;
  privacyMode: PrivacyMode;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  if (hidesPreviews(privacyMode) && !revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="flex min-h-28 w-full min-w-48 max-w-sm flex-col items-center justify-center gap-2 rounded-xl bg-background-primary/30 px-4 py-6 text-xs font-semibold"
      >
        <EyeOff size={22} className="opacity-80" />
        Tap to reveal media
      </button>
    );
  }
  return <StoredMediaPreview attachment={attachment} className={className} expandable />;
}

interface MessageTimelineProps {
  targetId: string;
  emptyTitle?: string;
  emptyBody?: string;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "👀", "✅"];

export function MessageTimeline({
  targetId,
  emptyTitle = "Start the conversation",
  emptyBody = "Share an update, a photo, a GIF, or a file when you are ready.",
}: MessageTimelineProps) {
  const { messages, users, me, lastReadMessageIds, privacyMode, toggleMessageReaction, networkProfiles, preferences, chatAppearance } = useMockAppState();
  // Local-only per-chat bubble color (curated white-text-safe presets).
  const outgoingBubbleStyle = bubbleStyle(chatAppearance[targetId]);
  // Read receipts preference (local-only): when off, delivery/read state is
  // hidden on the current user's outgoing messages.
  const showReadReceipts = preferences.readReceipts;
  const now = Date.now();
  const items = (messages[targetId] || []).filter((message) => !isExpired(message, now));
  const endRef = useRef<HTMLDivElement>(null);
  const [visibleReadMarker, setVisibleReadMarker] = useState<string | null | undefined>(
    lastReadMessageIds[targetId],
  );
  
  const networkIdMatch = targetId.match(/^network:([^:]+):/);
  const currentNetworkId = networkIdMatch ? networkIdMatch[1] : undefined;
  
  const typingUsers = useTypingIndicator(targetId);

  const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleReadMarker(lastReadMessageIds[targetId]);
  }, [targetId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [targetId, items.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerMessageId && pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerMessageId(null);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && pickerMessageId) {
        setPickerMessageId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [pickerMessageId]);

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-72 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 h-16 w-16 rounded-2xl bg-accent-primary/10 text-accent-primary flex items-center justify-center">
          <ImageIcon size={28} />
        </div>
        <h3 className="text-lg font-bold text-text-primary">{emptyTitle}</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-4 scrollbar-clean">
      <div className="flex justify-center my-5">
        <span className="rounded-full border border-border-default bg-surface-card px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Today
        </span>
      </div>

      {items.map((message, index) => {
        const isMe = message.senderId === me.id;
        const sender = isMe ? me : users[message.senderId];
        
        let senderName = isMe ? "You" : sender?.name || "Group member";
        if (isMe && currentNetworkId && networkProfiles[currentNetworkId]?.displayName) {
          senderName = networkProfiles[currentNetworkId].displayName + " (You)";
        }
        
        const initials = sender?.initials || "GM";
        const avatarColor = sender?.avatarColor || "bg-slate-600";

        const showUnreadBefore = (
          (visibleReadMarker === null && index === 0)
          || (index > 0 && items[index - 1].id === visibleReadMarker)
        );

        const prevMessage = index > 0 ? items[index - 1] : null;
        let groupedWithPrevious = prevMessage ? prevMessage.senderId === message.senderId : false;
        
        if (showUnreadBefore) {
          groupedWithPrevious = false;
        }
        
        if (groupedWithPrevious && prevMessage) {
          if (message.createdAt && prevMessage.createdAt) {
            if (message.createdAt - prevMessage.createdAt > 5 * 60 * 1000) {
              groupedWithPrevious = false;
            }
          } else if (message.timestamp !== prevMessage.timestamp) {
            groupedWithPrevious = false;
          }
        }

        const nextMessage = index < items.length - 1 ? items[index + 1] : null;
        let groupedWithNext = nextMessage ? nextMessage.senderId === message.senderId : false;
        
        if (groupedWithNext && nextMessage) {
          const nextShowUnread = (index + 1 > 0 && items[index].id === visibleReadMarker);
          if (nextShowUnread) {
            groupedWithNext = false;
          } else if (message.createdAt && nextMessage.createdAt) {
            if (nextMessage.createdAt - message.createdAt > 5 * 60 * 1000) {
              groupedWithNext = false;
            }
          } else if (message.timestamp !== nextMessage.timestamp) {
            groupedWithNext = false;
          }
        }

        return (
          <div key={message.id} className={clsx("flex flex-col w-full", groupedWithPrevious ? "mt-1" : "mt-5")}>
            {showUnreadBefore && (
              <div className="my-5 flex items-center gap-3" role="separator" aria-label="New messages">
                <div className="h-px flex-1 bg-accent-primary/35" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-readable">New messages</span>
                <div className="h-px flex-1 bg-accent-primary/35" />
              </div>
            )}
            <div
              className={clsx("flex max-w-[88%] items-end gap-2 sm:max-w-2xl", isMe && "ml-auto flex-row-reverse")}
            >
              {sender ? (
                <MemberProfilePopover user={sender} networkId={currentNetworkId} side={isMe ? "left" : "right"}>
                  <div className={clsx("h-8 w-8 shrink-0 rounded-full text-[11px] font-bold text-white flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent-primary focus:ring-2 focus:ring-accent-primary transition-all", (sender.profilePictureUrl && !preferences.lowBandwidthMode) ? "" : avatarColor, groupedWithNext && "opacity-0 invisible")}>
                    {sender.profilePictureUrl && !preferences.lowBandwidthMode ? (
                      <img src={sender.profilePictureUrl} alt={sender.name} className="h-full w-full object-cover" />
                    ) : initials}
                  </div>
                </MemberProfilePopover>
              ) : (
                <div className={clsx("h-8 w-8 shrink-0 rounded-full text-[11px] font-bold text-white flex items-center justify-center", avatarColor, groupedWithNext && "opacity-0 invisible")}>
                  {initials}
                </div>
              )}
              <div className={clsx("flex min-w-0 flex-col gap-1 w-full relative group/msg", isMe ? "items-end" : "items-start")}>
                {!groupedWithPrevious && (
                  sender ? (
                    <MemberProfilePopover user={sender} networkId={currentNetworkId} side={isMe ? "left" : "right"}>
                      <span className="px-1 text-[11px] font-semibold text-text-muted hover:underline cursor-pointer focus:outline-none focus:text-text-primary">{senderName}</span>
                    </MemberProfilePopover>
                  ) : (
                    <span className="px-1 text-[11px] font-semibold text-text-muted">{senderName}</span>
                  )
                )}
                
                <div className="relative w-full flex flex-col">
                  <div
                    style={isMe ? outgoingBubbleStyle : undefined}
                    className={clsx(
                      "max-w-full overflow-hidden border shadow-sm self-auto inline-block",
                      isMe ? "bg-accent-secondary text-white border-accent-primary/20" : "bg-surface-card text-text-primary border-border-default",
                      isMe ? "self-end" : "self-start",
                      isMe 
                        ? clsx(
                            "rounded-l-2xl",
                            groupedWithPrevious ? "rounded-tr-md" : "rounded-tr-2xl",
                            groupedWithNext ? "rounded-br-md" : "rounded-br-sm"
                          )
                        : clsx(
                            "rounded-r-2xl",
                            groupedWithPrevious ? "rounded-tl-md" : "rounded-tl-2xl",
                            groupedWithNext ? "rounded-bl-md" : "rounded-bl-sm"
                          )
                    )}
                  >
                    {message.attachment && (message.attachment.type === "image" || message.attachment.type === "gif") && (
                      <div className="p-1">
                        <RevealableMedia
                          attachment={message.attachment}
                          privacyMode={privacyMode}
                          className="max-h-80 w-full min-w-48 max-w-sm rounded-xl object-cover"
                        />
                        {message.attachment.name && (
                          <p className="px-2 py-1 text-[10px] opacity-75">{message.attachment.name}</p>
                        )}
                      </div>
                    )}
                    {message.attachment?.type === "file" && (
                      <div className="flex min-w-56 items-center gap-3 p-3">
                        {message.attachment.thumbnailUrl ? (
                          <img src={message.attachment.thumbnailUrl} alt="" className="h-14 w-20 rounded-xl object-cover" />
                        ) : (
                          <div className="h-11 w-11 rounded-xl bg-background-primary/20 flex items-center justify-center">
                            <FileText size={22} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{message.attachment.name || "Attached file"}</p>
                          <p className="text-[11px] opacity-75">
                            {message.attachment.mimeType || "File"} • {formatBytes(message.attachment.size || 0)}
                          </p>
                        </div>
                        {privacyMode === "lockdown" ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold opacity-75" title="Downloads are restricted in Lockdown Mode">
                            <Lock size={11} /> Restricted
                          </span>
                        ) : (
                          <PrototypeDownloadButton attachment={message.attachment} compact />
                        )}
                      </div>
                    )}
                    {message.attachment?.type === "audio" && (
                      <div className="flex min-w-52 items-center gap-3 p-3">
                        <div className="h-9 w-9 rounded-full bg-background-primary/20 flex items-center justify-center">▶</div>
                        <div className="flex-1 h-1 rounded-full bg-current opacity-40" />
                        <span className="text-xs">{message.attachment.duration || 0}s</span>
                      </div>
                    )}
                    {message.text && <p className="whitespace-pre-wrap break-words px-4 py-2.5 text-[15px] leading-relaxed">{message.text}</p>}
                  </div>
                  
                  {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className={clsx("flex flex-wrap gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
                      {Object.entries(message.reactions).map(([emoji, usersArr]) => {
                        const count = usersArr.length;
                        const hasReacted = usersArr.includes(me.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleMessageReaction(targetId, message.id, emoji)}
                            aria-label={`${hasReacted ? 'Remove' : 'Add'} reaction ${emoji}`}
                            className={clsx(
                              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold transition-colors border",
                              hasReacted 
                                ? "bg-accent-primary/20 border-accent-primary/40 text-accent-readable" 
                                : "bg-surface-hover border-border-default text-text-muted hover:bg-surface-selected hover:text-text-primary"
                            )}
                          >
                            <span>{emoji}</span>
                            <span className="opacity-80">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!groupedWithNext && (
                    <div className={clsx("flex items-center gap-2 px-1 text-[10px] text-text-muted mt-1", isMe ? "justify-end" : "justify-start")}>
                      <span>{message.timestamp}</span>
                      {isMe && showReadReceipts && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{message.status}</span>
                        </>
                      )}
                      {typeof message.expiresAt === "number" && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-accent-readable" title="Disappearing message">
                            <Timer size={11} /> {formatTimeLeft(message.expiresAt, now)}
                          </span>
                        </>
                      )}
                      {isMe && showReadReceipts && (
                        message.status === "read"
                          ? <CheckCheck size={13} className="text-accent-primary ml-1" />
                          : message.status === "delivered"
                            ? <CheckCheck size={13} className="ml-1" />
                            : <Check size={13} className="ml-1" />
                      )}
                    </div>
                  )}
                  
                  <div className={clsx(
                    "absolute top-0 flex items-center justify-center opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity z-10",
                    isMe ? "-left-10" : "-right-10"
                  )}>
                    <button 
                      aria-label="Add reaction"
                      onClick={() => setPickerMessageId(pickerMessageId === message.id ? null : message.id)}
                      className="p-1.5 rounded-full bg-surface-card border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-hover shadow-sm"
                    >
                      <SmilePlus size={16} />
                    </button>
                    {pickerMessageId === message.id && (
                      <div ref={pickerRef} className={clsx(
                        "absolute top-0 flex gap-1 p-1.5 rounded-full bg-surface-overlay border border-border-default shadow-xl backdrop-blur-md",
                        isMe ? "right-full mr-2" : "left-full ml-2"
                      )} role="dialog" aria-label="Emoji picker">
                        {QUICK_REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            aria-label={`React with ${emoji}`}
                            onClick={() => {
                              toggleMessageReaction(targetId, message.id, emoji);
                              setPickerMessageId(null);
                            }}
                            className="p-1.5 rounded-full text-lg leading-none hover:bg-surface-hover hover:scale-110 transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 mt-4 px-12 text-xs font-semibold text-text-muted italic animate-pulse">
          {typingUsers.length === 1 
            ? `${typingUsers[0].name} is typing...`
            : `${typingUsers.length} people are typing...`}
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
