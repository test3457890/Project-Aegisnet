import { ShieldCheck, Wifi, WifiOff, BatteryWarning, Car, Briefcase, Pin, CheckSquare } from "lucide-react";
import { clsx } from "clsx";

const members = [
 { id: 1, name: "Sarah Connor", status: "online", role: "Commander", verified: true, state: "In field", icon: Briefcase },
 { id: 2, name: "John Smith", status: "online", role: "Medic", verified: true, state: "Driving", icon: Car },
 { id: 3, name: "Mike Delta", status: "weak", role: "Operator", verified: true, state: "Weak network", icon: Wifi },
 { id: 4, name: "Elena Rostova", status: "reconnecting", role: "Analyst", verified: false, state: "Reconnecting", icon: WifiOff },
 { id: 5, name: "David Kim", status: "offline", role: "Pilot", verified: true, state: "Low battery", icon: BatteryWarning },
];

export function StatusPanel() {
 return (
 <div className="hidden lg:flex flex-col w-72 bg-background-secondary border-l border-border-default shrink-0 h-full">
 <div className="h-16 flex items-center px-4 border-b border-border-default">
 <h2 className="text-sm font-semibold text-text-primary">Operation Status</h2>
 </div>

 <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-clean">
 
 {/* Emergency Status - Only show if active */}
 <div className="bg-danger/10 border border-red-500/20 rounded-lg p-3 flex flex-col gap-2">
 <div className="flex items-center gap-2 text-danger font-semibold text-sm">
 <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
 Active Alert
 </div>
 <p className="text-xs text-danger/90 leading-relaxed">
 SAR team deployed to North Ridge. Radio silence in effect.
 </p>
 </div>

 {/* Tasks */}
 <div>
 <h3 className="text-xs font-semibold text-text-primary0 mb-3 tracking-wider flex items-center justify-between">
 ACTIVE TASKS
 <span className="bg-background-tertiary text-text-secondary px-1.5 py-0.5 rounded text-[10px]">2</span>
 </h3>
 <div className="space-y-2">
 <div className="flex items-start gap-2 bg-background-tertiary/50 p-2 rounded-md">
 <CheckSquare size={14} className="text-text-secondary mt-0.5" />
 <div className="text-sm text-text-secondary">Establish base camp comms</div>
 </div>
 <div className="flex items-start gap-2 bg-background-tertiary/50 p-2 rounded-md">
 <CheckSquare size={14} className="text-text-secondary mt-0.5" />
 <div className="text-sm text-text-secondary">Drone sweep Sector 4</div>
 </div>
 </div>
 </div>

 {/* Pinned Files */}
 <div>
 <h3 className="text-xs font-semibold text-text-primary0 mb-3 tracking-wider flex items-center justify-between">
 PINNED FILES
 <span className="bg-background-tertiary text-text-secondary px-1.5 py-0.5 rounded text-[10px]">1</span>
 </h3>
 <div className="flex items-start gap-2 bg-background-tertiary/50 p-2 rounded-md cursor-pointer hover:bg-background-tertiary transition-colors">
 <Pin size={14} className="text-accent-primary mt-0.5 transform -rotate-45" />
 <div className="text-sm text-text-secondary">Map_Pack_v2.pdf</div>
 </div>
 </div>

 {/* Members */}
 <div>
 <h3 className="text-xs font-semibold text-text-primary0 mb-3 tracking-wider">
 ROSTER — {members.length}
 </h3>
 <div className="space-y-3">
 {members.map((member) => {
 const StateIcon = member.icon;
 return (
 <div key={member.id} className="flex items-center gap-3 group cursor-pointer">
 <div className="relative">
 <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-medium text-text-secondary">
 {member.name.charAt(0)}
 </div>
 <div className={clsx(
 "absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-background-secondary rounded-full",
 member.status === 'online' ? "bg-success" :
 member.status === 'weak' ? "bg-yellow-500" :
 member.status === 'reconnecting' ? "bg-orange-500 animate-pulse" :
 "bg-background-primary0"
 )} />
 </div>
 <div className="flex-1 overflow-hidden">
 <div className="flex items-center gap-1.5">
 <span className="text-sm font-medium text-text-primary truncate group-hover:text-text-primary transition-colors">{member.name}</span>
 {member.verified && <ShieldCheck size={14} className="text-success shrink-0" />}
 </div>
 <div className="flex items-center gap-1.5 text-xs text-text-primary0">
 {StateIcon && <StateIcon size={12} className={clsx(
 member.status === 'weak' && "text-yellow-500",
 member.status === 'reconnecting' && "text-orange-500"
 )} />}
 <span className="truncate">{member.state}</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 </div>
 </div>
 );
}
