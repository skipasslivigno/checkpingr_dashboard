import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";

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
  const { t } = useTranslation();

  const isActive = (passages ?? 0) > 0;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: isActive ? colors.card : "transparent",
          borderColor: colors.border,
          opacity: isActive ? 1 : 0.5,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.border }]} />

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
        {(company ?? group) ? (
          <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {company ?? group}
          </Text>
        ) : null}
      </View>

      {/* Guests — amber */}
      <View style={styles.guestBlock}>
        <Feather name="users" size={11} color={isActive ? colors.warning : colors.border} />
        <Text style={[styles.guestCount, { color: isActive ? colors.warning : colors.border }]}>
          {guests ?? 0}
        </Text>
      </View>

      {/* Passages — teal/primary */}
      <Text style={[styles.passageCount, { color: isActive ? colors.primary : colors.border }]}>
        {(passages ?? 0).toLocaleString()}
      </Text>

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
    flexShrink: 0,
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
  guestBlock: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    minWidth: 36,
  },
  guestCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  passageCount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    minWidth: 52,
    textAlign: "right",
  },
});
