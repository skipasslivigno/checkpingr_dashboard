import * as Web from "react-native-web";

// Preview-only bridge: the installed community RN-web declarations omit runtime exports
// (including StyleSheet) and native-compatible props. Runtime primitives remain real RN-web.
const native = Web as unknown as Record<string, any>;
export const StyleSheet = native.StyleSheet;
export const View = native.View;
export const Text = native.Text;
export const ScrollView = native.ScrollView;
export const TouchableOpacity = native.TouchableOpacity;
export const Modal = native.Modal;
export const Pressable = native.Pressable;
export const Switch = native.Switch;
export const ActivityIndicator = native.ActivityIndicator;
export const useWindowDimensions: () => { width: number; height: number; scale: number; fontScale: number } = native.useWindowDimensions;
export const Platform: { OS: string } = native.Platform;
export const TextInput = native.TextInput;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TextInput = { focus: () => void; blur: () => void };
