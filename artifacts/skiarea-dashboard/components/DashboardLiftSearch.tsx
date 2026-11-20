import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { formatCount } from "@/lib/format-number";

interface Props {
  /** Undefined while the summary is loading: renders a placeholder, never a false zero. */
  activeLifts?: number;
  totalLifts?: number;
  loading: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Compact one-line strip: "IMPIANTI ATTIVI 21 / 40" + collapsible group/lift search.
 * Module-level component with stable identity so the TextInput is never remounted while typing.
 */
export function DashboardLiftSearch({ activeLifts, totalLifts, loading, query, onQueryChange, open, onOpenChange }: Props) {
  const colors = useColors();
  const { t, language } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [open]);

  const close = () => {
    onQueryChange("");
    inputRef.current?.blur();
    onOpenChange(false);
  };

  const countReady = !loading && activeLifts != null && totalLifts != null;

  return (
    <View testID="strip-lift-search" style={[styles.strip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.toolbar}>
        <View style={styles.summary} accessible accessibilityLabel={countReady ? `${t.activeLifts}: ${formatCount(activeLifts, language)} / ${formatCount(totalLifts, language)}` : t.activeLifts}>
          <View style={[styles.dot, { backgroundColor: countReady && activeLifts! > 0 ? colors.success : colors.border }]} />
          <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>
            {t.activeLifts.toUpperCase()}
          </Text>
          {countReady ? (
            <Text testID="text-active-lifts" style={[styles.count, { color: colors.foreground }]}>
              {formatCount(activeLifts, language)}
              <Text style={[styles.countTotal, { color: colors.mutedForeground }]}>{` / ${formatCount(totalLifts, language)}`}</Text>
            </Text>
          ) : (
            <View testID="active-lifts-loading" style={[styles.skel, { backgroundColor: colors.secondary }]} />
          )}
        </View>
        <TouchableOpacity
          testID={open ? "button-search-close" : "button-search-open"}
          accessibilityRole="button"
          accessibilityLabel={open ? t.searchClose : t.searchOpen}
          accessibilityState={{ expanded: open }}
          onPress={open ? close : () => onOpenChange(true)}
          hitSlop={4}
          style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name={open ? "x" : "search"} size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {open && (
        <View style={[styles.inputWrap, { borderTopColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            testID="input-lift-search"
            accessibilityLabel={t.searchOpen}
            style={[styles.input, { color: colors.foreground }]}
            placeholder={t.searchGroup}
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={onQueryChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            {...(Platform.OS === "web" ? {} : { autoFocus: true })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { borderRadius: 10, borderWidth: 1 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 4, minHeight: 48 },
  summary: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, flexShrink: 1 },
  count: { fontSize: 15, fontFamily: "Inter_700Bold" },
  countTotal: { fontSize: 13, fontFamily: "Inter_500Medium" },
  skel: { width: 44, height: 12, borderRadius: 6 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, paddingHorizontal: 12 },
  input: { flex: 1, minWidth: 0, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
