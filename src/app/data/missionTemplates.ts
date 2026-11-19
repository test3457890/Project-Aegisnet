import { MissionBriefing, MissionTask, MissionData } from "../state/missionState";

export interface MissionTemplate {
  id: string;
  name: string;
  suggestedMode: MissionData["mode"];
  briefing: Partial<MissionBriefing>;
  tasks: Pick<MissionTask, "label" | "priority">[];
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: "template_event_support",
    name: "Event Support",
    suggestedMode: "planning",
    briefing: {
      objective: "Provide coordination and support for the main event.",
      situation: "Standard event with expected high attendance.",
      risks: "Crowd control, lost persons, medical emergencies.",
    },
    tasks: [
      { label: "Set up central command post", priority: "high" },
      { label: "Distribute radios to team leads", priority: "high" },
      { label: "Conduct perimeter check", priority: "medium" },
    ],
  },
  {
    id: "template_cyber_incident",
    name: "Cyber Incident",
    suggestedMode: "lockdown",
    briefing: {
      objective: "Identify, contain, and mitigate the cyber threat.",
      situation: "Suspected breach or severe operational anomaly.",
      risks: "Data exfiltration, systemic downtime, reputational damage.",
    },
    tasks: [
      { label: "Isolate affected systems", priority: "critical" },
      { label: "Capture forensic image", priority: "high" },
      { label: "Notify security officer", priority: "critical" },
    ],
  },
  {
    id: "template_ctf",
    name: "CTF Competition",
    suggestedMode: "live",
    briefing: {
      objective: "Capture flags and defend local infrastructure.",
      situation: "Active cyber-security competition.",
      risks: "Unintended exposure, losing points, system crash.",
    },
    tasks: [
      { label: "Review rules of engagement", priority: "high" },
      { label: "Set up defensive monitors", priority: "medium" },
      { label: "Identify first target", priority: "medium" },
    ],
  },
  {
    id: "template_hiking_trip",
    name: "Hiking Club Trip",
    suggestedMode: "low-bandwidth",
    briefing: {
      objective: "Safely navigate the trail and return by nightfall.",
      situation: "Day hike in remote terrain.",
      risks: "Weather changes, injuries, wildlife, losing the trail.",
    },
    tasks: [
      { label: "Confirm headcount before start", priority: "high" },
      { label: "Verify weather forecast", priority: "high" },
      { label: "Check first aid kit", priority: "medium" },
    ],
  },
  {
    id: "template_training",
    name: "Training Exercise",
    suggestedMode: "training",
    briefing: {
      objective: "Run simulated scenarios to improve team readiness.",
      situation: "Controlled environment training.",
      risks: "Simulated injuries, equipment wear.",
    },
    tasks: [
      { label: "Brief participants on scenario", priority: "high" },
      { label: "Ensure safety words are known", priority: "critical" },
      { label: "Conduct hotwash (AAR) immediately after", priority: "medium" },
    ],
  },
  {
    id: "template_school_project",
    name: "School Project",
    suggestedMode: "planning",
    briefing: {
      objective: "Complete final project deliverables on time.",
      situation: "Collaborative academic assignment.",
      risks: "Missed deadlines, miscommunication.",
    },
    tasks: [
      { label: "Assign research topics", priority: "medium" },
      { label: "Draft initial outline", priority: "medium" },
      { label: "Review and merge final document", priority: "high" },
    ],
  },
  {
    id: "template_business_launch",
    name: "Business Launch",
    suggestedMode: "live",
    briefing: {
      objective: "Successfully launch the new product/service.",
      situation: "Go-live day for public access.",
      risks: "System overload, payment gateway failure, negative PR.",
    },
    tasks: [
      { label: "Verify production environment", priority: "critical" },
      { label: "Publish launch announcement", priority: "high" },
      { label: "Monitor support rooms", priority: "medium" },
    ],
  },
  {
    id: "template_family_travel",
    name: "Family Travel",
    suggestedMode: "watch",
    briefing: {
      objective: "Coordinate travel logistics and stay safe.",
      situation: "International or long-distance travel.",
      risks: "Flight delays, lost passports, getting separated.",
    },
    tasks: [
      { label: "Share itinerary with emergency contact", priority: "high" },
      { label: "Pack passports and tickets", priority: "critical" },
      { label: "Confirm hotel booking", priority: "medium" },
    ],
  },
  {
    id: "template_volunteer_op",
    name: "Volunteer Operation",
    suggestedMode: "planning",
    briefing: {
      objective: "Execute community service tasks efficiently.",
      situation: "Community or disaster relief volunteer effort.",
      risks: "Volunteer burnout, resource shortages, unsafe conditions.",
    },
    tasks: [
      { label: "Set up volunteer check-in station", priority: "high" },
      { label: "Distribute safety gear", priority: "critical" },
      { label: "Assign zone leaders", priority: "high" },
    ],
  },
  {
    id: "template_custom",
    name: "Custom",
    suggestedMode: "planning",
    briefing: {
      objective: "User-defined mission parameters.",
    },
    tasks: [],
  },
];
