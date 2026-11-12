import { Feather, useRouter } from "./_stubs";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "./_native";
import { useGetPeriodComparison, getGetPeriodComparisonQueryKey } from "./_period-fixture";
import type { PeriodComparisonValue } from "./_api-types";
import { useColors } from "./_theme";
import { useMetricColors, useTranslation, useAuth } from "./_stubs";
import { extractionBelongsToDate } from "./_forecast-view";

interface Props { date: string; season?: string; extraction?: string }

const fmtNum = (n: number | null | undefined) => (n == null ? null : n.toLocaleString("it-IT"));
const fmtDate = (d: string | null | undefined) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}` : "?");
const range = (a: string | null, b: string | null) => (a || b ? (a === b ? fmtDate(a) : `${fmtDate(a)}–${fmtDate(b)}`) : "");
const fmtPct = (p: number | null | undefined) =>
  p == null ? null : `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function Column({ title, v, id, showMissing, onToggle }: { title: string; v: PeriodComparisonValue; id: string; showMissing: boolean; onToggle: () => void }) {
  const colors = useColors();
  const accent = useMetricColors().primiIngressi;
  const { t } = useTranslation();
  const cur = fmtNum(v.currentTotal);
  const prev = fmtNum(v.previousTotal);
  const pct = fmtPct(v.changePercent);
  const pctColor = v.changePercent == null ? colors.mutedForeground : v.changePercent > 0 ? colors.success : v.changePercent < 0 ? colors.destructive : colors.foreground;
  const missing = v.missingCurrentDays.length + v.missingPreviousDays.length;
  return (
    <View style={styles.col} testID={`period-${id}`}>
      <Text style={[styles.colTitle, { color: accent.color }]} numberOfLines={1}>{title}</Text>
      <Text testID={`text-${id}-current`} style={[styles.big, { color: cur ? colors.foreground : colors.mutedForeground }]} numberOfLines={1} adjustsFontSizeToFit>
        {cur ?? "—"}
      </Text>
      <Text style={[styles.dates, { color: colors.mutedForeground }]} numberOfLines={1}>{range(v.currentFromDate, v.currentToDate)}</Text>
      <View style={styles.cmpRow}>
        <Text testID={`text-${id}-diff`} style={[styles.pct, { color: pctColor }]}>{pct ?? t.pc.na}</Text>
        <Text style={[styles.prev, { color: colors.mutedForeground }]} numberOfLines={1}>
          {t.pc.prev} {prev ?? t.pc.na}
        </Text>
      </View>
      <Text style={[styles.dates, { color: colors.mutedForeground }]} numberOfLines={1}>{range(v.previousFromDate, v.previousToDate)}</Text>
      {missing > 0 && (
        <TouchableOpacity testID={`button-${id}-missing`} onPress={onToggle} accessibilityRole="button" style={styles.missBtn}>
          <Feather name="alert-triangle" size={11} color={colors.destructive} />
          <Text style={[styles.missText, { color: colors.destructive }]}>{t.pc.missing} ({missing})</Text>
        </TouchableOpacity>
      )}
      {showMissing && missing > 0 && (
        <View testID={`list-${id}-missing`}>
          {v.missingCurrentDays.length > 0 && (
            <Text style={[styles.missList, { color: colors.mutedForeground }]}>{t.pc.missingCur}: {v.missingCurrentDays.map(fmtDate).join(", ")}</Text>
          )}
          {v.missingPreviousDays.length > 0 && (
            <Text style={[styles.missList, { color: colors.mutedForeground }]}>{t.pc.missingPrev}: {v.missingPreviousDays.map(fmtDate).join(", ")}</Text>
          )}
        </View>
      )}
    </View>
  );
}

export function PeriodComparison({ date, season, extraction }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const valid = !!season && !!user && extractionBelongsToDate(extraction, date);
  const params = { date, season: season ?? "", ...(extraction ? { extraction } : {}) };
  const q = useGetPeriodComparison(params, {
    query: { queryKey: getGetPeriodComparisonQueryKey(params), enabled: valid, staleTime: 60000, refetchInterval: 60000 },
  });
  const data = valid ? q.data : undefined;
  const card = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];

  if (!season) return null;
  if (!valid || q.isLoading) {
    return (
      <View testID="period-comparison-loading" style={card}>
        <View style={[styles.skel, { backgroundColor: colors.secondary, width: "40%" }]} />
        <View style={[styles.skel, { backgroundColor: colors.secondary, width: "70%", height: 26 }]} />
      </View>
    );
  }
  if (q.isError || !data) {
    return (
      <View testID="period-comparison-error" style={[card, styles.msgRow]}>
        <Feather name="alert-circle" size={14} color={colors.destructive} />
        <Text style={[styles.msg, { color: colors.mutedForeground }]}>{t.pc.error}</Text>
        <TouchableOpacity testID="button-period-retry" onPress={() => q.refetch()} disabled={q.isFetching} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.primary }]}>{t.pc.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (data.status !== "ready") {
    const msg = data.status === "configuration_required" ? (isAdmin ? t.pc.configAdmin : t.pc.config)
      : data.status === "before_season" ? t.pc.beforeSeason : t.pc.noData;
    return (
      <View testID={`period-comparison-${data.status}`} style={[card, styles.msgRow]}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.msg, { color: colors.mutedForeground }]}>{msg}</Text>
        {data.status === "configuration_required" && isAdmin && (
          <TouchableOpacity testID="button-period-open-settings" onPress={() => router.push("/settings")} accessibilityRole="button">
            <Text style={[styles.link, { color: colors.primary }]}>{t.pc.openSettings}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  const time = data.sourceExtraction && /^\d{14}$/.test(data.sourceExtraction)
    ? `${data.sourceExtraction.slice(8, 10)}:${data.sourceExtraction.slice(10, 12)}` : null;
  return (
    <View testID="period-comparison" style={card}>
      <View style={styles.head}>
        <Text style={[styles.headText, { color: colors.mutedForeground }]}>{t.pc.title}</Text>
        {data.includedSelectedDay && time && time !== "23:30" && (
          <Text testID="text-period-partial" style={[styles.headText, { color: colors.mutedForeground }]}>{t.pc.partial.replace("{time}", time)}</Text>
        )}
        {!data.previousSeason && <Text style={[styles.headText, { color: colors.mutedForeground }]}>{t.pc.noPrevSeason}</Text>}
      </View>
      <View style={styles.cols}>
        <Column title={t.pc.weekly} v={data.weekly} id="weekly" showMissing={open} onToggle={() => setOpen(!open)} />
        <View style={[styles.sep, { backgroundColor: colors.border }]} />
        <Column title={t.pc.progressive} v={data.progressive} id="progressive" showMissing={open} onToggle={() => setOpen(!open)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6, marginHorizontal: 16, marginBottom: 10 },
  head: { flexDirection: "row", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  headText: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  cols: { flexDirection: "row", gap: 10 },
  sep: { width: 1, alignSelf: "stretch" },
  col: { flex: 1, minWidth: 0, gap: 1 },
  colTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  big: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  dates: { fontSize: 10, fontFamily: "Inter_400Regular" },
  cmpRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4, flexWrap: "wrap" },
  pct: { fontSize: 15, fontFamily: "Inter_700Bold" },
  prev: { fontSize: 11, fontFamily: "Inter_500Medium", flexShrink: 1 },
  missBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, paddingVertical: 2 },
  missText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  missList: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  msgRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  msg: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  link: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  skel: { height: 12, borderRadius: 6 },
});
