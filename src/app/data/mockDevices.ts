export interface MockDevice {
  id: string;
  name: string;
  ownerId: string;
  trustLevel: "trusted" | "unverified" | "revoked";
  lastSeen: string;
}

export const mockDevices: Record<string, MockDevice> = {
  "device_me_1": {
    id: "device_me_1",
    name: "My iPhone",
    ownerId: "user_me",
    trustLevel: "trusted",
    lastSeen: "Just now",
  },
  "device_sarah_1": {
    id: "device_sarah_1",
    name: "Sarah's Pixel",
    ownerId: "user_sarah",
    trustLevel: "trusted",
    lastSeen: "2 mins ago",
  }
};
