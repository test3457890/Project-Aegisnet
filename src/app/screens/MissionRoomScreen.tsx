import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { clsx } from "clsx";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, ListTodo, Map, MapPin,
  Plus, Radio, ShieldCheck, Target, Trash2, Users, FileText, CalendarDays, UserRound,
  Box, ArrowRightLeft, CheckSquare
} from "lucide-react";
import { useMockAppState } from "../state/mockAppState";
import {
  CHECK_IN_OPTIONS, createDefaultMission, MissionTimelineEntry, presenceLabel,
  PRESENCE_OPTIONS, TimelineKind, useMissionState,
} from "../state/missionState";
import { logQaEvent } from "../qa/qaEvents";
import { MemberProfilePopover } from "../components/ui/MemberProfilePopover";
import { MissionOpsDashboard } from "../components/mission/MissionOpsDashboard";
import { MissionTasksTab } from "../components/mission/MissionTasksTab";
import { MissionCalendarView } from "../components/mission/MissionCalendarView";
import { DutyStatusPanel } from "../components/mission/DutyStatusPanel";

import { MissionVaultTab } from "../components/vault/MissionVaultTab";
import { MissionBriefingTab } from "../components/mission/MissionBriefingTab";
import { MissionRosterTab } from "../components/mission/MissionRosterTab";
import { MissionAssetTracker } from "../components/mission/MissionAssetTracker";
import { MissionHandoffTab } from "../components/mission/MissionHandoffTab";
import { MissionReadinessChecklist } from "../components/mission/MissionReadinessChecklist";
import { MissionDecisionLog } from "../components/mission/MissionDecisionLog";
import { MissionCatchUpPanel } from "../components/mission/MissionCatchUpPanel";
import { MissionBriefingCard } from "../components/mission/MissionBriefingCard";
import { MissionTimePanel } from "../components/mission/MissionTimePanel";
const tabs = [
  { id: "dashboard", name: "Dashboard", icon: Activity },
  { id: "briefing", name: "Briefing", icon: FileText },
  { id: "timeline", name: "Timeline", icon: Clock },
  { id: "tasks", name: "Tasks", icon: ListTodo },
  { id: "calendar", name: "Calendar", icon: CalendarDays },
  { id: "vault", name: "Vault", icon: FileText },
  { id: "roster", name: "Roster", icon: Users },
  { id: "assets", name: "Assets", icon: Box },
  { id: "handoff", name: "Handoff", icon: ArrowRightLeft },
  { id: "readiness", name: "Readiness", icon: CheckSquare },
  { id: "map", name: "Map", icon: Map },
  { id: "catchup", name: "Catch Up", icon: Activity },
] as const;

type TabId = typeof tabs[number]["id"];

const kindStyles: Record<TimelineKind, { label: string; className: string }> = {
  decision: { label: "Command Decision", className: "text-accent-readable bg-accent-primary/10" },
  "check-in": { label: "Check-In", className: "text-success bg-success/10" },
  alert: { label: "Alert", className: "text-danger-readable bg-danger/10" },
  update: { label: "Update", className: "text-text-secondary bg-surface-hover" },
  system: { label: "System", className: "text-text-secondary bg-surface-hover" },
};

function relativeTime(at: number): string {
  const diff = Date.now() - at;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function MissionRoomScreen() {
  const { networkId, missionId } = useParams();
  const { networks, users, me } = useMockAppState();
  const {
    missions, myPresence, ensureMission, addTask, toggleTask,
    postUpdate, postCheckIn, setEmergency, addMapPin, removeMapPin, setMyPresence,
    setMissionStatus, addDecision, generateAARDraft, setLastSeenTimeline, setMissionMode
  } = useMissionState();

  const roomName = useMemo(() => {
    if (!networkId || !missionId) return "Mission Room";
    return networks[networkId]?.rooms.flatMap((section) => section.items).find((room) => room.id === missionId)?.name
      || "Mission Room";
  }, [networks, networkId, missionId]);

  useEffect(() => {
    if (missionId) ensureMission(missionId, roomName);
  }, [missionId, roomName, ensureMission]);

  const [tab, setTab] = useState<TabId | "decisions" | "aar">("dashboard");
  const [taskDraft, setTaskDraft] = useState("");
  const [assigneeDraft, setAssigneeDraft] = useState("");
  const [dueTimeDraft, setDueTimeDraft] = useState("");
  const [updateDraft, setUpdateDraft] = useState("");
  const [decisionDraft, setDecisionDraft] = useState("");
  const [pinDraft, setPinDraft] = useState("");
  const [showCloseoutDialog, setShowCloseoutDialog] = useState<"archive" | "aar" | null>(null);

  const mission = (missionId && missions[missionId]) || createDefaultMission(missionId || "mission", roomName);
  const userName = (id: string) => (id === me.id ? me.name : users[id]?.name || id);
  const pendingTasks = mission.tasks.filter((task) => !task.done).length;

  const lastSeen = mission.lastSeenTimelineAt?.[me.id] || 0;
  const hasUpdates = mission.timeline.length > 0 && mission.timeline[0].at > lastSeen;

  const isAuthorized = mission.briefing?.leadId === me.id || (networkId && networks[networkId]?.admins?.includes(me.id)) || true; // Fallback to true if no strict auth implemented

  const isArchive = mission.mode === "archive";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background-primary">
      {/* Emergency banner */}
      {mission.emergencyActive && (
        <div role="alert" className="flex items-center justify-between gap-3 bg-danger/15 border-b border-danger/40 px-4 py-2">
          <span className="flex items-center gap-2 text-sm font-bold text-danger-readable">
            <AlertTriangle size={16} /> Emergency flag is active for this mission.
          </span>
          <button
            disabled={isArchive}
            onClick={() => missionId && setEmergency(missionId, false)}
            className="rounded-lg border border-danger/40 px-3 py-1 text-xs font-bold text-danger-readable hover:bg-danger/10 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      )}

      {/* Prototype Warning Banner */}
      {(mission.mode === "live" || !mission.mode) && (
        <div className="flex items-center justify-center gap-2 bg-accent-primary/10 border-b border-accent-primary/20 px-4 py-2">
          <ShieldCheck size={14} className="text-accent-readable" />
          <span className="text-[11px] font-bold text-accent-readable text-center">
            Mission Rooms are prototype coordination spaces only. They are not emergency dispatch, public safety command systems, legal records, or production-secure communications.
          </span>
        </div>
      )}

      {mission.mode === "lockdown" && (
        <div className="flex items-center justify-center gap-2 bg-amber-600/20 border-b border-amber-600/40 px-4 py-2">
          <ShieldCheck size={14} className="text-amber-600" />
          <span className="text-[11px] font-bold text-amber-600 text-center">
            Lockdown Prototype Mode changes local interface behavior only. It is not production security, production E2EE, legal compliance, or official access control.
          </span>
        </div>
      )}

      {hasUpdates && tab !== "catchup" && (
        <div className="flex justify-center bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 cursor-pointer hover:bg-blue-500/20 transition-colors" onClick={() => setTab("catchup")}>
          <span className="text-xs font-bold text-accent-readable flex items-center gap-2">
            <Activity size={14} /> Catch up available - New updates since you last checked. Click to view.
          </span>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 border-b border-border-default bg-surface-card px-4 lg:px-8 pt-5 pb-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-default bg-background-secondary">
                <Target size={20} className="text-accent-readable" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-text-primary">{mission.name}</h1>
                  <select
                    aria-label="Mission Status"
                    value={mission.status || "active"}
                    disabled={isArchive}
                    onChange={(e) => {
                      if (missionId) {
                        setMissionStatus(missionId, e.target.value as any);
                        logQaEvent({ type: "mission.status.changed", missionId, status: e.target.value });
                      }
                    }}
                    className={clsx(
                      "text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none disabled:opacity-50",
                      mission.status === "planning" ? "border-amber-600/30 text-amber-600 bg-amber-600/10" :
                      mission.status === "active" ? "border-success/30 text-success bg-success/10" :
                      mission.status === "paused" ? "border-slate-500/30 text-slate-500 bg-slate-500/10" :
                      "border-indigo-600/30 text-indigo-600 bg-indigo-600/10"
                    )}
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>

                  <select
                    aria-label="Mission Mode"
                    value={mission.mode || "planning"}
                    disabled={!isAuthorized}
                    onChange={(e) => {
                      if (missionId) {
                        const newMode = e.target.value as any;
                        if (newMode === "archive") {
                          setShowCloseoutDialog("archive");
                        } else {
                          setMissionMode(missionId, newMode);
                        }
                      }
                    }}
                    className="text-xs font-bold px-2 py-1 rounded-lg border border-border-default bg-background-secondary focus:outline-none ml-2"
                  >
                    <option value="planning">Planning Mode</option>
                    <option value="live">Live Mode</option>
                    <option value="lockdown">Lockdown Mode</option>
                    <option value="archive">Archive Mode</option>
                  </select>
                </div>
                <p className="text-xs text-text-secondary mt-1">{mission.objective || "Optional Mission Mode workspace. Add an objective, tasks, and check-ins."}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {missionId && <DutyStatusPanel missionId={missionId} />}
            {mission.emergencyActive ? (
              <span className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger-readable">Emergency active</span>
            ) : (
              <button
                disabled={isArchive}
                onClick={() => missionId && setEmergency(missionId, true)}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <AlertTriangle size={15} /> Raise Emergency
              </button>
            )}
          </div>
        </div>

        {/* Check-in bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Quick check-in</span>
          {CHECK_IN_OPTIONS.map((option) => (
            <button
              key={option.id}
              disabled={isArchive}
              onClick={() => missionId && postCheckIn(missionId, option.id)}
              className={clsx(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                option.tone === "ok" && "border-success/40 text-success hover:bg-success/10",
                option.tone === "info" && "border-accent-primary/40 text-accent-readable hover:bg-accent-primary/10",
                option.tone === "alert" && "border-danger/40 text-danger-readable hover:bg-danger/10",
                isArchive && "opacity-50 cursor-not-allowed"
              )}
            >
              <CheckCircle2 size={13} /> {option.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto scrollbar-clean">
          {[...tabs, { id: "decisions", name: "Decisions", icon: ShieldCheck }, { id: "aar", name: "AAR", icon: FileText }].map((item: any) => {
            const active = tab === item.id;
            const count = item.id === "tasks" ? pendingTasks : item.id === "roster" ? mission.memberIds.length : 0;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={clsx(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold transition-colors",
                  active ? "border-accent-primary text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon size={15} /> {item.name}
                {count > 0 && <span className="rounded-full bg-surface-hover px-1.5 text-[10px] text-text-secondary">{count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-clean" tabIndex={0} aria-label="Mission room content">
        <div className="mx-auto max-w-4xl space-y-6 pb-24">
          
          {missionId && (
            <>
              <MissionBriefingCard missionId={missionId} />
              <MissionTimePanel missionId={missionId} />
            </>
          )}

          {tab === "dashboard" && missionId && (
            <MissionOpsDashboard missionId={missionId} />
          )}

          {tab === "briefing" && missionId && (
            <MissionBriefingTab missionId={missionId} />
          )}

          {tab === "calendar" && missionId && (
            <MissionCalendarView missionId={missionId} />
          )}

          {tab === "vault" && missionId && (
            <MissionVaultTab missionId={missionId} />
          )}

          {tab === "tasks" && missionId && (
            <MissionTasksTab missionId={missionId} />
          )}

          {tab === "assets" && missionId && (
            <MissionAssetTracker missionId={missionId} />
          )}

          {tab === "handoff" && missionId && (
            <MissionHandoffTab missionId={missionId} />
          )}

          {tab === "readiness" && missionId && (
            <MissionReadinessChecklist missionId={missionId} />
          )}

          {tab === "catchup" && missionId && (
            <MissionCatchUpPanel missionId={missionId} />
          )}

          {tab === "timeline" && (
            <section className="space-y-4">
              <form
                onSubmit={(event) => { event.preventDefault(); if (missionId) { postUpdate(missionId, updateDraft); setUpdateDraft(""); } }}
                className="flex gap-2"
              >
                  <label className="sr-only" htmlFor="update-input">Post a situation update</label>
                  <input
                    id="update-input"
                    value={updateDraft}
                    onChange={(event) => setUpdateDraft(event.target.value)}
                    placeholder="Post a situation update..."
                    disabled={isArchive}
                    className="flex-1 rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none disabled:opacity-50"
                  />
                  <button type="submit" disabled={isArchive} className="rounded-xl bg-accent-secondary px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">Post</button>
                </form>

              {mission.timeline.length === 0 ? (
                <EmptyState icon={<Clock size={24} />} title="No timeline entries yet" body="Check-ins, decisions, and updates will appear here." />
              ) : (
                <ol className="space-y-3">
                  {mission.timeline.map((entry) => (
                    <li key={entry.id} className="rounded-2xl border border-border-default bg-surface-card p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={clsx("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", kindStyles[entry.kind].className)}>
                          {kindStyles[entry.kind].label}
                        </span>
                        <span className="text-[11px] font-semibold text-text-muted">{relativeTime(entry.at)}</span>
                      </div>
                      <p className="text-sm text-text-primary">{entry.text}</p>
                      {entry.authorId && <p className="mt-2 text-[11px] text-text-muted">— {userName(entry.authorId)}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {tab === "decisions" && missionId && (
            <MissionDecisionLog missionId={missionId} />
          )}

          {tab === "aar" && (
            <section className="space-y-4">
              <div className="flex justify-between items-center bg-surface-card p-4 rounded-xl border border-border-default">
                <div>
                  <h3 className="font-bold text-text-primary">After Action Report</h3>
                  <p className="text-xs text-text-secondary">Generate a draft AAR from mission logs and decisions.</p>
                </div>
                <button onClick={() => {
                  if (missionId) {
                    generateAARDraft(missionId);
                    logQaEvent({ type: "mission.aar.generated", missionId });
                  }
                }} className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover">
                  Generate Draft
                </button>
              </div>
              {mission.aarDraft && (
                <div className="rounded-xl border border-border-default bg-background-secondary p-4 mt-4 whitespace-pre-wrap text-sm text-text-primary font-mono leading-relaxed">
                  {mission.aarDraft}
                </div>
              )}
            </section>
          )}

          {tab === "roster" && missionId && (
            <MissionRosterTab missionId={missionId} />
          )}

          {tab === "map" && (
            <section className="space-y-4">
              <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-border-default bg-background-secondary">
                <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(150,150,150,0.15) 1px, transparent 0)", backgroundSize: "16px 16px" }} />
                <div className="relative text-center">
                  <Map size={28} className="mx-auto text-text-muted" />
                  <p className="mt-2 text-xs text-text-muted">Local map placeholder — pins are labels only. No live GPS or location tracking.</p>
                </div>
              </div>

              <form
                onSubmit={(event) => { event.preventDefault(); if (missionId) { addMapPin(missionId, pinDraft); setPinDraft(""); } }}
                className="flex gap-2"
              >
                <label className="sr-only" htmlFor="pin-input">Add a map pin label</label>
                <input
                  id="pin-input"
                  value={pinDraft}
                  onChange={(event) => setPinDraft(event.target.value)}
                  placeholder="Add a pin label..."
                  disabled={isArchive}
                  className="flex-1 rounded-xl border border-border-default bg-background-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none disabled:opacity-50"
                />
                <button type="submit" disabled={isArchive} className="flex items-center gap-1.5 rounded-xl bg-accent-secondary px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"><Plus size={16} /> Pin</button>
              </form>

              {mission.mapPins.length === 0 ? (
                <EmptyState icon={<MapPin size={24} />} title="No pins yet" body="Add labelled reference points for this mission." />
              ) : (
                <ul className="space-y-2">
                  {mission.mapPins.map((pin) => (
                    <li key={pin.id} className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-card p-3">
                      <MapPin size={16} className="shrink-0 text-accent-readable" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{pin.label}</p>
                        {pin.note && <p className="truncate text-[11px] text-text-muted">{pin.note}</p>}
                      </div>
                      <button
                        onClick={() => missionId && removeMapPin(missionId, pin.id)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger-readable"
                        aria-label={`Remove pin ${pin.label}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border-default bg-surface-card px-4 py-2 text-[11px] text-text-muted flex items-center gap-2">
        <Radio size={13} className="text-accent-readable" />
        Mission Mode is an optional local workspace. Presence and check-ins are self-reported; no live GPS, telemetry, or remote dispatch.
      </footer>

      {showCloseoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-card p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-text-primary">Mission Closeout</h3>
            <p className="mb-4 text-sm text-text-secondary">
              You are about to switch to Archive Mode. This will make the mission read-only.
              Have you verified all teams are secure and all tasks are accounted for?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCloseoutDialog(null)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (missionId) {
                    setMissionMode(missionId, "archive");
                    if (showCloseoutDialog === "aar") {
                      setTab("aar");
                    }
                  }
                  setShowCloseoutDialog(null);
                }}
                className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover"
              >
                Confirm Closeout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default p-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-hover text-text-muted">{icon}</div>
      <h3 className="text-sm font-bold text-text-primary">{title}</h3>
      <p className="mt-1 text-xs text-text-secondary">{body}</p>
    </div>
  );
}
