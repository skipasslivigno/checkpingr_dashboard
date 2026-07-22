import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useGetDashboardSummary,
  useGetLatestLifts,
  useGetSeasons,
  getGetDashboardSummaryQueryKey,
  getGetLatestLiftsQueryKey,
} from "@workspace/api-client-react";
import { DateExtractionPicker } from "@/components/DateExtractionPicker";
import { LiftRowSkeleton, StatCardSkeleton } from "@/components/SkeletonLoader";
import { StatCard } from "@/components/StatCard";
import { useColors } from "@/hooks/useColors";
import { useResponsive, CONTENT_MAX_WIDTH } from "@/hooks/useResponsive";
import { useTranslation } from "@/contexts/LanguageContext";
import { useSelectedDate } from "@/contexts/SelectedDateContext";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Group types & section component (mirrored from groups.tsx) ──────────────

interface GroupData {
  name: string;
  minNsoc: number;
  totalPassages: number;
  totalGuests: number;
  totalFirstPassages: number;
  activeLifts: number;
  totalLifts: number;
  lifts: Array<{
    ggnr: number;
    ggbz: string;
    nsoc: number | null;
    npas: number | null;
    nuin: number | null;
    npin: number | null;
    nomeSocieta: string | null;
    descrGrp: string | null;
  }>;
}

function GroupSection({
  group,
  visibleLifts,
  expanded,
  onToggle,
  maxPassages,
  index,
}: {
  group: GroupData;
  visibleLifts: GroupData["lifts"];
  expanded: boolean;
  onToggle: () => void;
  maxPassages: number;
  index: number;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();

  const targetFill = maxPassages > 0
    ? Math.round((group.totalPassages / maxPassages) * 100)
    : 0;

  const animatedFill = useRef(new Animated.Value(0)).current;
  const lastTargetRef = useRef<number>(-1);

  useEffect(() => {
    if (lastTargetRef.current === targetFill) return;
    lastTargetRef.current = targetFill;
    animatedFill.setValue(0);
    Animated.timing(animatedFill, {
      toValue: targetFill,
      duration: 500,
      delay: index * 60,
      useNativeDriver: false,
    }).start();
  }, [targetFill, index]);

  const animatedWidth = animatedFill.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View style={[groupStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={groupStyles.header} onPress={onToggle} activeOpacity={0.7}>
        <View style={groupStyles.titleRow}>
          <Text style={[groupStyles.name, { color: colors.foreground }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        </View>

        <View style={groupStyles.subtotalsRow}>
          <View style={groupStyles.subtotalItem}>
            <Text style={[groupStyles.subtotalValue, { color: colors.warning }]}>
              {group.totalFirstPassages.toLocaleString()}
            </Text>
            <Text style={[groupStyles.subtotalLabel, { color: colors.mutedForeground }]}>
              {t.firstPassages.toUpperCase()}
            </Text>
          </View>
          <View style={[groupStyles.divider, { backgroundColor: colors.border }]} />
          <View style={groupStyles.subtotalItem}>
            <Text style={[groupStyles.subtotalValue, { color: colors.mutedForeground }]}>
              {group.totalGuests}
            </Text>
            <Text style={[groupStyles.subtotalLabel, { color: colors.mutedForeground }]}>
              {t.onLiftLabel.toUpperCase()}
            </Text>
          </View>
          <View style={[groupStyles.divider, { backgroundColor: colors.border }]} />
          <View style={groupStyles.subtotalItem}>
            <Text style={[groupStyles.subtotalValue, { color: colors.primary }]}>
              {group.totalPassages.toLocaleString()}
            </Text>
            <Text style={[groupStyles.subtotalLabel, { color: colors.mutedForeground }]}>
              {t.passages.toUpperCase()}
            </Text>
          </View>
          <View style={[groupStyles.divider, { backgroundColor: colors.border }]} />
          <View style={groupStyles.subtotalItem}>
            <Text style={[groupStyles.subtotalValue, { color: group.activeLifts > 0 ? colors.success : colors.mutedForeground }]}>
              {group.activeLifts}
              <Text style={[groupStyles.subtotalSmall, { color: colors.mutedForeground }]}>
                {" / "}{group.totalLifts}
              </Text>
            </Text>
            <Text style={[groupStyles.subtotalLabel, { color: colors.mutedForeground }]}>
              {t.activeLifts.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[groupStyles.barTrack, { backgroundColor: colors.border }]}>
          <Animated.View style={[groupStyles.barFill, { backgroundColor: colors.primary, width: animatedWidth }]} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[groupStyles.liftList, { borderTopColor: colors.border }]}>
          {/* Column header */}
          <View style={[groupStyles.tableHeader, { borderBottomColor: colors.border }]}>
            <View style={groupStyles.tableHeaderName} />
            <Feather name="log-in" size={12} color={colors.warning} style={groupStyles.tableHeaderCol} />
            <Feather name="users" size={12} color={colors.mutedForeground} style={groupStyles.tableHeaderCol} />
            <Feather name="repeat" size={12} color={colors.primary} style={groupStyles.tableHeaderColPassages} />
            <View style={{ width: 17 }} />
          </View>
          {visibleLifts.map((lift) => {
            const isActive = (lift.npas ?? 0) > 0;
            return (
              <TouchableOpacity
                key={lift.ggnr}
                style={[groupStyles.tableRow, { borderBottomColor: colors.border, opacity: isActive ? 1 : 0.4 }]}
                onPress={() => router.push({ pathname: "/lift/[ggnr]", params: { ggnr: lift.ggnr, name: lift.ggbz } })}
                activeOpacity={0.7}
              >
                <Text style={[groupStyles.tableRowName, { color: colors.foreground }]} numberOfLines={1}>
                  {lift.ggbz}
                </Text>
                <Text style={[groupStyles.tableCol, { color: isActive ? colors.warning : colors.mutedForeground }]}>
                  {(lift.npin ?? 0).toLocaleString()}
                </Text>
                <Text style={[groupStyles.tableCol, { color: isActive ? colors.mutedForeground : colors.border }]}>
                  {(lift.nuin ?? 0).toLocaleString()}
                </Text>
                <Text style={[groupStyles.tableColPassages, { color: isActive ? colors.primary : colors.border }]}>
                  {(lift.npas ?? 0).toLocaleString()}
                </Text>
                <Feather name="chevron-right" size={13} color={colors.border} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Main dashboard screen ────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { t, language, setLanguage } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { selectedDate, setSelectedDate, selectedExtraction, setSelectedExtraction } = useSelectedDate();

  const { data: seasons } = useGetSeasons();

  const queryParams = {
    date: selectedDate,
    ...(selectedSeason ? { season: selectedSeason } : {}),
    ...(selectedExtraction ? { extraction: selectedExtraction } : {}),
  };

  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary(queryParams);
  const { data: lifts, isLoading: liftsLoading } = useGetLatestLifts(queryParams);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getGetLatestLiftsQueryKey() });
    setRefreshing(false);
  };

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const groups = useMemo<GroupData[]>(() => {
    if (!lifts) return [];
    const map = new Map<string, GroupData>();
    for (const lift of lifts) {
      const key = lift.descrGrp ?? "(no group)";
      if (!map.has(key)) {
        map.set(key, { name: key, minNsoc: lift.nsoc ?? 9999, totalPassages: 0, totalGuests: 0, totalFirstPassages: 0, activeLifts: 0, totalLifts: 0, lifts: [] });
      }
      const g = map.get(key)!;
      g.minNsoc = Math.min(g.minNsoc, lift.nsoc ?? 9999);
      g.totalPassages += lift.npas ?? 0;
      g.totalGuests += lift.nuin ?? 0;
      g.totalFirstPassages += lift.npin ?? 0;
      if ((lift.npas ?? 0) > 0) g.activeLifts += 1;
      g.totalLifts += 1;
      g.lifts.push({ ggnr: lift.ggnr, ggbz: lift.ggbz, nsoc: lift.nsoc ?? null, npas: lift.npas ?? null, nuin: lift.nuin ?? null, npin: lift.npin ?? null, nomeSocieta: lift.nomeSocieta ?? null, descrGrp: lift.descrGrp ?? null });
    }
    for (const g of map.values()) g.lifts.sort((a, b) => (a.nsoc ?? 9999) - (b.nsoc ?? 9999));
    return Array.from(map.values()).filter((g) => g.totalLifts > 0).sort((a, b) => a.minNsoc - b.minNsoc);
  }, [lifts]);

  const maxPassages = useMemo(() => groups.reduce((max, g) => Math.max(max, g.totalPassages), 0), [groups]);

  const isSearching = searchQuery.trim().length > 0;

  const filteredGroups = useMemo<Array<GroupData & { visibleLifts: GroupData["lifts"] }>>(() => {
    if (!isSearching) return groups.map((g) => ({ ...g, visibleLifts: g.lifts }));
    const q = searchQuery.trim().toLowerCase();
    const result: Array<GroupData & { visibleLifts: GroupData["lifts"] }> = [];
    for (const g of groups) {
      const groupNameMatches = g.name.toLowerCase().includes(q);
      const matchingLifts = g.lifts.filter((l) => l.ggbz.toLowerCase().includes(q));
      if (groupNameMatches) result.push({ ...g, visibleLifts: g.lifts });
      else if (matchingLifts.length > 0) result.push({ ...g, visibleLifts: matchingLifts });
    }
    return result;
  }, [groups, searchQuery, isSearching]);

  const isGroupExpanded = (name: string) => isSearching || expandedGroups.has(name);

  const topPadding = Platform.OS === "web" ? 67 : 0;
  const isToday = selectedDate === todayIso();
  const { isWide } = useResponsive();

  type ListItem =
    | { type: "header" }
    | { type: "search" }
    | { type: "group"; group: GroupData & { visibleLifts: GroupData["lifts"] }; idx: number }
    | { type: "skeleton"; key: string }
    | { type: "emptySearch" };

  const listData: ListItem[] = useMemo(() => {
    if (liftsLoading) {
      return [
        { type: "header" },
        { type: "search" },
        ...Array.from({ length: 5 }, (_, i) => ({ type: "skeleton" as const, key: String(i) })),
      ];
    }
    if (isSearching && filteredGroups.length === 0) {
      return [{ type: "header" }, { type: "search" }, { type: "emptySearch" }];
    }
    return [
      { type: "header" },
      { type: "search" },
      ...filteredGroups.map((g, i) => ({ type: "group" as const, group: g, idx: i })),
    ];
  }, [liftsLoading, isSearching, filteredGroups, summaryLoading, selectedSeason, seasons, summary, selectedDate, selectedExtraction]);

  const renderHeader = () => (
    <View style={[styles.headerBlock, { paddingTop: topPadding + 16 }]}>
      {/* Logo / title / lang */}
      <View style={styles.headerRow}>
        <View style={[styles.logoBox, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
          <Feather name="wind" size={20} color={colors.primary} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {isToday ? t.today : selectedDate}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {t.dashboard}
          </Text>
        </View>
        <View style={[styles.langToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["it", "en"] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[styles.langBtn, language === lang && { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.langText, { color: language === lang ? colors.primaryForeground : colors.mutedForeground }]}>
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Season segmented control */}
      {seasons && seasons.length > 1 && (
        <View style={[styles.seasonSegment, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="layers" size={13} color={colors.mutedForeground} style={styles.seasonIcon} />
          {seasons.map((s) => {
            const active = (selectedSeason ?? seasons[0]) === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.seasonTab, active && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedSeason(s === seasons[0] ? undefined : s)}
                activeOpacity={0.8}
              >
                <Text style={[styles.seasonText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Date + extraction picker */}
      <DateExtractionPicker
        selectedDate={selectedDate}
        selectedExtraction={selectedExtraction}
        season={selectedSeason}
        onDateChange={(d) => { setSelectedDate(d); setSelectedExtraction(undefined); }}
        onExtractionChange={setSelectedExtraction}
      />

      {/* Last sync */}
      {summary?.lastSyncAt && (
        <View style={[styles.syncRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="clock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.syncText, { color: colors.mutedForeground }]}>
            {t.lastSync}: {summary.lastSyncAt}
          </Text>
        </View>
      )}

      {/* Stat cards */}
      {isWide ? (
        <View style={styles.statsRow}>
          {summaryLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard compact accent label={t.passages} value={(summary?.totalPassages ?? 0).toLocaleString()} />
              <StatCard compact secondaryAccent label={t.guestsOnLifts} value={(summary?.totalGuests ?? 0).toLocaleString()} />
              <StatCard compact label={t.activeLifts} value={`${summary?.activeLifts ?? 0} / ${summary?.totalLifts ?? 0}`} />
              <StatCard compact label={t.season} value={summary?.season ?? "—"} />
            </>
          )}
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            {summaryLoading ? (
              <><StatCardSkeleton /><StatCardSkeleton /></>
            ) : (
              <>
                <StatCard accent label={t.passages} value={(summary?.totalPassages ?? 0).toLocaleString()} />
                <StatCard secondaryAccent label={t.guestsOnLifts} value={(summary?.totalGuests ?? 0).toLocaleString()} />
              </>
            )}
          </View>
          <View style={styles.statsRow}>
            {summaryLoading ? (
              <><StatCardSkeleton /><StatCardSkeleton /></>
            ) : (
              <>
                <StatCard label={t.activeLifts} value={`${summary?.activeLifts ?? 0} / ${summary?.totalLifts ?? 0}`} />
                <StatCard label={t.season} value={summary?.season ?? "—"} />
              </>
            )}
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.listWrap, isWide && styles.listWrapWide]}>
        <FlatList
          data={listData}
          keyExtractor={(item) => {
            if (item.type === "header") return "header";
            if (item.type === "search") return "search";
            if (item.type === "skeleton") return `skeleton-${item.key}`;
            if (item.type === "emptySearch") return "emptySearch";
            return `group-${item.group.name}`;
          }}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 100 : 100 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            if (item.type === "header") return renderHeader();
            if (item.type === "search") {
              return (
                <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="search" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.foreground }]}
                    placeholder={t.searchGroup}
                    placeholderTextColor={colors.mutedForeground}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && Platform.OS !== "ios" && (
                    <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
                      <Feather name="x" size={15} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }
            if (item.type === "skeleton") return <LiftRowSkeleton />;
            if (item.type === "emptySearch") {
              return (
                <View style={styles.emptyState}>
                  <Feather name="search" size={32} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    {t.noGroupsMatchSearch}
                  </Text>
                </View>
              );
            }
            return (
              <GroupSection
                group={item.group}
                visibleLifts={item.group.visibleLifts}
                expanded={isGroupExpanded(item.group.name)}
                onToggle={isSearching ? () => undefined : () => toggleGroup(item.group.name)}
                maxPassages={maxPassages}
                index={item.idx}
              />
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listWrap: { flex: 1, width: "100%" },
  listWrapWide: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  list: { paddingHorizontal: 16, gap: 10 },
  headerBlock: { marginHorizontal: -16, paddingHorizontal: 0, marginBottom: 4 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  logoBox: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  titleBlock: { flex: 1, justifyContent: "center" },
  dateText: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 1 },
  langToggle: {
    flexDirection: "row", borderRadius: 16, borderWidth: 1, overflow: "hidden", flexShrink: 0,
  },
  langBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14 },
  langText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  seasonSegment: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 10, borderWidth: 1, padding: 3, gap: 2,
  },
  seasonIcon: { marginLeft: 4, marginRight: 2 },
  seasonTab: { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 8 },
  seasonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  syncRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
    marginBottom: 16, marginHorizontal: 16,
  },
  syncText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10, paddingHorizontal: 16 },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
});

const groupStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  header: { padding: 14, gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  subtotalsRow: { flexDirection: "row", alignItems: "center" },
  subtotalItem: { flex: 1, alignItems: "center", gap: 2 },
  subtotalValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  subtotalSmall: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subtotalLabel: { fontSize: 9, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
  divider: { width: 1, height: 28, marginHorizontal: 2 },
  barTrack: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 2 },
  barFill: { height: 3, borderRadius: 2 },
  liftList: { borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 4,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  tableHeaderName: { flex: 1 },
  tableHeaderCol: { width: 40, textAlign: "right" },
  tableHeaderColPassages: { width: 48, textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 4,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRowName: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", minWidth: 0 },
  tableCol: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 40, textAlign: "right" },
  tableColPassages: { fontSize: 13, fontFamily: "Inter_700Bold", width: 48, textAlign: "right" },
});
