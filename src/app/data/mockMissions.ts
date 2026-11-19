export interface MockMission {
  id: string;
  name: string;
  status: "active" | "standby" | "completed";
  participants: string[];
}

export const mockMissions: Record<string, MockMission> = {
  "mission_1": {
    id: "mission_1",
    name: "Weekend Group Trip",
    status: "active",
    participants: ["user_me", "user_sarah", "user_john"],
  },
  "mission_sar": {
    id: "mission_sar",
    name: "SAR Operation Alpha",
    status: "standby",
    participants: ["user_me", "user_sarah"],
  }
};
