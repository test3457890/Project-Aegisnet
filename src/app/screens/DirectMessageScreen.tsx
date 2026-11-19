import { Phone, ShieldCheck, Video, Info } from "lucide-react";
import { Navigate, NavLink, useParams } from "react-router";
import { clsx } from "clsx";
import { useEffect } from "react";
import { ChatDetailsPanel } from "../components/chat/ChatDetailsPanel";
import { MessageComposer } from "../components/chat/MessageComposer";
import { MessageTimeline } from "../components/chat/MessageTimeline";
import { useMockAppState } from "../state/mockAppState";
import { MobileConversationSwitcher } from "../components/MobileContextSwitcher";
import { wallpaperStyle } from "../state/chatAppearance";
import { useWallpaperUrl } from "../hooks/useWallpaperUrl";

export function DirectMessageScreen() {
  const { chatId = "chat_sarah" } = useParams();
  const { chatList, users, me, setSelectedChatId, markConversationRead, isRightPanelCollapsed, toggleRightPanel, chatAppearance } = useMockAppState();
  const chat = chatList[chatId];
  const appearance = chatAppearance[chatId];
  const customUrl = useWallpaperUrl(appearance?.customWallpaperHash);

  useEffect(() => {
    setSelectedChatId(chatId);
  }, [chatId, setSelectedChatId]);

  useEffect(() => {
    const timer = window.setTimeout(() => markConversationRead(chatId), 700);
    return () => window.clearTimeout(timer);
  }, [chatId]);

  if (chat?.type === "group") {
    return <Navigate to={`/app/private/group/${chatId}`} replace />;
  }

  if (!chat) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background-primary p-8 text-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Chat not found</h2>
          <p className="mt-2 text-sm text-text-secondary">Choose another private message from the list.</p>
        </div>
      </div>
    );
  }

  const otherUserId = chat.participants.find((participantId) => participantId !== me.id);
  const otherUser = otherUserId ? users[otherUserId] : undefined;
  const title = otherUser?.name || chat.name || "Private message";
  const members = [me, ...(otherUser ? [otherUser] : [])];

  return (
    <div className="flex h-full w-full overflow-hidden bg-background-primary">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="h-16 shrink-0 border-b border-border-default bg-surface-card/90 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`h-10 w-10 shrink-0 rounded-full text-sm font-bold text-white flex items-center justify-center ${otherUser?.avatarColor || "bg-accent-primary"}`}>
              {otherUser?.initials || title.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-text-primary">{title}</h1>
              <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                <ShieldCheck size={13} className="text-success" />
                Private prototype session
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MobileConversationSwitcher currentChatId={chatId} />
            <NavLink
              to={`/app/private/dm/${chatId}/call/voice`}
              className="rounded-full border border-border-default bg-background-secondary p-2.5 text-text-secondary hover:bg-surface-hover hover:text-accent-primary"
              aria-label={`Start voice call with ${title}`}
              title="Voice call"
            >
              <Phone size={19} />
            </NavLink>
            <NavLink
              to={`/app/private/dm/${chatId}/call/video`}
              className="rounded-full border border-border-default bg-background-secondary p-2.5 text-text-secondary hover:bg-surface-hover hover:text-accent-primary hidden sm:block"
              aria-label={`Start video call with ${title}`}
              title="Video call"
            >
              <Video size={19} />
            </NavLink>
            <button
              type="button"
              className={clsx("rounded-full border border-border-default bg-background-secondary p-2.5 text-text-secondary hover:bg-surface-hover hover:text-accent-primary", !isRightPanelCollapsed && "xl:hidden")}
              onClick={toggleRightPanel}
              title="Contact Info"
            >
              <Info size={19} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-clean p-4 lg:p-6" style={wallpaperStyle(appearance, () => customUrl)}>
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 rounded-2xl border border-border-default bg-surface-card px-4 py-3 text-center">
              <p className="text-xs font-semibold text-text-secondary flex items-center justify-center gap-2">
                <ShieldCheck size={14} className="text-warning" />
                Prototype UI only • Not real E2EE
              </p>
            </div>

            {chat?.isSupervisedThread && (
              <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
                  <ShieldCheck size={14} />
                  Supervised Thread
                </p>
                <p className="mt-1 text-xs text-text-secondary max-w-sm mx-auto">
                  This conversation includes a Protected Person and is being supervised according to Network policy.
                </p>
              </div>
            )}

            <MessageTimeline
              targetId={chatId}
              emptyTitle={`Say hello to ${title}`}
              emptyBody="This private chat is empty. Send the first message or share a local attachment."
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-border-default bg-surface-card/90 p-3 lg:p-4">
          <div className="mx-auto max-w-4xl">
            <MessageComposer targetId={chatId} placeholder={`Message ${title}`} />
          </div>
        </div>
      </section>

      <ChatDetailsPanel
        title={title}
        subtitle={otherUser?.role || "Private contact"}
        members={members}
        targetId={chatId}
      />
    </div>
  );
}
