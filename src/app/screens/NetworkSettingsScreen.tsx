import { useState } from "react";
import { ShieldCheck, Users, LayoutDashboard, UserRound, Link, FileText, ArrowRight } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { useMockAppState } from "../state/mockAppState";
import { clsx } from "clsx";
import { NetworkOverviewTab } from "../components/network-settings/NetworkOverviewTab";
import { NetworkProfileTab } from "../components/network-settings/NetworkProfileTab";
import { NetworkMembersTab } from "../components/network-settings/NetworkMembersTab";
import { NetworkSafetyTab } from "../components/network-settings/NetworkSafetyTab";
import { NetworkInvitesTab } from "../components/network-settings/NetworkInvitesTab";
import { NetworkRoomsTab } from "../components/network-settings/NetworkRoomsTab";
import { NetworkIdentityTab } from "../components/network-settings/NetworkIdentityTab";
import { NetworkVaultTab } from "../components/vault/NetworkVaultTab";
import { Hash } from "lucide-react";

type Tab = "overview" | "profile" | "identity" | "invites" | "rooms" | "members" | "safety" | "vault";

const MAIN_TABS: { id: Tab; label: string; icon: any; adminOnly?: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "Profile in this Network", icon: UserRound },
  { id: "identity", label: "Identity Context", icon: ShieldCheck },
  { id: "invites", label: "Invites", icon: Link },
  { id: "rooms", label: "Rooms", icon: Hash, adminOnly: true },
  { id: "members", label: "Members", icon: Users },
  { id: "safety", label: "Safety Setup", icon: ShieldCheck, adminOnly: true },
  { id: "vault", label: "Network Vault", icon: FileText },
];

export function NetworkSettingsScreen() {
  const { networkId } = useParams();
  const navigate = useNavigate();
  const { networks, me } = useMockAppState();
  const [tab, setTab] = useState<Tab>("overview");
  
  if (!networkId || !networks[networkId]) {
    return <div className="p-8">Network not found.</div>;
  }
  
  const network = networks[networkId];
  const isOwner = network.ownerId === me.id;
  const isAdmin = isOwner || (network.memberRoles?.[me.id] || []).some(rId => network.roles?.find(r => r.id === rId)?.permissions.includes("admin"));

  const visibleTabs = MAIN_TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="flex h-full bg-background-primary overflow-hidden">
      <nav className="w-64 shrink-0 border-r border-border-default bg-background-secondary p-4 flex flex-col gap-2 overflow-y-auto">
        <div className="mb-4 flex items-center gap-3">
          <div className={`h-10 w-10 flex items-center justify-center rounded-xl text-white font-black text-sm ${network.color}`}>
            {network.initials}
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary">Settings</h1>
            <p className="text-xs text-text-secondary truncate">{network.name}</p>
          </div>
        </div>

        {visibleTabs.map((item) => (
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

        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-border-default">
            <button
              onClick={() => navigate(`/app/network/${networkId}/advanced-admin`)}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors w-full text-left text-warning hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={16} /> Advanced Admin
              </div>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </nav>

      <main className="flex-1 overflow-y-auto scrollbar-clean p-4 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {tab === "overview" && <NetworkOverviewTab network={network} isOwner={isOwner} />}
          {tab === "profile" && <NetworkProfileTab network={network} />}
          {tab === "identity" && <NetworkIdentityTab />}
          {tab === "vault" && <NetworkVaultTab networkId={network.id} />}
          {tab === "invites" && <NetworkInvitesTab network={network} isOwner={isOwner || !network.ownerId} />}
          {tab === "rooms" && <NetworkRoomsTab network={network} isOwner={isOwner} />}
          {tab === "safety" && <NetworkSafetyTab network={network} isOwner={isOwner} />}
          {tab === "members" && <NetworkMembersTab network={network} isOwner={isOwner} />}
        </div>
      </main>
    </div>
  );
}
