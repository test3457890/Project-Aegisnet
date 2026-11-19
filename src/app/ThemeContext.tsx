import React, { useEffect, useState } from 'react';
import { Theme, ThemeContext } from './themeState';

function loadBoolean(key: string) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('aegis-theme') as Theme) || 'social-dark';
    } catch {
      return 'social-dark';
    }
  });
  const [autoTheme, setAutoTheme] = useState(() => loadBoolean('aegisnet_appearance_autoTheme'));
  const [reduceMotion, setReduceMotion] = useState(() => loadBoolean('aegisnet_appearance_reduceMotion'));
  const [compactMode, setCompactMode] = useState(() => loadBoolean('aegisnet_appearance_compactMode'));
  const [dyslexiaFriendly, setDyslexiaFriendly] = useState(() => loadBoolean('aegisnet_appearance_dyslexiaFriendly'));
  const [highContrastShortcut, setHighContrastShortcut] = useState(() => loadBoolean('aegisnet_appearance_highContrastShortcut'));

  useEffect(() => {
    (window as any).resetTheme = () => {
      localStorage.removeItem('aegis-theme');
      Object.keys(localStorage)
        .filter((key) => key.startsWith('aegisnet_appearance_'))
        .forEach((key) => localStorage.removeItem(key));
      window.location.reload();
    };
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('aegis-theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-midnight', 'theme-signal', 'theme-field', 'theme-night', 'theme-high-contrast', 'theme-warm', 'theme-social-dark');
    root.classList.add(`theme-${theme}`);
    
    if (reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    if (compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    if (dyslexiaFriendly) {
      root.classList.add('dyslexia-friendly');
    } else {
      root.classList.remove('dyslexia-friendly');
    }
  }, [theme, reduceMotion, compactMode, dyslexiaFriendly]);

  useEffect(() => { localStorage.setItem('aegisnet_appearance_autoTheme', String(autoTheme)); }, [autoTheme]);
  useEffect(() => { localStorage.setItem('aegisnet_appearance_reduceMotion', String(reduceMotion)); }, [reduceMotion]);
  useEffect(() => { localStorage.setItem('aegisnet_appearance_compactMode', String(compactMode)); }, [compactMode]);
  useEffect(() => { localStorage.setItem('aegisnet_appearance_dyslexiaFriendly', String(dyslexiaFriendly)); }, [dyslexiaFriendly]);
  useEffect(() => { localStorage.setItem('aegisnet_appearance_highContrastShortcut', String(highContrastShortcut)); }, [highContrastShortcut]);

  return (
    <ThemeContext.Provider value={{
      theme, setTheme,
      autoTheme, setAutoTheme,
      reduceMotion, setReduceMotion,
      compactMode, setCompactMode,
      dyslexiaFriendly, setDyslexiaFriendly,
      highContrastShortcut, setHighContrastShortcut
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
