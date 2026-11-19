import { Home, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";

export function NotFoundScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background-primary p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-border-default bg-surface-card p-8 text-center shadow-xl">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-background-secondary border border-border-default text-text-primary flex items-center justify-center text-2xl font-black">404</div>
        <h1 className="mt-6 text-2xl font-bold text-text-primary">That page is not available</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">The link may be old or this prototype screen may have moved.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button onClick={() => window.location.reload()} className="rounded-xl border border-border-default bg-background-secondary px-4 py-2.5 text-sm font-bold text-text-primary flex items-center justify-center gap-2 hover:bg-surface-hover">
            <RefreshCw size={17} />
            Reload App
          </button>
          <button onClick={() => navigate("/app")} className="rounded-xl border border-border-default bg-background-secondary px-4 py-2.5 text-sm font-bold text-text-primary flex items-center justify-center gap-2 hover:bg-surface-hover">
            <Home size={17} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
