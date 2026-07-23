import { useTenantSettings } from "@/contexts/TenantSettingsContext";
import { useColors } from "@/hooks/useColors";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const validHex = (s: string | undefined): s is string => !!s && HEX_RE.test(s);

function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

function tokens(color: string) {
  return { color, light: withAlpha(color, 0.12), border: withAlpha(color, 0.4) };
}

/**
 * Returns design tokens for the three metric categories, using
 * tenant-configured chart colors with palette fallbacks:
 *   tenantColors[0] → passaggi     (fallback: colors.primary)
 *   tenantColors[1] → primiIngressi (fallback: colors.warning)
 *   tenantColors[2] → presenze      (fallback: colors.mutedForeground)
 */
export function useMetricColors() {
  const colors = useColors();
  const { colors: tenantColors } = useTenantSettings();

  return {
    passages:      tokens(validHex(tenantColors[0]) ? tenantColors[0] : colors.primary),
    primiIngressi: tokens(validHex(tenantColors[1]) ? tenantColors[1] : colors.warning),
    presenze:      tokens(validHex(tenantColors[2]) ? tenantColors[2] : colors.mutedForeground),
  };
}
