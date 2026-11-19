/**
 * Configurable Protected Person and Supervisor categories.
 * Network-specific prototype policy markers. They do not prove age, employment,
 * legal status, background check status, or clearance.
 */

export interface ProtectedCategory {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  defaultRule: "warning-only" | "supervised-thread" | "blocked";
  backendBacked: false;
}

export const PROTECTED_CATEGORIES: ProtectedCategory[] = [
  { id: "youth", name: "Youth Participant", description: "Minors under 18. Requires supervision.", badgeColor: "bg-emerald-600/20 text-emerald-600", defaultRule: "supervised-thread", backendBacked: false },
  { id: "cadet", name: "Cadet", description: "Program cadets.", badgeColor: "bg-blue-600/20 text-blue-600", defaultRule: "supervised-thread", backendBacked: false },
  { id: "student", name: "Student", description: "Enrolled students.", badgeColor: "bg-indigo-600/20 text-indigo-600", defaultRule: "warning-only", backendBacked: false },
  { id: "intern", name: "Intern", description: "Temporary interns.", badgeColor: "bg-amber-600/20 text-amber-600", defaultRule: "warning-only", backendBacked: false },
  { id: "trainee", name: "Trainee", description: "Employees in training.", badgeColor: "bg-orange-600/20 text-orange-600", defaultRule: "warning-only", backendBacked: false },
  { id: "junior_employee", name: "Junior Employee", description: "Recent hires or junior staff.", badgeColor: "bg-teal-600/20 text-teal-600", defaultRule: "warning-only", backendBacked: false },
  { id: "volunteer", name: "Volunteer", description: "Unpaid volunteers.", badgeColor: "bg-green-600/20 text-green-600", defaultRule: "warning-only", backendBacked: false },
  { id: "external_guest", name: "External Guest", description: "Visitors or guests.", badgeColor: "bg-rose-600/20 text-rose-600", defaultRule: "warning-only", backendBacked: false },
  { id: "contractor", name: "Contractor", description: "External contractors.", badgeColor: "bg-slate-600/20 text-slate-600", defaultRule: "warning-only", backendBacked: false },
  { id: "vendor", name: "Vendor", description: "External vendors.", badgeColor: "bg-gray-600/20 text-gray-600", defaultRule: "warning-only", backendBacked: false },
  { id: "client", name: "Client", description: "Clients or customers.", badgeColor: "bg-cyan-600/20 text-cyan-600", defaultRule: "warning-only", backendBacked: false },
  { id: "program_participant", name: "Program Participant", description: "General program attendees.", badgeColor: "bg-violet-600/20 text-violet-600", defaultRule: "warning-only", backendBacked: false },
  { id: "custom_protected", name: "Custom Protected Role", description: "Custom protected category.", badgeColor: "bg-fuchsia-600/20 text-fuchsia-600", defaultRule: "warning-only", backendBacked: false },
];

export interface SupervisorCategory {
  id: string;
  name: string;
  description: string;
  canSupervise: boolean;
  canApprove: boolean;
  isSecondAdult: boolean;
  canViewAudit: boolean;
  backendBacked: false;
}

export const SUPERVISOR_ROLES: SupervisorCategory[] = [
  { id: "supervisor", name: "Supervisor", description: "General supervisor.", canSupervise: true, canApprove: true, isSecondAdult: true, canViewAudit: true, backendBacked: false },
  { id: "safety_monitor", name: "Safety Monitor", description: "Monitors compliance.", canSupervise: true, canApprove: false, isSecondAdult: true, canViewAudit: true, backendBacked: false },
  { id: "senior_member", name: "Senior Member", description: "Senior organization member.", canSupervise: true, canApprove: true, isSecondAdult: true, canViewAudit: true, backendBacked: false },
  { id: "training_officer", name: "Training Officer", description: "Oversees trainees.", canSupervise: true, canApprove: true, isSecondAdult: true, canViewAudit: true, backendBacked: false },
  { id: "instructor", name: "Instructor", description: "Teaching staff.", canSupervise: true, canApprove: false, isSecondAdult: true, canViewAudit: false, backendBacked: false },
  { id: "manager", name: "Manager", description: "Management staff.", canSupervise: true, canApprove: true, isSecondAdult: true, canViewAudit: true, backendBacked: false },
  { id: "hr_reviewer", name: "HR Reviewer", description: "Human resources.", canSupervise: true, canApprove: true, isSecondAdult: true, canViewAudit: true, backendBacked: false },
  { id: "program_lead", name: "Program Lead", description: "Program leadership.", canSupervise: true, canApprove: true, isSecondAdult: true, canViewAudit: true, backendBacked: false },
  { id: "compliance_reviewer", name: "Compliance Reviewer", description: "Compliance officer.", canSupervise: false, canApprove: false, isSecondAdult: false, canViewAudit: true, backendBacked: false },
  { id: "organization_admin", name: "Organization Admin", description: "Admin staff.", canSupervise: true, canApprove: true, isSecondAdult: true, canViewAudit: true, backendBacked: false },
  { id: "parent_guardian", name: "Parent or Guardian", description: "Parent or guardian.", canSupervise: true, canApprove: false, isSecondAdult: false, canViewAudit: false, backendBacked: false },
  { id: "custom_supervisor", name: "Custom Supervisor", description: "Custom supervisor.", canSupervise: true, canApprove: false, isSecondAdult: true, canViewAudit: false, backendBacked: false },
];
