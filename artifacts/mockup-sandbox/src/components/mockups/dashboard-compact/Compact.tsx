import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "./_native";
import { Layers } from "lucide-react";
import { StatCard } from "./_StatCard";
import { FirstEntriesForecast } from "./_ForecastTile";
import { palette as colors } from "./_theme";
import { romeDate } from "./_forecast-view";
import "./_group.css";

// Uses the real revised forecast tile and details panel, copied with API/context boundaries stubbed.
export function Compact() {
  const [selected, setSelected] = useState(0);
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const date = selected === 0 ? romeDate() : "2025-02-10";
  const seasons = ["2025-26", "2024-25", "2023-24", "2022-23"];
  const tile = <FirstEntriesForecast compact={wide} date={date} season={seasons[selected]} extraction={`${date.replaceAll("-", "")}113000`} />;
  const actuals = [
    <StatCard key="passages" compact={wide} accentColor={colors.primary} label="Passaggi" value={(18432).toLocaleString()} />,
    <StatCard key="entries" compact={wide} accentColor={colors.warning} label="Primi ingressi" value={(1911).toLocaleString()} />,
    <StatCard key="lifts" compact={wide} label="Impianti attivi" value="33 / 40" />,
  ];
  return (
    <div className="ski-extraction">
      <View style={{ paddingTop: 20, maxWidth: 640, width: "100%", alignSelf: "center" }}>
        <View style={[styles.seasonSegment, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Layers size={15} color={colors.mutedForeground} style={{ marginLeft: 6, marginRight: 2 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonScrollContent}>
            {seasons.map((s, i) => (
              <TouchableOpacity key={s} onPress={() => setSelected(i)} style={[styles.seasonTab, i === selected && { backgroundColor: colors.primary }]}>
                <Text style={[styles.seasonText, { color: i === selected ? colors.primaryForeground : colors.mutedForeground }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {wide ? <View style={styles.statsRow}>{actuals}{tile}</View> : <>
          <View style={styles.statsRow}>{actuals.slice(0, 2)}</View>
          <View style={styles.statsRow}>{actuals[2]}{tile}</View>
        </>}
      </View>
    </div>
  );
}

const styles = StyleSheet.create({
  seasonSegment: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16,
    marginBottom: 10, borderRadius: 10, borderWidth: 1, padding: 4, gap: 4, minHeight: 44,
  },
  seasonScrollContent: { flexDirection: "row", gap: 4, alignItems: "center" },
  seasonTab: {
    alignItems: "center", paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, minHeight: 36, justifyContent: "center",
  },
  seasonText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10, paddingHorizontal: 16 },
});
