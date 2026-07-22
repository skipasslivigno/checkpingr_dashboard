import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  secondaryAccent?: boolean;
  compact?: boolean;
}

export function StatCard({ label, value, sub, accent, secondaryAccent, compact }: StatCardProps) {
  const colors = useColors();

  const bg = accent
    ? colors.primaryLight
    : secondaryAccent
    ? colors.warningLight
    : colors.card;

  const borderColor = accent
    ? colors.primaryBorder
    : secondaryAccent
    ? colors.warningBorder
    : colors.border;

  const valueColor = accent
    ? colors.primary
    : secondaryAccent
    ? colors.warning
    : colors.foreground;

  const labelColor = accent
    ? colors.primary
    : secondaryAccent
    ? colors.warning
    : colors.mutedForeground;

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: bg, borderColor },
      ]}
    >
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      {sub ? <Text style={[styles.sub, { color: labelColor }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 4,
    minHeight: 88,
    justifyContent: "center",
  },
  cardCompact: {
    padding: 12,
    minHeight: 72,
    gap: 2,
  },
  value: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
