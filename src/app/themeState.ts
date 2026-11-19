import { createContext, useContext } from "react";

export type Theme = "midnight" | "signal" | "field" | "night" | "high-contrast" | "warm" | "social-dark";

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  autoTheme: boolean;
  setAutoTheme: (auto: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (reduce: boolean) => void;
  compactMode: boolean;
  setCompactMode: (compact: boolean) => void;
  dyslexiaFriendly: boolean;
  setDyslexiaFriendly: (dyslexia: boolean) => void;
  highContrastShortcut: boolean;
  setHighContrastShortcut: (shortcut: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
