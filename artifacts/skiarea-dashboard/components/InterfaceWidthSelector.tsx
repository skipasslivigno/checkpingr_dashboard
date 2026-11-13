import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useResponsive } from "@/hooks/useResponsive";
import { useTranslation } from "@/contexts/LanguageContext";
import { useInterfaceWidth } from "@/contexts/InterfaceWidthContext";
import { INTERFACE_WIDTH_OPTIONS, INTERFACE_WIDTH_PX } from "@/lib/interface-width";

export function InterfaceWidthSelector() {
  const colors = useColors();
  const { t } = useTranslation();
  const { width, setWidth, status, retrySave } = useInterfaceWidth();
  const { isContentWide: isWide } = useResponsive();
  const tw = t.interfaceWidth;

  return (
    <View testID="interface-width-selector" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.head}>
        <Feather name="maximize-2" size={15} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>{tw.title}</Text>
        {status === "saving" && <Text style={[styles.meta, { color: colors.mutedForeground }]}>{tw.saving}</Text>}
        {status === "loading" && <Text style={[styles.meta, { color: colors.mutedForeground }]}>{tw.loading}</Text>}
      </View>
      <View accessibilityRole="radiogroup" style={[styles.segment, !isWide && styles.segmentNarrow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        {INTERFACE_WIDTH_OPTIONS.map((opt) => {
          const active = opt === width;
          const px = INTERFACE_WIDTH_PX[opt];
          return (
            <TouchableOpacity
              key={opt}
              testID={`interface-width-${opt}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => setWidth(opt)}
              activeOpacity={0.75}
              style={[styles.opt, !isWide && styles.optNarrow, active && { backgroundColor: colors.primary }]}
            >
              <Text numberOfLines={1} style={[styles.optLabel, { color: active ? colors.primaryForeground : colors.foreground }]}>{tw[opt]}</Text>
              <Text numberOfLines={1} style={[styles.optPx, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {px == null ? tw.unlimited : `${px} px`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {status === "readError" || status === "writeError" ? (
        <View testID="interface-width-error" style={[styles.err, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
          <Feather name="alert-triangle" size={13} color={colors.warning} />
          <Text style={[styles.errText, { color: colors.foreground }]}>{status === "readError" ? tw.readError : tw.writeError}</Text>
          {status === "writeError" && (
            <TouchableOpacity testID="interface-width-retry" onPress={retrySave} accessibilityRole="button">
              <Text style={[styles.retry, { color: colors.warning }]}>{tw.retry}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{tw.hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  segment: { flexDirection: "row", borderRadius: 10, borderWidth: 1, padding: 3, gap: 3 },
  segmentNarrow: { flexWrap: "wrap" },
  opt: { flex: 1, minWidth: 0, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 4, alignItems: "center", gap: 1 },
  optNarrow: { flexBasis: "45%", minHeight: 48, justifyContent: "center" },
  optLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  optPx: { fontSize: 10, fontFamily: "Inter_500Medium" },
  err: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  errText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  retry: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
