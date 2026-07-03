import { useWindowDimensions } from "react-native";

export const WIDE_BREAKPOINT = 700;
export const CONTENT_MAX_WIDTH = 640;

export function useResponsive() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  return { isWide, width };
}
