import { useNavigate } from "react-router";
import { useMockAppState } from "../state/mockAppState";
import { canViewRoom } from "../data/mockNetworks";

export function MobileConversationSwitcher({ currentChatId }: { currentChatId: string }) {
  const { chatList } = useMockAppState();
  const navigate = useNavigate();

  return (
    <select
      value={currentChatId}
      onChange={(event) => {
        const chat = chatList[event.target.value];
        if (!chat) return;
        navigate(chat.type === "group"
          ? `/app/private/group/${chat.id}`
          : `/app/private/dm/${chat.id}`);
      }}
      className="max-w-36 rounded-lg border border-border-default bg-background-secondary px-2 py-1.5 text-xs font-bold text-text-primary md:hidden"
      aria-label="Choose conversation"
    >
      {Object.values(chatList).map((chat) => (
        <option key={chat.id} value={chat.id}>{chat.unreadCount ? `(${chat.unreadCount}) ` : ""}{chat.name || "Private chat"}</option>
      ))}
    </select>
  );
}

export function MobileRoomSwitcher({ currentNetworkId, currentRoomId }: { currentNetworkId: string; currentRoomId: string }) {
  const { networks, me } = useMockAppState();
  const navigate = useNavigate();
  const value = `${currentNetworkId}:${currentRoomId}`;

  return (
    <select
      value={value}
      onChange={(event) => {
        const separator = event.target.value.indexOf(":");
        const networkId = event.target.value.slice(0, separator);
        const roomId = event.target.value.slice(separator + 1);
        navigate(`/app/network/${networkId}/room/${roomId}`);
      }}
      className="max-w-40 rounded-lg border border-border-default bg-background-secondary px-2 py-1.5 text-xs font-bold text-text-primary md:hidden"
      aria-label="Choose Network room"
    >
      {Object.values(networks).flatMap((network) => (
        network.rooms.flatMap((section) => section.items
          .filter((room) => !room.archived && room.name !== "Mission Room" && room.name !== "File Vault" && canViewRoom(room, me.id, network || {}))
          .map((room) => (
            <option key={`${network.id}:${room.id}`} value={`${network.id}:${room.id}`}>
              {room.unread ? `(${room.unread}) ` : ""}{network.name.replace(" Network", "")} / {room.name}
            </option>
          )))
      ))}
    </select>
  );
}
