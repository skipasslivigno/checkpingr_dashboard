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
import { LiftRow } from "@/components/LiftRow";
import { LiftRowSkeleton } from "@/components/SkeletonLoader";
import { useColors } from "@/hooks/useColors";
import { useResponsive, CONTENT_MAX_WIDTH } from "@/hooks/useResponsive";
import { useTranslation } from "@/contexts/LanguageContext";
import { useSelectedDate } from "@/contexts/SelectedDateContext";

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
    <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
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
            <Text style={[styles.subtotalValue, { color: colors.primary }]}>
              {group.totalPassages.toLocaleString()}
            </Text>
            <Text style={[styles.subtotalLabel, { color: colors.mutedForeground }]}>
              {t.passages.toUpperCase()}
            </Text>
          </View>

          <View style={[styles.subtotalDivider, { backgroundColor: colors.border }]} />

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

        <View style={[styles.passageBarTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.passageBarFill,
              {
                backgroundColor: colors.primary,
                width: animatedWidth,
              },
            ]}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.liftList, { borderTopColor: colors.border }]}>
          {visibleLifts.map((lift) => (
            <LiftRow
              key={lift.ggnr}
              name={lift.ggbz}
              passages={lift.npas ?? null}
              guests={lift.nuin ?? null}
              firstPassage={lift.npin ?? null}
              company={lift.nomeSocieta}
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

export default function GroupsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const { selectedDate, setSelectedDate, selectedExtraction, setSelectedExtraction } = useSelectedDate();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const queryParams = {
    date: selectedDate,
    ...(selectedExtraction ? { extraction: selectedExtraction } : {}),
  };

  const { data: lifts, isLoading } = useGetLatestLifts(queryParams);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: getGetLatestLiftsQueryKey() });
    setRefreshing(false);
  };

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const groups = useMemo<GroupData[]>(() => {
    if (!lifts) return [];

    const map = new Map<string, GroupData>();

    for (const lift of lifts) {
      const key = lift.descrGrp ?? "(no group)";
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          minNsoc: lift.nsoc ?? 9999,
          totalPassages: 0,
          totalGuests: 0,
          totalFirstPassages: 0,
          activeLifts: 0,
          totalLifts: 0,
          lifts: [],
        });
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

    for (const g of map.values()) {
      g.lifts.sort((a, b) => (a.nsoc ?? 9999) - (b.nsoc ?? 9999));
    }

    return Array.from(map.values())
      .filter((g) => g.totalLifts > 0)
      .sort((a, b) => a.minNsoc - b.minNsoc);
  }, [lifts]);

  const maxPassages = useMemo(
    () => groups.reduce((max, g) => Math.max(max, g.totalPassages), 0),
    [groups]
  );

  const isSearching = searchQuery.trim().length > 0;

  const filteredGroups = useMemo<Array<GroupData & { visibleLifts: GroupData["lifts"] }>>(() => {
    if (!isSearching) {
      return groups.map((g) => ({ ...g, visibleLifts: g.lifts }));
    }
    const q = searchQuery.trim().toLowerCase();
    const result: Array<GroupData & { visibleLifts: GroupData["lifts"] }> = [];
    for (const g of groups) {
      const groupNameMatches = g.name.toLowerCase().includes(q);
      const matchingLifts = g.lifts.filter((l) => l.ggbz.toLowerCase().includes(q));
      if (groupNameMatches) {
        result.push({ ...g, visibleLifts: g.lifts });
      } else if (matchingLifts.length > 0) {
        result.push({ ...g, visibleLifts: matchingLifts });
      }
    }
    return result;
  }, [groups, searchQuery, isSearching]);

  const isGroupExpanded = (name: string) => {
    if (isSearching) return true;
    return expandedGroups.has(name);
  };

  const topPadding = Platform.OS === "web" ? 67 : 0;
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
      return [
        { type: "picker" },
        { type: "search" },
        { type: "emptySearch" },
      ];
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
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
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
                onDateChange={(d) => {
                  setSelectedDate(d);
                  setSelectedExtraction(undefined);
                }}
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
          if (item.type === "skeleton") {
            return <LiftRowSkeleton />;
          }
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
              index={Math.max(0, flatIndex - 2)}
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
  header: {
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  inner: { width: "100%" },
  innerWide: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  listWrap: { flex: 1, width: "100%" },
  listWrapWide: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  groupHeader: {
    padding: 14,
    gap: 10,
  },
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  groupName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  subtotalsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  subtotalItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  subtotalValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  subtotalValueSmall: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  subtotalLabel: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  subtotalDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 2,
  },
  passageBarTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 2,
  },
  passageBarFill: {
    height: 3,
    borderRadius: 2,
  },
  liftList: {
    borderTopWidth: 1,
    padding: 10,
    paddingTop: 8,
    gap: 0,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
