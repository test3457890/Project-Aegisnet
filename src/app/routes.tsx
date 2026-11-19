import { createBrowserRouter, Navigate } from "react-router";
import { ErrorScreen } from "./screens/ErrorScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { MainLayout } from "./components/MainLayout";
import { HomeDashboard } from "./screens/HomeDashboard";
import { GroupChatScreen } from "./screens/GroupChatScreen";
import { DirectMessageScreen } from "./screens/DirectMessageScreen";
import { VideoCallScreen } from "./screens/VideoCallScreen";
import { PrivateCallScreen } from "./screens/PrivateCallScreen";
import { MissionRoomScreen } from "./screens/MissionRoomScreen";
import { FileVaultScreen } from "./screens/FileVaultScreen";
import { UserProfileScreen } from "./screens/UserProfileScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AdminCenterScreen } from "./screens/AdminCenterScreen";
import { DesignBoard } from "./screens/DesignBoard";
import { NotFoundScreen } from "./screens/NotFoundScreen";
import { NetworkSettingsScreen } from "./screens/NetworkSettingsScreen";
import { AdvancedNetworkAdminScreen } from "./screens/AdvancedNetworkAdminScreen";
import { QAModeScreen } from "./screens/QAModeScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginScreen,
    errorElement: <ErrorScreen />
  },
  {
    path: "/design-board",
    Component: DesignBoard,
  },
  {
    path: "/app",
    Component: MainLayout,
    errorElement: <ErrorScreen />,
    children: [
      { index: true, Component: HomeDashboard },
      { path: "network/:networkId", Component: HomeDashboard },
      { path: "network/:networkId/about", Component: NetworkSettingsScreen },
      { path: "network/:networkId/settings", Component: NetworkSettingsScreen },
      { path: "network/:networkId/advanced-admin", Component: AdvancedNetworkAdminScreen },
      { path: "network/:networkId/room/:roomId", Component: GroupChatScreen },
      { path: "network/:networkId/room/:roomId/call/:callType", Component: VideoCallScreen },
      { path: "network/:networkId/mission/:missionId", Component: MissionRoomScreen },
      { path: "network/:networkId/call/:callId", Component: VideoCallScreen },
      
      { path: "private", element: <Navigate to="/app/private/dm/chat_sarah" replace /> },
      { path: "private/dm/:chatId", Component: DirectMessageScreen },
      { path: "private/dm/:chatId/call/:callType", Component: PrivateCallScreen },
      { path: "private/group/:chatId", Component: GroupChatScreen },
      { path: "private/group/:groupChatId/call/:callType", Component: VideoCallScreen },
      { path: "private/call/:callId", Component: PrivateCallScreen },
      
      { path: "vault", Component: FileVaultScreen },
      { path: "profile", Component: UserProfileScreen },
      { path: "profile/:userId", Component: UserProfileScreen },
      { path: "settings", Component: SettingsScreen },
      { path: "admin", Component: AdminCenterScreen },
      { path: "qa", Component: QAModeScreen },
    ],
  },
  {
    path: "*",
    Component: NotFoundScreen,
  },
]);
