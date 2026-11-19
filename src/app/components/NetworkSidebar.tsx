import {
  Activity, FolderLock, GraduationCap, Home, Map, MapPin,
  MessageSquare, Mountain, Shield, ShieldAlert, User, Users,
} from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { clsx } from "clsx";
import { useMockAppState } from "../state/mockAppState";
import { useState, useEffect } from "react";
import { CreateNetworkDialog } from "./CreateNetworkDialog";
import { JoinNetworkDialog } from "./JoinNetworkDialog";
import { wsClient, ConnectionState } from "../api/wsClient";

const iconByNetwork: Record<string, typeof Users> = {
  net_family: Users,
  net_roadtrip: Map,
  net_hiking: Mountain,
  net_neighborhood: MapPin,
  net_school: GraduationCap,
  net_cyber: Shield,
  net_sar: Activity,
};

export function NetworkSidebar() {
  const { chatList, networks, networkFolders, networkOrder, reorderNetwork, updateNetworkFolder, selectedChatId, setSelectedNetworkId, setSelectedRoomId } = useMockAppState();
  const location = useLocation();
  const [draggedNetwork, setDraggedNetwork] = useState<string | null>(null);
  const [dragOverNetwork, setDragOverNetwork] = useState<string | null>(null);
  const [wsState, setWsState] = useState<ConnectionState>(wsClient.getState());

  useEffect(() => {
    return wsClient.onStateChange(setWsState);
  }, []);

  const selectedChat = selectedChatId ? chatList[selectedChatId] : undefined;
  const privatePath = selectedChat?.type === "group"
    ? `/app/private/group/${selectedChat.id}`
    : `/app/private/dm/${selectedChatId || "chat_sarah"}`;

  const itemClass = (active: boolean) => clsx(
    "relative h-12 w-12 rounded-2xl border flex items-center justify-center transition-all",
    active
      ? "rounded-xl border-accent-primary/50 bg-surface-selected text-text-primary"
      : "border-transparent bg-background-secondary text-text-secondary hover:rounded-xl hover:bg-surface-hover hover:text-text-primary",
  );

  return (
    <aside className="z-20 flex h-full w-16 shrink-0 flex-col items-center gap-3 border-r border-border-default bg-background-primary py-4 md:w-20">
      <NavLink to="/app" end className={({ isActive }) => itemClass(isActive)} aria-label="Home dashboard" title="Home dashboard">
        <Home size={23} />
      </NavLink>
      <NavLink
        to={privatePath}
        className={({ isActive }) => itemClass(isActive)}
        aria-label="Private messages"
        title="Private messages"
      >
        <MessageSquare size={23} />
      </NavLink>

      <div className="my-1 h-px w-8 bg-border-default" />

      <div className="flex flex-1 flex-col items-center gap-3 overflow-y-auto scrollbar-clean px-1">
        {networkOrder.map((itemId) => {
          const folder = networkFolders?.[itemId];
          
          if (folder) {
            return (
              <div key={folder.id} className="flex w-full flex-col items-center gap-2 relative group mt-2 mb-1">
                <button
                  onClick={() => updateNetworkFolder(folder.id, { isCollapsed: !folder.isCollapsed })}
                  className="flex w-12 h-6 items-center justify-center rounded bg-surface-card hover:bg-surface-hover text-text-secondary transition-colors"
                  title={folder.name}
                  aria-label={folder.name}
                >
                  <div className="flex h-1 w-4 gap-0.5">
                    <span className="h-full flex-1 rounded-full bg-current opacity-60" />
                    <span className="h-full flex-1 rounded-full bg-current opacity-60" />
                  </div>
                </button>
                {!folder.isCollapsed && folder.networkIds.map((networkId) => {
                  const network = networks[networkId];
                  if (!network) return null;
                  const KnownIcon = iconByNetwork[network.id];
                  const firstRoom = network.rooms[0]?.items[0];
                  const path = `/app/network/${network.id}/room/${firstRoom?.id || "room_general"}`;
                  const active = location.pathname.includes(`/app/network/${network.id}/`);
                  
                  return (
                    <NavLink
                      key={network.id}
                      to={path}
                      onClick={() => {
                        setSelectedNetworkId(network.id);
                        setSelectedRoomId(firstRoom?.id || null);
                      }}
                      className={itemClass(active)}
                      aria-label={network.name}
                      title={network.name}
                    >
                      {active && <span className="absolute -left-[17px] h-8 w-1 rounded-r-full bg-accent-primary" />}
                      {network?.iconUrl 
                          ? <img src={network.iconUrl} alt={network.name} className="h-full w-full object-cover rounded-[inherit]" />
                          : KnownIcon
                            ? <KnownIcon size={23} />
                            : <span className={clsx("flex h-full w-full items-center justify-center rounded-[inherit] text-[11px] font-bold text-white", network.color)}>{network.initials}</span>}
                    </NavLink>
                  );
                })}
              </div>
            );
          }

          const network = networks[itemId];
          if (!network) return null;
          const KnownIcon = iconByNetwork[network.id];
          const firstRoom = network.rooms[0]?.items[0];
          const path = `/app/network/${network.id}/room/${firstRoom?.id || "room_general"}`;
          const active = location.pathname.includes(`/app/network/${network.id}/`);
          const isDragOver = dragOverNetwork === network.id;

          const handleDragStart = (e: React.DragEvent) => {
            setDraggedNetwork(network.id);
            e.dataTransfer.effectAllowed = "move";
          };

          const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (draggedNetwork && draggedNetwork !== network.id) {
              setDragOverNetwork(network.id);
            }
          };

          const handleDragLeave = () => {
            setDragOverNetwork(null);
          };

          const handleDrop = (e: React.DragEvent) => {
            e.preventDefault();
            if (draggedNetwork && draggedNetwork !== network.id) {
              const fromIndex = networkOrder.indexOf(draggedNetwork);
              const toIndex = networkOrder.indexOf(network.id);
              if (fromIndex >= 0 && toIndex >= 0 && reorderNetwork) {
                reorderNetwork(fromIndex, toIndex);
              }
            }
            setDraggedNetwork(null);
            setDragOverNetwork(null);
          };

          return (
            <NavLink
              key={network.id}
              to={path}
              draggable
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                setSelectedNetworkId(network.id);
                setSelectedRoomId(firstRoom?.id || null);
              }}
              className={clsx(itemClass(active), isDragOver && "border-t-2 border-t-accent-primary")}
              aria-label={network.name}
              title={network.name}
            >
              {active && <span className="absolute -left-[17px] h-8 w-1 rounded-r-full bg-accent-primary" />}
              {network?.iconUrl 
                  ? <img src={network.iconUrl} alt={network.name} className="h-full w-full object-cover rounded-[inherit]" />
                  : KnownIcon
                    ? <KnownIcon size={23} />
                    : <span className={clsx("flex h-full w-full items-center justify-center rounded-[inherit] text-[11px] font-bold text-white", network.color)}>{network.initials}</span>}
            </NavLink>
          );
        })}

        <CreateNetworkDialog />
        <JoinNetworkDialog />
      </div>

      <div className="my-1 h-px w-8 bg-border-default" />
      <NavLink to="/app/vault" className={({ isActive }) => itemClass(isActive)} aria-label="File Vault" title="File Vault">
        <FolderLock size={22} />
      </NavLink>
      <NavLink to="/app/admin" className={({ isActive }) => itemClass(isActive)} aria-label="Admin Center" title="Admin Center">
        <ShieldAlert size={22} />
      </NavLink>
      <NavLink to="/app/profile" className={({ isActive }) => itemClass(isActive)} aria-label="Profile and safety" title="Profile and safety">
        <User size={22} />
      </NavLink>

      <div 
        className={clsx(
          "mb-1 mt-auto h-2 w-2 rounded-full",
          wsState === "connected" && "bg-success",
          wsState === "connecting" && "bg-warning animate-pulse",
          wsState === "reconnecting" && "bg-warning animate-pulse",
          wsState === "offline" && "bg-danger",
          wsState === "unauthorized" && "bg-danger"
        )}
        title={`Sync: ${wsState}`}
      />
    </aside>
  );
}
