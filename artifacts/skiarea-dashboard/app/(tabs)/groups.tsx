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
  useGetLatestLifts,
  getGetLatestLiftsQueryKey,
} from "@workspace/api-client-react";
import { DateExtractionPicker } from "@/components/DateExtractionPicker";
import { LiftRowSkeleton } from "@/components/SkeletonLoader";
import { useColors } from "@/hooks/useColors";
import { useResponsive, CONTENT_MAX_WIDTH } from "@/hooks/useResponsive";
import { useTranslation } from "@/contexts/LanguageContext";
import { useSelectedDate } from "@/contexts/SelectedDateContext";
import { useSeason, formatSeason } from "@/contexts/SeasonContext";

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

// ── Compact 2-line lift row used inside group cards ──────────────────────────

function GroupLiftRow({
  lift,
  onPress,
}: {
  lift: GroupData["lifts"][number];
  onPress: () => void;
}) {
  const colors = useColors();
  const isActive = (lift.npas ?? 0) > 0;

  return (
    <TouchableOpacity
      style={[liftRowStyles.row, { opacity: isActive ? 1 : 0.4 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[liftRowStyles.name, { color: colors.foreground }]} numberOfLines={1}>
        {lift.ggbz}
      </Text>
      <Text style={[liftRowStyles.col, { color: isActive ? colors.warning : colors.mutedForeground }]}>
        {(lift.npin ?? 0).toLocaleString()}
      </Text>
      <Text style={[liftRowStyles.col, { color: isActive ? colors.mutedForeground : colors.border }]}>
        {(lift.nuin ?? 0).toLocaleString()}
      </Text>
      <Text style={[liftRowStyles.colPassages, { color: isActive ? colors.primary : colors.border }]}>
        {(lift.npas ?? 0).toLocaleString()}
      </Text>
      <Feather name="chevron-right" size={13} color={colors.border} />
    </TouchableOpacity>
  );
}

const liftRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 4,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    minWidth: 0,
  },
  col: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    width: 40,
    textAlign: "right",
  },
  colPassages: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    width: 48,
    textAlign: "right",
  },
});

// ── Group card ───────────────────────────────────────────────────────────────

function GroupSection({
  group,
  visibleLifts,
  expanded,
  onToggle,
}: {
  group: GroupData;
  visibleLifts: GroupData["lifts"];
  expanded: boolean;
  onToggle: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.groupHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.groupTitleRow}>
          <Text style={[styles.groupName, { color: colors.foreground }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.mutedForeground}
          />
        </View>

        <View style={styles.subtotalsRow}>
          <View style={styles.subtotalItem}>
            <Text style={[styles.subtotalValue, { color: colors.warning }]}>
              {group.totalFirstPassages.toLocaleString()}
            </Text>
            <Text style={[styles.subtotalLabel, { color: colors.mutedForeground }]}>
              {t.firstPassages.toUpperCase()}
            </Text>
          </View>

          <View style={[styles.subtotalDivider, { backgroundColor: colors.border }]} />

          <View style={styles.subtotalItem}>
            <Text style={[styles.subtotalValue, { color: colors.mutedForeground }]}>
              {group.totalGuests}
            </Text>
            <Text style={[styles.subtotalLabel, { color: colors.mutedForeground }]}>
              {t.onLiftLabel.toUpperCase()}
            </Text>
          </View>

          <View style={[styles.subtotalDivider, { backgroundColor: colors.border }]} />

          <View style={styles.subtotalItem}>
            <Text style={[styles.subtotalValue, { color: colors.primary }]}>
              {group.totalPassages.toLocaleString()}
            </Text>
            <Text style={[styles.subtotalLabel, { color: colors.mutedForeground }]}>
              {t.passages.toUpperCase()}
            </Text>
          </View>

          <View style={[styles.subtotalDivider, { backgroundColor: colors.border }]} />

          <View style={styles.subtotalItem}>
            <Text style={[styles.subtotalValue, { color: group.activeLifts > 0 ? colors.success : colors.mutedForeground }]}>
              {group.activeLifts}
              <Text style={[styles.subtotalValueSmall, { color: colors.mutedForeground }]}>
                {" / "}{group.totalLifts}
              </Text>
            </Text>
            <Text style={[styles.subtotalLabel, { color: colors.mutedForeground }]}>
              {t.activeLifts.toUpperCase()}
            </Text>
          </View>
        </View>

      </TouchableOpacity>

      {expanded && (
        <View style={[styles.liftList, { borderTopColor: colors.border }]}>
          {/* Column header */}
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.tableHeaderName} />
            <Feather name="log-in" size={12} color={colors.warning} style={styles.tableHeaderCol} />
            <Feather name="users" size={12} color={colors.mutedForeground} style={styles.tableHeaderCol} />
            <Feather name="repeat" size={12} color={colors.primary} style={styles.tableHeaderColPassages} />
            <View style={{ width: 17 }} />
          </View>
          {visibleLifts.map((lift) => (
            <GroupLiftRow
              key={lift.ggnr}
              lift={lift}
              onPress={() =>
                router.push({ pathname: "/lift/[ggnr]", params: { ggnr: lift.ggnr, name: lift.ggbz } })
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const { selectedDate, setSelectedDate, selectedExtraction, setSelectedExtraction } = useSelectedDate();
  const { seasons, selectedSeason, setSelectedSeason } = useSeason();
  // Default expanded: track collapsed groups (opt-out)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const queryParams = {
    date: selectedDate,
    ...(selectedExtraction ? { extraction: selectedExtraction } : {}),
    ...(selectedSeason ? { season: selectedSeason } : {}),
  };

  const { data: lifts, isLoading } = useGetLatestLifts(queryParams);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: getGetLatestLiftsQueryKey() });
    setRefreshing(false);
  };

  const toggleGroup = (name: string) => {
    setCollapsedGroups((prev) => {
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
      g.lifts.push({
        ggnr: lift.ggnr,
        ggbz: lift.ggbz,
        nsoc: lift.nsoc ?? null,
        npas: lift.npas ?? null,
        nuin: lift.nuin ?? null,
        npin: lift.npin ?? null,
        nomeSocieta: lift.nomeSocieta ?? null,
        descrGrp: lift.descrGrp ?? null,
      });
    }
    for (const g of map.values()) g.lifts.sort((a, b) => (a.nsoc ?? 9999) - (b.nsoc ?? 9999));
    return Array.from(map.values()).filter((g) => g.totalLifts > 0).sort((a, b) => a.minNsoc - b.minNsoc);
  }, [lifts]);

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

  // Expanded = NOT in collapsedGroups (unless searching, always expand)
  const isGroupExpanded = (name: string) => isSearching || !collapsedGroups.has(name);

  const topPadding = Platform.OS === "web" ? 16 : 0;
  const { isWide } = useResponsive();

  type ListItem =
    | { type: "picker" }
    | { type: "search" }
    | { type: "group"; group: GroupData & { visibleLifts: GroupData["lifts"] } }
    | { type: "skeleton"; key: string }
    | { type: "emptySearch" };

  const listData: ListItem[] = useMemo(() => {
    if (isLoading) {
      return [
        { type: "picker" },
        { type: "search" },
        ...Array.from({ length: 5 }, (_, i) => ({ type: "skeleton" as const, key: String(i) })),
      ];
    }
    if (isSearching && filteredGroups.length === 0) {
      return [{ type: "picker" }, { type: "search" }, { type: "emptySearch" }];
    }
    return [
      { type: "picker" },
      { type: "search" },
      ...filteredGroups.map((g) => ({ type: "group" as const, group: g })),
    ];
  }, [isLoading, isSearching, filteredGroups]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <View style={[styles.inner, isWide && styles.innerWide]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.groups}</Text>
          {seasons.length > 1 && (
            <View style={[styles.seasonSegment, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="layers" size={13} color={colors.mutedForeground} style={styles.seasonIcon} />
              {seasons.map((s) => {
                const active = (selectedSeason ?? seasons[0]) === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.seasonTab, active && { backgroundColor: colors.primary }]}
                    onPress={() => setSelectedSeason(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.seasonText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                      {formatSeason(s)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <View style={[styles.listWrap, isWide && styles.listWrapWide]}>
        <FlatList
          data={listData}
          keyExtractor={(item) => {
            if (item.type === "picker") return "picker";
            if (item.type === "search") return "search";
            if (item.type === "skeleton") return `skeleton-${item.key}`;
            if (item.type === "emptySearch") return "emptySearch";
            return `group-${item.group.name}`;
          }}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 100 : 100 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyState}>
                <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {t.noLiftDataAvailable}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index: flatIndex }) => {
            if (item.type === "picker") {
              return (
                <DateExtractionPicker
                  selectedDate={selectedDate}
                  selectedExtraction={selectedExtraction}
                  onDateChange={(d) => { setSelectedDate(d); setSelectedExtraction(undefined); }}
                  onExtractionChange={setSelectedExtraction}
                />
              );
            }
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
  header: { paddingBottom: 4, paddingHorizontal: 16 },
  inner: { width: "100%" },
  innerWide: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  listWrap: { flex: 1, width: "100%" },
  listWrapWide: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 4 },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  groupCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  groupHeader: { padding: 14, gap: 10 },
  groupTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  groupName: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  subtotalsRow: { flexDirection: "row", alignItems: "center" },
  subtotalItem: { flex: 1, alignItems: "center", gap: 2 },
  subtotalValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  subtotalValueSmall: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subtotalLabel: { fontSize: 9, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
  subtotalDivider: { width: 1, height: 28, marginHorizontal: 2 },
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
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  seasonSegment: {
    flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1,
    padding: 3, gap: 2, marginTop: 8,
  },
  seasonIcon: { marginLeft: 4, marginRight: 2 },
  seasonTab: { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 8 },
  seasonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
