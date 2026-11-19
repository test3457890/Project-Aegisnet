import { useState } from "react";
import { useMockAppState } from "../state/mockAppState";
import { Shield, User, Smartphone, Globe, Lock, AlertTriangle, CheckCircle, SmartphoneNfc, Cpu, EyeOff, Timer, Download, Upload, ShieldAlert, Database, FileText, ShieldCheck, Phone } from "lucide-react";
import { clsx } from "clsx";
import { DISAPPEAR_OPTIONS, PRIVACY_MODES } from "../utils/privacy";
import { exportLocalData, importLocalData } from "../state/exportData";
import { useNavigate } from "react-router";

import { DataHygieneTab } from "../components/settings/DataHygieneTab";
import { DeviceSessionsTab } from "../components/settings/DeviceSessionsTab";
import { TrustVerificationTab } from "../components/settings/TrustVerificationTab";
import { PrivacyAuditTab } from "../components/settings/PrivacyAuditTab";
import { CallSettingsTab } from "../components/settings/CallSettingsTab";

export function SettingsScreen() {
  const navigate = useNavigate();
  const {
    me, networks, networkProfiles, updateNetworkProfile, selectedNetworkId, clearLocalData,
    privacyMode, setPrivacyMode, disappearDefaultSeconds, setDisappearDefault,
    lockPinSet, setLockPin, clearLockPin,
    preferences, updatePreference
  } = useMockAppState();
  const [activeTab, setActiveTab] = useState<"personal" | "device" | "network" | "safety" | "security" | "trust" | "audit" | "dev" | "data" | "calls">("personal");
  const [profileName, setProfileName] = useState(me.name);
  const [pinDraft, setPinDraft] = useState("");
  const [pinNotice, setPinNotice] = useState("");

  const handleSetPin = () => {
    const clean = pinDraft.trim();
    if (clean.length < 4) {
      setPinNotice("Use at least 4 digits for the local lock PIN.");
      return;
    }
    setLockPin(clean);
    setPinDraft("");
    setPinNotice("Local lock PIN saved.");
  };
  const [networkDisplayName, setNetworkDisplayName] = useState(
    selectedNetworkId && networkProfiles[selectedNetworkId] 
      ? networkProfiles[selectedNetworkId].displayName || me.name 
      : me.name
  );
  const [networkRole, setNetworkRole] = useState(
    selectedNetworkId && networkProfiles[selectedNetworkId] 
      ? networkProfiles[selectedNetworkId].role || "" 
      : ""
  );

  const handleSaveNetworkProfile = () => {
    if (!selectedNetworkId) return;
    updateNetworkProfile(selectedNetworkId, {
      displayName: networkDisplayName,
      role: networkRole
    });
  };

  return (
    <div className="flex h-full flex-col bg-background-primary">
      <header className="flex h-16 items-center border-b border-border-default px-6 shrink-0">
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-64 border-r border-border-default bg-background-secondary p-4 overflow-y-auto scrollbar-clean shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("personal")}
              className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "personal" ? "bg-surface-selected text-text-primary border border-accent-primary/50" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")}
            >
              <User size={18} /> Personal Profile
            </button>
            <button
              onClick={() => setActiveTab("device")}
              className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "device" ? "bg-surface-selected text-text-primary border border-accent-primary/50" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")}
            >
              <Smartphone size={18} /> Device Settings
            </button>
            <button
              onClick={() => setActiveTab("network")}
              className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "network" ? "bg-surface-selected text-text-primary border border-accent-primary/50" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")}
            >
              <Globe size={18} /> Network Settings
            </button>
            <button
              onClick={() => setActiveTab("calls")}
              className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "calls" ? "bg-surface-selected text-text-primary border border-accent-primary/50" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")}
            >
              <Phone size={18} /> Voice & Video
            </button>
            <button
              onClick={() => setActiveTab("safety")}
              className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "safety" ? "bg-surface-selected text-text-primary border border-accent-primary/50" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")}
            >
              <Shield size={18} /> Safety & Privacy
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "security" ? "bg-surface-selected text-text-primary border border-accent-primary/50" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")}
            >
              <Lock size={18} /> Security Status
            </button>
            <button
              onClick={() => setActiveTab("trust")}
              className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "trust" ? "bg-surface-selected text-text-primary border border-accent-primary/50" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")}
            >
              <ShieldCheck size={18} /> Trust Verification
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "audit" ? "bg-surface-selected text-text-primary border border-accent-primary/50" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")}
            >
              <FileText size={18} /> Privacy Audit
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-4 border border-danger/20", activeTab === "data" ? "bg-danger/10 text-danger-readable border-danger/50" : "text-text-secondary hover:bg-danger/5 hover:text-danger-readable")}
            >
              <Database size={18} /> Data Hygiene
            </button>
            {import.meta.env.DEV && (
              <button
                onClick={() => setActiveTab("dev")}
                className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-4", activeTab === "dev" ? "bg-surface-selected text-text-primary border border-accent-primary/50" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary")}
              >
                <ShieldAlert size={18} /> Developer Diagnostics
              </button>
            )}
          </nav>
        </aside>

        {/* Settings Content */}
        <main className="flex-1 overflow-y-auto scrollbar-clean p-6 lg:p-10">
          {activeTab === "data" && <DataHygieneTab />}
          {activeTab === "calls" && <CallSettingsTab />}
          {activeTab === "personal" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">Personal Profile</h2>
                <p className="text-sm text-text-secondary mb-6">This is your main identity across the app.</p>
                
                <div className="space-y-4 max-w-md">
                  <div className="rounded-lg border border-border-default bg-background-secondary p-4 flex flex-col gap-4 items-start">
                     <p className="text-sm text-text-primary">Your personal profile management, including display name, username, bio, status, and profile picture, has been moved to its own dedicated screen.</p>
                     <button onClick={() => navigate("/app/profile")} className="rounded bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover transition-colors">Go to Profile</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "device" && <DeviceSessionsTab />}
          {activeTab === "trust" && <TrustVerificationTab />}
          {activeTab === "audit" && <PrivacyAuditTab />}

          {activeTab === "network" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">Network Settings</h2>
                <p className="text-sm text-text-muted mb-6">Manage your profile within specific networks.</p>
                
                {selectedNetworkId ? (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-border-default bg-background-secondary p-4">
                      <h3 className="font-medium text-text-primary mb-4">Profile in {networks[selectedNetworkId]?.name}</h3>
                      <div className="space-y-4 max-w-md">
                        <div>
                          <label htmlFor="settings-network-name" className="block text-sm font-medium text-text-secondary mb-1">Network Display Name</label>
                          <input 
                            id="settings-network-name"
                            type="text" 
                            value={networkDisplayName}
                            onChange={(e) => setNetworkDisplayName(e.target.value)}
                            className="w-full rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                          />
                          <p className="text-[11px] text-text-muted mt-1">This name is only visible inside this network.</p>
                        </div>
                        <div>
                          <label htmlFor="settings-network-role" className="block text-sm font-medium text-text-secondary mb-1">Role / Status</label>
                          <input 
                            id="settings-network-role"
                            type="text" 
                            value={networkRole}
                            onChange={(e) => setNetworkRole(e.target.value)}
                            placeholder="e.g. Hiking Lead, Parent"
                            className="w-full rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                          />
                        </div>
                        <button 
                          onClick={handleSaveNetworkProfile}
                          className="rounded bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover transition-colors"
                        >
                          Save Network Profile
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border-default bg-background-secondary p-4">
                      <h3 className="font-medium text-text-primary mb-4">Transport Preferences</h3>
                      <div className="flex items-center justify-between py-2">
                        <label htmlFor="settings-transport-mode" className="text-sm text-text-secondary">Default Transport Mode</label>
                        <select id="settings-transport-mode" className="rounded border border-border-default bg-background-primary px-2 py-1 text-sm text-text-primary">
                          <option>Auto (Internet / Local)</option>
                          <option disabled>Radio Relay (Planned)</option>
                          <option disabled>Mesh Network (Planned)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Select a network from the sidebar first to edit its settings.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "safety" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">Safety & Privacy</h2>
                <p className="text-sm text-text-muted mb-6">Control your privacy posture, disappearing messages, and the local screen lock.</p>

                <div className="space-y-6">
                  {/* Privacy Mode */}
                  <div className="rounded-lg border border-border-default bg-background-secondary p-4">
                    <h3 className="font-medium text-text-primary flex items-center gap-2 mb-1">
                      <EyeOff size={18} className="text-accent-primary" /> Privacy Mode
                    </h3>
                    <p className="text-sm text-text-muted mb-4">Higher modes hide previews and tighten local behavior. These are on-device behaviors, not encryption.</p>
                    <div className="space-y-2">
                      {PRIVACY_MODES.map((mode) => (
                        <label
                          key={mode.id}
                          className={clsx(
                            "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                            privacyMode === mode.id ? "border-accent-primary/50 bg-surface-selected" : "border-border-default hover:bg-surface-hover",
                          )}
                        >
                          <input
                            type="radio"
                            name="privacy-mode"
                            value={mode.id}
                            checked={privacyMode === mode.id}
                            onChange={() => setPrivacyMode(mode.id)}
                            className="mt-1 accent-current text-accent-primary"
                          />
                          <span>
                            <span className="block text-sm font-bold text-text-primary">{mode.label}</span>
                            <span className="block text-xs text-text-muted">{mode.summary}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {privacyMode === "lockdown" && !lockPinSet && (
                      <p role="alert" className="mt-3 rounded-lg border border-amber-900/30 bg-amber-900/10 px-3 py-2 text-xs font-medium text-amber-500">
                        Set a local lock PIN below to enable the Lockdown screen lock. Without a PIN, Lockdown still hides previews but cannot lock the app.
                      </p>
                    )}
                  </div>

                  {/* Disappearing messages default */}
                  <div className="rounded-lg border border-border-default bg-background-secondary p-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-text-primary flex items-center gap-2">
                        <Timer size={18} className="text-accent-primary" /> Disappearing Messages Default
                      </h3>
                      <p className="text-sm text-text-muted">New messages you send are removed locally after this time. Lockdown enforces at least 24 hours.</p>
                    </div>
                    <select
                      value={disappearDefaultSeconds}
                      onChange={(event) => setDisappearDefault(Number(event.target.value))}
                      className="shrink-0 rounded border border-border-default bg-background-primary px-2 py-1 text-sm text-text-primary"
                      aria-label="Disappearing messages default"
                    >
                      {DISAPPEAR_OPTIONS.map((option) => (
                        <option key={option.seconds} value={option.seconds}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Local lock PIN */}
                  <div className="rounded-lg border border-border-default bg-background-secondary p-4">
                    <h3 className="font-medium text-text-primary flex items-center gap-2 mb-1">
                      <Lock size={18} className="text-accent-primary" /> Local Lock PIN
                    </h3>
                    <p className="text-sm text-text-muted mb-4">
                      A convenience lock that hides the screen behind a PIN. This is <span className="font-bold">not encryption</span> and does not protect your data if the device is compromised.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 max-w-md">
                      <input
                        type="password"
                        inputMode="numeric"
                        value={pinDraft}
                        onChange={(event) => { setPinDraft(event.target.value); setPinNotice(""); }}
                        placeholder={lockPinSet ? "Enter new PIN" : "Set a PIN (min 4 digits)"}
                        className="flex-1 min-w-40 rounded-lg border border-border-default bg-background-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                        aria-label="Local lock PIN"
                      />
                      <button
                        onClick={handleSetPin}
                        className="rounded bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-secondary transition-colors"
                      >
                        {lockPinSet ? "Update PIN" : "Set PIN"}
                      </button>
                      {lockPinSet && (
                        <button
                          onClick={() => { clearLockPin(); setPinNotice("Local lock PIN removed."); }}
                          className="rounded border border-border-default px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                        >
                          Remove PIN
                        </button>
                      )}
                    </div>
                    {pinNotice && <p className="mt-2 text-xs font-medium text-text-secondary">{pinNotice}</p>}
                    <p className="mt-2 text-xs text-text-muted">{lockPinSet ? "A local lock PIN is set." : "No local lock PIN is set."}</p>
                  </div>

                  {/* Trusted contacts (planned) */}
                  <div className="rounded-lg border border-border-default bg-background-secondary p-4">
                    <h3 className="font-medium text-text-primary mb-2">Trusted Contacts</h3>
                    <p className="text-sm text-text-muted mb-4">Contacts who will receive check-in alerts. (Planned — not yet active.)</p>
                    <button disabled className="rounded border border-border-default px-4 py-2 text-sm font-bold text-text-secondary opacity-50 cursor-not-allowed">
                      + Add Trusted Contact
                    </button>
                  </div>

                  {/* Watermarking */}
                  <div className="rounded-lg border border-border-default bg-background-secondary p-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-text-primary">Screenshot Deterrent Watermark</h3>
                      <p className="text-sm text-text-muted">Displays a faint repeating pattern of your name and ID over the entire screen to deter casual screenshots.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center shrink-0">
                      <input 
                        type="checkbox" 
                        className="peer sr-only" 
                        checked={preferences.watermarkEnabled}
                        onChange={(e) => updatePreference("watermarkEnabled", e.target.checked)}
                      />
                      <div className="peer h-6 w-11 rounded-full bg-surface-hover after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border-default after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-primary/50"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">Security Status</h2>
                <p className="text-sm text-text-muted mb-6">Transparency on prototype vs planned security.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-emerald-900/30 bg-emerald-900/10 p-4">
                    <h3 className="font-bold text-emerald-500 flex items-center gap-2 mb-3">
                      <CheckCircle size={18} /> Actually Implemented
                    </h3>
                    <ul className="space-y-2 text-sm text-text-secondary list-disc pl-4">
                      <li>Local data mocking and storage</li>
                      <li>Client-side SHA-256 file hashing</li>
                      <li>Basic WebSocket payload structure</li>
                      <li>Privacy Modes: local preview hiding and screen blur</li>
                      <li>Disappearing messages: local timed removal</li>
                      <li>Local convenience lock (PIN screen guard, not encryption)</li>
                      <li>RBAC Access UI Controls (Owner/Admin rules)</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-emerald-900/30 bg-emerald-900/10 p-4">
                    <h3 className="font-bold text-emerald-500 flex items-center gap-2 mb-3">
                      <Database size={18} /> Backend-Backed
                    </h3>
                    <ul className="space-y-2 text-sm text-text-secondary list-disc pl-4">
                      <li>Network, Category, Room, Chat schemas</li>
                      <li>SQLite persistence (if configured)</li>
                      <li>File Upload API endpoints</li>
                      <li>Basic Access Route Guards</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-amber-900/30 bg-amber-900/10 p-4">
                    <h3 className="font-bold text-amber-500 flex items-center gap-2 mb-3">
                      <AlertTriangle size={18} /> Prototype Only (Mock)
                    </h3>
                    <ul className="space-y-2 text-sm text-text-secondary list-disc pl-4">
                      <li>Device Trust policies (UI only)</li>
                      <li>Session Safety (UI only)</li>
                      <li>Trust Verification (Labels only)</li>
                      <li>Vault Encryption (Local browser AES only)</li>
                      <li>Authentication & Login</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-700/50 bg-background-secondary p-4">
                    <h3 className="font-bold text-text-primary flex items-center gap-2 mb-3">
                      <Globe size={18} /> Planned Architecture
                    </h3>
                    <ul className="space-y-2 text-sm text-text-secondary list-disc pl-4">
                      <li>Production E2EE (X25519/Double Ratchet)</li>
                      <li>Radio, Satellite, Cellular fallback</li>
                      <li>Mesh Networking</li>
                      <li>Hardware Nodes</li>
                      <li>Real Identity / Organization Verification</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "dev" && import.meta.env.DEV && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">Developer Diagnostics</h2>
                <p className="text-sm text-text-muted mb-6">Tools for the QA Bug Bash.</p>
                <div className="rounded-lg border border-border-default bg-background-secondary p-4 flex flex-col gap-4 items-start">
                   <p className="text-sm text-text-secondary">Open the QA Mode screen to generate safe diagnostics, view backend health, and wipe local test data.</p>
                   <button onClick={() => navigate("/app/qa")} className="rounded bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover transition-colors">Open QA Mode</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
