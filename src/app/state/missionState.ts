import { createContext, useContext } from "react";

/**
 * Local-only Mission Room + Verified Presence state.
 *
 * Mission Mode is an OPTIONAL, advanced layer — AegisNet stays civilian-first by default.
 * Everything here is local prototype data (persisted in localStorage). There is no backend,
 * no live GPS, no telemetry, and no remote dispatch. Presence and check-ins are self-reported.
 */

export type PresenceStatus =
  | "available"
  | "driving"
  | "in-field"
  | "on-duty"
  | "off-duty"
  | "low-battery"
  | "weak-network"
  | "in-briefing"
  | "on-break"
  | "needs-assistance";

export const PRESENCE_OPTIONS: { id: PresenceStatus; label: string }[] = [
  { id: "available", label: "Available" },
  { id: "driving", label: "Driving" },
  { id: "in-field", label: "In Field" },
  { id: "on-duty", label: "On Duty" },
  { id: "off-duty", label: "Off Duty" },
  { id: "low-battery", label: "Low Battery" },
  { id: "weak-network", label: "Weak Network" },
  { id: "in-briefing", label: "In Briefing" },
  { id: "on-break", label: "On Break" },
  { id: "needs-assistance", label: "Needs Assistance" },
];

export type CheckInKind = "safe" | "on-my-way" | "arrived" | "need-help";

export const CHECK_IN_OPTIONS: { id: CheckInKind; label: string; tone: "ok" | "info" | "alert" }[] = [
  { id: "safe", label: "I'm safe", tone: "ok" },
  { id: "on-my-way", label: "On my way", tone: "info" },
  { id: "arrived", label: "Arrived", tone: "info" },
  { id: "need-help", label: "Need help", tone: "alert" },
];

export type TimelineKind = "decision" | "check-in" | "alert" | "update" | "system";

export interface MissionTask {
  id: string;
  label: string;
  done: boolean;
  assigneeId?: string;
  dueTime?: string;
  status?: "pending" | "in-progress" | "blocked" | "completed";
  priority?: "low" | "medium" | "high" | "critical";
  scheduled?: boolean;
  repeatLabel?: string;
  completedAt?: string;
}

export interface MissionBriefing {
  objective?: string;
  situation?: string;
  area?: string;
  startTime?: string;
  expectedEndTime?: string;
  leadId?: string;
  safetyOfficerId?: string;
  commsLeadId?: string;
  risks?: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  type: "briefing" | "milestone" | "deadline" | "general";
}

export interface MissionAsset {
  id: string;
  name: string;
  type: "Radio" | "Medical kit" | "Vehicle" | "Laptop" | "Camera" | "Field pack" | "Event kit" | "Custom";
  assigneeId?: string;
  condition?: string;
  status: "available" | "checked-out" | "maintenance" | "lost";
  notes?: string;
}

export interface MissionHandoff {
  id: string;
  outgoingUserId: string;
  incomingUserId: string;
  time: string;
  summary: string;
  openTasks: string;
  risks: string;
  filesToReview: string;
  decisionsMade: string;
  nextActions: string;
}

export interface MissionReadiness {
  objectiveAdded: boolean;
  leadAssigned: boolean;
  safetyOfficerAssigned: boolean;
  commsLeadAssigned: boolean;
  tasksCreated: boolean;
  vaultReviewed: boolean;
  checkInEnabled: boolean;
  protectedCommsReviewed: boolean;
  restrictedRoomReviewed: boolean;
  briefingReviewed: boolean;
  aarPlanAcknowledged: boolean;
  prototypeWarningsAcknowledged: boolean;
}

export interface DutyCheckIn {
  id: string;
  userId: string;
  status: PresenceStatus;
  timestamp: string;
  note?: string;
}

export interface MissionTimelineEntry {
  id: string;
  kind: TimelineKind;
  text: string;
  authorId?: string;
  at: number;
}

export interface MissionMapPin {
  id: string;
  label: string;
  note?: string;
}

export interface MissionAsset {
  id: string;
  name: string;
  type: string;
  assigneeId?: string;
  status: "available" | "checked-out" | "maintenance" | "lost";
  condition?: string;
  linkedTaskId?: string;
  linkedFileId?: string;
  notes?: string;
  updatedAt: string;
}

export interface ShiftHandoff {
  id: string;
  outgoingId: string;
  incomingId: string;
  time: string;
  summary: string;
  openTasks: string;
  risks: string;
  filesToReview: string;
  decisionsMade: string;
  nextActions: string;
}

export interface ReadinessState {
  objectiveAdded: boolean;
  leadAssigned: boolean;
  safetyAssigned: boolean;
  commsAssigned: boolean;
  tasksCreated: boolean;
  vaultReviewed: boolean;
  checkInEnabled: boolean;
  protectedCommsReviewed: boolean;
  permissionsReviewed: boolean;
  briefingReviewed: boolean;
  aarPlanAcknowledged: boolean;
  warningsAcknowledged: boolean;
}

export interface MissionData {
  id: string;
  name: string;
  objective: string;
  status: "planning" | "active" | "paused" | "completed";
  memberIds: string[];
  tasks: MissionTask[];
  timeline: MissionTimelineEntry[];
  mapPins: MissionMapPin[];
  calendarEvents: CalendarEvent[];
  dutyCheckIns: DutyCheckIn[];
  emergencyActive: boolean;
  aarDraft?: string;
  briefing: MissionBriefing;
  assets: MissionAsset[];
  handoffs: MissionHandoff[];
  readiness: MissionReadiness;
  mode?: "planning" | "live" | "watch" | "training" | "low-bandwidth" | "lockdown" | "aar" | "archive";
  timeZone?: string;
  startTime?: string;
  endTime?: string;
  lastSeenTimelineAt?: Record<string, number>;
}

export interface MissionState {
  missions: Record<string, MissionData>;
  myPresence: PresenceStatus;
  ensureMission: (id: string, name?: string) => void;
  setMissionStatus: (missionId: string, status: MissionData["status"]) => void;
  addTask: (missionId: string, label: string, assigneeId?: string, dueTime?: string) => void;
  toggleTask: (missionId: string, taskId: string) => void;
  postUpdate: (missionId: string, text: string) => void;
  addDecision: (missionId: string, text: string) => void;
  postCheckIn: (missionId: string, kind: CheckInKind) => void;
  setEmergency: (missionId: string, active: boolean) => void;
  addMapPin: (missionId: string, label: string, note?: string) => void;
  removeMapPin: (missionId: string, pinId: string) => void;
  addCalendarEvent: (missionId: string, event: Omit<CalendarEvent, "id">) => void;
  recordDutyCheckIn: (missionId: string, status: PresenceStatus, note?: string) => void;
  setMyPresence: (status: PresenceStatus) => void;
  generateAARDraft: (missionId: string) => void;
  updateBriefing: (missionId: string, briefing: Partial<MissionBriefing>) => void;
  addAsset: (missionId: string, asset: Omit<MissionAsset, "id" | "updatedAt">) => void;
  updateAsset: (missionId: string, assetId: string, updates: Partial<MissionAsset>) => void;
  addHandoff: (missionId: string, handoff: Omit<MissionHandoff, "id">) => void;
  updateReadiness: (missionId: string, readiness: Partial<MissionReadiness>) => void;
  setMissionMode: (missionId: string, mode: MissionData["mode"]) => void;
  setMissionTimeZone: (missionId: string, tz: string) => void;
  setMissionTimes: (missionId: string, start?: string, end?: string) => void;
  setLastSeenTimeline: (missionId: string, userId: string, at: number) => void;
  applyMissionTemplate: (missionId: string, templateId: string) => void;
}

export const MissionStateContext = createContext<MissionState | undefined>(undefined);

export function useMissionState() {
  const context = useContext(MissionStateContext);
  if (!context) throw new Error("useMissionState must be used within MissionStateProvider");
  return context;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested directly, no React required).
// ---------------------------------------------------------------------------

export function makeMissionId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefaultMission(id: string, name = "Mission Room"): MissionData {
  return {
    id,
    name,
    objective: "",
    status: "active",
    mode: "planning",
    timeZone: "UTC",
    lastSeenTimelineAt: {},
    memberIds: [],
    tasks: [],
    timeline: [],
    mapPins: [],
    calendarEvents: [],
    dutyCheckIns: [],
    emergencyActive: false,
    briefing: {},
    assets: [],
    handoffs: [],
    readiness: {
      objectiveAdded: false,
      leadAssigned: false,
      safetyOfficerAssigned: false,
      commsLeadAssigned: false,
      tasksCreated: false,
      vaultReviewed: false,
      checkInEnabled: false,
      protectedCommsReviewed: false,
      restrictedRoomReviewed: false,
      briefingReviewed: false,
      aarPlanAcknowledged: false,
      prototypeWarningsAcknowledged: false,
    },
  };
}

export function checkInText(kind: CheckInKind): string {
  return CHECK_IN_OPTIONS.find((option) => option.id === kind)?.label || "Checked in";
}

export function presenceLabel(status: PresenceStatus): string {
  return PRESENCE_OPTIONS.find((option) => option.id === status)?.label || "Available";
}

export function addTaskToMission(mission: MissionData, label: string, assigneeId?: string, dueTime?: string, id = makeMissionId("task")): MissionData {
  const clean = label.trim();
  if (!clean) return mission;
  return { ...mission, tasks: [...mission.tasks, { id, label: clean, done: false, assigneeId, dueTime }] };
}

export function toggleTaskInMission(mission: MissionData, taskId: string): MissionData {
  return {
    ...mission,
    tasks: mission.tasks.map((task) => {
      if (task.id !== taskId) return task;
      const done = !task.done;
      return { ...task, done, completedAt: done ? Date.now().toString() : undefined };
    }),
  };
}

export function appendTimelineEntry(mission: MissionData, entry: MissionTimelineEntry): MissionData {
  return { ...mission, timeline: [entry, ...mission.timeline] };
}

export function checkInEntry(kind: CheckInKind, authorId: string, at = Date.now(), id = makeMissionId("tl")): MissionTimelineEntry {
  return {
    id,
    kind: kind === "need-help" ? "alert" : "check-in",
    text: checkInText(kind),
    authorId,
    at,
  };
}

// ---------------------------------------------------------------------------
// Seed data (a worked SAR example so the Mission Room is not empty on first open).
// ---------------------------------------------------------------------------

export function createInitialMissions(): Record<string, MissionData> {
  const now = Date.now();
  return {
    room_sar_mission: {
      id: "room_sar_mission",
      name: "Mission Room: Scottsdale SAR",
      objective: "Locate missing hikers. Operation started 04:00.",
      status: "active",
      memberIds: ["user_me", "user_sarah", "user_john", "user_marcus"],
      tasks: [
        { id: "task_seed_1", label: "Establish radio relay at Ridge 2", done: false },
        { id: "task_seed_2", label: "Drone sweep Sector 4", done: false },
        { id: "task_seed_3", label: "Confirm Base Camp Delta headcount", done: true },
      ],
      timeline: [
        { id: "tl_seed_1", kind: "decision", text: "Sector 4 search suspended due to weather. Ground teams fall back to Base Camp Delta.", authorId: "user_sarah", at: now - 1000 * 60 * 18 },
        { id: "tl_seed_2", kind: "check-in", text: "Alpha team arrived at Waypoint 2. No signs of hikers.", authorId: "user_john", at: now - 1000 * 60 * 45 },
      ],
      mapPins: [
        { id: "pin_seed_1", label: "Base Camp Delta", note: "Fallback rally point" },
        { id: "pin_seed_2", label: "Waypoint 2", note: "Last cleared sector" },
      ],
      calendarEvents: [],
      dutyCheckIns: [],
      emergencyActive: false,
      mode: "planning",
      timeZone: "UTC",
      lastSeenTimelineAt: {},
      briefing: {},
      assets: [],
      handoffs: [],
      readiness: {
        objectiveAdded: false,
        leadAssigned: false,
        safetyOfficerAssigned: false,
        commsLeadAssigned: false,
        tasksCreated: false,
        vaultReviewed: false,
        checkInEnabled: false,
        protectedCommsReviewed: false,
        permissionsReviewed: false,
        briefingReviewed: false,
        aarPlanAcknowledged: false,
        warningsAcknowledged: false,
      },
    },
  };
}
