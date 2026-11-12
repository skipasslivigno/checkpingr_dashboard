import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  useGetFirstEntriesForecast,
  getGetFirstEntriesForecastQueryKey,
} from "@workspace/api-client-react";
import type { FirstEntriesForecastPoint } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useMetricColors } from "@/hooks/useMetricColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { FORECAST_VIEW_SLOTS as SLOTS, extractionBelongsToDate, defaultForecastSlot } from "@/lib/forecast-view";

interface Props {
  date: string;
  season?: string;
  extraction?: string;
}

function fmtExtractionTime(e: string | null): string {
  if (!e || e.length < 12) return "—";
  return `${e.slice(8, 10)}:${e.slice(10, 12)}`;
}

function fmtNum(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? "—" : Math.round(n).toLocaleString();
}

function fmtPct(f: number | null | undefined): string {
  return f == null || !Number.isFinite(f) ? "—" : `${(f * 100).toFixed(1)}%`;
}

export function FirstEntriesForecast({ date, season, extraction }: Props) {
  const colors = useColors();
  const metrics = useMetricColors();
  const { t } = useTranslation();
  const accent = metrics.primiIngressi;

  const valid = !!season && extractionBelongsToDate(extraction, date);
  const params = {
    date,
    season: season ?? "",
    ...(extraction ? { extraction } : {}),
  };
  const query = useGetFirstEntriesForecast(params, {
    query: {
      queryKey: getGetFirstEntriesForecastQueryKey(params),
      enabled: valid,
      staleTime: 60000,
      refetchInterval: 60000,
    },
  });
  const data = valid ? query.data : undefined;

  const points = useMemo(() => {
    const map = new Map<string, FirstEntriesForecastPoint>();
    for (const p of data?.forecasts ?? []) map.set(p.slot, p);
    return map;
  }, [data]);

  // Latest usable scheduled forecast at/before the selected extraction
  const defaultSlot = useMemo(() => defaultForecastSlot(points), [points]);

  const [picked, setPicked] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setPicked(null); }, [date, season, extraction]);
  const slot = picked ?? defaultSlot;
  const focus = points.get(slot);

  const statusLabel = (s: FirstEntriesForecastPoint["status"]) => t.fcStatus[s] ?? s;
  const confLabel = (c: FirstEntriesForecastPoint["confidence"]) => t.fcConfidence[c] ?? c;

  const wrap = (children: React.ReactNode) => (
    <View testID="forecast-card" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headRow}>
        <View style={[styles.iconDot, { backgroundColor: accent.light, borderColor: accent.border }]}>
          <Feather name="trending-up" size={13} color={accent.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.fcTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.fcSubtitle}</Text>
        </View>
        <View style={[styles.badge, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
          <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{t.fcEstimate}</Text>
        </View>
      </View>
      {children}
    </View>
  );

  if (!season) {
    return wrap(<Text testID="forecast-no-season" style={[styles.note, { color: colors.mutedForeground }]}>{t.fcNoSeason}</Text>);
  }
  if (!valid || query.isLoading) {
    return wrap(
      <View testID="forecast-loading" style={styles.loading}>
        <View style={[styles.skel, { backgroundColor: colors.secondary, width: "45%" }]} />
        <View style={[styles.skel, { backgroundColor: colors.secondary, width: "70%", height: 28 }]} />
        <View style={[styles.skel, { backgroundColor: colors.secondary, width: "60%" }]} />
      </View>,
    );
  }
  if (query.isError || !data) {
    return wrap(
      <View style={styles.errorBox}>
        <Text testID="forecast-error" style={[styles.note, { color: colors.destructive }]}>{t.fcError}</Text>
        <TouchableOpacity
          testID="button-forecast-retry"
          accessibilityRole="button"
          onPress={() => query.refetch()}
          style={[styles.retryBtn, { borderColor: colors.border }]}
        >
          {query.isFetching ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="refresh-cw" size={13} color={colors.primary} />}
          <Text style={[styles.retryText, { color: colors.primary }]}>{t.emRetry}</Text>
        </TouchableOpacity>
      </View>,
    );
  }
  if (data.forecasts.length === 0) {
    return wrap(<Text testID="forecast-empty" style={[styles.note, { color: colors.mutedForeground }]}>{t.fcEmpty}</Text>);
  }

  const ready = focus?.status === "ready" && focus.predictedTotal != null;

  return wrap(
    <>
      {/* Slot selector */}
      <View style={[styles.slotRow, { backgroundColor: colors.secondary, borderColor: colors.border }]} accessibilityRole="tablist">
        {SLOTS.map((s) => {
          const p = points.get(s);
          const active = s === slot;
          const isReady = p?.status === "ready";
          return (
            <TouchableOpacity
              key={s}
              testID={`button-forecast-slot-${s.replace(":", "")}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${s} ${p ? statusLabel(p.status) : t.fcStatus.no_data}`}
              onPress={() => setPicked(s)}
              style={[styles.slotBtn, active && { backgroundColor: colors.card, borderColor: accent.border }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.slotTime, { color: active ? colors.foreground : colors.mutedForeground }]}>{s}</Text>
              <View style={styles.slotStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: isReady ? accent.color : colors.border }]} />
                <Text numberOfLines={1} style={[styles.slotStatus, { color: colors.mutedForeground }]}>
                  {p ? statusLabel(p.status) : t.fcStatus.no_data}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Focused slot */}
      {ready && focus ? (
        <View style={styles.focus}>
          <Text style={[styles.focusLabel, { color: colors.mutedForeground }]}>
            {t.fcPredictedAt.replace("{slot}", slot)}
          </Text>
          <Text testID="text-forecast-predicted" style={[styles.bigValue, { color: accent.color }]}>
            {fmtNum(focus.predictedTotal)}
          </Text>
          {focus.lowerBound != null && focus.upperBound != null && (
            <Text testID="text-forecast-interval" style={[styles.interval, { color: colors.foreground }]}>
              {t.fcInterval}: {fmtNum(focus.lowerBound)} – {fmtNum(focus.upperBound)}
            </Text>
          )}
          <View style={styles.metaGrid}>
            <Meta label={t.fcObserved.replace("{time}", fmtExtractionTime(focus.extraction))} value={fmtNum(focus.observedEntries)} testID="text-forecast-observed" />
            <Meta label={t.fcTrainingDays} value={String(focus.sampleDays)} testID="text-forecast-training" />
            <Meta label={t.fcReliability} value={confLabel(focus.confidence)} testID="text-forecast-confidence" />
          </View>
          <Text style={[styles.scope, { color: colors.mutedForeground }]}>
            {focus.comparisonScope === "similar_days" ? t.fcScopeSimilar : t.fcScopeBroader}
          </Text>
        </View>
      ) : (
        <View style={styles.focus}>
          <Text testID="text-forecast-unavailable" style={[styles.note, { color: colors.foreground }]}>
            {focus ? statusLabel(focus.status) : t.fcStatus.no_data}
          </Text>
          <Text style={[styles.scope, { color: colors.mutedForeground }]}>
            {focus ? t.fcStatusHelp[focus.status] : t.fcStatusHelp.no_data}
          </Text>
          {focus && focus.observedEntries != null && focus.status !== "before_extraction" && (
            <View style={styles.metaGrid}>
              <Meta label={t.fcObserved.replace("{time}", fmtExtractionTime(focus.extraction))} value={fmtNum(focus.observedEntries)} testID="text-forecast-observed" />
            </View>
          )}
        </View>
      )}

      {/* Details */}
      <TouchableOpacity
        testID="button-forecast-details"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((v) => !v)}
        style={[styles.detailsToggle, { borderTopColor: colors.border }]}
      >
        <Text style={[styles.detailsToggleText, { color: colors.primary }]}>{t.fcDetails}</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
      </TouchableOpacity>
      {expanded && (
        <View testID="forecast-details" style={styles.details}>
          {focus && (
            <>
              <Row label={t.fcMape} value={fmtPct(focus.validation.medianAbsolutePercentageError)} />
              <Row label={t.fcMae} value={fmtNum(focus.validation.meanAbsoluteError)} />
              <Row label={t.fcValidationDays} value={String(focus.validation.sampleDays)} />
              <Row label={t.fcCoverage} value={fmtPct(focus.validation.intervalCoverage)} />
            </>
          )}
          <Row
            label={t.fcHistory}
            value={`${data.history.completeDays} / ${data.history.daysExamined}${data.history.fromDate && data.history.toDate ? ` (${data.history.fromDate} – ${data.history.toDate})` : ""}`}
          />
          <Text style={[styles.method, { color: colors.mutedForeground }]}>{t.fcMethod}</Text>
          <Text style={[styles.method, { color: colors.mutedForeground }]}>{t.fcIntervalNote}</Text>
          <Text style={[styles.method, { color: colors.mutedForeground }]}>{t.fcModel}: {data.modelVersion} · {data.timeZone}</Text>
        </View>
      )}
    </>,
  );

  function Meta({ label, value, testID }: { label: string; value: string; testID: string }) {
    return (
      <View style={[styles.meta, { borderColor: colors.border }]}>
        <Text testID={testID} style={[styles.metaValue, { color: colors.foreground }]}>{value}</Text>
        <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
    );
  }
  function Row({ label, value }: { label: string; value: string }) {
    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, marginHorizontal: 16, marginBottom: 10 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4, textTransform: "uppercase" },
  slotRow: { flexDirection: "row", borderRadius: 10, borderWidth: 1, padding: 3, gap: 3 },
  slotBtn: { flex: 1, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, borderColor: "transparent", minWidth: 0 },
  slotTime: { fontSize: 13, fontFamily: "Inter_700Bold" },
  slotStatusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  slotStatus: { fontSize: 10, fontFamily: "Inter_500Medium", flexShrink: 1 },
  focus: { gap: 4 },
  focusLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  bigValue: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  interval: { fontSize: 13, fontFamily: "Inter_500Medium" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  meta: { flexGrow: 1, flexBasis: 100, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  metaValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  metaLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  scope: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  note: { fontSize: 13, fontFamily: "Inter_500Medium" },
  loading: { gap: 8 },
  skel: { height: 12, borderRadius: 6 },
  errorBox: { gap: 10, alignItems: "flex-start" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  retryText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  detailsToggle: { flexDirection: "row", alignItems: "center", gap: 4, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  detailsToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  details: { gap: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  rowValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right", flex: 1, flexShrink: 1 },
  method: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 6 },
});
