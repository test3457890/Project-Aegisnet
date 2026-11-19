import {
  CalendarDays, CheckCircle2, FileText, FolderLock, MessageSquare,
  Phone, ShieldCheck, Users, Video, Zap, Target
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router";
import { ThemeSwitcherModal } from "../components/ThemeSwitcherModal";
import { useMockAppState } from "../state/mockAppState";
import { useMissionState } from "../state/missionState";
import { formatBytes } from "../utils/files";
import { maskSnippet } from "../utils/privacy";

export function HomeDashboard() {
  const [themeOpen, setThemeOpen] = useState(false);
  const { me, chatList, networks, vaultFiles, users, privacyMode, isBackendConnected, preferences } = useMockAppState();
  const { missions } = useMissionState();
  const activeMissions = Object.values(missions).filter(m => m.status === "active");
  
  const directChats = Object.values(chatList).filter((chat) => chat.type === "direct").slice(0, 4);
  const groupChats = Object.values(chatList).filter((chat) => chat.type === "group").slice(0, 4);
  const recentFiles = vaultFiles.slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-clean bg-background-primary p-4 pb-24 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent-readable">Everyday communication</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">Welcome back, {me.name.split(" ")[0]}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
              <ShieldCheck size={16} className="text-success" />
              Private prototype session • {isBackendConnected ? "Shared data connected" : "Browser-local fallback"}
            </p>
          </div>
          <button
            onClick={() => setThemeOpen(true)}
            className="rounded-xl border border-border-default bg-surface-card px-4 py-2.5 text-sm font-bold text-text-primary shadow-sm hover:bg-surface-hover"
          >
            Appearance Settings
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <NavLink to="/app/private/group/chat_family" className="rounded-2xl border border-border-default bg-surface-card p-4 hover:border-accent-primary/50">
            <Users className="text-accent-primary" size={21} />
            <h2 className="mt-3 text-sm font-bold text-text-primary">Family Group</h2>
            <p className="mt-1 text-xs text-text-secondary">Messages, weekend plans, and check-ins</p>
          </NavLink>
          <NavLink to="/app/private/group/chat_roadtrip" className="rounded-2xl border border-border-default bg-surface-card p-4 hover:border-accent-primary/50">
            <CalendarDays className="text-warning" size={21} />
            <h2 className="mt-3 text-sm font-bold text-text-primary">Road Trip Group</h2>
            <p className="mt-1 text-xs text-text-secondary">Route, hotels, food stops, and photos</p>
          </NavLink>
          <NavLink to="/app/private/group/chat_hiking" className="rounded-2xl border border-border-default bg-surface-card p-4 hover:border-accent-primary/50">
            <CheckCircle2 className="text-success" size={21} />
            <h2 className="mt-3 text-sm font-bold text-text-primary">Hiking Club</h2>
            <p className="mt-1 text-xs text-text-secondary">Trail plans and safety check-ins</p>
          </NavLink>
          <NavLink to="/app/vault" className="rounded-2xl border border-border-default bg-surface-card p-4 hover:border-accent-primary/50">
            <FolderLock className="text-encrypted" size={21} />
            <h2 className="mt-3 text-sm font-bold text-text-primary">File Vault</h2>
            <p className="mt-1 text-xs text-text-secondary">{vaultFiles.length} local prototype files</p>
          </NavLink>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <DashboardPanel title="Recent private messages" icon={<MessageSquare size={17} />}>
            {directChats.map((chat) => {
              const otherId = chat.participants.find((id) => id !== me.id);
              const person = otherId ? users[otherId] : undefined;
              return (
                <NavLink key={chat.id} to={`/app/private/dm/${chat.id}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-surface-hover">
                  <div className={`h-10 w-10 rounded-full text-xs font-bold text-white flex items-center justify-center ${person?.avatarColor || "bg-accent-primary"}`}>
                    {person?.initials || "PM"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-text-primary">{person?.name || chat.name}</p>
                    <p className="truncate text-xs text-text-secondary">{maskSnippet(chat.lastMessageSnippet, privacyMode)}</p>
                  </div>
                  <span className="text-[10px] text-text-secondary">{chat.lastActivityAt}</span>
                </NavLink>
              );
            })}
          </DashboardPanel>

          <DashboardPanel title="Recent groups" icon={<Users size={17} />}>
            {groupChats.map((chat) => (
              <NavLink key={chat.id} to={`/app/private/group/${chat.id}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-surface-hover">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-xs font-bold text-white flex items-center justify-center">
                  {chat.name?.split(" ").map((word) => word[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-primary">{chat.name}</p>
                  <p className="truncate text-xs text-text-secondary">{maskSnippet(chat.lastMessageSnippet, privacyMode)}</p>
                </div>
                <span className="text-[10px] text-text-muted">{chat.participants.length} members</span>
              </NavLink>
            ))}
          </DashboardPanel>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <DashboardPanel title="Active calls" icon={<Phone size={17} />}>
            <NavLink to="/app/private/group/chat_family/call/video" className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/5 p-3 hover:bg-success/10">
              <div className="h-10 w-10 rounded-xl bg-success/15 text-success flex items-center justify-center"><Video size={19} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text-primary">Family Group video check-in</p>
                <p className="text-xs text-success">Prototype call ready to join</p>
              </div>
            </NavLink>
            <p className="px-3 py-4 text-xs leading-relaxed text-text-muted">Remote calling is mock-only in this sprint. Local call controls are interactive.</p>
          </DashboardPanel>

          <DashboardPanel title="Upcoming plans" icon={<CalendarDays size={17} />}>
            <PlanItem title="Weekend picnic" detail="Saturday • 11:00 AM" />
            <PlanItem title="Road trip planning" detail="Monday • 7:30 PM" />
            <PlanItem title="Hiking Club trail check" detail="Next Friday • 6:00 PM" />
          </DashboardPanel>

          <DashboardPanel title="Safety check-ins" icon={<CheckCircle2 size={17} />}>
            {preferences.safetyCheckReminders ? (
              <>
                <PlanItem title="Mom arrived home" detail="Checked in 12 minutes ago" success />
                <PlanItem title="Hiking Club" detail="4 of 4 members checked in" success />
                <PlanItem title="Neighborhood Group" detail="No active safety requests" />
              </>
            ) : (
              <p className="px-3 py-4 text-xs leading-relaxed text-text-muted">
                Safety check-in reminders are turned off. Re-enable them in Profile &amp; Safety to see check-ins here. (Local-only setting.)
              </p>
            )}
          </DashboardPanel>
          
          <DashboardPanel title="Active missions" icon={<Target size={17} />}>
            {activeMissions.length ? activeMissions.slice(0,3).map(m => {
              const netId = Object.values(networks).find(n => n.rooms.some(c => c.items.some(r => r.id === m.id)))?.id;
              return (
                <NavLink key={m.id} to={netId ? `/app/network/${netId}/room/${m.id}` : "#"} className="flex items-start gap-3 rounded-xl p-3 hover:bg-surface-hover">
                  <div className={`mt-1.5 h-2 w-2 rounded-full ${m.emergencyActive ? "bg-danger-readable" : "bg-accent-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-text-primary truncate">{m.name}</p>
                    <p className="text-xs text-text-muted truncate">
                      {m.timeline[0] ? m.timeline[0].text : "No recent activity"}
                    </p>
                  </div>
                </NavLink>
              );
            }) : <EmptyPanelText text="No active missions." />}
          </DashboardPanel>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <DashboardPanel title="Shared files" icon={<FileText size={17} />}>
            {recentFiles.length ? recentFiles.map((file) => (
              <NavLink key={file.id} to="/app/vault" className="flex items-center gap-3 rounded-xl p-3 hover:bg-surface-hover">
                <div className="h-10 w-10 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center"><FileText size={18} /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-primary">{file.name}</p>
                  <p className="text-xs text-text-muted">{formatBytes(file.size)} • {file.accessState}</p>
                </div>
              </NavLink>
            )) : <EmptyPanelText text="No files have been uploaded yet." />}
          </DashboardPanel>

          <DashboardPanel title="Quick actions" icon={<Zap size={17} />}>
            <div className="grid grid-cols-2 gap-2 p-2">
              <QuickAction to="/app/private/dm/chat_sarah" label="New message" />
              <QuickAction to="/app/private/group/chat_weekend" label="Weekend Plans" />
              <QuickAction to="/app/network/net_family/room/room_fam_checkins" label="Family check-in" />
              <QuickAction to="/app/vault" label="Upload a file" />
            </div>
          </DashboardPanel>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Your Networks</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(networks).map((network) => {
              const firstRoom = network.rooms[0]?.items[0];
              return (
                <NavLink
                  key={network.id}
                  to={`/app/network/${network.id}/room/${firstRoom?.id || "room_general"}`}
                  className="rounded-2xl border border-border-default bg-surface-card p-4 hover:border-accent-primary/50"
                >
                  <div className={`relative h-10 w-10 overflow-hidden rounded-xl text-xs font-black text-white flex items-center justify-center ${!network.iconUrl ? network.color : "bg-background-secondary border border-border-default"}`}>
                    {network.iconUrl ? (
                      <img src={network.iconUrl} alt={network.name} className="h-full w-full object-cover" />
                    ) : (
                      network.initials
                    )}
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-text-primary">{network.name}</h3>
                  <p className="mt-1 text-xs text-text-muted">{network.rooms.flatMap((section) => section.items).length} rooms</p>
                </NavLink>
              );
            })}
          </div>
        </section>
      </div>

      <ThemeSwitcherModal open={themeOpen} onOpenChange={setThemeOpen} />
    </div>
  );
}

function DashboardPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border-default bg-surface-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border-default px-4 py-3 text-sm font-bold text-text-primary">
        <span className="text-accent-primary">{icon}</span>
        {title}
      </div>
      <div className="p-2">{children}</div>
    </section>
  );
}

function PlanItem({ title, detail, success = false }: { title: string; detail: string; success?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-3">
      <div className={`mt-1 h-2.5 w-2.5 rounded-full ${success ? "bg-success" : "bg-accent-primary"}`} />
      <div>
        <p className="text-sm font-bold text-text-primary">{title}</p>
        <p className="text-xs text-text-muted">{detail}</p>
      </div>
    </div>
  );
}

function QuickAction({ to, label }: { to: string; label: string }) {
  return <NavLink to={to} className="rounded-xl border border-border-default bg-background-secondary px-3 py-3 text-center text-xs font-bold text-text-primary hover:bg-surface-hover">{label}</NavLink>;
}

function EmptyPanelText({ text }: { text: string }) {
  return <p className="p-6 text-center text-sm text-text-muted">{text}</p>;
}
