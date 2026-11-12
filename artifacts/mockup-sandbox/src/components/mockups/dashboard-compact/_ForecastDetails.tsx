import { Feather } from "./_stubs";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "./_native";
import { useSafeAreaInsets } from "./_stubs";
import type { FirstEntriesForecast, FirstEntriesForecastPoint } from "./_fixtures";
import { useColors } from "./_theme";
import { useMetricColors, useTranslation } from "./_stubs";
import { FORECAST_VIEW_SLOTS as SLOTS } from "./_forecast-view";

export type ForecastPanelState = "no_season" | "live_only" | "loading" | "error" | "empty" | "data";

interface Props {
  visible: boolean;
  onClose: () => void;
  state: ForecastPanelState;
  data?: FirstEntriesForecast;
  points: ReadonlyMap<string, FirstEntriesForecastPoint>;
  slot: string;
  onPickSlot: (slot: string) => void;
  isAdmin: boolean;
  verification: boolean;
  onVerificationChange: (enabled: boolean) => void;
  onRetry: () => void;
  retrying: boolean;
}

export function fmtExtractionTime(e: string | null | undefined): string {
  if (!e || e.length < 12) return "—";
  return `${e.slice(8, 10)}:${e.slice(10, 12)}`;
}
export function fmtNum(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? "—" : Math.round(n).toLocaleString();
}
function fmtPct(f: number | null | undefined): string {
  return f == null || !Number.isFinite(f) ? "—" : `${(f * 100).toFixed(1)}%`;
}

export function ForecastDetails(props: Props) {
  const { visible, onClose, state, data, points, slot, onPickSlot, isAdmin, verification, onVerificationChange, onRetry, retrying } = props;
  const colors = useColors();
  const accent = useMetricColors().primiIngressi;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 768;
  const focus = points.get(slot);
  const statusLabel = (s: FirstEntriesForecastPoint["status"]) => t.fcStatus[s] ?? s;

  const Meta = ({ label, value, testID }: { label: string; value: string; testID: string }) => (
    <View style={[styles.meta, { borderColor: colors.border }]}>
      <Text testID={testID} style={[styles.metaValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );

  const body = () => {
    if (state === "no_season") return <Text testID="forecast-no-season" style={[styles.note, { color: colors.mutedForeground }]}>{t.fcNoSeason}</Text>;
    if (state === "live_only") return <Text testID="forecast-live-only" style={[styles.note, { color: colors.mutedForeground }]}>{t.fcLiveOnly}</Text>;
    if (state === "loading") {
      return (
        <View testID="forecast-loading" style={{ gap: 8 }}>
          <View style={[styles.skel, { backgroundColor: colors.secondary, width: "45%" }]} />
          <View style={[styles.skel, { backgroundColor: colors.secondary, width: "70%", height: 28 }]} />
          <View style={[styles.skel, { backgroundColor: colors.secondary, width: "60%" }]} />
        </View>
      );
    }
    if (state === "error" || !data) {
      return (
        <View style={styles.errorBox}>
          <Text testID="forecast-error" style={[styles.note, { color: colors.destructive }]}>{t.fcError}</Text>
          <TouchableOpacity testID="button-forecast-retry" accessibilityRole="button" onPress={onRetry} style={[styles.retryBtn, { borderColor: colors.border }]}>
            {retrying ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="refresh-cw" size={14} color={colors.primary} />}
            <Text style={[styles.strong, { color: colors.primary }]}>{t.emRetry}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (state === "empty") return <Text testID="forecast-empty" style={[styles.note, { color: colors.mutedForeground }]}>{t.fcEmpty}</Text>;

    const ready = focus?.status === "ready" && focus.predictedTotal != null;
    return (
      <>
        <View accessibilityRole="tablist" accessibilityLabel={t.fcSlots} style={[styles.slotRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {SLOTS.map((s) => {
            const p = points.get(s);
            const active = s === slot;
            return (
              <TouchableOpacity
                key={s}
                testID={`button-forecast-slot-${s.replace(":", "")}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${s} ${p ? statusLabel(p.status) : t.fcStatus.no_data}`}
                onPress={() => onPickSlot(s)}
                style={[styles.slotBtn, active && { backgroundColor: colors.card, borderColor: accent.border }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.slotTime, { color: active ? colors.foreground : colors.mutedForeground }]}>{s}</Text>
                <View style={styles.slotStatusRow}>
                  <View style={[styles.statusDot, { backgroundColor: p?.status === "ready" ? accent.color : colors.border }]} />
                  <Text numberOfLines={1} style={[styles.slotStatus, { color: colors.mutedForeground }]}>{p ? statusLabel(p.status) : t.fcStatus.no_data}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {ready && focus ? (
          <View style={{ gap: 4 }}>
            <Text style={[styles.focusLabel, { color: colors.mutedForeground }]}>{t.fcPredictedAt.replace("{slot}", slot)}</Text>
            <Text testID="text-forecast-predicted" style={[styles.bigValue, { color: accent.color }]}>{fmtNum(focus.predictedTotal)}</Text>
            {focus.lowerBound != null && focus.upperBound != null && (
              <Text testID="text-forecast-interval" style={[styles.interval, { color: colors.foreground }]}>
                {t.fcInterval}: {fmtNum(focus.lowerBound)} – {fmtNum(focus.upperBound)}
              </Text>
            )}
            <View style={styles.metaGrid}>
              <Meta label={t.fcObserved.replace("{time}", fmtExtractionTime(focus.extraction))} value={fmtNum(focus.observedEntries)} testID="text-forecast-observed" />
              <Meta label={t.fcTrainingDays} value={String(focus.sampleDays)} testID="text-forecast-training" />
              <Meta label={t.fcReliability} value={t.fcConfidence[focus.confidence] ?? focus.confidence} testID="text-forecast-confidence" />
            </View>
            <Text style={[styles.scope, { color: colors.mutedForeground }]}>
              {focus.comparisonScope === "similar_days" ? t.fcScopeSimilar : t.fcScopeBroader}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <Text testID="text-forecast-unavailable" style={[styles.note, { color: colors.foreground }]}>{focus ? statusLabel(focus.status) : t.fcStatus.no_data}</Text>
            <Text style={[styles.scope, { color: colors.mutedForeground }]}>{focus ? t.fcStatusHelp[focus.status] : t.fcStatusHelp.no_data}</Text>
            {focus && focus.observedEntries != null && focus.status !== "before_extraction" && (
              <View style={styles.metaGrid}>
                <Meta label={t.fcObserved.replace("{time}", fmtExtractionTime(focus.extraction))} value={fmtNum(focus.observedEntries)} testID="text-forecast-observed" />
              </View>
            )}
          </View>
        )}

        <View testID="forecast-details" style={[styles.details, { borderTopColor: colors.border }]}>
          <Text style={[styles.section, { color: colors.foreground }]}>{t.fcDetails}</Text>
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
      </>
    );
  };

  return (
    <Modal visible={visible} transparent animationType={wide ? "fade" : "slide"} onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdropWrap, wide ? styles.center : styles.bottom]}>
        <Pressable
          testID="button-forecast-backdrop"
          accessibilityRole="button"
          accessibilityLabel={t.fcClose}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15, 23, 42, 0.45)" }]}
        />
        <View
          testID="forecast-panel"
          accessibilityViewIsModal
          style={[
            styles.sheet,
            wide ? styles.sheetWide : styles.sheetPhone,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              maxHeight: Math.max(320, height - insets.top - (wide ? 80 : 24)),
              paddingBottom: wide ? 0 : insets.bottom,
            },
          ]}
        >
          {!wide && <View style={[styles.grabber, { backgroundColor: colors.border }]} />}
          <View style={[styles.head, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconDot, { backgroundColor: accent.light, borderColor: accent.border }]}>
              <Feather name="trending-up" size={14} color={accent.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t.fcTitle}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.fcSubtitle}</Text>
            </View>
            <TouchableOpacity
              testID="button-forecast-close"
              accessibilityRole="button"
              accessibilityLabel={t.fcClose}
              onPress={onClose}
              style={[styles.closeBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
              hitSlop={6}
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
            {isAdmin && (
              <View style={[styles.verificationRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.strong, { color: colors.foreground }]}>{t.fcVerificationMode}</Text>
                  <Text style={[styles.scope, { color: colors.mutedForeground }]}>{t.fcVerificationHint}</Text>
                </View>
                <Switch
                  testID="switch-forecast-verification"
                  accessibilityLabel={t.fcVerificationMode}
                  value={verification}
                  onValueChange={onVerificationChange}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
            )}
            {verification && (
              <Text testID="forecast-verification-banner" style={[styles.note, { color: colors.primary }]}>{t.fcVerificationActive}</Text>
            )}
            {body()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  bottom: { justifyContent: "flex-end" },
  sheet: { borderWidth: 1, overflow: "hidden" },
  sheetWide: { width: "100%", maxWidth: 560, borderRadius: 16 },
  sheetPhone: { width: "100%", borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14 },
  slotRow: { flexDirection: "row", borderRadius: 10, borderWidth: 1, padding: 3, gap: 3 },
  slotBtn: { flex: 1, minHeight: 44, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, borderColor: "transparent", minWidth: 0 },
  slotTime: { fontSize: 13, fontFamily: "Inter_700Bold" },
  slotStatusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  slotStatus: { fontSize: 10, fontFamily: "Inter_500Medium", flexShrink: 1 },
  focusLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  bigValue: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  interval: { fontSize: 13, fontFamily: "Inter_500Medium" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  meta: { flexGrow: 1, flexBasis: 100, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  metaValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  metaLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  scope: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  note: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  strong: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  skel: { height: 12, borderRadius: 6 },
  errorBox: { gap: 10, alignItems: "flex-start" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, minHeight: 44 },
  details: { gap: 2, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  section: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  rowValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right", flex: 1, flexShrink: 1 },
  method: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 6 },
  verificationRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 10, padding: 10 },
});
