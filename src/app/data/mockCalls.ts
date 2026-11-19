export interface MockCall {
  id: string;
  type: "voice" | "video";
  status: "active" | "ended" | "missed" | "incoming" | "declined";
  participants: string[];
  duration: number; // in seconds
  startedAt: string;
}

export const mockCalls: Record<string, MockCall> = {
  "call_1": {
    id: "call_1",
    type: "voice",
    status: "active",
    participants: ["user_me", "user_sarah"],
    duration: 124,
    startedAt: "10:42 AM",
  },
  "call_2": {
    id: "call_2",
    type: "video",
    status: "active",
    participants: ["user_me", "user_john", "user_sarah"],
    duration: 45,
    startedAt: "Just now",
  }
};
