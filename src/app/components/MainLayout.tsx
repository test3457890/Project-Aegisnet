import { FolderLock, MessageSquare, Network, Phone, User } from "lucide-react";
import { Outlet, NavLink, useLocation } from "react-router";
import { NetworkSidebar } from "./NetworkSidebar";
import { PrivateSidebar } from "./PrivateSidebar";
import { RoomsSidebar } from "./RoomsSidebar";
import { LockScreen } from "./privacy/LockScreen";
import { PrivacyShell } from "./privacy/PrivacyShell";
import { OfflineSyncBanner } from "./OfflineSyncBanner";
import { useMockAppState } from "../state/mockAppState";
import { WatermarkOverlay } from "./privacy/WatermarkOverlay";

export function MainLayout() {
  const { chatList, selectedChatId, selectedNetworkId, selectedRoomId, isLocked } = useMockAppState();
  const location = useLocation();
  const isPrivate = location.pathname.includes("/app/private");
  const isNetwork = location.pathname.includes("/app/network/");
  const isCall = location.pathname.includes("/call/");
  const selectedChat = selectedChatId ? chatList[selectedChatId] : undefined;
  const privatePath = selectedChat?.type === "group"
    ? `/app/private/group/${selectedChat.id}`
    : `/app/private/dm/${selectedChatId || "chat_sarah"}`;
  const callPath = selectedChat?.type === "group"
    ? `/app/private/group/${selectedChat.id}/call/voice`
    : `/app/private/dm/${selectedChatId || "chat_sarah"}/call/voice`;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-primary font-sans">
      <a href="#main-content" className="sr-only z-[100] rounded-lg bg-accent-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to main content
      </a>
      {!isPrivate && <NetworkSidebar />}
      {isPrivate && <PrivateSidebar />}
      {isNetwork && <RoomsSidebar />}

      <main id="main-content" tabIndex={-1} className="relative z-10 flex min-w-0 flex-1 flex-col bg-background-primary">
        <OfflineSyncBanner />
        <Outlet />
      </main>

      <WatermarkOverlay />
      {!isCall && <PrivacyShell />}
      {isLocked && <LockScreen />}

      {!isCall && <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border-default bg-surface-card px-2 md:hidden">
        <NavLink to={privatePath} aria-label="Messages" className={({ isActive }) => `p-2 text-center ${isActive ? "text-accent-readable" : "text-text-muted"}`}>
          <MessageSquare size={20} className="mx-auto" />
          <span className="text-[10px] font-medium">Messages</span>
        </NavLink>
        <NavLink to={`/app/network/${selectedNetworkId || "net_family"}/room/${selectedRoomId || "room_fam_chat"}`} aria-label="Networks" className={({ isActive }) => `p-2 text-center ${isActive ? "text-accent-readable" : "text-text-muted"}`}>
          <Network size={20} className="mx-auto" />
          <span className="text-[10px] font-medium">Networks</span>
        </NavLink>
        <NavLink to={callPath} aria-label="Calls" className={({ isActive }) => `p-2 text-center ${isActive ? "text-accent-readable" : "text-text-muted"}`}>
          <Phone size={20} className="mx-auto" />
          <span className="text-[10px] font-medium">Calls</span>
        </NavLink>
        <NavLink to="/app/vault" aria-label="File Vault" className={({ isActive }) => `p-2 text-center ${isActive ? "text-accent-readable" : "text-text-muted"}`}>
          <FolderLock size={20} className="mx-auto" />
          <span className="text-[10px] font-medium">Vault</span>
        </NavLink>
        <NavLink to="/app/profile" aria-label="Profile and safety" className={({ isActive }) => `p-2 text-center ${isActive ? "text-accent-readable" : "text-text-muted"}`}>
          <User size={20} className="mx-auto" />
          <span className="text-[10px] font-medium">Profile</span>
        </NavLink>
      </nav>}
    </div>
  );
}
