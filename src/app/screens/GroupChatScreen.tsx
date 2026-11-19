import { Phone, ShieldCheck, Video, Info, Lock } from "lucide-react";
import { NavLink, useParams } from "react-router";
import { clsx } from "clsx";
import { useEffect } from "react";
import { ChatDetailsPanel } from "../components/chat/ChatDetailsPanel";
import { MessageComposer } from "../components/chat/MessageComposer";
import { MessageTimeline } from "../components/chat/MessageTimeline";
import { useMockAppState } from "../state/mockAppState";
import { canViewRoom } from "../data/mockNetworks";
import { getRoomConversationId } from "../utils/files";
import { MobileConversationSwitcher, MobileRoomSwitcher } from "../components/MobileContextSwitcher";
import { ManageGroupDialog } from "../components/ManageSpaceDialog";
import { wallpaperStyle } from "../state/chatAppearance";
import { useWallpaperUrl } from "../hooks/useWallpaperUrl";
import { PlanningRoomScreen } from "./PlanningRoomScreen";
import { NetworkWelcomeScreen } from "../components/welcome/NetworkWelcomeScreen";
import { MockOrgTreeNode } from "../data/mockNetworks";
import { ActiveVoicePanel } from "../components/chat/ActiveVoicePanel";
import { MissionVoicePanel } from "../components/chat/MissionVoicePanel";

export function GroupChatScreen() {
  const { chatId, networkId, roomId } = useParams();
  const {
    chatList,
    networks,
    users,
    me,
    setSelectedChatId,
    setSelectedNetworkId,
    setSelectedRoomId,
    markConversationRead,
    isRightPanelCollapsed,
    toggleRightPanel,
    chatAppearance,
  } = useMockAppState();

  const privateGroup = chatId ? chatList[chatId] : undefined;
  const network = networkId ? networks[networkId] : undefined;
  const room = network?.rooms.flatMap((section) => section.items).find((item) => item.id === roomId);
  const isPrivateGroup = Boolean(privateGroup);
  const targetId = isPrivateGroup
    ? String(chatId)
    : getRoomConversationId(String(networkId), String(roomId));

  const appearance = chatAppearance[targetId];
  const customUrl = useWallpaperUrl(appearance?.customWallpaperHash);

  const hasPermission = (perm: string) => {
    if (!network) return true;
    if (network.ownerId === me.id) return true;
    if (!network.roles) return true;
    const userRoleIds = network.memberRoles?.[me.id] || [];
    const userRoles = network.roles.filter(r => userRoleIds.includes(r.id));
    return userRoles.some(r => r.permissions.includes("*") || r.permissions.includes(perm));
  };

  // Prototype access control: check room visibility.
  // NOTE: This is UI-only filtering, not a production security boundary.
  const hasRoomAccess = !networkId || !room || !network || canViewRoom(room, me.id, network);

  useEffect(() => {
    if (chatId) setSelectedChatId(chatId);
    if (networkId) setSelectedNetworkId(networkId);
    if (roomId) setSelectedRoomId(roomId);
  }, [chatId, networkId, roomId, setSelectedChatId, setSelectedNetworkId, setSelectedRoomId]);

  useEffect(() => {
    const timer = window.setTimeout(() => markConversationRead(targetId), 700);
    return () => window.clearTimeout(timer);
  }, [targetId]);

  // Access denied guard (prototype UI-only).
  if (networkId && room && !hasRoomAccess) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background-primary px-4">
        <div className="rounded-2xl border border-border-default bg-surface-card p-8 text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
            <Lock size={24} className="text-danger-readable" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Access Denied</h2>
          <p className="mt-2 text-sm text-text-secondary">You do not currently have access to this Room.</p>
          <p className="mt-1 text-sm text-text-secondary">Contact a Network owner or admin if you believe this is a mistake.</p>
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <p className="text-[11px] text-amber-700 dark:text-amber-400">Prototype access control. Not a production security boundary.</p>
          </div>
        </div>
      </div>
    );
  }

  // Welcome flow interceptor
  if (networkId && network && !network.welcomeAcknowledged?.[me.id]) {
    return <NetworkWelcomeScreen networkId={networkId} />;
  }

  // Dispatch to specialized room types.
  if (room?.type === "planning") {
    return <PlanningRoomScreen />;
  }

  if ((!privateGroup && !network) || (!privateGroup && !room)) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background-primary p-8 text-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Shared space not found</h2>
          <p className="mt-2 text-sm text-text-secondary">Choose another group or room from the navigation.</p>
        </div>
      </div>
    );
  }

  const title = privateGroup?.name || room?.name || "Group chat";
  const subtitle = privateGroup
    ? "Private group chat"
    : `${network?.name} room`;
  const participantIds = privateGroup?.participants || network?.memberIds || [me.id, ...Object.keys(users).slice(0, 4)];
  const members = participantIds
    .map((participantId) => participantId === me.id ? me : users[participantId])
    .filter(Boolean);
  const callBase = isPrivateGroup
    ? `/app/private/group/${chatId}/call`
    : `/app/network/${networkId}/room/${roomId}/call`;

  // Task 2: Derive related leadership from orgNodes
  const roomLeadership = !isPrivateGroup && network?.orgNodes
    ? network.orgNodes.filter((n: MockOrgTreeNode) => {
        if (!n.assignedMemberId) return false;
        const nameLower = n.name.toLowerCase();
        if (room?.type === "mission") {
          return nameLower.includes("mission lead") || nameLower.includes("safety") || n.missionRole;
        }
        return nameLower.includes("room lead") || nameLower.includes("lead") || nameLower.includes("commander") || nameLower.includes("officer");
      })
    : [];

  return (
    <div className="flex h-full w-full overflow-hidden bg-background-primary">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="h-16 shrink-0 border-b border-border-default bg-surface-card/90 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-accent-primary/15 text-sm font-black text-accent-readable flex items-center justify-center">
              {title.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-text-primary">{title}</h1>
              <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                <ShieldCheck size={13} className="text-success" />
                {members.length} members • {subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPrivateGroup ? (
              <MobileConversationSwitcher currentChatId={String(chatId)} />
            ) : (
              <MobileRoomSwitcher currentNetworkId={String(networkId)} currentRoomId={String(roomId)} />
            )}
            {isPrivateGroup && <ManageGroupDialog chatId={String(chatId)} />}
            {(!network || hasPermission("start_calls")) && (
              <>
                <NavLink
                  to={`${callBase}/voice`}
                  className="rounded-full border border-border-default bg-background-secondary p-2.5 text-text-secondary hover:bg-surface-hover hover:text-accent-primary"
                  aria-label={`Start group voice call in ${title}`}
                  title="Group voice call"
                >
                  <Phone size={19} />
                </NavLink>
                <NavLink
                  to={`${callBase}/video`}
                  className="rounded-full border border-border-default bg-background-secondary p-2.5 text-text-secondary hover:bg-surface-hover hover:text-accent-primary hidden sm:block"
                  aria-label={`Start group video call in ${title}`}
                  title="Group video call"
                >
                  <Video size={19} />
                </NavLink>
              </>
            )}
            <button
              type="button"
              className={clsx("rounded-full border border-border-default bg-background-secondary p-2.5 text-text-secondary hover:bg-surface-hover hover:text-accent-primary", !isRightPanelCollapsed && "xl:hidden")}
              onClick={toggleRightPanel}
              title="Group Info"
            >
              <Info size={19} />
            </button>
          </div>
        </header>

      <div className="flex flex-1 flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto scrollbar-clean p-4 lg:p-6" style={wallpaperStyle(appearance, () => customUrl)}>
          <div className="mx-auto flex max-w-4xl flex-col justify-end min-h-full">
            <div className="mb-6 rounded-2xl border border-border-default bg-surface-card px-4 py-3 text-center">
              <p className="text-xs font-semibold text-text-secondary flex items-center justify-center gap-2">
                <ShieldCheck size={14} className="text-warning" />
                Prototype UI only • Not real E2EE
              </p>
            </div>

            {privateGroup?.isSupervisedThread && (
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

            {!isPrivateGroup && roomLeadership && roomLeadership.length > 0 && (
              <div className="mb-6 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <ShieldCheck size={14} className="text-accent-primary" />
                  Room Leadership
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {roomLeadership.map((leader: MockOrgTreeNode) => {
                    const lUser = leader.assignedMemberId ? users[leader.assignedMemberId] : null;
                    if (!lUser) return null;
                    return (
                      <div key={leader.id} className="flex items-center gap-2 rounded-xl border border-border-default bg-surface-card px-3 py-1.5 shadow-sm">
                        <img src={lUser.avatarUrl} alt={lUser.name} className="h-6 w-6 rounded-full bg-surface-hover object-cover" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-text-primary leading-tight">{lUser.name}</span>
                          <span className="text-[10px] font-medium text-text-secondary uppercase leading-tight">{leader.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {room?.type === "voice" && (
              <ActiveVoicePanel members={members} hasPermission={hasPermission} />
            )}

            {room?.type === "mission" && (
              <MissionVoicePanel members={members} hasPermission={hasPermission} roomLeadership={roomLeadership} />
            )}

            <MessageTimeline
              targetId={targetId}
              emptyTitle={`Start ${title}`}
              emptyBody={isPrivateGroup
                ? "This group is ready for messages, photos, GIFs, and files."
                : "This room is quiet right now. Share the first update with the Network."}
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-border-default bg-surface-card/90 p-3 lg:p-4">
          <div className="mx-auto max-w-4xl">
            <MessageComposer targetId={targetId} placeholder={`Message ${title}`} />
          </div>
        </div>
      </div>
      </section>

      <ChatDetailsPanel
        title={title}
        subtitle={subtitle}
        members={members}
        targetId={targetId}
        contextLabel={isPrivateGroup ? "Private group prototype" : "Network room prototype"}
      />
    </div>
  );
}
