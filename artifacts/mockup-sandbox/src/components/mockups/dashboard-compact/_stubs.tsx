import React, { createContext, useContext } from "react";
import { Maximize2, RefreshCw, TrendingUp, X } from "lucide-react";
import { translations } from "./_translations";
import { palette } from "./_theme";

export function useTranslation() { return { t: translations.it, language: "it" as const }; }
export const PreviewAuthContext = createContext({
  user: { id: "preview-admin", tenantId: "preview", role: "admin" },
});
export function useAuth() { return useContext(PreviewAuthContext); }
export function useSafeAreaInsets() { return { top: 0, bottom: 0, left: 0, right: 0 }; }
function tokens(color: string) { return { color, light: `${color}1f`, border: `${color}66` }; }
export function useMetricColors() {
  return { primiIngressi: tokens(palette.warning), passages: tokens(palette.primary), presenze: tokens(palette.mutedForeground) };
}
const icons = { "maximize-2": Maximize2, "refresh-cw": RefreshCw, "trending-up": TrendingUp, x: X };
export function Feather({ name, size = 16, color, style }: { name: keyof typeof icons; size?: number; color?: string; style?: React.CSSProperties }) {
  const Icon = icons[name];
  return <Icon size={size} color={color} style={style} />;
}
