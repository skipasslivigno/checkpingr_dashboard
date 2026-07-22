import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient, skipToken } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useState, useEffect } from "react";
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
  useGetLiftsPeriod,
  useGetSeasons,
  useGetLiftDates,
  getGetLiftsPeriodQueryKey,
  getLiftsPeriod,
} from "@workspace/api-client-react";
import type { PeriodResult } from "@workspace/api-client-react";
import { StatCard } from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/SkeletonLoader";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { useSeason, formatSeason } from "@/contexts/SeasonContext";
import { CalendarRangePicker } from "@/components/CalendarRangePicker";

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

function csvEscape(value: string | number): string {
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(data: PeriodResult): string {
  const header = ["rank", "lift_name", "ggnr", "total_passages", "total_guests", "total_first_passages", "active_days"].join(",");
  const rows = data.lifts.map((lift, index) =>
    [
      index + 1,
      csvEscape(lift.ggbz),
      lift.ggnr,
      lift.totalPassages,
      lift.totalGuests,
      lift.totalFirstPassages,
      lift.activeDays,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

async function exportCsv(data: PeriodResult, from: string, to: string): Promise<void> {
  const filename = `period-${from}_${to}.csv`;
  const csv = buildCsv(data);

  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const uri = (FileSystem.cacheDirectory ?? "") + filename;
    await FileSystem.writeAsStringAsync(uri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(uri, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });
  }
}

function buildComparisonHtml(
  data: PeriodResult,
  priorData: PeriodResult,
  currentSeason: string,
  priorSeason: string,
  fromDate: string,
  toDate: string,
  priorFrom: string,
  priorTo: string,
  language: string,
): string {
  const fmt = (n: number) => n.toLocaleString();
  const fmtDate = (d: string) => formatDate(d, language);
  const diff = (a: number, b: number) => {
    const v = a - b;
    return { val: v, text: (v >= 0 ? "+" : "") + v.toLocaleString(), positive: v >= 0 };
  };

  const passagesDiff = diff(data.totalPassages, priorData.totalPassages);
  const guestsDiff = diff(data.totalGuests, priorData.totalGuests);

  const posStyle = "color:#00A9E0;font-weight:600";
  const negStyle = "color:#E74C3C;font-weight:600";

  const liftRows = data.lifts.map((lift, i) => {
    const prior = priorData.lifts.find((l) => l.ggnr === lift.ggnr);
    const d = prior ? diff(lift.totalPassages, prior.totalPassages) : null;
    const rankBg = i < 3 ? "#00A9E0" : "#D2EEF8";
    const rankColor = i < 3 ? "#FFFFFF" : "#4E82A0";
    return `
      <tr style="border-bottom:1px solid #C8E6F5">
        <td style="padding:8px 10px;text-align:center">
          <span style="display:inline-block;width:24px;height:24px;line-height:24px;border-radius:50%;background:${rankBg};color:${rankColor};font-size:11px;font-weight:700;text-align:center">${i + 1}</span>
        </td>
        <td style="padding:8px 10px;font-size:13px;color:#0C2340;font-weight:600">${lift.ggbz}</td>
        <td style="padding:8px 10px;text-align:right;font-size:14px;color:#00A9E0;font-weight:700">${fmt(lift.totalPassages)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:13px;color:#4E82A0">${prior ? fmt(prior.totalPassages) : "—"}</td>
        <td style="padding:8px 10px;text-align:right;font-size:11px;${d ? (d.positive ? posStyle : negStyle) : ""}">${d ? d.text : "—"}</td>
        <td style="padding:8px 10px;text-align:right;font-size:11px;color:#4E82A0">${lift.activeDays}d</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Season Comparison Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F1F8FC; color: #0C2340; padding: 24px; }
  h1 { font-size: 22px; font-weight: 700; color: #0C2340; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #4E82A0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; }
  .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
  .card { background: #FFFFFF; border: 1px solid #C8E6F5; border-radius: 10px; padding: 14px; }
  .card-label { font-size: 11px; color: #4E82A0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .card-row { display: flex; align-items: baseline; gap: 10px; }
  .card-current { font-size: 20px; font-weight: 700; color: #0C2340; }
  .card-prior { font-size: 13px; color: #4E82A0; }
  .card-delta-pos { font-size: 12px; font-weight: 600; color: #00A9E0; margin-top: 2px; }
  .card-delta-neg { font-size: 12px; font-weight: 600; color: #E74C3C; margin-top: 2px; }
  .seasons-header { display: flex; gap: 16px; margin-bottom: 14px; }
  .season-badge { display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #C8E6F5; border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600; }
  .dot-current { width: 8px; height: 8px; border-radius: 50%; background: #00A9E0; display: inline-block; }
  .dot-prior { width: 8px; height: 8px; border-radius: 50%; background: #4E82A0; display: inline-block; }
  h2 { font-size: 16px; font-weight: 600; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; background: #FFFFFF; border: 1px solid #C8E6F5; border-radius: 10px; overflow: hidden; }
  th { padding: 8px 10px; font-size: 10px; font-weight: 600; color: #4E82A0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #C8E6F5; text-align: right; }
  th:nth-child(1) { text-align: center; width: 36px; }
  th:nth-child(2) { text-align: left; }
  .footer { margin-top: 20px; font-size: 10px; color: #4E82A0; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="subtitle">Season Comparison Report</div>
  <h1>${fmtDate(fromDate)} — ${fmtDate(toDate)}</h1>
  <div class="subtitle" style="margin-top:4px">${language === "it" ? "Generato il" : "Generated on"} ${new Date().toLocaleDateString(language === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>

  <div class="seasons-header" style="margin-top:16px">
    <div class="season-badge"><span class="dot-current"></span>${currentSeason} · ${fmtDate(fromDate)} – ${fmtDate(toDate)}</div>
    <div class="season-badge"><span class="dot-prior"></span>${priorSeason} · ${fmtDate(priorFrom)} – ${fmtDate(priorTo)}</div>
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-label">${language === "it" ? "Passaggi totali" : "Total passages"}</div>
      <div class="card-row">
        <div class="card-current">${fmt(data.totalPassages)}</div>
        <div class="card-prior">${fmt(priorData.totalPassages)} ${priorSeason}</div>
      </div>
      <div class="${passagesDiff.positive ? "card-delta-pos" : "card-delta-neg"}">${passagesDiff.text} ${language === "it" ? "vs stagione prec." : "vs prior season"}</div>
    </div>
    <div class="card">
      <div class="card-label">${language === "it" ? "Ospiti totali" : "Total guests"}</div>
      <div class="card-row">
        <div class="card-current">${fmt(data.totalGuests)}</div>
        <div class="card-prior">${fmt(priorData.totalGuests)} ${priorSeason}</div>
      </div>
      <div class="${guestsDiff.positive ? "card-delta-pos" : "card-delta-neg"}">${guestsDiff.text} ${language === "it" ? "vs stagione prec." : "vs prior season"}</div>
    </div>
    <div class="card">
      <div class="card-label">${language === "it" ? "Giorni attivi" : "Active days"}</div>
      <div class="card-row">
        <div class="card-current">${data.activeDays}</div>
        <div class="card-prior">${priorData.activeDays} ${priorSeason}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-label">${language === "it" ? "Giorno più affollato" : "Busiest day"}</div>
      <div class="card-current" style="font-size:14px">${data.busiestDay ? fmtDate(data.busiestDay) : "—"}</div>
      ${priorData.busiestDay ? `<div class="card-prior" style="margin-top:4px">${priorSeason}: ${fmtDate(priorData.busiestDay)}</div>` : ""}
    </div>
  </div>

  <h2>${language === "it" ? "Impianti per passaggi" : "Lifts by passages"}</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th style="text-align:left">${language === "it" ? "Impianto" : "Lift"}</th>
        <th>${currentSeason}</th>
        <th>${priorSeason}</th>
        <th>${language === "it" ? "Δ" : "Δ"}</th>
        <th>${language === "it" ? "Giorni" : "Days"}</th>
      </tr>
    </thead>
    <tbody>${liftRows}</tbody>
  </table>

  <div class="footer">Ski Area Dashboard · ${currentSeason} vs ${priorSeason}</div>
</body>
</html>`;
}

async function shareComparison(
  data: PeriodResult,
  priorData: PeriodResult,
  currentSeason: string,
  priorSeason: string,
  fromDate: string,
  toDate: string,
  priorFrom: string,
  priorTo: string,
  language: string,
): Promise<void> {
  const html = buildComparisonHtml(data, priorData, currentSeason, priorSeason, fromDate, toDate, priorFrom, priorTo, language);

  if (Platform.OS === "web") {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  } else {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    });
  }
}

function formatDelta(current: number, prior: number): { text: string; positive: boolean } {
  const diff = current - prior;
  const sign = diff >= 0 ? "+" : "";
  return { text: `${sign}${diff.toLocaleString()}`, positive: diff >= 0 };
}

/**
 * Shift a YYYY-MM-DD date string by `years` years.
 * Used to map the current-season date range onto the prior season's
 * equivalent calendar period (e.g. 2025-01-10 → 2024-01-10).
 */
function shiftDateByYears(dateStr: string, years: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/**
 * Extract the start year from a season string like "2024-2025" → 2024.
 */
function seasonStartYear(season: string): number {
  return parseInt(season.split("-")[0], 10);
}

export default function PeriodScreen() {
  const colors = useColors();
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const defaultFrom = offsetDays(-7);
  const defaultTo = todayIso();

  const [fromInput, setFromInput] = useState(defaultFrom);
  const [toInput, setToInput] = useState(defaultTo);
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState(defaultTo);
  const { seasons, selectedSeason, setSelectedSeason } = useSeason();
  const [compareEnabled, setCompareEnabled] = useState(false);

  useEffect(() => {
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    Promise.all([
      AsyncStorage.getItem("compare_enabled"),
      AsyncStorage.getItem("period_from"),
      AsyncStorage.getItem("period_to"),
    ]).then(([compare, storedFrom, storedTo]) => {
      if (compare === "true") setCompareEnabled(true);
      if (
        storedFrom &&
        storedTo &&
        isoPattern.test(storedFrom) &&
        isoPattern.test(storedTo) &&
        storedFrom <= storedTo
      ) {
        setFromInput(storedFrom);
        setToInput(storedTo);
        setAppliedFrom(storedFrom);
        setAppliedTo(storedTo);
      }
    });
  }, []);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"from" | "to">("from");

  const { data: availableDates } = useGetLiftDates(
    selectedSeason ? { season: selectedSeason } : {}
  );

  const currentSeasonStr = selectedSeason ?? seasons?.[0];
  const currentSeasonIndex = seasons && currentSeasonStr ? seasons.indexOf(currentSeasonStr) : -1;
  const priorSeason =
    seasons && currentSeasonIndex >= 0 && currentSeasonIndex + 1 < seasons.length
      ? seasons[currentSeasonIndex + 1]
      : undefined;

  // Year offset between current and prior season (e.g. 2024-2025 vs 2023-2024 → 1)
  const yearOffset =
    currentSeasonStr && priorSeason
      ? seasonStartYear(currentSeasonStr) - seasonStartYear(priorSeason)
      : 1;

  // Dates shifted back by yearOffset to align the same calendar period in the prior season
  const priorFrom = shiftDateByYears(appliedFrom, -yearOffset);
  const priorTo = shiftDateByYears(appliedTo, -yearOffset);

  const queryParams = {
    from: appliedFrom,
    to: appliedTo,
    ...(selectedSeason ? { season: selectedSeason } : {}),
  };

  const comparing = compareEnabled && !!priorSeason;

  const { data, isLoading } = useGetLiftsPeriod(queryParams);

  // Second parallel query for the prior season — uses skipToken when compare is off
  // so no network request is made. Dates are shifted to the equivalent period in the
  // prior season (e.g. "Jan 10–17, 2025" → "Jan 10–17, 2024").
  const priorParams = { from: priorFrom, to: priorTo, season: priorSeason ?? "" };
  const { data: priorData, isLoading: priorLoading } = useQuery({
    queryKey: getGetLiftsPeriodQueryKey(priorParams),
    queryFn: comparing ? () => getLiftsPeriod(priorParams) : skipToken,
  });

  const anyLoading = isLoading || (comparing && priorLoading);

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
      AsyncStorage.setItem("period_from", fromInput);
      AsyncStorage.setItem("period_to", toInput);
    }
  }

  function handleCalendarSelect(date: string) {
    if (calendarMode === "from") {
      setFromInput(date);
      // If the new from-date is after the current to-date, push to forward
      if (date > toInput) setToInput(date);
      // Auto-switch to "to" mode so the user can pick the end date next
      setCalendarMode("to");
    } else {
      setToInput(date);
      const newFrom = date < fromInput ? date : fromInput;
      const newTo = date < fromInput ? fromInput : date;
      setFromInput(newFrom);
      setToInput(newTo);
      setAppliedFrom(newFrom);
      setAppliedTo(newTo);
      AsyncStorage.setItem("period_from", newFrom);
      AsyncStorage.setItem("period_to", newTo);
      setCalendarVisible(false);
    }
  }

  const hasData = data && data.lifts.length > 0;

  return (
    <>
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
        <View style={styles.headerButtons}>
          {hasData && comparing && priorData && (
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() =>
                shareComparison(
                  data,
                  priorData,
                  currentSeasonStr ?? "",
                  priorSeason ?? "",
                  appliedFrom,
                  appliedTo,
                  priorFrom,
                  priorTo,
                  language,
                )
              }
              activeOpacity={0.7}
            >
              <Feather name="share-2" size={14} color={colors.primaryForeground} />
              <Text style={[styles.exportBtnText, { color: colors.primaryForeground }]}>{t.periodShareComparison}</Text>
            </TouchableOpacity>
          )}
          {hasData && (
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => exportCsv(data, appliedFrom, appliedTo)}
              activeOpacity={0.7}
            >
              <Feather name="download" size={14} color={colors.primary} />
              <Text style={[styles.exportBtnText, { color: colors.primary }]}>{t.periodExportCsv}</Text>
            </TouchableOpacity>
          )}
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
                  {formatSeason(s)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Compare seasons toggle — only when a prior season exists */}
      {priorSeason && (
        <TouchableOpacity
          style={[
            styles.compareToggle,
            {
              backgroundColor: compareEnabled ? colors.primary : colors.secondary,
              borderColor: compareEnabled ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setCompareEnabled((v) => {
            const next = !v;
            AsyncStorage.setItem("compare_enabled", next ? "true" : "false");
            return next;
          })}
          activeOpacity={0.7}
        >
          <Feather
            name="layers"
            size={14}
            color={compareEnabled ? colors.primaryForeground : colors.primary}
          />
          <Text
            style={[
              styles.compareToggleText,
              { color: compareEnabled ? colors.primaryForeground : colors.primary },
            ]}
          >
            {t.periodCompareSeasons}
          </Text>
          {compareEnabled && (
            <Text
              style={[
                styles.compareToggleSub,
                { color: colors.primaryForeground },
              ]}
            >
              {currentSeasonStr} {t.periodVs} {priorSeason}
            </Text>
          )}
        </TouchableOpacity>
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
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: calendarMode === "from" && calendarVisible ? colors.primary : colors.border }]}
              onPress={() => {
                setCalendarMode("from");
                setCalendarVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={13} color={colors.primary} />
              <Text style={[styles.dateButtonText, { color: colors.foreground }]}>
                {formatDate(fromInput, language)}
              </Text>
            </TouchableOpacity>
          </View>

          <Feather name="arrow-right" size={16} color={colors.mutedForeground} style={styles.arrow} />

          <View style={styles.rangeField}>
            <Text style={[styles.rangeLabel, { color: colors.mutedForeground }]}>{t.periodTo}</Text>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: calendarMode === "to" && calendarVisible ? colors.primary : colors.border }]}
              onPress={() => {
                setCalendarMode("to");
                setCalendarVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={13} color={colors.primary} />
              <Text style={[styles.dateButtonText, { color: colors.foreground }]}>
                {formatDate(toInput, language)}
              </Text>
            </TouchableOpacity>
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
                  AsyncStorage.setItem("period_from", pFrom);
                  AsyncStorage.setItem("period_to", pTo);
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

        {/* Prior-season aligned date range hint */}
        {comparing && (
          <View style={styles.compareHintRow}>
            <Feather name="info" size={11} color={colors.mutedForeground} />
            <Text style={[styles.compareHint, { color: colors.mutedForeground }]}>
              {priorSeason}: {formatDate(priorFrom, language)} — {formatDate(priorTo, language)}
            </Text>
          </View>
        )}
      </View>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        {anyLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label={t.periodTotalPassages}
              value={(data?.totalPassages ?? 0).toLocaleString()}
              sub={
                comparing && priorData
                  ? (() => {
                      const d = formatDelta(data?.totalPassages ?? 0, priorData.totalPassages);
                      return `${d.text} ${t.periodVs} ${priorSeason}`;
                    })()
                  : undefined
              }
              accent
            />
            <StatCard
              label={t.periodTotalGuests}
              value={(data?.totalGuests ?? 0).toLocaleString()}
              sub={
                comparing && priorData
                  ? (() => {
                      const d = formatDelta(data?.totalGuests ?? 0, priorData.totalGuests);
                      return `${d.text} ${t.periodVs} ${priorSeason}`;
                    })()
                  : undefined
              }
            />
          </>
        )}
      </View>

      <View style={styles.statsRow}>
        {anyLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label={t.periodActiveDays}
              value={`${data?.activeDays ?? 0} ${t.periodDays}`}
              sub={
                comparing && priorData
                  ? `${priorData.activeDays} ${t.periodDays} ${t.periodVs} ${priorSeason}`
                  : undefined
              }
            />
            <StatCard
              label={t.periodBusiestDay}
              value={data?.busiestDay ? formatDate(data.busiestDay, language) : "—"}
              sub={
                comparing && priorData?.busiestDay
                  ? `${priorSeason}: ${formatDate(priorData.busiestDay, language)}`
                  : undefined
              }
            />
          </>
        )}
      </View>

      {data?.busiestLift && !anyLoading && (
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

      {/* Column headers when comparing */}
      {comparing && hasData && !anyLoading && (
        <View style={[styles.compareHeader, { borderColor: colors.border }]}>
          <View style={{ flex: 1 }} />
          <View style={styles.compareHeaderCols}>
            <Text style={[styles.compareHeaderLabel, { color: colors.primary }]}>
              {currentSeasonStr}
            </Text>
            <Text style={[styles.compareHeaderLabel, { color: colors.mutedForeground }]}>
              {priorSeason}
            </Text>
          </View>
        </View>
      )}

      {anyLoading ? (
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
        data.lifts.map((lift, index) => {
          const prior = comparing
            ? priorData?.lifts.find((l) => l.ggnr === lift.ggnr)
            : undefined;
          const delta = prior ? formatDelta(lift.totalPassages, prior.totalPassages) : null;

          return (
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

              {comparing ? (
                <View style={styles.compareStats}>
                  {/* Current season */}
                  <View style={styles.compareCol}>
                    <Text style={[styles.liftPassages, { color: colors.primary }]}>
                      {lift.totalPassages.toLocaleString()}
                    </Text>
                    {delta && (
                      <Text
                        style={[
                          styles.deltaText,
                          { color: delta.positive ? colors.success : colors.destructive },
                        ]}
                      >
                        {delta.text}
                      </Text>
                    )}
                  </View>
                  {/* Prior season */}
                  <View style={styles.compareCol}>
                    <Text style={[styles.liftPassagesPrior, { color: colors.mutedForeground }]}>
                      {prior ? prior.totalPassages.toLocaleString() : "—"}
                    </Text>
                  </View>
                </View>
              ) : (
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
              )}
            </View>
          );
        })
      )}

      <View style={{ height: Platform.OS === "web" ? 34 : 100 }} />
    </ScrollView>

    <CalendarRangePicker
      visible={calendarVisible}
      mode={calendarMode}
      fromDate={fromInput}
      toDate={toInput}
      availableDates={availableDates ?? []}
      onSelect={handleCalendarSelect}
      onClose={() => setCalendarVisible(false)}
    />
    </>
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
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  exportBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
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
  compareToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  compareToggleText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  compareToggleSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginLeft: 2,
  },
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
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  dateButtonText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
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
  compareHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  compareHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
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
  compareHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  compareHeaderCols: {
    flexDirection: "row",
    gap: 16,
    minWidth: 130,
    justifyContent: "flex-end",
  },
  compareHeaderLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    minWidth: 55,
    textAlign: "right",
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
  compareStats: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  compareCol: {
    alignItems: "flex-end",
    gap: 2,
    minWidth: 55,
  },
  liftPassagesPrior: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  deltaText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
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
  emptySubText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
