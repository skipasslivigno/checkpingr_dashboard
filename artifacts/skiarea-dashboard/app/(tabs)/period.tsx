import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useGetLiftsPeriod,
  useGetSeasons,
  getGetLiftsPeriodQueryKey,
} from "@workspace/api-client-react";
import { StatCard } from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/SkeletonLoader";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function offsetDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr: string, language: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const locale = language === "it" ? "it-IT" : "en-GB";
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export default function PeriodScreen() {
  const colors = useColors();
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const [fromInput, setFromInput] = useState(offsetDays(-7));
  const [toInput, setToInput] = useState(todayIso());
  const [appliedFrom, setAppliedFrom] = useState(offsetDays(-7));
  const [appliedTo, setAppliedTo] = useState(todayIso());
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>(undefined);

  const { data: seasons } = useGetSeasons();

  const queryParams = {
    from: appliedFrom,
    to: appliedTo,
    ...(selectedSeason ? { season: selectedSeason } : {}),
  };

  const { data, isLoading } = useGetLiftsPeriod(queryParams);

  const topPadding = Platform.OS === "web" ? 67 : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: getGetLiftsPeriodQueryKey() });
    setRefreshing(false);
  };

  function applyRange() {
    const fromOk = /^\d{4}-\d{2}-\d{2}$/.test(fromInput);
    const toOk = /^\d{4}-\d{2}-\d{2}$/.test(toInput);
    if (fromOk && toOk && fromInput <= toInput) {
      setAppliedFrom(fromInput);
      setAppliedTo(toInput);
    }
  }

  const hasData = data && data.lifts.length > 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {formatDate(appliedFrom, language)} — {formatDate(appliedTo, language)}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.period}</Text>
        </View>
      </View>

      {/* Season chips */}
      {seasons && seasons.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.seasonRow}
        >
          {seasons.map((s) => {
            const active = (selectedSeason ?? seasons[0]) === s;
            return (
              <TouchableOpacity
                key={s}
                style={[
                  styles.seasonChip,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedSeason(s === seasons[0] ? undefined : s)}
              >
                <Text
                  style={[
                    styles.seasonText,
                    { color: active ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Date range picker */}
      <View
        style={[
          styles.rangeCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.rangeRow}>
          <View style={styles.rangeField}>
            <Text style={[styles.rangeLabel, { color: colors.mutedForeground }]}>{t.periodFrom}</Text>
            <TextInput
              style={[styles.rangeInput, { color: colors.foreground, borderColor: colors.border }]}
              value={fromInput}
              onChangeText={setFromInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              maxLength={10}
              onSubmitEditing={applyRange}
            />
          </View>

          <Feather name="arrow-right" size={16} color={colors.mutedForeground} style={styles.arrow} />

          <View style={styles.rangeField}>
            <Text style={[styles.rangeLabel, { color: colors.mutedForeground }]}>{t.periodTo}</Text>
            <TextInput
              style={[styles.rangeInput, { color: colors.foreground, borderColor: colors.border }]}
              value={toInput}
              onChangeText={setToInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              maxLength={10}
              onSubmitEditing={applyRange}
            />
          </View>
        </View>

        {/* Quick-select presets */}
        <View style={styles.presetsRow}>
          {([
            { label: "7d", days: 7 },
            { label: "14d", days: 14 },
            { label: "30d", days: 30 },
          ] as const).map(({ label, days }) => {
            const pFrom = offsetDays(-days);
            const pTo = todayIso();
            const active = appliedFrom === pFrom && appliedTo === pTo;
            return (
              <TouchableOpacity
                key={label}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: active ? colors.accent : colors.secondary,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  setFromInput(pFrom);
                  setToInput(pTo);
                  setAppliedFrom(pFrom);
                  setAppliedTo(pTo);
                }}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: active ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: colors.primary }]}
            onPress={applyRange}
          >
            <Text style={[styles.applyText, { color: colors.primaryForeground }]}>
              {t.periodApply}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label={t.periodTotalPassages}
              value={(data?.totalPassages ?? 0).toLocaleString()}
              accent
            />
            <StatCard
              label={t.periodTotalGuests}
              value={(data?.totalGuests ?? 0).toLocaleString()}
            />
          </>
        )}
      </View>

      <View style={styles.statsRow}>
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label={t.periodActiveDays}
              value={`${data?.activeDays ?? 0} ${t.periodDays}`}
            />
            <StatCard
              label={t.periodBusiestDay}
              value={data?.busiestDay ? formatDate(data.busiestDay, language) : "—"}
            />
          </>
        )}
      </View>

      {data?.busiestLift && !isLoading && (
        <View
          style={[
            styles.busiestLiftCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="award" size={14} color={colors.primary} />
          <Text style={[styles.busiestLabel, { color: colors.mutedForeground }]}>
            {t.periodBusiestLift}
          </Text>
          <Text style={[styles.busiestValue, { color: colors.foreground }]} numberOfLines={1}>
            {data.busiestLift}
          </Text>
        </View>
      )}

      {/* Ranked lift list */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {t.periodRankedLifts}
      </Text>

      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[styles.liftRowSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}
          />
        ))
      ) : !hasData ? (
        <View
          style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="calendar" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {t.periodNoData}
          </Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
            {t.periodNoDataSub}
          </Text>
        </View>
      ) : (
        data.lifts.map((lift, index) => (
          <View
            key={lift.ggnr}
            style={[styles.liftRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.rankBadge, { backgroundColor: index < 3 ? colors.primary : colors.secondary }]}>
              <Text style={[styles.rankText, { color: index < 3 ? colors.primaryForeground : colors.mutedForeground }]}>
                {index + 1}
              </Text>
            </View>

            <View style={styles.liftInfo}>
              <Text style={[styles.liftName, { color: colors.foreground }]} numberOfLines={1}>
                {lift.ggbz}
              </Text>
              <Text style={[styles.liftMeta, { color: colors.mutedForeground }]}>
                {lift.activeDays} {t.periodDays}
              </Text>
            </View>

            <View style={styles.liftStats}>
              <View style={styles.liftStatRow}>
                <Text style={[styles.liftPassages, { color: colors.primary }]}>
                  {lift.totalPassages.toLocaleString()}
                </Text>
                <Text style={[styles.liftPassagesLabel, { color: colors.mutedForeground }]}>
                  {t.passagesRowLabel}
                </Text>
              </View>
              <View style={styles.liftStatRow}>
                <Text style={[styles.liftGuests, { color: colors.mutedForeground }]}>
                  {lift.totalGuests.toLocaleString()}
                </Text>
                <Text style={[styles.liftGuestsLabel, { color: colors.mutedForeground }]}>
                  {t.guestsOnLifts}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}

      <View style={{ height: Platform.OS === "web" ? 34 : 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  titleBlock: { flex: 1 },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  seasonRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 14,
  },
  seasonChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  seasonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  rangeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rangeField: { flex: 1, gap: 4 },
  rangeLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  rangeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  arrow: { marginTop: 16 },
  presetsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  presetChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  presetText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  applyBtn: {
    marginLeft: "auto",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  applyText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10, paddingHorizontal: 16 },
  busiestLiftCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  busiestLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  busiestValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  liftRowSkeleton: {
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    height: 60,
  },
  liftRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  liftInfo: { flex: 1, gap: 2 },
  liftName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  liftMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  liftStats: { alignItems: "flex-end", gap: 3 },
  liftStatRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  liftPassages: { fontSize: 15, fontFamily: "Inter_700Bold" },
  liftPassagesLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  liftGuests: { fontSize: 12, fontFamily: "Inter_500Medium" },
  liftGuestsLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 40,
    gap: 8,
    marginHorizontal: 16,
  },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySubText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
