import { useMockAppState } from "../../state/mockAppState";
import { Mic, Video, Filter, Phone, ShieldCheck } from "lucide-react";

export function CallSettingsTab() {
  const { preferences, updatePreference } = useMockAppState();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">Voice & Video Settings</h2>
        <p className="text-sm text-text-secondary">
          Configure local prototype defaults for calls and meetings. 
        </p>
      </div>

      <div className="rounded-2xl border border-border-default bg-surface-card overflow-hidden">
        <div className="p-4 border-b border-border-default bg-surface-hover/30 flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-500" />
          <h3 className="font-medium text-text-primary">Call Privacy</h3>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="pr-8">
              <p className="font-medium text-text-primary flex items-center gap-2">
                <Filter size={16} className="text-text-secondary" />
                Inbound Call Filter
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Control who can ring your device directly. Prototype feature only.
              </p>
            </div>
            <select
              value={preferences.inboundCallFilter || "all"}
              onChange={(e) => updatePreference("inboundCallFilter", e.target.value)}
              className="rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="all">Everyone</option>
              <option value="network">Network Members Only</option>
              <option value="known">Known Contacts Only</option>
              <option value="trusted">Trusted Contacts Only</option>
              <option value="nobody">Block All Calls</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border-default bg-surface-card overflow-hidden">
        <div className="p-4 border-b border-border-default bg-surface-hover/30 flex items-center gap-2">
          <Phone size={18} className="text-accent-primary" />
          <h3 className="font-medium text-text-primary">Meeting Defaults</h3>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="pr-8">
              <p className="font-medium text-text-primary flex items-center gap-2">
                <Mic size={16} className="text-text-secondary" />
                Default Microphone State
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Turn on the microphone automatically when starting a call.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={preferences.defaultMicrophone !== false}
                onChange={(e) => updatePreference("defaultMicrophone", e.target.checked)}
              />
              <div className="peer h-6 w-11 rounded-full bg-surface-hover after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="pr-8">
              <p className="font-medium text-text-primary flex items-center gap-2">
                <Video size={16} className="text-text-secondary" />
                Default Camera State
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Turn on the camera automatically when starting a video call.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={preferences.defaultCamera !== false}
                onChange={(e) => updatePreference("defaultCamera", e.target.checked)}
              />
              <div className="peer h-6 w-11 rounded-full bg-surface-hover after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="pr-8">
              <p className="font-medium text-text-primary">Join Room Voice Muted</p>
              <p className="mt-1 text-xs text-text-secondary">
                Always join Network Room voice rooms with your microphone muted.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={preferences.joinMuted || false}
                onChange={(e) => updatePreference("joinMuted", e.target.checked)}
              />
              <div className="peer h-6 w-11 rounded-full bg-surface-hover after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
