import { clsx } from "clsx";
import { Shield, ShieldAlert, Circle, ShieldCheck, CheckCircle2 } from "lucide-react";

export function PrototypeBadge() {
  return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20" title="Prototype feature">PROTOTYPE</span>;
}

export function LocalOnlyBadge() {
  return <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-500/20" title="Local to this browser only">LOCAL-ONLY</span>;
}

export function BackendBackedBadge() {
  return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20" title="Backed by server API">BACKEND-BACKED</span>;
}

export function PlannedBadge() {
  return <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-700" title="Planned architecture feature">PLANNED</span>;
}

export function ManualTrustBadge() {
  return <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">MANUAL TRUST</span>;
}

export function TrustedContactBadge() {
  return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20"><ShieldCheck size={10} className="mr-1"/> TRUSTED CONTACT</span>;
}

export function KnownContactBadge() {
  return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20"><Circle size={10} className="mr-1"/> KNOWN CONTACT</span>;
}

export function ProtectedPersonBadge() {
  return <span className="inline-flex items-center rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-bold text-fuchsia-400 border border-fuchsia-500/20">PROTECTED PERSON</span>;
}

export function SupervisorBadge() {
  return <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">SUPERVISOR</span>;
}

export function SafetyMonitorBadge() {
  return <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">SAFETY MONITOR</span>;
}

export function DeviceTrustedBadge() {
  return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20" title="Prototype device trust"><CheckCircle2 size={10} className="mr-1"/> TRUSTED (PROTOTYPE)</span>;
}

export function SessionReviewedBadge() {
  return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20" title="Prototype session review"><CheckCircle2 size={10} className="mr-1"/> REVIEWED (PROTOTYPE)</span>;
}

export function TrustRingIcon({ level, className }: { level: "green" | "blue" | "amber" | "red" | "gray", className?: string }) {
  switch (level) {
    case "green":
      return <ShieldCheck size={16} className={clsx("text-emerald-500", className)} aria-label="Green Ring: Organization verified" />;
    case "blue":
      return <Shield size={16} className={clsx("text-blue-500", className)} aria-label="Blue Ring: Trusted partner" />;
    case "amber":
      return <ShieldAlert size={16} className={clsx("text-amber-500", className)} aria-label="Amber Ring: Known Contact or manually trusted" />;
    case "red":
      return <ShieldAlert size={16} className={clsx("text-red-500", className)} aria-label="Red Ring: Untrusted or high risk" />;
    case "gray":
      return <Circle size={16} className={clsx("text-slate-500", className)} aria-label="Gray Ring: Guest or temporary participant" />;
  }
}
