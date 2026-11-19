import { useRouteError, useNavigate } from "react-router";
import { ShieldAlert, RefreshCw, Home, Copy, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { logQaEvent } from "../qa/qaEvents";
import { useMockAppState } from "../state/mockAppState";

export function ErrorScreen() {
  const error: any = useRouteError();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { logDevError } = useMockAppState();

  // Metadata-only QA event: error name + request ID, never the message text.
  useEffect(() => {
    logQaEvent({
      type: "error.boundary",
      success: false,
      reason: error?.name || "UnknownError",
      requestId: error?.requestId || undefined,
    });
    
    // Developer error log: full message, kept locally for the Admin Center
    logDevError({
      environment: import.meta.env.MODE,
      route: window.location.pathname,
      errorName: error?.name || "UnknownError",
      errorMessage: error?.message || error?.statusText || String(error),
      requestId: error?.requestId || "none",
    });
  }, [error, logDevError]);

  const handleCopyDiagnostics = () => {
    const data = {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE,
      route: window.location.pathname,
      errorName: error?.name || "UnknownError",
      errorMessage: error?.message || error?.statusText || String(error),
      requestId: error?.requestId || "none",
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background-primary flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-card border border-border-default rounded-2xl p-8 shadow-xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-text-primary mb-2">Something went wrong</h1>
        <p className="text-text-secondary mb-8">
          Something went wrong while opening this part of AegisNet.
        </p>

        {import.meta.env.DEV && error && (
          <div className="w-full bg-background-secondary rounded-lg p-4 mb-8 text-left overflow-x-auto scrollbar-clean">
            <p className="text-danger-readable font-mono text-xs font-semibold mb-1">Developer Error Details:</p>
            <pre className="text-text-primary0 text-xs whitespace-pre-wrap">
              {error.message || error.statusText || String(error)}
            </pre>
            <button 
              onClick={handleCopyDiagnostics}
              className="mt-4 flex items-center justify-center gap-2 bg-surface-card hover:bg-surface-hover text-text-primary px-3 py-1.5 rounded-lg transition-colors font-medium border border-border-default text-xs"
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied ? 'Copied Diagnostics' : 'Copy Diagnostics'}
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 bg-background-secondary hover:bg-surface-hover text-text-primary px-4 py-2 rounded-xl transition-colors font-medium border border-border-default"
          >
            <RefreshCw size={18} />
            Reload App
          </button>
          <button 
            onClick={() => navigate("/app")}
            className="flex-1 flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white px-4 py-2 rounded-xl transition-colors font-medium"
          >
            <Home size={18} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
