import { describe, expect, it } from "vitest";
import {
  addTaskToMission,
  appendTimelineEntry,
  checkInEntry,
  checkInText,
  createDefaultMission,
  createInitialMissions,
  presenceLabel,
  toggleTaskInMission,
} from "./missionState";

describe("mission state helpers", () => {
  it("creates an empty default mission", () => {
    const mission = createDefaultMission("room_x", "Field Op");
    expect(mission.id).toBe("room_x");
    expect(mission.name).toBe("Field Op");
    expect(mission.tasks).toHaveLength(0);
    expect(mission.timeline).toHaveLength(0);
    expect(mission.emergencyActive).toBe(false);
  });

  it("adds tasks and ignores blank labels", () => {
    const base = createDefaultMission("room_x");
    const withTask = addTaskToMission(base, "Set up relay", undefined, undefined, "task_1");
    expect(withTask.tasks).toHaveLength(1);
    expect(withTask.tasks[0]).toMatchObject({ id: "task_1", label: "Set up relay", done: false });

    const blank = addTaskToMission(withTask, "   ");
    expect(blank.tasks).toHaveLength(1);
  });

  it("toggles a task's done state", () => {
    const mission = addTaskToMission(createDefaultMission("room_x"), "Sweep sector", undefined, undefined, "task_1");
    const toggled = toggleTaskInMission(mission, "task_1");
    expect(toggled.tasks[0].done).toBe(true);
    expect(toggleTaskInMission(toggled, "task_1").tasks[0].done).toBe(false);
  });

  it("prepends timeline entries (newest first)", () => {
    const mission = createDefaultMission("room_x");
    const a = appendTimelineEntry(mission, { id: "tl_1", kind: "update", text: "first", at: 1 });
    const b = appendTimelineEntry(a, { id: "tl_2", kind: "update", text: "second", at: 2 });
    expect(b.timeline.map((entry) => entry.id)).toEqual(["tl_2", "tl_1"]);
  });

  it("maps check-ins to the right timeline kind and text", () => {
    expect(checkInEntry("safe", "user_me", 100, "tl_a")).toMatchObject({ kind: "check-in", text: "I'm safe", authorId: "user_me" });
    expect(checkInEntry("need-help", "user_me", 100, "tl_b").kind).toBe("alert");
    expect(checkInText("on-my-way")).toBe("On my way");
  });

  it("labels presence statuses", () => {
    expect(presenceLabel("in-field")).toBe("In Field");
    expect(presenceLabel("available")).toBe("Available");
  });

  it("seeds a worked SAR mission example", () => {
    const seed = createInitialMissions();
    expect(seed.room_sar_mission).toBeDefined();
    expect(seed.room_sar_mission.tasks.length).toBeGreaterThan(0);
    expect(seed.room_sar_mission.timeline.length).toBeGreaterThan(0);
  });
});
