import { HomeDashboard } from "./HomeDashboard";
import { PrivateCallScreen } from "./PrivateCallScreen";
import { DirectMessageScreen } from "./DirectMessageScreen";

export function DesignBoard() {
  const themes = [
    { id: "midnight", name: "Midnight Command" },
    { id: "signal", name: "Signal Light" },
    { id: "field", name: "Field Ops" },
    { id: "night", name: "Night Rescue" },
    { id: "high-contrast", name: "High Contrast" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AegisNet Design Board</h1>
        <p className="text-slate-400">Comparing themes side-by-side</p>
      </div>

      <div className="space-y-16">
        {themes.map((theme) => (
          <div key={theme.id} className="space-y-4">
            <h2 className="text-2xl font-bold border-b border-slate-700 pb-2">{theme.name}</h2>
            
            {/* Wrap the previews in the theme class */}
            <div className={`theme-${theme.id} flex gap-8 overflow-x-auto pb-8 snap-x`}>
              
              {/* Preview 1: Dashboard */}
              <div className="w-[1024px] h-[768px] shrink-0 border border-border-default rounded-xl overflow-hidden shadow-2xl bg-background-primary text-text-primary flex flex-col snap-start relative">
                 {/* Provide basic structure simulating MainLayout */}
                 <div className="flex h-full">
                    <div className="w-64 bg-sidebar-background border-r border-border-default">
                      <div className="p-4 border-b border-border-default font-bold">AegisNet Sidebar</div>
                      <div className="p-4 space-y-2">
                        <div className="h-8 bg-surface-hover rounded"></div>
                        <div className="h-8 bg-surface-selected rounded"></div>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden relative bg-background-primary">
                      <HomeDashboard />
                    </div>
                 </div>
              </div>

              {/* Preview 2: Direct Message */}
              <div className="w-[1024px] h-[768px] shrink-0 border border-border-default rounded-xl overflow-hidden shadow-2xl bg-background-primary text-text-primary flex flex-col snap-start relative">
                 <div className="flex h-full">
                    <div className="w-64 bg-sidebar-background border-r border-border-default">
                      <div className="p-4 border-b border-border-default font-bold">Private Comms</div>
                      <div className="p-4 space-y-2">
                        <div className="h-8 bg-surface-selected rounded"></div>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden relative bg-background-primary">
                      <DirectMessageScreen />
                    </div>
                 </div>
              </div>

              {/* Preview 3: Call Screen */}
              <div className="w-[1024px] h-[768px] shrink-0 border border-border-default rounded-xl overflow-hidden shadow-2xl bg-background-primary text-text-primary flex flex-col snap-start relative">
                 <PrivateCallScreen />
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
