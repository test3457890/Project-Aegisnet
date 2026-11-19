import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { CheckCircle2, Moon, Sun, Shield, Settings, Mountain } from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "../themeState";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { useState } from "react";

interface ThemeSwitcherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themes = [
  { id: "social-dark", name: "Aegis Social Dark", desc: "Dark charcoal and navy surfaces. Familiar and comfortable.", icon: Moon },
  { id: "midnight", name: "Midnight Command", desc: "Deep navy and calm blue. Focused and readable.", icon: Moon },
  { id: "warm", name: "Warm Everyday", desc: "Soft off-white and warm blue. Friendly and accessible.", icon: Sun },
  { id: "signal", name: "Signal Light", desc: "Soft white and cool gray. Clean and airy.", icon: Sun },
  { id: "field", name: "Field Ops", desc: "Muted olive and sand. For outdoor operations.", icon: Mountain },
  { id: "night", name: "Night Rescue", desc: "Dark blue-black with cyan and orange accents.", icon: Shield },
  { id: "high-contrast", name: "High Contrast", desc: "Maximum readability. Accessibility first.", icon: Settings },
] as const;

export function ThemeSwitcherModal({ open, onOpenChange }: ThemeSwitcherModalProps) {
  const { 
    theme, setTheme,
    autoTheme, setAutoTheme,
    reduceMotion, setReduceMotion,
    compactMode, setCompactMode,
    dyslexiaFriendly, setDyslexiaFriendly,
    highContrastShortcut, setHighContrastShortcut
  } = useTheme();

  const [showMessage, setShowMessage] = useState(false);

  const handleThemeChange = (newTheme: any) => {
    setTheme(newTheme);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-surface-card border-border-default p-0 overflow-hidden text-text-primary">
        <div className="p-6 pb-4 border-b border-border-default flex justify-between items-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Appearance Settings</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Customize your AegisNet experience.
            </DialogDescription>
          </DialogHeader>
          {showMessage && (
            <div className="text-sm text-success font-medium animate-in fade-in">
              Theme applied locally.
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-4 bg-background-tertiary h-[60vh] sm:h-[60vh] overflow-y-auto scrollbar-clean">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themes.map((t) => {
              const active = theme === t.id;
              // Mini preview container gets the theme class specifically so it renders that theme's colors
              return (
                <button 
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={clsx(
                    "w-full flex flex-col items-start gap-3 p-4 rounded-xl text-left transition-colors border",
                    active 
                      ? "bg-surface-hover border-accent-primary shadow-sm ring-1 ring-accent-primary" 
                      : "bg-surface-card hover:bg-surface-hover border-border-default"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-text-primary">
                      <t.icon size={18} className={active ? "text-accent-primary" : "text-text-muted"} />
                      <h4 className="text-sm font-bold">{t.name}</h4>
                    </div>
                    {active && <CheckCircle2 size={18} className="text-accent-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-text-secondary">{t.desc}</p>
                  
                  {/* Mini Preview inside the button */}
                  <div className={clsx("theme-" + t.id, "w-full rounded-md border border-border-default overflow-hidden flex h-24 bg-background-primary pointer-events-none")}>
                    {/* Sidebar preview */}
                    <div className="w-1/4 h-full bg-sidebar-background border-r border-border-default flex flex-col gap-1 p-1">
                      <div className="w-full h-2 rounded bg-surface-hover mb-2"></div>
                      <div className="w-full h-2 rounded bg-surface-selected"></div>
                      <div className="w-2/3 h-2 rounded bg-surface-hover"></div>
                    </div>
                    {/* Content preview */}
                    <div className="flex-1 p-2 flex flex-col gap-2">
                      {/* Status badge */}
                      <div className="w-fit px-1.5 py-0.5 rounded text-[8px] bg-success/20 text-success font-medium">Verified</div>
                      {/* Chat bubbles */}
                      <div className="flex flex-col gap-1">
                        <div className="self-start w-2/3 h-4 rounded-lg rounded-tl-sm bg-message-incoming border border-border-default"></div>
                        <div className="self-end w-1/2 h-4 rounded-lg rounded-tr-sm bg-message-outgoing"></div>
                      </div>
                      {/* Button */}
                      <div className="mt-auto self-end w-12 h-4 rounded bg-button-primary"></div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-border-default pt-6 space-y-4">
            <h4 className="font-bold text-sm text-text-primary">Preferences</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-theme" className="flex flex-col gap-1 cursor-pointer">
                <span className="text-sm font-medium">Auto theme</span>
                <span className="text-xs text-text-muted">Follow system settings</span>
              </Label>
              <Switch id="auto-theme" checked={autoTheme} onCheckedChange={setAutoTheme} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reduce-motion" className="flex flex-col gap-1 cursor-pointer">
                <span className="text-sm font-medium">Reduce motion</span>
                <span className="text-xs text-text-muted">Disable animations</span>
              </Label>
              <Switch id="reduce-motion" checked={reduceMotion} onCheckedChange={setReduceMotion} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="compact-mode" className="flex flex-col gap-1 cursor-pointer">
                <span className="text-sm font-medium">Compact mode</span>
                <span className="text-xs text-text-muted">Decrease spacing</span>
              </Label>
              <Switch id="compact-mode" checked={compactMode} onCheckedChange={setCompactMode} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="dyslexia" className="flex flex-col gap-1 cursor-pointer">
                <span className="text-sm font-medium">Dyslexia-friendly text</span>
                <span className="text-xs text-text-muted">Use OpenDyslexic font</span>
              </Label>
              <Switch id="dyslexia" checked={dyslexiaFriendly} onCheckedChange={setDyslexiaFriendly} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="high-contrast" className="flex flex-col gap-1 cursor-pointer">
                <span className="text-sm font-medium">High contrast shortcut</span>
                <span className="text-xs text-text-muted">Quick toggle accessibility</span>
              </Label>
              <Switch id="high-contrast" checked={highContrastShortcut} onCheckedChange={setHighContrastShortcut} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
