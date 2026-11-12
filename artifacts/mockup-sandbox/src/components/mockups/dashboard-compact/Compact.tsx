import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "./_native";
import { Layers } from "lucide-react";
import { StatCard } from "./_StatCard";
import { FirstEntriesForecast } from "./_ForecastTile";
import { ForecastDetails } from "./_ForecastDetails";
import { DashboardLiftSearch } from "./_DashboardLiftSearch";
import { useGetFirstEntriesForecast, type FirstEntriesForecastPoint } from "./_fixtures";
import { PreviewAuthContext } from "./_stubs";
import { palette as colors } from "./_theme";
import { romeDate } from "./_forecast-view";
import "./_group.css";

// PREVIEW ONLY. Uses fresh copies of the real app components; values below are isolated preview fixtures.
const VIEWER = { user: { id: "preview-viewer", tenantId: "preview", role: "viewer" } };
const ACTUAL_FIRST_ENTRIES = 1911;
const LIFT_GROUPS: Array<{ name: string; lifts: Array<{ name: string; npas: number }> }> = [
  { name: "Carosello 3000", lifts: [{ name: "Cabinovia Carosello", npas: 2140 }, { name: "Seggiovia Sitas", npas: 1288 }, { name: "Skilift Tagliede", npas: 0 }] },
  { name: "Mottolino", lifts: [{ name: "Cabinovia Mottolino", npas: 1932 }, { name: "Seggiovia Monte Sponda", npas: 874 }, { name: "Seggiovia Trela", npas: 611 }] },
  { name: "Costaccia", lifts: [{ name: "Cabinovia Tagliede", npas: 1460 }, { name: "Seggiovia Costaccia", npas: 905 }, { name: "Tapis Blesaccia", npas: 0 }] },
];

function filterGroups(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return LIFT_GROUPS.map((g) => ({ ...g, visible: g.lifts }));
  return LIFT_GROUPS.flatMap((g) => {
    if (g.name.toLowerCase().includes(s)) return [{ ...g, visible: g.lifts }];
    const m = g.lifts.filter((l) => l.name.toLowerCase().includes(s));
    return m.length ? [{ ...g, visible: m }] : [];
  });
}

function Dashboard({ initialSearchOpen = false, initialQuery = "" }: { initialSearchOpen?: boolean; initialQuery?: string }) {
  const [selected, setSelected] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [searchOpen, setSearchOpen] = useState(initialSearchOpen);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["Mottolino"]));
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const date = selected === 0 ? romeDate() : "2025-02-10";
  const seasons = ["2025-26", "2024-25", "2023-24", "2022-23"];
  const searching = query.trim().length > 0;
  const groups = useMemo(() => filterGroups(query), [query]);
  const totalLifts = LIFT_GROUPS.reduce((n, g) => n + g.lifts.length, 0);
  const activeLifts = LIFT_GROUPS.reduce((n, g) => n + g.lifts.filter((l) => l.npas > 0).length, 0);

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
        <View style={styles.statsRow}>
          <StatCard compact={wide} accentColor={colors.primary} label="Passaggi" value={(18432).toLocaleString("it-IT")} />
          <StatCard compact={wide} accentColor={colors.warning} label="Primi ingressi" value={ACTUAL_FIRST_ENTRIES.toLocaleString("it-IT")}>
            <FirstEntriesForecast date={date} season={seasons[selected]} extraction={`${date.replaceAll("-", "")}113000`} actualEntries={ACTUAL_FIRST_ENTRIES} />
          </StatCard>
        </View>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <DashboardLiftSearch activeLifts={activeLifts} totalLifts={totalLifts} loading={false} query={query} onQueryChange={setQuery} open={searchOpen} onOpenChange={setSearchOpen} />
          {groups.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>Nessun gruppo o impianto corrisponde alla ricerca</Text>
          ) : groups.map((g) => {
            const open = searching || expanded.has(g.name);
            return (
              <View key={g.name} style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity onPress={searching ? undefined : () => setExpanded((p) => { const n = new Set(p); n.has(g.name) ? n.delete(g.name) : n.add(g.name); return n; })}>
                  <Text style={[styles.groupName, { color: colors.foreground }]}>{g.name}</Text>
                </TouchableOpacity>
                {open && g.visible.map((l) => (
                  <View key={l.name} style={[styles.liftRow, { opacity: l.npas > 0 ? 1 : 0.4, borderTopColor: colors.border }]}>
                    <Text style={[styles.liftName, { color: colors.foreground }]}>{l.name}</Text>
                    <Text style={[styles.liftName, { color: colors.primary }]}>{l.npas.toLocaleString("it-IT")}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </View>
    </div>
  );
}

/** Ready estimate, viewer role (no admin verification). */
export function Compact() {
  return <PreviewAuthContext.Provider value={VIEWER}><Dashboard /></PreviewAuthContext.Provider>;
}

/** Search expanded with a query applied, for screenshots without interaction. */
export function CompactOpenSearch() {
  return <PreviewAuthContext.Provider value={VIEWER}><Dashboard initialSearchOpen initialQuery="cabin" /></PreviewAuthContext.Provider>;
}

/** The real details modal rendered open (admin), with actual first entries shown. */
export function CompactDetails() {
  const date = romeDate();
  const extraction = `${date.replaceAll("-", "")}113000`;
  const { data } = useGetFirstEntriesForecast({ date, season: "2025-26", mode: "live", extraction }, {});
  const points = useMemo(() => new Map<string, FirstEntriesForecastPoint>(data.forecasts.map((p) => [p.slot, p])), [data]);
  const [slot, setSlot] = useState("11:30");
  const [verification, setVerification] = useState(false);
  return (
    <ForecastDetails
      visible onClose={() => undefined} state="data" data={data} points={points} slot={slot} onPickSlot={setSlot}
      isAdmin verification={verification} onVerificationChange={setVerification} onRetry={() => undefined} retrying={false}
      actualEntries={ACTUAL_FIRST_ENTRIES} actualExtraction={extraction}
    />
  );
}

const styles = StyleSheet.create({
  seasonSegment: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10, borderRadius: 10, borderWidth: 1, padding: 4, gap: 4, minHeight: 44 },
  seasonScrollContent: { flexDirection: "row", gap: 4, alignItems: "center" },
  seasonTab: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, minHeight: 36, justifyContent: "center" },
  seasonText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10, paddingHorizontal: 16 },
  group: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  groupName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  liftRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, borderTopWidth: 1 },
  liftName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  empty: { textAlign: "center", paddingTop: 30, fontSize: 14 },
});
