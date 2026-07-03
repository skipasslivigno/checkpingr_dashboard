import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useGetLiftHistory } from "@workspace/api-client-react";
import { LiftRowSkeleton } from "@/components/SkeletonLoader";
import { StatCard } from "@/components/StatCard";
import { useColors } from "@/hooks/useColors";
import { useResponsive, CONTENT_MAX_WIDTH } from "@/hooks/useResponsive";
import { useTranslation } from "@/contexts/LanguageContext";
import { useSelectedDate } from "@/contexts/SelectedDateContext";

export default function LiftDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { ggnr, name } = useLocalSearchParams<{ ggnr: string; name: string }>();
  const { selectedDate } = useSelectedDate();

  const ggnrNum = parseInt(ggnr ?? "0", 10);
  const { data: history, isLoading } = useGetLiftHistory(
    { ggnr: ggnrNum, date: selectedDate },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!ggnrNum } as any }
  );

  const latest = history?.[0];
  const topPadding = Platform.OS === "web" ? 67 : 0;
  const { isWide } = useResponsive();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View style={[styles.navBar, { paddingTop: topPadding + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.navBarInner, isWide && styles.navBarInnerWide]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={22} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>{t.back}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      >
        <View style={[styles.inner, isWide && styles.innerWide]}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {name ?? `${t.liftPrefix}${ggnr}`}
        </Text>
        <Text style={[styles.code, { color: colors.mutedForeground }]}>{t.code}: {ggnr}</Text>
        {latest?.nomeSocieta && (
          <View style={[styles.companyBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.companyText, { color: colors.foreground }]} numberOfLines={1}>
              {latest.nomeSocieta}
            </Text>
            {latest.descrGrp && latest.descrGrp !== latest.nomeSocieta && (
              <Text style={[styles.groupText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {latest.descrGrp}
              </Text>
            )}
          </View>
        )}
        {latest?.eser && (
          <Text style={[styles.season, { color: colors.mutedForeground }]}>{t.seasonLabel}: {latest.eser}</Text>
        )}

        {/* Current stats */}
        <View style={styles.statsRow}>
          <StatCard label={t.passages} value={(latest?.npas ?? 0).toLocaleString()} accent />
          <StatCard label={t.onLiftsNow} value={latest?.nuin ?? "—"} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label={t.firstPassage} value={latest?.npin ?? "—"} />
          <StatCard label={t.secondPassage} value={latest?.npic ?? "—"} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {t.todaysHistory} — {selectedDate}
        </Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
          {t.historySubtitle}
        </Text>

        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <LiftRowSkeleton key={i} />)
        ) : !history || history.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="wind" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noHistoryToday}</Text>
          </View>
        ) : (
          history.map((snap) => (
            <View
              key={snap.id}
              style={[styles.histRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.histLeft}>
                <Text style={[styles.histTime, { color: colors.foreground }]}>
                  {snap.dupd?.slice(8, 10)}:{snap.dupd?.slice(10, 12)}
                </Text>
                <Text style={[styles.histDate, { color: colors.mutedForeground }]}>
                  {snap.dtgg?.slice(0, 10)}
                </Text>
              </View>
              <View style={styles.histStats}>
                <View style={styles.histStat}>
                  <Text style={[styles.histVal, { color: colors.primary }]}>
                    {(snap.npas ?? 0).toLocaleString()}
                  </Text>
                  <Text style={[styles.histLabel, { color: colors.mutedForeground }]}>{t.passagesRowLabel}</Text>
                </View>
                <View style={styles.histStat}>
                  <Text style={[styles.histVal, { color: colors.foreground }]}>
                    {snap.nuin ?? "—"}
                  </Text>
                  <Text style={[styles.histLabel, { color: colors.mutedForeground }]}>{t.onLiftLabel}</Text>
                </View>
                <View style={styles.histStat}>
                  <Text style={[styles.histVal, { color: colors.foreground }]}>
                    {snap.npin ?? "—"}
                  </Text>
                  <Text style={[styles.histLabel, { color: colors.mutedForeground }]}>{t.firstPassLabel}</Text>
                </View>
              </View>
            </View>
          ))
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  navBarInner: { width: "100%" },
  navBarInnerWide: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  backText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 0 },
  inner: { width: "100%" },
  innerWide: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 4 },
  code: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  season: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16 },
  companyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 8,
    alignSelf: "flex-start",
  },
  companyText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  groupText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 20, marginBottom: 4 },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12 },
  emptyState: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 36,
    gap: 8,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 12,
  },
  histLeft: { width: 52 },
  histTime: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  histDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  histStats: { flex: 1, flexDirection: "row", gap: 16 },
  histStat: { alignItems: "center" },
  histVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  histLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 },
});
