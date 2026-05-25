import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface LiftRowProps {
  name: string;
  passages: number | null;
  guests: number | null;
  firstPassage: number | null;
  company?: string | null;
  group?: string | null;
  onPress?: () => void;
}

export function LiftRow({ name, passages, guests, firstPassage, company, group, onPress }: LiftRowProps) {
  const colors = useColors();

  const isActive = (passages ?? 0) > 0;
  const subtitle = company ?? group ?? `${firstPassage ?? 0} guests today`;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.mutedForeground }]} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={[styles.passageCount, { color: colors.primary }]}>{(passages ?? 0).toLocaleString()}</Text>
        <Text style={[styles.passageLabel, { color: colors.mutedForeground }]}>PASSAGES</Text>
      </View>
      <View style={styles.guestBlock}>
        <Text style={[styles.guestCount, { color: colors.foreground }]}>{guests ?? 0}</Text>
        <Text style={[styles.guestLabel, { color: colors.mutedForeground }]}>ON LIFT</Text>
      </View>
      {onPress ? <Feather name="chevron-right" size={16} color={colors.mutedForeground} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  stats: {
    alignItems: "center",
    minWidth: 52,
  },
  passageCount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  passageLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  guestBlock: {
    alignItems: "center",
    minWidth: 40,
  },
  guestCount: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  guestLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
});
