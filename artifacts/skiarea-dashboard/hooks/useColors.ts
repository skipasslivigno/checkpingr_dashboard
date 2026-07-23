import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useTenantSettings } from "@/contexts/TenantSettingsContext";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

function foregroundFor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#FFFFFF";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? "#1A1A1A" : "#FFFFFF";
}

/**
 * Returns the design tokens for the current color scheme, merged with
 * any tenant-configured colours (primary, warning/secondary, muted accent).
 *
 * Tenant color slots:
 *   [0] → primary  (azzurro default #0070BA)
 *   [1] → warning  (fuxia default #E6007E)
 *   [2] → mutedForeground / third accent
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as unknown as Record<string, typeof colors.light>).dark
      : colors.light;

  const { colors: tenantColors } = useTenantSettings();

  const base = { ...palette, radius: colors.radius };

  const primary = tenantColors[0] && /^#[0-9A-Fa-f]{6}$/.test(tenantColors[0]) ? tenantColors[0] : null;
  const secondary = tenantColors[1] && /^#[0-9A-Fa-f]{6}$/.test(tenantColors[1]) ? tenantColors[1] : null;
  const third = tenantColors[2] && /^#[0-9A-Fa-f]{6}$/.test(tenantColors[2]) ? tenantColors[2] : null;

  if (!primary && !secondary && !third) return base;

  return {
    ...base,
    ...(primary ? {
      primary,
      primaryForeground: foregroundFor(primary),
      primaryLight: withAlpha(primary, 0.12),
      primaryBorder: withAlpha(primary, 0.4),
      accent: primary,
      accentForeground: foregroundFor(primary),
      tint: primary,
      success: primary,
    } : {}),
    ...(secondary ? {
      warning: secondary,
      warningLight: withAlpha(secondary, 0.12),
      warningBorder: withAlpha(secondary, 0.4),
    } : {}),
    ...(third ? {
      mutedForeground: third,
    } : {}),
  };
}
