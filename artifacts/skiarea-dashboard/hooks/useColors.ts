import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useTenantSettings } from "@/contexts/TenantSettingsContext";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
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
 * Returns the design tokens for the current color scheme, optionally
 * overriding the primary/accent colour with the tenant's configured primaryColor.
 *
 * Chart series colours (tenant colors[]) are NOT applied here —
 * they are used directly in the charts screen via useTenantSettings().
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as unknown as Record<string, typeof colors.light>).dark
      : colors.light;

  const { primaryColor } = useTenantSettings();

  const base = { ...palette, radius: colors.radius };

  const valid = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor);
  if (!valid) return base;

  return {
    ...base,
    primary: primaryColor,
    primaryForeground: foregroundFor(primaryColor),
    primaryLight: withAlpha(primaryColor, 0.12),
    primaryBorder: withAlpha(primaryColor, 0.4),
    accent: primaryColor,
    accentForeground: foregroundFor(primaryColor),
    tint: primaryColor,
    success: primaryColor,
  };
}
