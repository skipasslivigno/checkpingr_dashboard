import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
import { LiftRow } from "@/components/LiftRow";
import { LiftRowSkeleton, StatCardSkeleton } from "@/components/SkeletonLoader";
import { StatCard } from "@/components/StatCard";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, language, setLanguage } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [selectedExtraction, setSelectedExtraction] = useState<string | undefined>(undefined);

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

  const topLifts = lifts
    ? [...lifts].sort((a, b) => (b.npas ?? 0) - (a.npas ?? 0)).slice(0, 5)
    : [];

  const topPadding = Platform.OS === "web" ? 67 : 0;
  const isToday = selectedDate === todayIso();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            {isToday ? t.today : selectedDate}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.dashboard}</Text>
        </View>

        {/* Language toggle */}
        <View style={[styles.langToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["it", "en"] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[
                styles.langBtn,
                language === lang && { backgroundColor: colors.primary },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langText,
                  { color: language === lang ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {seasons && seasons.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonScroll}>
            {seasons.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.seasonChip,
                  {
                    backgroundColor:
                      (selectedSeason ?? seasons[0]) === s ? colors.primary : colors.secondary,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedSeason(s === seasons[0] ? undefined : s)}
              >
                <Text
                  style={[
                    styles.seasonText,
                    {
                      color:
                        (selectedSeason ?? seasons[0]) === s
                          ? colors.primaryForeground
                          : colors.foreground,
                    },
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Date + extraction picker */}
      <DateExtractionPicker
        selectedDate={selectedDate}
        selectedExtraction={selectedExtraction}
        season={selectedSeason}
        onDateChange={(d) => {
          setSelectedDate(d);
          setSelectedExtraction(undefined);
        }}
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

      {/* Stats row */}
      <View style={styles.statsRow}>
        {summaryLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label={t.passages}
              value={(summary?.totalPassages ?? 0).toLocaleString()}
              accent
            />
            <StatCard
              label={t.guestsOnLifts}
              value={(summary?.totalGuests ?? 0).toLocaleString()}
            />
          </>
        )}
      </View>

      <View style={styles.statsRow}>
        {summaryLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label={t.activeLifts}
              value={`${summary?.activeLifts ?? 0} / ${summary?.totalLifts ?? 0}`}
            />
            <StatCard label={t.season} value={summary?.season ?? "—"} />
          </>
        )}
      </View>

      {/* Top lifts */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {isToday ? t.topLiftsToday : `${t.topLiftsDate} — ${selectedDate}`}
      </Text>

      {liftsLoading ? (
        Array.from({ length: 5 }).map((_, i) => <LiftRowSkeleton key={i} />)
      ) : topLifts.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="wind" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {isToday ? t.noDataToday : `${t.noDataDate} ${selectedDate}`}
          </Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
            {isToday ? t.pushFirstExtraction : t.tryDifferentDate}
          </Text>
        </View>
      ) : (
        topLifts.map((lift) => (
          <LiftRow
            key={lift.ggnr}
            name={lift.ggbz}
            passages={lift.npas ?? null}
            guests={lift.nuin ?? null}
            firstPassage={lift.npin ?? null}
            company={lift.nomeSocieta}
            group={lift.descrGrp}
            onPress={() =>
              router.push({
                pathname: "/lift/[ggnr]",
                params: { ggnr: lift.ggnr, name: lift.ggbz },
              })
            }
          />
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
    gap: 8,
    paddingHorizontal: 16,
  },
  titleBlock: { flex: 1 },
  dateText: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  langToggle: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  langText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  seasonScroll: { flexShrink: 1 },
  seasonChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginLeft: 6,
  },
  seasonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  syncText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
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
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24 },
});
