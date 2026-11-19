/**
 * Per-chat color and wallpaper customization — LOCAL-ONLY prototype.
 *
 * Settings are stored in this browser and are never synced or shared.
 * Only curated presets exist: bubble colors are pre-vetted dark tones that
 * keep white message text readable (WCAG-minded), and wallpapers are
 * CSS-pattern presets — no image uploads, so no image contents can ever be
 * logged or exported. Custom wallpaper upload is documented future work.
 */

import type { CSSProperties } from "react";

export interface ChatAppearance {
  /** ID from CHAT_COLOR_PRESETS. Undefined/"default" = theme default. */
  colorId?: string;
  /** ID from CHAT_WALLPAPER_PRESETS. Undefined/"none" = no wallpaper. */
  wallpaperId?: string;
  /** Local-only custom uploaded wallpaper hash in prototype storage. */
  customWallpaperHash?: string;
  /** Dim the wallpaper pattern (useful on dark themes). */
  dimWallpaper?: boolean;
}

export interface ChatColorPreset {
  id: string;
  label: string;
  /** Outgoing-bubble background. Empty string = use the theme default. */
  bubble: string;
}

/** Dark, white-text-safe bubble colors only — readability stays strong. */
export const CHAT_COLOR_PRESETS: ChatColorPreset[] = [
  { id: "default", label: "Theme default", bubble: "" },
  { id: "ocean", label: "Ocean", bubble: "#0e7490" },
  { id: "forest", label: "Forest", bubble: "#15803d" },
  { id: "plum", label: "Plum", bubble: "#7e22ce" },
  { id: "rose", label: "Rose", bubble: "#be123c" },
  { id: "ember", label: "Ember", bubble: "#b45309" },
  { id: "slate", label: "Slate", bubble: "#334155" },
];

export interface ChatWallpaperPreset {
  id: string;
  label: string;
  /** CSS background-image (subtle, theme-neutral grays). Empty = none. */
  backgroundImage: string;
  /** Lower-alpha variant used when "Dim wallpaper" is on. */
  dimBackgroundImage?: string;
  backgroundSize?: string;
}

/** Subtle CSS-only patterns. Neutral rgba grays work on every theme. */
export const CHAT_WALLPAPER_PRESETS: ChatWallpaperPreset[] = [
  { id: "none", label: "None", backgroundImage: "" },
  {
    id: "dots",
    label: "Dots",
    backgroundImage: "radial-gradient(rgba(128,128,128,0.16) 1.5px, transparent 1.5px)",
    dimBackgroundImage: "radial-gradient(rgba(128,128,128,0.07) 1.5px, transparent 1.5px)",
    backgroundSize: "22px 22px",
  },
  {
    id: "grid",
    label: "Grid",
    backgroundImage:
      "linear-gradient(rgba(128,128,128,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.10) 1px, transparent 1px)",
    dimBackgroundImage:
      "linear-gradient(rgba(128,128,128,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.05) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
  },
  {
    id: "waves",
    label: "Waves",
    backgroundImage:
      "repeating-linear-gradient(45deg, rgba(128,128,128,0.08) 0 2px, transparent 2px 14px)",
    dimBackgroundImage:
      "repeating-linear-gradient(45deg, rgba(128,128,128,0.04) 0 2px, transparent 2px 14px)",
  },
  {
    id: "aurora",
    label: "Aurora",
    backgroundImage:
      "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(99,102,241,0.10), transparent), radial-gradient(ellipse 70% 50% at 80% 100%, rgba(16,185,129,0.08), transparent)",
    dimBackgroundImage:
      "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(99,102,241,0.05), transparent), radial-gradient(ellipse 70% 50% at 80% 100%, rgba(16,185,129,0.04), transparent)",
  },
];

export function colorPreset(colorId?: string): ChatColorPreset {
  return CHAT_COLOR_PRESETS.find((preset) => preset.id === colorId) ?? CHAT_COLOR_PRESETS[0];
}

export function wallpaperPreset(wallpaperId?: string): ChatWallpaperPreset {
  return CHAT_WALLPAPER_PRESETS.find((preset) => preset.id === wallpaperId) ?? CHAT_WALLPAPER_PRESETS[0];
}

/** Inline style for a chat scroll container. Returns {} when no wallpaper. */
export function wallpaperStyle(appearance?: ChatAppearance, getCustomUrl?: (hash: string) => string | undefined): CSSProperties {
  if (appearance?.customWallpaperHash && getCustomUrl) {
    const url = getCustomUrl(appearance.customWallpaperHash);
    if (url) {
      return {
        backgroundImage: appearance.dimWallpaper 
          ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${url})` 
          : `url(${url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
  }

  const preset = wallpaperPreset(appearance?.wallpaperId);
  if (!preset.backgroundImage) return {};
  // Dim uses a lower-alpha pattern so message text contrast stays strong.
  const backgroundImage = appearance?.dimWallpaper && preset.dimBackgroundImage
    ? preset.dimBackgroundImage
    : preset.backgroundImage;
  return {
    backgroundImage,
    backgroundSize: preset.backgroundSize,
  };
}

/** Inline style for the current user's outgoing bubbles. {} = theme default. */
export function bubbleStyle(appearance?: ChatAppearance): CSSProperties {
  const preset = colorPreset(appearance?.colorId);
  if (!preset.bubble) return {};
  return { backgroundColor: preset.bubble };
}

/** True when the appearance differs from the defaults. */
export function isCustomized(appearance?: ChatAppearance): boolean {
  if (!appearance) return false;
  return Boolean(
    (appearance.colorId && appearance.colorId !== "default")
    || (appearance.wallpaperId && appearance.wallpaperId !== "none")
    || appearance.customWallpaperHash
    || appearance.dimWallpaper,
  );
}
