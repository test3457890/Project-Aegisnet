import { useState } from "react";
import { ShieldCheck, ArrowLeft, ShieldAlert, Shield, Smile, Bot, Settings, Activity } from "lucide-react";
import { useParams, NavLink } from "react-router";
import { useMockAppState } from "../state/mockAppState";
import { clsx } from "clsx";
import { NetworkRolesTab } from "../components/network-settings/NetworkRolesTab";
import { NetworkEmojiTab } from "../components/network-settings/NetworkEmojiTab";
import { NetworkBotsTab } from "../components/network-settings/NetworkBotsTab";
import { NetworkAdminTab } from "../components/network-settings/NetworkAdminTab";
import { NetworkPermissionDashboard } from "../components/network-settings/NetworkPermissionDashboard";
import { NetworkModerationTab } from "../components/network-settings/NetworkModerationTab";
import { NetworkActivityLogTab } from "../components/network-settings/NetworkActivityLogTab";

type Tab = "roles" | "permissions" | "moderation" | "admin" | "integrations" | "emojis" | "activity";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "roles", label: "Roles & Access", icon: Shield },
  { id: "permissions", label: "Test Permissions", icon: ShieldCheck },
  { id: "moderation", label: "Moderation Queue", icon: ShieldAlert },
  { id: "integrations", label: "Integrations & Bots", icon: Bot },
  { id: "emojis", label: "Emoji & Stickers", icon: Smile },
  { id: "activity", label: "Network Activity Log", icon: Activity },
  { id: "admin", label: "Dangerous Actions", icon: Settings },
];

export function AdvancedNetworkAdminScreen() {
  const { networkId } = useParams();
  const { networks, me } = useMockAppState();
  const [tab, setTab] = useState<Tab>("roles");

  if (!networkId || !networks[networkId]) {
    return <div className="p-8">Network not found.</div>;
  }

  const network = networks[networkId];
  const isOwner = network.ownerId === me.id;
  const isAdmin = isOwner || (network.memberRoles?.[me.id] || []).some(rId => network.roles?.find(r => r.id === rId)?.permissions.includes("admin"));

  if (!isAdmin) {
    return <div className="p-8 text-danger-readable">You do not have permission to view this page.</div>;
  }

  return (
    <div className="flex h-full bg-background-primary overflow-hidden">
      <nav className="w-64 shrink-0 border-r border-border-default bg-background-secondary p-4 flex flex-col gap-2 overflow-y-auto">
        <NavLink to={`/app/network/${networkId}/settings`} className="mb-4 flex items-center gap-2 text-sm font-bold text-text-muted hover:text-text-primary">
          <ArrowLeft size={16} /> Back to Settings
        </NavLink>
        
        <div className="mb-4">
          <h1 className="text-lg font-black text-text-primary">Advanced Admin</h1>
          <p className="text-[10px] uppercase font-bold text-warning tracking-wider mt-1">Prototype Zone</p>
        </div>

        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors w-full text-left",
              tab === item.id ? "bg-surface-selected text-text-primary" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            <item.icon size={16} className={tab === item.id ? "text-accent-primary" : ""} /> {item.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto scrollbar-clean p-4 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {tab === "roles" && <NetworkRolesTab network={network} isOwner={isOwner} />}
          {tab === "permissions" && <NetworkPermissionDashboard networkId={network.id} />}
          {tab === "moderation" && <NetworkModerationTab network={network} isOwner={isOwner} />}
          {tab === "integrations" && <NetworkBotsTab network={network} isOwner={isOwner} />}
          {tab === "emojis" && <NetworkEmojiTab network={network} isOwner={isOwner} />}
          {tab === "admin" && <NetworkAdminTab network={network} isOwner={isOwner} />}
          {tab === "activity" && <NetworkActivityLogTab networkId={network.id} />}
        </div>
      </main>
    </div>
  );
}
