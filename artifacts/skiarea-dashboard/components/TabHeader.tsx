import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTenantSettings } from "@/contexts/TenantSettingsContext";
import { useColors } from "@/hooks/useColors";
import { useResponsive } from "@/hooks/useResponsive";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  inlineActionsMinWidth?: number;
  titleTestID?: string;
  style?: StyleProp<ViewStyle>;
};

export function TabHeader({ title, subtitle, actions, inlineActionsMinWidth = 380, titleTestID, style }: Props) {
  const colors = useColors();
  const { logoBase64 } = useTenantSettings();
  const { contentWidth, isContentWide } = useResponsive();
  const inlineActions = contentWidth >= inlineActionsMinWidth;

  return (
    <View style={[styles.header, style]}>
      <View style={styles.row}>
        <Image
          testID="tab-header-logo"
          source={logoBase64 ? { uri: logoBase64 } : require("@/assets/images/logo.png")}
          resizeMode="contain"
          style={[styles.logo, isContentWide && styles.logoWide]}
        />
        <View style={styles.copy}>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
          <Text
            testID={titleTestID}
            accessibilityRole="header"
            style={[styles.title, contentWidth < 420 && styles.titleCompact, { color: colors.primary }]}
          >
            {title.toUpperCase()}
          </Text>
        </View>
        {inlineActions ? actions : null}
      </View>
      {!inlineActions && actions ? <View style={styles.stackedActions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 10, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52 },
  logo: { width: 124, height: 50, flexShrink: 0 },
  logoWide: { width: 180, height: 64 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  titleCompact: { fontSize: 22 },
  subtitle: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 },
  stackedActions: { alignItems: "flex-end" },
});
