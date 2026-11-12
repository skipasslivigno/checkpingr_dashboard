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
import { ForecastDetails, fmtExtractionTime, fmtNum, type ForecastPanelState } from "@/components/ForecastDetails";

interface Props {
  date: string;
  season?: string;
  extraction?: string;
  /** Desktop stats-row size (matches StatCard compact). */
  compact?: boolean;
}

export function FirstEntriesForecast({ date, season, extraction, compact }: Props) {
  const colors = useColors();
  const accent = useMetricColors().primiIngressi;
  const { t } = useTranslation();
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

  // Viewers/operators: only a ready live estimate, a tile-sized loading state, or a compact error entry.
  if (!isAdmin && !ready && state !== "loading" && state !== "error") return null;
  if (!isAdmin && state === "loading" && (!dateAllowed || !season)) return null;

  const cardStyle = [
    styles.card,
    compact && styles.cardCompact,
    ready
      ? { backgroundColor: accent.light, borderColor: accent.border, borderStyle: "dashed" as const }
      : { backgroundColor: colors.card, borderColor: colors.border },
  ];

  if (state === "loading" && !ready && !open) {
    return (
      <View testID="forecast-loading-tile" style={cardStyle} accessibilityLabel={t.fcTitle}>
        <View style={[styles.skel, { backgroundColor: colors.secondary, width: "55%", height: compact ? 22 : 26 }]} />
        <View style={[styles.skel, { backgroundColor: colors.secondary, width: "80%" }]} />
      </View>
    );
  }

  const time = ready ? fmtExtractionTime(focus!.extraction) : "";
  const a11y = ready
    ? `${t.fcTileLabel}: ${fmtNum(focus!.predictedTotal)}. ${t.fcTileAt.replace("{time}", time)}. ${t.fcTileOpen}`
    : `${t.fcTitle}: ${t.fcTileUnavailable}. ${t.fcTileOpen}`;

  return (
    <>
      <TouchableOpacity
        testID="button-forecast-tile"
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityHint={t.fcTileOpen}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        style={cardStyle}
      >
        <View style={styles.topRow}>
          <Text
            testID={ready ? "text-forecast-tile-value" : "text-forecast-tile-empty"}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.value, compact && styles.valueCompact, { color: ready ? accent.color : colors.mutedForeground }]}
          >
            {ready ? fmtNum(focus!.predictedTotal) : "—"}
          </Text>
          <Feather name="maximize-2" size={13} color={ready ? accent.color : colors.mutedForeground} style={styles.affordance} />
        </View>
        <Text numberOfLines={1} style={[styles.label, { color: ready ? accent.color : colors.mutedForeground }]}>
          {ready ? t.fcTileLabel : isAdmin ? t.fcTileVerify : t.fcTileUnavailable}
        </Text>
        {ready ? (
          <Text testID="text-forecast-tile-time" numberOfLines={1} style={[styles.sub, { color: colors.mutedForeground }]}>
            {t.fcTileAt.replace("{time}", time)}
          </Text>
        ) : isAdmin ? (
          <Text numberOfLines={1} style={[styles.sub, { color: colors.mutedForeground }]}>{t.fcTitle}</Text>
        ) : null}
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
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, padding: 16, borderWidth: 1, gap: 4, minHeight: 88, justifyContent: "center", minWidth: 0 },
  cardCompact: { padding: 12, minHeight: 72, gap: 2 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  value: { flex: 1, fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  valueCompact: { fontSize: 24 },
  affordance: { marginTop: 4 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  skel: { height: 12, borderRadius: 6 },
});
