import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "./_native";
import { Layers } from "lucide-react";
import { StatCard } from "./_StatCard";
import { palette as colors } from "./_theme";
import "./_group.css";

// Extracted season strip, stat row structure and style values from the dashboard header.
// Values are isolated preview fixtures, never used by the live app.
export function Current() {
  return (
    <div className="ski-extraction">
      <View style={{ paddingTop: 20 }}>
        <View style={[styles.seasonSegment, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Layers size={13} color={colors.mutedForeground} style={{ marginLeft: 4, marginRight: 2 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonScrollContent}>
            {["2025-26", "2024-25", "2023-24", "2022-23"].map((s, i) => (
              <TouchableOpacity key={s} style={[styles.seasonTab, i === 0 && { backgroundColor: colors.primary }]}>
                <Text style={[styles.seasonText, { color: i === 0 ? colors.primaryForeground : colors.mutedForeground }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.statsRow}>
          <StatCard accentColor={colors.primary} label="Passaggi" value={(18432).toLocaleString()} />
          <StatCard accentColor={colors.warning} label="Primi ingressi" value={(1911).toLocaleString()} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Impianti attivi" value="33 / 40" />
          <StatCard label="Stagione" value="2025-26" />
        </View>
      </View>
    </div>
  );
}

const styles = StyleSheet.create({
  seasonSegment: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16,
    marginBottom: 10, borderRadius: 10, borderWidth: 1, padding: 3, gap: 2,
  },
  seasonScrollContent: { flexDirection: "row", gap: 2 },
  seasonTab: { alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  seasonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10, paddingHorizontal: 16 },
});
