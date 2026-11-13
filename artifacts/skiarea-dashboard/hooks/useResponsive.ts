import { useWindowDimensions, type ViewStyle } from "react-native";
import { useInterfaceWidth } from "@/contexts/InterfaceWidthContext";
import { resolveContentWidth } from "@/lib/interface-width";

export const WIDE_BREAKPOINT = 700;
/** @deprecated Legacy fixed cap; kept only for the lift detail stack screen. Tabs use useResponsive().maxWidth. */
export const CONTENT_MAX_WIDTH = 640;

/**
 * width: window width. contentWidth: width actually available to content after
 * the per-device Larghezza interfaccia cap. Tab layouts use isContentWide;
 * isWide retains the window breakpoint for unconstrained stack screens.
 */
export function useResponsive() {
  const { width } = useWindowDimensions();
  const { maxWidth, width: pref } = useInterfaceWidth();
  const contentWidth = resolveContentWidth(width, pref);
  const isWide = width >= WIDE_BREAKPOINT;
  const isContentWide = contentWidth >= WIDE_BREAKPOINT;
  const containerStyle: ViewStyle = { width: "100%", maxWidth: maxWidth ?? undefined, alignSelf: "center" };
  return { isWide, isContentWide, width, contentWidth, maxWidth, containerStyle };
}
