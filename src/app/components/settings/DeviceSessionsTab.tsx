import { useMockAppState } from "../../state/mockAppState";
import { SmartphoneNfc, Laptop, Smartphone, AlertTriangle, Monitor, XCircle, ShieldAlert } from "lucide-react";
import { DeviceTrustedBadge, PlannedBadge, PrototypeBadge } from "../ui/Badges";

export function DeviceSessionsTab() {
  const { devices, sessions, revokeDevice, revokeSession, markDeviceTrusted } = useMockAppState();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">Device & Sessions</h2>
        <p className="text-sm text-text-muted mb-4">Manage devices and active sessions accessing your account.</p>

        <div className="mb-6 rounded-lg border border-amber-900/30 bg-amber-900/10 px-4 py-3">
          <p className="text-sm font-medium text-amber-500">
            <AlertTriangle size={16} className="inline mr-2" />
            Device Trust is a prototype trust label in this build. It is not hardware-backed device verification unless explicitly marked as implemented. Session controls are prototype safety controls unless backend session enforcement is enabled.
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="rounded-lg border border-border-default bg-background-secondary p-4">
            <h3 className="font-medium text-text-primary flex items-center gap-2 mb-4">
              <SmartphoneNfc size={18} className="text-accent-primary"/> Known Devices
            </h3>
            <div className="space-y-4">
              {devices.filter(d => !d.revoked).map(device => (
                <div key={device.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl border border-border-default bg-background-primary">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {device.type === "desktop" ? <Monitor size={20} className="text-text-secondary"/> : 
                       device.type === "mobile" ? <Smartphone size={20} className="text-text-secondary"/> : 
                       <Laptop size={20} className="text-text-secondary"/>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary text-sm">{device.name}</span>
                        {device.currentDevice && <span className="text-[10px] font-bold bg-accent-primary/20 text-accent-readable px-2 py-0.5 rounded-full">Current Device</span>}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{device.browser}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Last active: {new Date(device.lastActive).toLocaleString()}</p>
                      {device.trustState === "trusted" && <div className="mt-2"><DeviceTrustedBadge /></div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {device.trustState !== "trusted" && (
                      <button 
                        onClick={() => markDeviceTrusted(device.id, true)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border-default text-text-primary hover:bg-surface-hover"
                      >
                        Mark Trusted
                      </button>
                    )}
                    <button 
                      onClick={() => revokeDevice(device.id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-danger/10 text-danger-readable hover:bg-danger/20 flex items-center gap-1"
                    >
                      <XCircle size={14} /> Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border-default bg-background-secondary p-4">
            <h3 className="font-medium text-text-primary flex items-center gap-2 mb-4">
              <ShieldAlert size={18} className="text-accent-primary"/> Active Sessions
            </h3>
            <div className="space-y-4">
              {sessions.filter(s => !s.revoked).map(session => {
                const device = devices.find(d => d.id === session.deviceId);
                return (
                  <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl border border-border-default bg-background-primary">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary text-sm">{device?.name || "Unknown Device"} Session</span>
                        {session.currentSession && <span className="text-[10px] font-bold bg-accent-primary/20 text-accent-readable px-2 py-0.5 rounded-full">Current Session</span>}
                        {!session.reviewed && !session.currentSession && <span className="text-[10px] font-bold bg-danger/20 text-danger-readable px-2 py-0.5 rounded-full">Unreviewed</span>}
                      </div>
                      <p className="text-[10px] text-text-muted mt-1">Started: {new Date(session.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="shrink-0">
                      {!session.currentSession && (
                        <button 
                          onClick={() => revokeSession(session.id)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-danger/10 text-danger-readable hover:bg-danger/20 flex items-center gap-1"
                        >
                          <XCircle size={14} /> Terminate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
