import { MockNetwork, MockRoom, RoomVisibility, MockOrgTreeNode } from "./mockNetworks";

export interface NetworkTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  roles: { name: string; color: string; permissions: string[] }[];
  categories: {
    name: string;
    rooms: { name: string; type: MockRoom["type"]; visibility?: RoomVisibility }[];
  }[];
  defaultSafetySettings?: {
    hideFromNonMembers: boolean;
    requireJoinApproval: boolean;
  };
  orgNodes?: MockOrgTreeNode[];
}

export const networkTemplates: NetworkTemplate[] = [
  {
    id: "family",
    name: "Family Network",
    description: "A private space for family members with shared photo vaults and check-ins.",
    icon: "Home",
    roles: [
      { name: "Parent", color: "bg-indigo-600", permissions: ["manage_rooms", "manage_members", "manage_safety", "send_messages", "view_audit", "join_voice", "start_calls"] },
      { name: "Family Member", color: "bg-emerald-600", permissions: ["send_messages", "join_voice", "start_calls"] },
      { name: "Kid", color: "bg-blue-500", permissions: ["send_messages", "join_voice"] }
    ],
    categories: [
      {
        name: "General",
        rooms: [
          { name: "Family Chat", type: "text" },
          { name: "Announcements", type: "announcement" }
        ]
      },
      {
        name: "Media",
        rooms: [
          { name: "Photos", type: "text" },
          { name: "Secure Vault", type: "vault", visibility: "private" }
        ]
      },
      {
        name: "Safety",
        rooms: [
          { name: "Check-ins", type: "check-in" }
        ]
      }
    ],
    defaultSafetySettings: { hideFromNonMembers: true, requireJoinApproval: true }
  },
  {
    id: "school",
    name: "School / Student Org",
    description: "Organize students, share resources, and post announcements securely.",
    icon: "GraduationCap",
    roles: [
      { name: "Teacher/Admin", color: "bg-rose-600", permissions: ["manage_rooms", "manage_members", "manage_safety", "send_messages", "view_audit", "join_voice", "start_calls"] },
      { name: "Student Leader", color: "bg-amber-600", permissions: ["send_messages", "manage_rooms", "join_voice", "start_calls"] },
      { name: "Student", color: "bg-blue-500", permissions: ["send_messages", "join_voice"] }
    ],
    categories: [
      {
        name: "Classes",
        rooms: [
          { name: "Announcements", type: "announcement" },
          { name: "General Discussion", type: "text" }
        ]
      },
      {
        name: "Resources",
        rooms: [
          { name: "Syllabus & Files", type: "vault" }
        ]
      }
    ],
    defaultSafetySettings: { hideFromNonMembers: false, requireJoinApproval: true },
    orgNodes: [
      { id: "node_sch_cmd", name: "Commander", type: "duty_position", isVacant: false },
      { id: "node_sch_dep", name: "Deputy Commander", type: "duty_position", parentId: "node_sch_cmd", isVacant: false },
      { id: "node_sch_flt_cmd", name: "Flight Commander", type: "duty_position", parentId: "node_sch_cmd", isVacant: false },
      { id: "node_sch_flt_sgt", name: "Flight Sergeant", type: "duty_position", parentId: "node_sch_flt_cmd", isVacant: false },
    ]
  },
  {
    id: "cyber",
    name: "Cyber Team / CTF",
    description: "Operational space for incident response, CTFs, or security teams.",
    icon: "Terminal",
    roles: [
      { name: "Incident Commander", color: "bg-danger-readable", permissions: ["manage_rooms", "manage_members", "manage_safety", "manage_mission", "send_messages", "view_audit", "join_voice", "start_calls"] },
      { name: "Analyst", color: "bg-slate-600", permissions: ["send_messages", "view_audit", "join_voice", "start_calls"] },
      { name: "Trainee", color: "bg-emerald-600", permissions: ["send_messages", "join_voice"] }
    ],
    categories: [
      {
        name: "Operations",
        rooms: [
          { name: "General", type: "text" },
          { name: "Incident Room", type: "mission", visibility: "restricted" },
          { name: "Planning Room", type: "planning", visibility: "opsec" }
        ]
      },
      {
        name: "Secure",
        rooms: [
          { name: "Evidence Vault", type: "vault", visibility: "restricted" },
          { name: "Audit Metadata", type: "text", visibility: "restricted" }
        ]
      }
    ],
    defaultSafetySettings: { hideFromNonMembers: true, requireJoinApproval: true }
  },
  {
    id: "mission",
    name: "Mission / Event Team",
    description: "Real-time coordination with Mission Rooms, planning tools, and check-ins.",
    icon: "Map",
    roles: [
      { name: "Mission Lead", color: "bg-amber-600", permissions: ["manage_rooms", "manage_members", "manage_mission", "send_messages", "join_voice", "start_calls"] },
      { name: "Safety Officer", color: "bg-emerald-600", permissions: ["manage_safety", "send_messages", "join_voice", "start_calls"] },
      { name: "Operator", color: "bg-blue-500", permissions: ["send_messages", "join_voice", "start_calls"] }
    ],
    categories: [
      {
        name: "Command",
        rooms: [
          { name: "Mission Briefing", type: "text" },
          { name: "Live Mission", type: "mission", visibility: "restricted" },
          { name: "Planning", type: "planning", visibility: "opsec" }
        ]
      },
      {
        name: "Live Spaces",
        rooms: [
          { name: "Voice Net", type: "voice" },
          { name: "Check-ins", type: "check-in" }
        ]
      }
    ],
    defaultSafetySettings: { hideFromNonMembers: true, requireJoinApproval: true }
  },
  {
    id: "corporate",
    name: "Corporate Team",
    description: "Professional team space with structured roles, project rooms, and announcements.",
    icon: "Briefcase",
    roles: [
      { name: "Manager", color: "bg-indigo-600", permissions: ["manage_rooms", "manage_members", "send_messages", "view_audit", "join_voice", "start_calls"] },
      { name: "Team Member", color: "bg-blue-500", permissions: ["send_messages", "join_voice", "start_calls"] },
      { name: "Contractor", color: "bg-amber-600", permissions: ["send_messages", "join_voice"] }
    ],
    categories: [
      {
        name: "General",
        rooms: [
          { name: "Announcements", type: "announcement" },
          { name: "Team Chat", type: "text" }
        ]
      },
      {
        name: "Projects",
        rooms: [
          { name: "Project Alpha", type: "text" },
          { name: "Project Files", type: "vault" }
        ]
      }
    ],
    defaultSafetySettings: { hideFromNonMembers: true, requireJoinApproval: true }
  },
  {
    id: "blank",
    name: "Blank Network",
    description: "Start from scratch. Create your own roles, rooms, and categories.",
    icon: "Plus",
    roles: [],
    categories: [
      {
        name: "General",
        rooms: [
          { name: "General Chat", type: "text" }
        ]
      }
    ],
    defaultSafetySettings: { hideFromNonMembers: false, requireJoinApproval: false }
  },
  {
    id: "cadet",
    name: "Cadet / Flight Structure",
    description: "Structured program with flights, commanders, and standardized roles.",
    icon: "Users",
    roles: [
      { name: "Commander", color: "bg-indigo-600", permissions: ["manage_rooms", "manage_members", "manage_safety", "send_messages", "view_audit", "join_voice", "start_calls"] },
      { name: "Flight Staff", color: "bg-amber-600", permissions: ["send_messages", "manage_rooms", "join_voice", "start_calls"] },
      { name: "Cadet", color: "bg-blue-500", permissions: ["send_messages", "join_voice", "start_calls"] }
    ],
    categories: [
      {
        name: "General",
        rooms: [
          { name: "Announcements", type: "announcement" },
          { name: "General Chat", type: "text" }
        ]
      },
      {
        name: "Flights",
        rooms: [
          { name: "Alpha Flight", type: "text" },
          { name: "Bravo Flight", type: "text" }
        ]
      }
    ],
    defaultSafetySettings: { hideFromNonMembers: false, requireJoinApproval: true },
    orgNodes: [
      { id: "node_cadet_cmd", name: "Commander", type: "duty_position", isVacant: false },
      { id: "node_cadet_dep", name: "Deputy Commander", type: "duty_position", parentId: "node_cadet_cmd", isVacant: false },
      { id: "node_cadet_flt_cmd", name: "Flight Commander", type: "duty_position", parentId: "node_cadet_cmd", isVacant: false },
      { id: "node_cadet_flt_sgt", name: "Flight Sergeant", type: "duty_position", parentId: "node_cadet_flt_cmd", isVacant: false }
    ]
  }
];
