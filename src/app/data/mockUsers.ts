export interface MockUser {
  id: string;
  name: string;
  status: "online" | "offline" | "busy" | "away";
  avatarColor: string;
  initials: string;
  role?: string;
  username?: string;
  bio?: string;
  statusMessage?: string;
  profilePictureUrl?: string;
  memberSince?: string;
  localTrust?: string;
}

export const currentUser: MockUser = {
  id: "user_me",
  name: "Alex",
  status: "online",
  avatarColor: "bg-blue-700",
  initials: "AL",
  role: "You",
};

export const mockUsers: Record<string, MockUser> = {
  "user_sarah": {
    id: "user_sarah",
    name: "Sarah Connor",
    status: "online",
    avatarColor: "bg-emerald-800",
    initials: "SC",
    role: "Trusted contact",
  },
  "user_john": {
    id: "user_john",
    name: "John Smith",
    status: "away",
    avatarColor: "bg-amber-800",
    initials: "JS",
    role: "Family",
  },
  "user_elena": {
    id: "user_elena",
    name: "Elena Rostova",
    status: "offline",
    avatarColor: "bg-purple-800",
    initials: "ER",
    role: "Known contact",
  },
  "user_marcus": {
    id: "user_marcus",
    name: "Marcus Wright",
    status: "busy",
    avatarColor: "bg-rose-800",
    initials: "MW",
    role: "Hiking coordinator",
  },
  "user_david": {
    id: "user_david",
    name: "David Kim",
    status: "online",
    avatarColor: "bg-cyan-800",
    initials: "DK",
    role: "Known contact",
  },
  "user_keira": {
    id: "user_keira",
    name: "Keira Walsh",
    status: "away",
    avatarColor: "bg-pink-800",
    initials: "KW",
    role: "Known contact",
  },
  "user_mom": {
    id: "user_mom",
    name: "Mom",
    status: "online",
    avatarColor: "bg-orange-800",
    initials: "MO",
    role: "Family",
  }
};
