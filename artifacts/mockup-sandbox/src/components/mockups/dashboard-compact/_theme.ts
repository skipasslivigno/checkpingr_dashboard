// Extracted from skiarea-dashboard/constants/colors.ts; contexts are stubbed in previews.
export const palette = {
  text: "#0C2340", tint: "#0070BA", background: "#F1F8FC",
  foreground: "#0C2340", card: "#FFFFFF", cardForeground: "#0C2340",
  primary: "#0070BA", primaryForeground: "#FFFFFF", primaryLight: "#DCF0FF",
  primaryBorder: "#99CCEE", secondary: "#D2EEF8", secondaryForeground: "#0C2340",
  muted: "#D2EEF8", mutedForeground: "#4E82A0", accent: "#0070BA",
  accentForeground: "#FFFFFF", destructive: "#E74C3C", destructiveForeground: "#FFFFFF",
  border: "#C8E6F5", input: "#C8E6F5", success: "#0070BA", warning: "#E6007E",
  warningLight: "#FCE4F3", warningBorder: "#F5A0CF", radius: 12,
};
export function useColors() { return palette; }
