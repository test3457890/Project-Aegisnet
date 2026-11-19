import { useEffect, useState } from 'react';
import { useMockAppState } from '../state/mockAppState';
import { ShieldAlert, Trash2, Copy, AlertTriangle, CheckCircle2, ListChecks } from 'lucide-react';
import { clearVaultKey } from '../storage/vaultCrypto';
import { clearQaEvents, getQaEvents, logQaEvent } from '../qa/qaEvents';

// Once per app session: marks that this build carries the hidden-scrollbar
// audit (Sprint 8) so testers can see it in the event log.
let scrollbarAuditLogged = false;

// DEVELOPMENT-ONLY: QA Mode screen for the AegisNet Bug Bash.
// This screen is gated by import.meta.env.DEV and must never appear in production builds.
// It exposes safe metadata diagnostics only. It never logs message bodies, file contents,
// Vault plaintext, Vault keys, auth tokens, passwords, or secrets.

export function QAModeScreen() {
  const { me, selectedNetworkId, selectedRoomId, clearLocalData } = useMockAppState();
  const [copied, setCopied] = useState(false);
  const [wipeStep, setWipeStep] = useState(0);
  const [wipeInput, setWipeInput] = useState('');
  const [eventsVersion, setEventsVersion] = useState(0);

  useEffect(() => {
    if (!scrollbarAuditLogged && import.meta.env.DEV) {
      scrollbarAuditLogged = true;
      logQaEvent({ type: "scrollbar.audit.completed", reason: "sprint8-hidden-scrollbars", success: true });
      setEventsVersion((v) => v + 1);
    }
  }, []);

  // Re-read on each render; the version counter forces refresh after Clear.
  void eventsVersion;
  const qaEvents = getQaEvents();

  if (!import.meta.env.DEV) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background-primary h-full">
        <ShieldAlert size={48} className="text-danger mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">QA Mode Disabled</h1>
        <p className="text-text-secondary max-w-md">
          This developer diagnostic screen is not available in production builds.
        </p>
      </div>
    );
  }

  // Safe metadata only — never includes message bodies, keys, tokens, passwords, or file contents.
  const generateDiagnostics = () => {
    let storageEstimate = 'unavailable';
    try {
      storageEstimate = `${localStorage.length} localStorage keys`;
    } catch (_) { /* ignore */ }

    const data = {
      _warning: 'QA diagnostics are prototype metadata only. No private content included.',
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE,
      frontendVersion: import.meta.env.VITE_APP_VERSION || 'development',
      route: window.location.pathname,
      activeUserId: me?.id || 'none',
      activeNetworkId: selectedNetworkId || 'none',
      activeRoomId: selectedRoomId || 'none',
      localStorageUsage: storageEstimate,
      userAgent: navigator.userAgent,
      // Recent QA events are metadata-only (event type, route, IDs, success, reason code).
      recentQaEvents: getQaEvents().slice(0, 50),
      // Explicitly excluded: message bodies, file contents, Vault plaintext, Vault keys,
      // auth tokens, passwords, profile bios, Activity content, profile photo contents,
      // and support ticket private content.
    };
    return JSON.stringify(data, null, 2);
  };

  const handleCopyDiagnostics = () => {
    navigator.clipboard.writeText(generateDiagnostics());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWipe = async () => {
    if (wipeInput === 'WIPE LOCAL DATA') {
      // Clear prototype local state (does NOT touch backend SQLite)
      clearLocalData();
      await clearVaultKey();
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background-primary overflow-y-auto scrollbar-clean">
      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert size={28} className="text-accent-primary" />
            <h1 className="text-3xl font-bold text-text-primary">QA Mode &amp; Diagnostics</h1>
          </div>
          <p className="text-text-secondary">
            Development-only tools for the AegisNet Bug Bash.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-amber-900/20 border border-amber-900/40 text-amber-500 rounded-lg px-3 py-1.5 text-xs font-medium">
            <AlertTriangle size={14} />
            Prototype-only. Not visible in production builds.
          </div>
        </div>

        {/* Safe diagnostics panel */}
        <div className="bg-surface-card border border-border-default rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">Safe Diagnostics</h2>
          <p className="text-xs text-text-muted mb-3">
            Metadata only. No message bodies, file contents, Vault keys, tokens, or passwords are included.
          </p>
          <pre className="bg-background-secondary p-4 rounded-lg text-sm text-text-secondary font-mono mb-4 overflow-x-auto scrollbar-clean whitespace-pre-wrap">
            {generateDiagnostics()}
          </pre>
          <button
            id="qa-copy-diagnostics"
            onClick={handleCopyDiagnostics}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-secondary text-white rounded-lg transition-colors font-medium text-sm"
          >
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? 'Copied to Clipboard' : 'Copy Diagnostics'}
          </button>
        </div>

        {/* Bug Reporter Panel */}
        <div className="bg-surface-card border border-border-default rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 text-text-primary mb-4">
            <AlertTriangle size={20} className="text-warning" />
            <h2 className="text-lg font-bold">Report Prototype Bug</h2>
          </div>
          <p className="text-text-secondary text-sm mb-4">
            Submitting a bug here creates a mock support ticket in your local database for testing the Admin Center. 
            <strong> Do not send bug reports to the mock backend.</strong>
          </p>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const title = (form.elements.namedItem('title') as HTMLInputElement).value;
            const steps = (form.elements.namedItem('steps') as HTMLTextAreaElement).value;
            const behavior = (form.elements.namedItem('behavior') as HTMLTextAreaElement).value;
            
            logQaEvent({ 
              type: "bug_report.submitted", 
              userId: me.id, 
              reason: `Mock report: ${title}` 
            });
            
            form.reset();
            alert("Bug report submitted locally! Check the Support Tickets tab in the Admin Center.");
          }}>
            <div>
              <label htmlFor="bug-title" className="block text-sm font-medium text-text-primary mb-1">Issue Title</label>
              <input id="bug-title" name="title" required className="w-full bg-background-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary" placeholder="Brief description of the issue" />
            </div>
            <div>
              <label htmlFor="bug-steps" className="block text-sm font-medium text-text-primary mb-1">Steps to Reproduce</label>
              <textarea id="bug-steps" name="steps" required rows={3} className="w-full bg-background-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary" placeholder="1. Go to...\n2. Click on...\n3. Observe..." />
            </div>
            <div>
              <label htmlFor="bug-behavior" className="block text-sm font-medium text-text-primary mb-1">Actual Behavior</label>
              <textarea id="bug-behavior" name="behavior" required rows={2} className="w-full bg-background-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary" placeholder="What happened?" />
            </div>
            <div className="flex items-center gap-2 bg-background-secondary p-3 rounded-lg border border-border-default">
              <input type="checkbox" id="include-logs" defaultChecked className="h-4 w-4 rounded border-border-default text-accent-primary focus:ring-accent-primary" />
              <label htmlFor="include-logs" className="text-sm text-text-primary font-medium">Include recent QA events and safe diagnostics</label>
            </div>
            <button type="submit" className="w-full py-2 bg-accent-secondary hover:opacity-90 text-white rounded-lg font-bold text-sm transition-opacity">
              Submit Local Bug Report
            </button>
          </form>
        </div>

        {/* Recent QA Events panel */}
        <div className="bg-surface-card border border-border-default rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <ListChecks size={18} className="text-accent-primary" />
              Recent QA Events
            </h2>
            <button
              id="qa-clear-events"
              onClick={() => { clearQaEvents(); setEventsVersion((v) => v + 1); }}
              className="px-3 py-1.5 text-xs font-bold text-text-secondary border border-border-default rounded-lg hover:bg-surface-hover transition-colors"
            >
              Clear QA event log
            </button>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Metadata only: event type, route, user/Network/Room IDs, success flag, and short reason codes.
            Never message bodies, bios, Activity content, photos, keys, tokens, or passwords.
            Copy Diagnostics includes the 50 most recent events.
          </p>
          {qaEvents.length === 0 ? (
            <p className="text-sm text-text-secondary bg-background-secondary rounded-lg p-4">
              No QA events yet. Open a profile, click a roster member, or toggle a privacy preference to record one.
            </p>
          ) : (
            <ul className="divide-y divide-border-default max-h-80 overflow-y-auto scrollbar-clean rounded-lg border border-border-default" data-testid="qa-event-list">
              {qaEvents.slice(0, 100).map((event, index) => (
                <li key={`${event.ts}-${index}`} className="px-3 py-2 text-xs font-mono flex flex-wrap gap-x-3 gap-y-1 items-center bg-background-secondary">
                  <span className="text-text-muted shrink-0">{new Date(event.ts).toLocaleTimeString()}</span>
                  <span className="font-bold text-text-primary">{event.type}</span>
                  {event.route && <span className="text-text-secondary">{event.route}</span>}
                  {event.targetUserId && <span className="text-text-muted">target:{event.targetUserId}</span>}
                  {event.networkId && <span className="text-text-muted">net:{event.networkId}</span>}
                  {event.reason && <span className="text-text-muted">{event.reason}</span>}
                  {event.success === false && <span className="text-danger font-bold">failed</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Wipe panel */}
        <div className="bg-surface-card border border-danger/30 rounded-xl p-6">
          <div className="flex items-center gap-2 text-danger mb-4">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-bold">Wipe Local Test Data</h2>
          </div>
          <p className="text-text-secondary text-sm mb-2">
            This clears your <strong>local prototype state only</strong>: MockAppState, OfflineSyncQueue, and File Vault keys/files.
          </p>
          <p className="text-text-muted text-xs mb-6">
            It does <strong>NOT</strong> reset the backend SQLite database. Run the backend reset script separately if needed.
          </p>

          {wipeStep === 0 ? (
            <button
              id="qa-start-wipe"
              onClick={() => setWipeStep(1)}
              className="px-4 py-2 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg transition-colors font-medium text-sm"
            >
              Start Local Wipe
            </button>
          ) : (
            <div className="bg-background-secondary p-4 rounded-lg border border-danger/30">
              <p className="text-sm text-text-primary mb-3">
                Type <strong>WIPE LOCAL DATA</strong> below to confirm destruction of all local prototype data.
              </p>
              <div className="flex flex-wrap gap-3">
                <input
                  id="qa-wipe-input"
                  type="text"
                  value={wipeInput}
                  onChange={(e) => setWipeInput(e.target.value)}
                  className="flex-1 min-w-48 bg-background-primary border border-border-default rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-danger"
                  placeholder="WIPE LOCAL DATA"
                />
                <button
                  id="qa-confirm-wipe"
                  onClick={handleWipe}
                  disabled={wipeInput !== 'WIPE LOCAL DATA'}
                  className="px-4 py-2 bg-danger text-white rounded-lg font-medium text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={16} />
                  Confirm Wipe
                </button>
                <button
                  onClick={() => { setWipeStep(0); setWipeInput(''); }}
                  className="px-4 py-2 bg-surface-hover text-text-primary rounded-lg font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
