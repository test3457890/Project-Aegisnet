export interface MockMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  /** Epoch ms the message was created (used by disappearing-message expiry). */
  createdAt?: number;
  /** Epoch ms after which the message is locally removed. Undefined means it never expires. */
  expiresAt?: number;
  attachment?: {
    type: "image" | "gif" | "audio" | "file";
    url: string;
    name?: string;
    size?: number;
    duration?: number;
    mimeType?: string;
    fileId?: string;
    storageId?: string;
    storageScope?: "api-local" | "browser-local";
    safeUrl?: string;
    thumbnailUrl?: string;
  };
  /** Emoji reactions mapped to user IDs. e.g. { "👍": ["user_me", "user_sarah"] } */
  reactions?: Record<string, string[]>;
}

export interface MockChat {
  id: string;
  type: "direct" | "group";
  name?: string;
  participants: string[];
  ownerId?: string;
  unreadCount: number;
  lastActivityAt: string;
  lastMessageSnippet: string;
  isSupervisedThread?: boolean;
  protectedUserId?: string;
  initiatingUserId?: string;
  supervisorIds?: string[];
  supervisionReason?: string;
}

export const initialMockChatList: Record<string, MockChat> = {
  "chat_sarah": {
    id: "chat_sarah",
    type: "direct",
    name: "Sarah Connor",
    participants: ["user_me", "user_sarah"],
    unreadCount: 0,
    lastActivityAt: "10:45 AM",
    lastMessageSnippet: "Yes, I'm already here. Take your time.",
  },
  "chat_david": {
    id: "chat_david",
    type: "direct",
    name: "David",
    participants: ["user_me", "user_david"],
    unreadCount: 1,
    lastActivityAt: "Yesterday",
    lastMessageSnippet: "Are we still on for tomorrow?",
  },
  "chat_keira": {
    id: "chat_keira",
    type: "direct",
    name: "Keira",
    participants: ["user_me", "user_keira"],
    unreadCount: 0,
    lastActivityAt: "Tue",
    lastMessageSnippet: "Thanks for the info!",
  },
  "chat_mom": {
    id: "chat_mom",
    type: "direct",
    name: "Mom",
    participants: ["user_me", "user_mom"],
    unreadCount: 2,
    lastActivityAt: "08:30 AM",
    lastMessageSnippet: "Call me when you get this.",
  },
  "chat_family": {
    id: "chat_family",
    type: "group",
    name: "Family Group",
    participants: ["user_me", "user_john", "user_elena"],
    unreadCount: 0,
    lastActivityAt: "09:05 AM",
    lastMessageSnippet: "Check the kitchen counter.",
  },
  "chat_roadtrip": {
    id: "chat_roadtrip",
    type: "group",
    name: "Road Trip Group",
    participants: ["user_me", "user_sarah", "user_marcus"],
    unreadCount: 5,
    lastActivityAt: "Mon",
    lastMessageSnippet: "I'll bring the snacks.",
  },
  "chat_hiking": {
    id: "chat_hiking",
    type: "group",
    name: "Hiking Club Group",
    participants: ["user_me", "user_john", "user_marcus", "user_elena"],
    unreadCount: 0,
    lastActivityAt: "Sun",
    lastMessageSnippet: "Great hike everyone!",
  },
  "chat_weekend": {
    id: "chat_weekend",
    type: "group",
    name: "Weekend Plans",
    participants: ["user_me", "user_david", "user_keira"],
    unreadCount: 3,
    lastActivityAt: "11:20 AM",
    lastMessageSnippet: "What time are we meeting up?",
  },
  "chat_neighborhood": {
    id: "chat_neighborhood",
    type: "group",
    name: "Neighborhood Group",
    participants: ["user_me", "user_sarah"],
    unreadCount: 1,
    lastActivityAt: "Wed",
    lastMessageSnippet: "Did anyone see a lost cat?",
  },
  "chat_school": {
    id: "chat_school",
    type: "group",
    name: "School Group",
    participants: ["user_me", "user_elena"],
    unreadCount: 0,
    lastActivityAt: "Last week",
    lastMessageSnippet: "Don't forget the field trip permission slips.",
  }
};

export const initialMockMessages: Record<string, MockMessage[]> = {
  "chat_sarah": [
    {
      id: "msg_1",
      senderId: "user_sarah",
      text: "Are you near the meeting point? Traffic is bad.",
      timestamp: "10:42 AM",
      status: "read",
    },
    {
      id: "msg_2",
      senderId: "user_me",
      text: "Yes, I'm already here. Take your time.",
      timestamp: "10:45 AM",
      status: "read",
    }
  ],
  "chat_family": [
    {
      id: "msg_1",
      senderId: "user_john",
      text: "Has anyone seen the car keys?",
      timestamp: "09:00 AM",
      status: "read",
    },
    {
      id: "msg_2",
      senderId: "user_elena",
      text: "Check the kitchen counter.",
      timestamp: "09:05 AM",
      status: "read",
    }
  ],
  "chat_david": [
    {
      id: "msg_david_1",
      senderId: "user_david",
      text: "Are we still on for tomorrow?",
      timestamp: "Yesterday",
      status: "delivered",
    }
  ],
  "chat_roadtrip": [
    {
      id: "msg_roadtrip_1",
      senderId: "user_sarah",
      text: "I added two hotel options near the halfway point.",
      timestamp: "9:14 AM",
      status: "read",
    },
    {
      id: "msg_roadtrip_2",
      senderId: "user_marcus",
      text: "I'll bring the snacks and a cooler.",
      timestamp: "9:18 AM",
      status: "read",
    }
  ],
  "chat_hiking": [
    {
      id: "msg_hiking_1",
      senderId: "user_john",
      text: "Saturday's trail is about six miles. Bring extra water.",
      timestamp: "Sunday",
      status: "read",
    }
  ],
  "chat_weekend": [
    {
      id: "msg_weekend_1",
      senderId: "user_keira",
      text: "What time are we meeting up?",
      timestamp: "11:20 AM",
      status: "delivered",
    }
  ],
  "chat_neighborhood": [
    {
      id: "msg_neighborhood_1",
      senderId: "user_sarah",
      text: "Did anyone see a lost cat near the park?",
      timestamp: "Wednesday",
      status: "read",
    }
  ],
  "chat_school": [
    {
      id: "msg_school_1",
      senderId: "user_elena",
      text: "Don't forget the field trip permission slips.",
      timestamp: "Last week",
      status: "read",
    }
  ]
};
