import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: accent ? colors.primary : colors.card, borderColor: colors.border }]}>
      <Text style={[styles.value, { color: accent ? colors.primaryForeground : colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: accent ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text>
      {sub ? <Text style={[styles.sub, { color: accent ? colors.primaryForeground : colors.mutedForeground }]}>{sub}</Text> : null}
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
