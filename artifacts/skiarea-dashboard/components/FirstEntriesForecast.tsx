import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  useGetFirstEntriesForecast,
  getGetFirstEntriesForecastQueryKey,
} from "@workspace/api-client-react";
import type { FirstEntriesForecastPoint } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useMetricColors } from "@/hooks/useMetricColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { extractionBelongsToDate, defaultForecastSlot, forecastDateAllowed } from "@/lib/forecast-view";
import { ForecastDetails, fmtExtractionTime, fmtGrouped, type ForecastPanelState } from "@/components/ForecastDetails";

interface Props {
  date: string;
  season?: string;
  extraction?: string;
  /** Actual first entries for the selected date/extraction (summary.totalGuests). */
  actualEntries?: number | null;
}

/**
 * Inline first-entries estimate, rendered inside the PRIMI INGRESSI StatCard.
 * Tapping opens the full ForecastDetails modal (including the actual metric).
 */
export function FirstEntriesForecast({ date, season, extraction, actualEntries }: Props) {
  const colors = useColors();
  const accent = useMetricColors().primiIngressi;
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const userKey = user ? `${user.tenantId}:${user.id}` : "";
  const [verificationSetting, setVerificationSetting] = useState({ userKey: "", enabled: false });
  const verification = isAdmin && verificationSetting.userKey === userKey && verificationSetting.enabled;
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    // Re-evaluate midnight even if the screen stays open. Dates are Rome-local.
    const timer = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const dateAllowed = forecastDateAllowed(date, verification, clock);

  const valid = !!season && !!user && dateAllowed && extractionBelongsToDate(extraction, date);
  const params = {
    date,
    season: season ?? "",
    mode: verification ? ("verification" as const) : ("live" as const),
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
  const defaultSlot = useMemo(() => defaultForecastSlot(points), [points]);

  const [picked, setPicked] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { setPicked(null); }, [date, season, extraction, verification]);
  // Close the panel whenever context changes (date, season, extraction, account).
  useEffect(() => { setOpen(false); }, [date, season, extraction, userKey]);

  const suppressed = !!data && !["live", "verification"].includes(data.availability);
  const focus = points.get(defaultSlot);
  const ready = !!data && !suppressed && focus?.status === "ready" && focus.predictedTotal != null;

  let state: ForecastPanelState;
  if (!season) state = "no_season";
  else if (!dateAllowed || suppressed) state = "live_only";
  else if (!valid || query.isLoading) state = "loading";
  else if (query.isError || !data) state = "error";
  else if (data.forecasts.length === 0) state = "empty";
  else state = "data";

  // Viewers/operators: only a ready live estimate, a loading line, or a compact error entry.
  if (!isAdmin && !ready && state !== "loading" && state !== "error") return null;
  if (!isAdmin && state === "loading" && (!dateAllowed || !season)) return null;

  if (state === "loading" && !ready && !open) {
    return (
      <View testID="forecast-loading-inline" style={styles.line} accessibilityLabel={t.fcTitle}>
        <View style={[styles.skel, { backgroundColor: accent.border }]} />
      </View>
    );
  }

  const estimate = ready ? fmtGrouped(focus!.predictedTotal, language) : "";
  const time = ready ? fmtExtractionTime(focus!.extraction) : "";
  const a11y = ready
    ? `${t.fcTileLabel}: ${estimate}. ${t.fcTileAt.replace("{time}", time)}. ${t.fcTileOpen}`
    : `${t.fcTitle}: ${isAdmin ? t.fcTileVerify : t.fcTileUnavailable}. ${t.fcTileOpen}`;

  return (
    <>
      <TouchableOpacity
        testID="button-forecast-inline"
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityHint={t.fcTileOpen}
        onPress={() => setOpen(true)}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        style={styles.line}
      >
        {ready ? (
          <Text testID="text-forecast-inline-value" numberOfLines={1} style={[styles.text, { color: accent.color }]}>
            {t.fcInlineEstimate.replace("{n}", estimate)}
          </Text>
        ) : (
          <Text testID="text-forecast-inline-empty" numberOfLines={1} style={[styles.text, styles.muted, { color: colors.mutedForeground }]}>
            {isAdmin ? `${t.fcInlineDetails} · ${t.fcTileVerify}` : t.fcTileUnavailable}
          </Text>
        )}
        <Feather name={ready ? "maximize-2" : isAdmin ? "sliders" : "info"} size={10} color={ready ? accent.color : colors.mutedForeground} />
      </TouchableOpacity>
      {open && (
        <ForecastDetails
          visible={open}
          onClose={() => setOpen(false)}
          state={state}
          data={data}
          points={points}
          slot={picked ?? defaultSlot}
          onPickSlot={setPicked}
          isAdmin={isAdmin}
          verification={verification}
          onVerificationChange={(enabled) => setVerificationSetting({ userKey, enabled })}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
          actualEntries={actualEntries}
          actualExtraction={extraction}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, marginTop: 2, minHeight: 16, maxWidth: "100%" },
  text: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2, flexShrink: 1, textDecorationLine: "underline", textDecorationStyle: "dotted" },
  muted: { fontFamily: "Inter_500Medium" },
  skel: { height: 10, width: 72, borderRadius: 5, opacity: 0.6 },
});
