import { ArrowLeft, Search, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink } from "react-router";
import { clsx } from "clsx";
import { useMockAppState } from "../state/mockAppState";
import { maskSnippet } from "../utils/privacy";
import { CreateConversationDialog } from "./CreateConversationDialog";
import { MemberProfilePopover } from "./ui/MemberProfilePopover";

export function PrivateSidebar() {
  const { chatList, users, me, privacyMode } = useMockAppState();
  const [query, setQuery] = useState("");

  const chats = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return Object.values(chatList).filter((chat) => (
      !normalizedQuery || (chat.name || "").toLowerCase().includes(normalizedQuery)
    ));
  }, [chatList, query]);

  const directChats = chats.filter((chat) => chat.type === "direct");
  const groupChats = chats.filter((chat) => chat.type === "group");

  const renderChat = (chat: typeof directChats[number]) => {
    const otherUserId = chat.participants.find((participantId) => participantId !== me.id);
    const otherUser = otherUserId ? users[otherUserId] : undefined;
    const name = chat.type === "direct" ? otherUser?.name || chat.name : chat.name;
    const initials = chat.type === "direct"
      ? otherUser?.initials || name?.slice(0, 2).toUpperCase()
      : name?.split(" ").map((word) => word[0]).slice(0, 2).join("");
    const avatarColor = chat.type === "direct" ? otherUser?.avatarColor || "bg-accent-primary" : "bg-indigo-600";
    const path = chat.type === "direct"
      ? `/app/private/dm/${chat.id}`
      : `/app/private/group/${chat.id}`;

    return (
      <NavLink
        key={chat.id}
        to={path}
        className={({ isActive }) => clsx(
          "relative flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors",
          isActive
            ? "border-accent-primary/50 bg-surface-selected"
            : "border-transparent hover:bg-surface-hover",
        )}
      >
        {({ isActive }) => (
          <>
            {isActive && <span className="absolute left-0 h-8 w-1 rounded-r-full bg-accent-primary" />}
            <div className="relative shrink-0">
              {otherUser && chat.type === "direct" ? (
                <MemberProfilePopover user={otherUser} side="right">
                  <div className={`h-11 w-11 rounded-full text-xs font-bold text-white flex items-center justify-center ${otherUser.profilePictureUrl ? '' : avatarColor} overflow-hidden hover:ring-2 hover:ring-accent-primary transition-all cursor-pointer`}>
                    {otherUser.profilePictureUrl ? (
                      <img src={otherUser.profilePictureUrl} alt={name} className="h-full w-full object-cover" />
                    ) : (initials || "CH")}
                  </div>
                </MemberProfilePopover>
              ) : (
                <div className={`h-11 w-11 rounded-full text-xs font-bold text-white flex items-center justify-center ${avatarColor}`}>
                  {initials || "CH"}
                </div>
              )}
              {chat.type === "group" ? (
                <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-background-primary bg-accent-primary p-0.5 text-white">
                  <Users size={10} />
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-background-primary bg-success p-0.5 text-white">
                  <ShieldCheck size={10} />
                </div>
              )}
              {chat.unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full border-2 border-background-primary bg-accent-secondary px-1 text-center text-[10px] font-bold text-white">
                  {chat.unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="truncate text-sm font-bold text-text-primary">{name || "Private chat"}</h3>
                <span className="shrink-0 text-[10px] text-text-secondary">{chat.lastActivityAt}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-text-secondary">{maskSnippet(chat.lastMessageSnippet, privacyMode)}</p>
            </div>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <aside className="hidden h-full w-80 shrink-0 flex-col border-r border-border-default bg-background-primary md:flex">
      <div className="h-16 shrink-0 border-b border-border-default px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NavLink to="/app" className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary" aria-label="Back to dashboard">
            <ArrowLeft size={18} />
          </NavLink>
          <h2 className="text-lg font-bold text-text-primary">Messages</h2>
        </div>
        <CreateConversationDialog />
      </div>

      <div className="p-3">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-xl border border-border-default bg-background-secondary py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
          />
        </label>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto scrollbar-clean p-2">
        <section>
          <h3 className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Private messages</h3>
          <div className="space-y-1">{directChats.map(renderChat)}</div>
        </section>
        <section>
          <h3 className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Private groups</h3>
          <div className="space-y-1">{groupChats.map(renderChat)}</div>
        </section>
        {chats.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No chats match that search.</p>
        )}
      </div>

      <div className="border-t border-border-default p-4 text-xs text-text-muted flex items-center gap-2">
        <ShieldCheck size={15} className="text-success" />
        Private prototype session
      </div>
    </aside>
  );
}
