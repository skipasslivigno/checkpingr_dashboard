export type InterfaceWidth = "compact" | "standard" | "wide" | "full";

export const INTERFACE_WIDTH_STORAGE_KEY = "interface_width";
export const DEFAULT_INTERFACE_WIDTH: InterfaceWidth = "standard";
export const INTERFACE_WIDTH_OPTIONS: InterfaceWidth[] = ["compact", "standard", "wide", "full"];

/** Max content width in px for each preference; null means unlimited. */
export const INTERFACE_WIDTH_PX: Record<InterfaceWidth, number | null> = {
  compact: 640,
  standard: 960,
  wide: 1200,
  full: null,
};

export function parseInterfaceWidth(raw: unknown): InterfaceWidth | null {
  return typeof raw === "string" && (INTERFACE_WIDTH_OPTIONS as string[]).includes(raw)
    ? (raw as InterfaceWidth)
    : null;
}

/** Actual content width: window width capped by the preference (phones stay full width). */
export function resolveContentWidth(windowWidth: number, pref: InterfaceWidth): number {
  const max = INTERFACE_WIDTH_PX[pref];
  const w = Math.max(0, windowWidth);
  return max == null ? w : Math.min(w, max);
}

/** Serialize storage writes, including recovery after a rejected earlier write. */
export function createInterfaceWidthWriter(write: (value: InterfaceWidth) => Promise<void>) {
  let pending = Promise.resolve();
  return (value: InterfaceWidth): Promise<void> => {
    const next = pending.catch(() => undefined).then(() => write(value));
    pending = next;
    return next;
  };
}
