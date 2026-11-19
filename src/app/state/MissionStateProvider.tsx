import { ReactNode, useCallback, useEffect, useState } from "react";
import { currentUser } from "../data/mockUsers";
import { MISSION_TEMPLATES } from "../data/missionTemplates";
import {
  addTaskToMission,
  appendTimelineEntry,
  checkInEntry,
  createDefaultMission,
  createInitialMissions,
  makeMissionId,
  MissionData,
  MissionStateContext,
  PresenceStatus,
  toggleTaskInMission,
  CheckInKind,
  CalendarEvent,
  MissionBriefing,
  MissionAsset,
  MissionHandoff,
  MissionReadiness,
} from "./missionState";

function loadMissions(): Record<string, MissionData> {
  const seed = createInitialMissions();
  try {
    const stored = localStorage.getItem("aegisnet_missions");
    if (!stored) return seed;
    const parsed = JSON.parse(stored) as Record<string, MissionData>;
    // Seed missions stay available; stored copies (including edits) win.
    return { ...seed, ...parsed };
  } catch {
    return seed;
  }
}

function loadPresence(): PresenceStatus {
  try {
    return (localStorage.getItem("aegisnet_presence") as PresenceStatus) || "available";
  } catch {
    return "available";
  }
}

export function MissionStateProvider({ children }: { children: ReactNode }) {
  const [missions, setMissions] = useState<Record<string, MissionData>>(loadMissions);
  const [myPresence, setMyPresenceState] = useState<PresenceStatus>(loadPresence);

  useEffect(() => {
    try {
      localStorage.setItem("aegisnet_missions", JSON.stringify(missions));
    } catch {
      // The in-memory prototype keeps working when storage is unavailable.
    }
  }, [missions]);

  useEffect(() => {
    try {
      localStorage.setItem("aegisnet_presence", myPresence);
    } catch {
      // ignore
    }
  }, [myPresence]);

  const updateMission = useCallback((missionId: string, updater: (mission: MissionData) => MissionData) => {
    setMissions((previous) => {
      const existing = previous[missionId];
      if (!existing) return previous;
      return { ...previous, [missionId]: updater(existing) };
    });
  }, []);

  const ensureMission = useCallback((id: string, name?: string) => {
    setMissions((previous) => (
      previous[id]
        ? previous
        : { ...previous, [id]: { ...createDefaultMission(id, name), memberIds: [currentUser.id] } }
    ));
  }, []);

  const setMissionStatus = useCallback((missionId: string, status: MissionData["status"]) => {
    updateMission(missionId, (mission) => ({ ...mission, status }));
    import("../qa/qaEvents").then(({ logQaEvent }) => {
      logQaEvent({ type: "mission.status.changed", userId: currentUser.id, missionId, metadata: { status } } as any);
    });
  }, [updateMission]);

  const addTask = useCallback((missionId: string, label: string, assigneeId?: string, dueTime?: string) => {
    updateMission(missionId, (mission) => addTaskToMission(mission, label, assigneeId, dueTime));
  }, [updateMission]);

  const toggleTask = useCallback((missionId: string, taskId: string) => {
    updateMission(missionId, (mission) => toggleTaskInMission(mission, taskId));
  }, [updateMission]);

  const postUpdate = useCallback((missionId: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    updateMission(missionId, (mission) => appendTimelineEntry(mission, {
      id: makeMissionId("tl"),
      kind: "update",
      text: clean,
      authorId: currentUser.id,
      at: Date.now(),
    }));
  }, [updateMission]);

  const addDecision = useCallback((missionId: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    updateMission(missionId, (mission) => appendTimelineEntry(mission, {
      id: makeMissionId("tl"),
      kind: "decision",
      text: clean,
      authorId: currentUser.id,
      at: Date.now(),
    }));
    import("../qa/qaEvents").then(({ logQaEvent }) => {
      logQaEvent({ type: "mission.decision.added", userId: currentUser.id, missionId } as any);
    });
  }, [updateMission]);

  const postCheckIn = useCallback((missionId: string, kind: CheckInKind) => {
    updateMission(missionId, (mission) => appendTimelineEntry(mission, checkInEntry(kind, currentUser.id)));
  }, [updateMission]);

  const setEmergency = useCallback((missionId: string, active: boolean) => {
    updateMission(missionId, (mission) => appendTimelineEntry(
      { ...mission, emergencyActive: active },
      {
        id: makeMissionId("tl"),
        kind: active ? "alert" : "system",
        text: active ? "Emergency flag raised." : "Emergency flag cleared.",
        authorId: currentUser.id,
        at: Date.now(),
      },
    ));
  }, [updateMission]);

  const addMapPin = useCallback((missionId: string, label: string, note?: string) => {
    const clean = label.trim();
    if (!clean) return;
    updateMission(missionId, (mission) => ({
      ...mission,
      mapPins: [...mission.mapPins, { id: makeMissionId("pin"), label: clean, note: note?.trim() || undefined }],
    }));
  }, [updateMission]);

  const removeMapPin = useCallback((missionId: string, pinId: string) => {
    updateMission(missionId, (mission) => ({
      ...mission,
      mapPins: mission.mapPins.filter((pin) => pin.id !== pinId),
    }));
  }, [updateMission]);

  const addCalendarEvent = useCallback((missionId: string, event: Omit<CalendarEvent, "id">) => {
    updateMission(missionId, (mission) => ({
      ...mission,
      calendarEvents: [...mission.calendarEvents, { ...event, id: makeMissionId("cal") }],
    }));
  }, [updateMission]);

  const recordDutyCheckIn = useCallback((missionId: string, status: PresenceStatus, note?: string) => {
    updateMission(missionId, (mission) => ({
      ...mission,
      dutyCheckIns: [...mission.dutyCheckIns, {
        id: makeMissionId("chk"),
        userId: currentUser.id,
        status,
        timestamp: Date.now().toString(),
        note,
      }],
    }));
  }, [updateMission]);

  const setMyPresence = useCallback((status: PresenceStatus) => {
    setMyPresenceState(status);
  }, []);

  const generateAARDraft = useCallback((missionId: string) => {
    updateMission(missionId, (mission) => {
      // Use any to bypass TS error since briefing might be partially defined
      const b = (mission as any).briefing || {};
      
      let draft = `# After Action Report Draft\n\n`;
      draft += `**Mission:** ${mission.name}\n`;
      draft += `**Objective:** ${b.objective || mission.objective || "Not specified"}\n`;
      draft += `**Situation:** ${b.situation || "Not specified"}\n`;
      draft += `**Area:** ${b.area || "Not specified"}\n`;
      draft += `**Times:** ${b.startTime || "TBD"} to ${b.expectedEndTime || "TBD"}\n`;
      draft += `**Key Risks:** ${b.risks || "None noted"}\n\n`;
      
      draft += `## Team & Duty Summary\n`;
      const activeMembers = new Set(mission.dutyCheckIns?.filter(c => c.status !== 'off-duty').map(c => c.userId));
      draft += `- Personnel engaged: ${activeMembers.size}\n`;
      draft += `- Total check-in events: ${mission.dutyCheckIns?.length || 0}\n\n`;

      draft += `## Timeline Summary\n`;
      if (mission.timeline.length > 0) {
        draft += mission.timeline.map(t => `- [${new Date(t.at).toLocaleTimeString()}] ${t.kind.toUpperCase()}: ${t.text}`).join('\n') + `\n\n`;
      } else {
        draft += `No events logged.\n\n`;
      }

      draft += `## Tasks Completed\n`;
      const completedTasks = mission.tasks.filter(t => t.done);
      if (completedTasks.length > 0) {
        draft += completedTasks.map(t => `- ${t.label}`).join('\n') + `\n\n`;
      } else {
        draft += `No tasks completed.\n\n`;
      }

      draft += `## Issues & Lessons Learned\n`;
      draft += `- [Draft recommendations here]\n`;

      return { ...mission, aarDraft: draft };
    });
    import("../qa/qaEvents").then(({ logQaEvent }) => {
      logQaEvent({ type: "mission.aar.draft.generated", userId: currentUser.id, missionId } as any);
    });
  }, [updateMission]);

  const updateBriefing = useCallback((missionId: string, briefing: Partial<MissionBriefing>) => {
    updateMission(missionId, (mission) => ({
      ...mission,
      briefing: { ...mission.briefing, ...briefing },
    }));
    import("../qa/qaEvents").then(({ logQaEvent }) => {
      logQaEvent({ type: "mission.briefing.updated", userId: currentUser.id, missionId } as any);
    });
  }, [updateMission]);

  const addAsset = useCallback((missionId: string, asset: Omit<MissionAsset, "id">) => {
    updateMission(missionId, (mission) => ({
      ...mission,
      assets: [...(mission.assets || []), { ...asset, id: makeMissionId("asset") }],
    }));
  }, [updateMission]);

  const updateAsset = useCallback((missionId: string, assetId: string, updates: Partial<MissionAsset>) => {
    updateMission(missionId, (mission) => ({
      ...mission,
      assets: (mission.assets || []).map((a) => (a.id === assetId ? { ...a, ...updates } : a)),
    }));
  }, [updateMission]);

  const addHandoff = useCallback((missionId: string, handoff: Omit<MissionHandoff, "id">) => {
    updateMission(missionId, (mission) => ({
      ...mission,
      handoffs: [...(mission.handoffs || []), { ...handoff, id: makeMissionId("handoff") }],
    }));
  }, [updateMission]);

  const updateReadiness = useCallback((missionId: string, updates: Partial<MissionReadiness>) => {
    updateMission(missionId, (mission) => ({
      ...mission,
      readiness: { ...mission.readiness, ...updates },
    }));
  }, [updateMission]);

  const setMissionMode = useCallback((missionId: string, mode: MissionData["mode"]) => {
    updateMission(missionId, (mission) => ({ ...mission, mode }));
    import("../qa/qaEvents").then(({ logQaEvent }) => {
      logQaEvent({ type: "mission.mode_changed", userId: currentUser.id, missionId, metadata: { mode } } as any);
    });
  }, [updateMission]);

  const setMissionTimeZone = useCallback((missionId: string, tz: string) => {
    updateMission(missionId, (mission) => ({ ...mission, timeZone: tz }));
    import("../qa/qaEvents").then(({ logQaEvent }) => {
      logQaEvent({ type: "mission.timezone_changed", userId: currentUser.id, missionId, metadata: { tz } } as any);
    });
  }, [updateMission]);

  const setMissionTimes = useCallback((missionId: string, start?: string, end?: string) => {
    updateMission(missionId, (mission) => ({ ...mission, startTime: start, endTime: end }));
  }, [updateMission]);

  const setLastSeenTimeline = useCallback((missionId: string, userId: string, at: number) => {
    updateMission(missionId, (mission) => ({
      ...mission,
      lastSeenTimelineAt: { ...(mission.lastSeenTimelineAt || {}), [userId]: at },
    }));
  }, [updateMission]);

  const applyMissionTemplate = useCallback((missionId: string, templateId: string) => {
    const template = MISSION_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    updateMission(missionId, (mission) => {
      const newTasks = template.tasks.map(t => ({
        id: makeMissionId("task"),
        label: t.label,
        done: false,
        priority: t.priority,
      }));

      return {
        ...mission,
        mode: mission.mode === "planning" ? template.suggestedMode : mission.mode,
        briefing: {
          ...template.briefing,
          ...mission.briefing,
          objective: mission.briefing?.objective || template.briefing.objective,
          situation: mission.briefing?.situation || template.briefing.situation,
          risks: mission.briefing?.risks || template.briefing.risks,
        },
        tasks: [...mission.tasks, ...newTasks],
      };
    });

    import("../qa/qaEvents").then(({ logQaEvent }) => {
      logQaEvent({ type: "mission.template_applied", userId: currentUser.id, missionId, metadata: { templateId } } as any);
    });
  }, [updateMission]);

  return (
    <MissionStateContext.Provider
      value={{
        missions,
        myPresence,
        ensureMission,
        setMissionStatus,
        addTask,
        toggleTask,
        postUpdate,
        addDecision,
        postCheckIn,
        setEmergency,
        addMapPin,
        removeMapPin,
        addCalendarEvent,
        recordDutyCheckIn,
        setMyPresence,
        generateAARDraft,
        updateBriefing,
        addAsset,
        updateAsset,
        addHandoff,
        updateReadiness,
        setMissionMode,
        setMissionTimeZone,
        setMissionTimes,
        setLastSeenTimeline,
        applyMissionTemplate,
      }}
    >
      {children}
    </MissionStateContext.Provider>
  );
}
