import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import {
  getGetSeasonTrendQueryKey,
  getGetSeasonsQueryKey,
  getGetWeekTrendQueryKey,
  useGetSeasonTrend,
  useGetSeasons,
  useGetWeekTrend,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";

const SEASON_COLORS = ["#4B9FE1", "#E67E22", "#2ECC71", "#E74C3C"];

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function formatDate(iso: string): string {
  const parts = iso.split("T")[0]?.split("-");
  if (!parts || parts.length < 3) return iso;
  const [, mm, dd] = parts;
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(mm ?? "1", 10) - 1] ?? mm;
  return `${parseInt(dd ?? "1", 10)} ${month}`;
}

interface DataPoint {
  dayIndex: number;
  totalPassages: number;
  cumulative: number;
  date: string;
}

interface SeasonLine {
  season: string;
  color: string;
  points: DataPoint[];
}

function buildSeasonLines(
  rawData: Array<{ season: string; data: Array<{ date: string; dayIndex: number; totalPassages: number; totalGuests: number; totalFirstPassages: number }> }>,
  colorOffset = 0
): SeasonLine[] {
  return rawData.map((s, i) => {
    let cum = 0;
    const points = s.data.map((d) => {
      cum += d.totalFirstPassages;
      return { dayIndex: d.dayIndex, totalPassages: d.totalFirstPassages, cumulative: cum, date: d.date };
    });
    return { season: s.season, color: SEASON_COLORS[(i + colorOffset) % SEASON_COLORS.length]!, points };
  });
}

const PX_PER_DAY = 6;
const MIN_CHART_CONTENT_W = 260;

const TOOLTIP_W = 130;
const TOOLTIP_H = 58;
const TOOLTIP_PADDING = 8;
const HIT_RADIUS = 14;

interface ActivePoint {
  svgX: number;
  svgY: number;
  season: string;
  seasonColor: string;
  date: string;
  value: number;
}

interface LineChartProps {
  lines: SeasonLine[];
  valueKey: "totalPassages" | "cumulative";
  containerWidth: number;
  height: number;
  colors: ReturnType<typeof useColors>;
  yLabel: string;
  xLabel: string;
}

function LineChart({ lines, valueKey, containerWidth, height, colors, yLabel, xLabel }: LineChartProps) {
  const PAD = { top: 16, right: 16, bottom: 40, left: 52 };
  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null);

  const allPoints = lines.flatMap((l) => l.points);
  const maxX = allPoints.length > 0 ? Math.max(...allPoints.map((p) => p.dayIndex)) : 1;

  const minContentW = Math.max(MIN_CHART_CONTENT_W, maxX * PX_PER_DAY);
  const width = Math.max(containerWidth, minContentW + PAD.left + PAD.right);

  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;

  if (allPoints.length === 0) return null;

  const maxY = Math.max(...allPoints.map((p) => p[valueKey]), 1);

  const toX = (d: number) => (d / maxX) * chartW;
  const toY = (v: number) => chartH - (v / maxY) * chartH;

  const Y_TICKS = 4;
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => Math.round((maxY / Y_TICKS) * i));

  const X_TICKS = Math.min(maxX, 6);
  const xTickStep = Math.max(1, Math.round(maxX / X_TICKS));
  const xTicks = Array.from({ length: X_TICKS + 1 }, (_, i) => Math.min(i * xTickStep, maxX));

  function computeTooltipPos(sx: number, sy: number) {
    let tx = sx + 10;
    if (tx + TOOLTIP_W > chartW) tx = sx - TOOLTIP_W - 10;
    tx = Math.max(0, Math.min(tx, chartW - TOOLTIP_W));

    let ty = sy - TOOLTIP_H - 10;
    if (ty < 0) ty = sy + 10;
    ty = Math.max(0, Math.min(ty, chartH - TOOLTIP_H));

    return { tx, ty };
  }

  function handlePointPress(line: SeasonLine, pt: DataPoint) {
    const sx = toX(pt.dayIndex);
    const sy = toY(pt[valueKey]);
    if (activePoint && activePoint.season === line.season && activePoint.svgX === sx && activePoint.svgY === sy) {
      setActivePoint(null);
    } else {
      setActivePoint({ svgX: sx, svgY: sy, season: line.season, seasonColor: line.color, date: pt.date, value: pt[valueKey] });
    }
  }

  const tooltipPos = activePoint ? computeTooltipPos(activePoint.svgX, activePoint.svgY) : null;

  return (
    <Svg width={width} height={height}>
      <G x={PAD.left} y={PAD.top}>
        {/* Grid lines + Y labels */}
        {yTicks.map((v) => (
          <G key={v}>
            <Line x1={0} y1={toY(v)} x2={chartW} y2={toY(v)} stroke={colors.border} strokeWidth={1} strokeDasharray="3,3" />
            <SvgText x={-6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill={colors.mutedForeground} fontFamily="Inter_400Regular">
              {formatBigNumber(v)}
            </SvgText>
          </G>
        ))}

        {/* X grid lines + labels */}
        {xTicks.filter((v) => v > 0).map((v) => (
          <G key={v}>
            <Line x1={toX(v)} y1={0} x2={toX(v)} y2={chartH} stroke={colors.border} strokeWidth={0.5} strokeDasharray="2,4" />
            <SvgText x={toX(v)} y={chartH + 14} textAnchor="middle" fontSize={9} fill={colors.mutedForeground} fontFamily="Inter_400Regular">
              {v}
            </SvgText>
          </G>
        ))}

        {/* Axes */}
        <Line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke={colors.border} strokeWidth={1} />
        <Line x1={0} y1={0} x2={0} y2={chartH} stroke={colors.border} strokeWidth={1} />

        {/* Lines */}
        {lines.map((line) => {
          if (line.points.length < 2) {
            const p = line.points[0];
            if (!p) return null;
            return <Circle key={line.season} cx={toX(p.dayIndex)} cy={toY(p[valueKey])} r={3} fill={line.color} />;
          }
          const d = line.points
            .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.dayIndex).toFixed(1)},${toY(p[valueKey]).toFixed(1)}`)
            .join(" ");
          return <Path key={line.season} d={d} stroke={line.color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
        })}

        {/* Active point highlight ring (rendered above lines) */}
        {activePoint && (
          <Circle
            cx={activePoint.svgX}
            cy={activePoint.svgY}
            r={7}
            fill={activePoint.seasonColor}
            stroke="white"
            strokeWidth={2}
            opacity={0.95}
          />
        )}

        {/* Transparent dismiss overlay — covers entire chart area, tapping dismisses tooltip */}
        {activePoint && (
          <Rect
            x={0}
            y={0}
            width={chartW}
            height={chartH}
            fill="transparent"
            onPress={() => setActivePoint(null)}
          />
        )}

        {/* Hit-area circles for every data point (on top of dismiss rect) */}
        {lines.map((line) =>
          line.points.map((pt) => (
            <Circle
              key={`${line.season}-${pt.dayIndex}`}
              cx={toX(pt.dayIndex)}
              cy={toY(pt[valueKey])}
              r={HIT_RADIUS}
              fill="transparent"
              onPress={() => handlePointPress(line, pt)}
            />
          ))
        )}

        {/* Tooltip card */}
        {activePoint && tooltipPos && (
          <G x={tooltipPos.tx} y={tooltipPos.ty}>
            {/* Shadow approximation */}
            <Rect
              x={2}
              y={2}
              width={TOOLTIP_W}
              height={TOOLTIP_H}
              rx={8}
              fill="rgba(0,0,0,0.18)"
            />
            {/* Card background */}
            <Rect
              x={0}
              y={0}
              width={TOOLTIP_W}
              height={TOOLTIP_H}
              rx={8}
              fill={colors.card}
              stroke={activePoint.seasonColor}
              strokeWidth={1.5}
            />
            {/* Season colour bar on the left */}
            <Rect
              x={0}
              y={0}
              width={4}
              height={TOOLTIP_H}
              rx={4}
              fill={activePoint.seasonColor}
            />
            {/* Season label */}
            <SvgText
              x={TOOLTIP_PADDING + 4}
              y={TOOLTIP_PADDING + 10}
              fontSize={9}
              fill={colors.mutedForeground}
              fontFamily="Inter_500Medium"
            >
              {activePoint.season}
            </SvgText>
            {/* Date */}
            <SvgText
              x={TOOLTIP_PADDING + 4}
              y={TOOLTIP_PADDING + 24}
              fontSize={11}
              fill={colors.foreground}
              fontFamily="Inter_600SemiBold"
            >
              {formatDate(activePoint.date)}
            </SvgText>
            {/* Value */}
            <SvgText
              x={TOOLTIP_PADDING + 4}
              y={TOOLTIP_PADDING + 42}
              fontSize={13}
              fill={activePoint.seasonColor}
              fontFamily="Inter_700Bold"
            >
              {activePoint.value.toLocaleString()}
            </SvgText>
          </G>
        )}

        {/* X axis label */}
        <SvgText x={chartW / 2} y={chartH + 32} textAnchor="middle" fontSize={9} fill={colors.mutedForeground} fontFamily="Inter_500Medium">
          {xLabel}
        </SvgText>
      </G>
    </Svg>
  );
}

// ─── Weekly Bar Chart ────────────────────────────────────────────────────────

interface WeekBar {
  season: string;
  color: string;
  weeks: Array<{ weekNumber: number; totalPassages: number }>;
}

const BAR_W = 14;
const BAR_GAP = 2;
const GROUP_PAD = 12;

interface WeekBarChartProps {
  bars: WeekBar[];
  containerWidth: number;
  height: number;
  colors: ReturnType<typeof useColors>;
  weekLabel: string;
}

interface ActiveBar {
  svgX: number;
  svgY: number;
  season: string;
  seasonColor: string;
  weekNumber: number;
  value: number;
}

function WeekBarChart({ bars, containerWidth, height, colors, weekLabel }: WeekBarChartProps) {
  const PAD = { top: 16, right: 16, bottom: 44, left: 52 };
  const [activeBar, setActiveBar] = useState<ActiveBar | null>(null);

  const numSeasons = bars.length;
  const groupW = numSeasons * BAR_W + Math.max(0, numSeasons - 1) * BAR_GAP;
  const unitW = groupW + GROUP_PAD;

  const maxWeek = bars.reduce((m, b) => Math.max(m, ...b.weeks.map((w) => w.weekNumber)), 0);
  if (maxWeek === 0) return null;

  const contentW = maxWeek * unitW + GROUP_PAD;
  const width = Math.max(containerWidth, contentW + PAD.left + PAD.right);
  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;

  const allValues = bars.flatMap((b) => b.weeks.map((w) => w.totalPassages));
  const maxY = Math.max(...allValues, 1);

  const toY = (v: number) => chartH - (v / maxY) * chartH;

  const Y_TICKS = 4;
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => Math.round((maxY / Y_TICKS) * i));

  const groupXs = Array.from({ length: maxWeek }, (_, i) => (i + 0.5) * unitW);

  function computeBarTooltipPos(sx: number, sy: number) {
    let tx = sx + 10;
    if (tx + TOOLTIP_W > chartW) tx = sx - TOOLTIP_W - 10;
    tx = Math.max(0, Math.min(tx, chartW - TOOLTIP_W));

    let ty = sy - TOOLTIP_H - 10;
    if (ty < 0) ty = sy + 10;
    ty = Math.max(0, Math.min(ty, chartH - TOOLTIP_H));

    return { tx, ty };
  }

  function handleBarPress(b: WeekBar, weekNum: number, val: number, cx: number, barH: number) {
    const sx = cx;
    const sy = chartH - barH;
    if (activeBar && activeBar.season === b.season && activeBar.weekNumber === weekNum) {
      setActiveBar(null);
    } else {
      setActiveBar({ svgX: sx, svgY: sy, season: b.season, seasonColor: b.color, weekNumber: weekNum, value: val });
    }
  }

  const tooltipPos = activeBar ? computeBarTooltipPos(activeBar.svgX, activeBar.svgY) : null;

  return (
    <Svg width={width} height={height}>
      <G x={PAD.left} y={PAD.top}>
        {/* Y grid + labels */}
        {yTicks.map((v) => (
          <G key={v}>
            <Line x1={0} y1={toY(v)} x2={chartW} y2={toY(v)} stroke={colors.border} strokeWidth={1} strokeDasharray="3,3" />
            <SvgText x={-6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill={colors.mutedForeground} fontFamily="Inter_400Regular">
              {formatBigNumber(v)}
            </SvgText>
          </G>
        ))}

        {/* Axes */}
        <Line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke={colors.border} strokeWidth={1} />
        <Line x1={0} y1={0} x2={0} y2={chartH} stroke={colors.border} strokeWidth={1} />

        {/* Bars + X labels */}
        {groupXs.map((cx, wi) => {
          const weekNum = wi + 1;
          const barStartX = cx - groupW / 2;

          return (
            <G key={weekNum}>
              {/* X label — show every 4th week to avoid clutter, always show W1 */}
              {(weekNum === 1 || weekNum % 4 === 0) && (
                <SvgText
                  x={cx}
                  y={chartH + 14}
                  textAnchor="middle"
                  fontSize={8}
                  fill={colors.mutedForeground}
                  fontFamily="Inter_400Regular"
                >
                  {`${weekLabel.slice(0, 1)}${weekNum}`}
                </SvgText>
              )}

              {/* Vertical separator every 4 weeks */}
              {weekNum % 4 === 0 && (
                <Line x1={cx + unitW / 2} y1={0} x2={cx + unitW / 2} y2={chartH} stroke={colors.border} strokeWidth={0.5} strokeDasharray="2,4" />
              )}

              {bars.map((b, si) => {
                const wk = b.weeks.find((w) => w.weekNumber === weekNum);
                const val = wk?.totalPassages ?? 0;
                if (val === 0) return null;
                const barH = Math.max(2, (val / maxY) * chartH);
                const bx = barStartX + si * (BAR_W + BAR_GAP);
                const isActive = activeBar?.season === b.season && activeBar?.weekNumber === weekNum;
                return (
                  <Rect
                    key={b.season}
                    x={bx}
                    y={chartH - barH}
                    width={BAR_W}
                    height={barH}
                    fill={b.color}
                    rx={2}
                    opacity={isActive ? 1 : 0.85}
                    onPress={() => handleBarPress(b, weekNum, val, bx + BAR_W / 2, barH)}
                  />
                );
              })}
            </G>
          );
        })}

        {/* Dismiss overlay — covers entire chart, tapping outside dismisses tooltip */}
        {activeBar && (
          <Rect
            x={0}
            y={0}
            width={chartW}
            height={chartH}
            fill="transparent"
            onPress={() => setActiveBar(null)}
          />
        )}

        {/* Hit-area rects for each bar (on top of dismiss overlay) */}
        {activeBar && groupXs.map((cx, wi) => {
          const weekNum = wi + 1;
          const barStartX = cx - groupW / 2;
          return bars.map((b, si) => {
            const wk = b.weeks.find((w) => w.weekNumber === weekNum);
            const val = wk?.totalPassages ?? 0;
            if (val === 0) return null;
            const barH = Math.max(2, (val / maxY) * chartH);
            const bx = barStartX + si * (BAR_W + BAR_GAP);
            return (
              <Rect
                key={`hit-${b.season}-${weekNum}`}
                x={bx - 4}
                y={chartH - barH - 4}
                width={BAR_W + 8}
                height={barH + 4}
                fill="transparent"
                onPress={() => handleBarPress(b, weekNum, val, bx + BAR_W / 2, barH)}
              />
            );
          });
        })}

        {/* Tooltip card */}
        {activeBar && tooltipPos && (
          <G x={tooltipPos.tx} y={tooltipPos.ty}>
            {/* Shadow approximation */}
            <Rect x={2} y={2} width={TOOLTIP_W} height={TOOLTIP_H} rx={8} fill="rgba(0,0,0,0.18)" />
            {/* Card background */}
            <Rect
              x={0}
              y={0}
              width={TOOLTIP_W}
              height={TOOLTIP_H}
              rx={8}
              fill={colors.card}
              stroke={activeBar.seasonColor}
              strokeWidth={1.5}
            />
            {/* Season colour bar on the left */}
            <Rect x={0} y={0} width={4} height={TOOLTIP_H} rx={4} fill={activeBar.seasonColor} />
            {/* Season label */}
            <SvgText
              x={TOOLTIP_PADDING + 4}
              y={TOOLTIP_PADDING + 10}
              fontSize={9}
              fill={colors.mutedForeground}
              fontFamily="Inter_500Medium"
            >
              {activeBar.season}
            </SvgText>
            {/* Week number */}
            <SvgText
              x={TOOLTIP_PADDING + 4}
              y={TOOLTIP_PADDING + 24}
              fontSize={11}
              fill={colors.foreground}
              fontFamily="Inter_600SemiBold"
            >
              {`${weekLabel.slice(0, 1)}${activeBar.weekNumber}`}
            </SvgText>
            {/* Passage count */}
            <SvgText
              x={TOOLTIP_PADDING + 4}
              y={TOOLTIP_PADDING + 42}
              fontSize={13}
              fill={activeBar.seasonColor}
              fontFamily="Inter_700Bold"
            >
              {activeBar.value.toLocaleString()}
            </SvgText>
          </G>
        )}

        {/* X axis label */}
        <SvgText x={chartW / 2} y={chartH + 36} textAnchor="middle" fontSize={9} fill={colors.mutedForeground} fontFamily="Inter_500Medium">
          {weekLabel}
        </SvgText>
      </G>
    </Svg>
  );
}

// ─── Chart with auto-measured width ─────────────────────────────────────────

function ChartWithWidth({
  lines,
  valueKey,
  height,
  colors,
  yLabel,
  xLabel,
}: Omit<LineChartProps, "containerWidth">) {
  const [containerWidth, setContainerWidth] = useState(320);
  return (
    <View style={{ width: "100%" }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <ScrollView horizontal showsHorizontalScrollIndicator scrollIndicatorInsets={{ right: 1 }} bounces={false}>
        <LineChart lines={lines} valueKey={valueKey} containerWidth={containerWidth} height={height} colors={colors} yLabel={yLabel} xLabel={xLabel} />
      </ScrollView>
    </View>
  );
}

function WeekBarChartWithWidth({
  bars,
  height,
  colors,
  weekLabel,
}: Omit<WeekBarChartProps, "containerWidth">) {
  const [containerWidth, setContainerWidth] = useState(320);
  return (
    <View style={{ width: "100%" }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <ScrollView horizontal showsHorizontalScrollIndicator scrollIndicatorInsets={{ right: 1 }} bounces={false}>
        <WeekBarChart bars={bars} containerWidth={containerWidth} height={height} colors={colors} weekLabel={weekLabel} />
      </ScrollView>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ChartsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: allSeasons } = useGetSeasons();

  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);

  const resolvedSeasons = useMemo(() => {
    if (selectedSeasons.length > 0) return selectedSeasons;
    if (allSeasons && allSeasons.length > 0) return allSeasons.slice(0, 2);
    return [];
  }, [selectedSeasons, allSeasons]);

  const seasonsParam = resolvedSeasons.join(",") || undefined;

  const { data: trendData, isLoading } = useGetSeasonTrend(
    seasonsParam ? { seasons: seasonsParam } : {}
  );

  const { data: weekData, isLoading: weekLoading } = useGetWeekTrend(
    seasonsParam ? { seasons: seasonsParam } : {}
  );

  const seasonLines = useMemo(() => {
    if (!trendData) return [];
    return buildSeasonLines(trendData);
  }, [trendData]);

  const weekBars = useMemo((): WeekBar[] => {
    if (!weekData) return [];
    return weekData.map((s, i) => ({
      season: s.season,
      color: SEASON_COLORS[i % SEASON_COLORS.length]!,
      weeks: s.weeks.map((w) => ({ weekNumber: w.weekNumber, totalPassages: w.totalFirstPassages })),
    }));
  }, [weekData]);

  const hasAnyData = seasonLines.some((l) => l.points.length > 0);
  const hasWeekData = weekBars.some((b) => b.weeks.length > 0);

  const topPadding = Platform.OS === "web" ? 67 : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetSeasonTrendQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetSeasonsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetWeekTrendQueryKey() }),
    ]);
    setRefreshing(false);
  };

  function toggleSeason(s: string) {
    setSelectedSeasons((prev) => {
      const current = prev.length > 0 ? prev : (allSeasons?.slice(0, 2) ?? []);
      if (current.includes(s)) {
        const next = current.filter((x) => x !== s);
        return next.length === 0 ? [] : next;
      }
      if (current.length >= 3) return current;
      return [...current, s];
    });
  }

  const CHART_HEIGHT = 220;
  const WEEK_CHART_HEIGHT = 200;

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
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.chartsSubtitle}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.charts}</Text>
        </View>
      </View>

      {/* Season selector */}
      {allSeasons && allSeasons.length > 0 && (
        <View style={styles.selectorSection}>
          <Text style={[styles.selectorLabel, { color: colors.mutedForeground }]}>{t.chartsSeasonSelector}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonRow}>
            {allSeasons.map((s) => {
              const current = resolvedSeasons;
              const active = current.includes(s);
              const color = SEASON_COLORS[allSeasons.indexOf(s) % SEASON_COLORS.length]!;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.seasonChip, { backgroundColor: active ? color + "22" : colors.secondary, borderColor: active ? color : colors.border }]}
                  onPress={() => toggleSeason(s)}
                >
                  {active && <View style={[styles.colorDot, { backgroundColor: color }]} />}
                  <Text style={[styles.seasonText, { color: active ? color : colors.mutedForeground }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {seasonLines.length > 0 && (
            <View style={styles.legendRow}>
              {seasonLines.map((line) => (
                <View key={line.season} style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: line.color }]} />
                  <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{line.season}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Weekly passages bar chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.foreground }]}>{t.chartsWeekly}</Text>
        <Text style={[styles.chartSubtitle, { color: colors.mutedForeground }]}>{t.chartsWeeklySubtitle}</Text>

        {weekLoading ? (
          <View style={[styles.chartSkeleton, { height: WEEK_CHART_HEIGHT, backgroundColor: colors.secondary }]} />
        ) : !hasWeekData ? (
          <View style={[styles.emptyChart, { height: WEEK_CHART_HEIGHT }]}>
            <Feather name="bar-chart" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.chartsNoData}</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>{t.chartsNoDataSub}</Text>
          </View>
        ) : (
          <View style={styles.chartWrapper}>
            <WeekBarChartWithWidth
              bars={weekBars}
              height={WEEK_CHART_HEIGHT}
              colors={colors}
              weekLabel={t.chartsWeek}
            />
          </View>
        )}
      </View>

      {/* Daily passages line chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.foreground }]}>{t.chartsDailyPassages}</Text>
        <Text style={[styles.chartHint, { color: colors.mutedForeground }]}>{t.chartsTapHint}</Text>

        {isLoading ? (
          <View style={[styles.chartSkeleton, { height: CHART_HEIGHT, backgroundColor: colors.secondary }]} />
        ) : !hasAnyData ? (
          <View style={[styles.emptyChart, { height: CHART_HEIGHT }]}>
            <Feather name="bar-chart-2" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.chartsNoData}</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>{t.chartsNoDataSub}</Text>
          </View>
        ) : (
          <View style={styles.chartWrapper}>
            <ChartWithWidth lines={seasonLines} valueKey="totalPassages" height={CHART_HEIGHT} colors={colors} yLabel={t.chartsFirstEntries} xLabel={t.chartsDay} />
          </View>
        )}
      </View>

      {/* Cumulative line chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.foreground }]}>{t.chartsCumulative}</Text>
        <Text style={[styles.chartHint, { color: colors.mutedForeground }]}>{t.chartsTapHint}</Text>

        {isLoading ? (
          <View style={[styles.chartSkeleton, { height: CHART_HEIGHT, backgroundColor: colors.secondary }]} />
        ) : !hasAnyData ? (
          <View style={[styles.emptyChart, { height: CHART_HEIGHT }]}>
            <Feather name="trending-up" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.chartsNoData}</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>{t.chartsNoDataSub}</Text>
          </View>
        ) : (
          <View style={styles.chartWrapper}>
            <ChartWithWidth lines={seasonLines} valueKey="cumulative" height={CHART_HEIGHT} colors={colors} yLabel={t.chartsFirstEntries} xLabel={t.chartsDay} />
          </View>
        )}
      </View>

      {/* Season summary stats */}
      {hasAnyData && !isLoading && (
        <View style={styles.summarySection}>
          {seasonLines.map((line) => {
            const last = line.points[line.points.length - 1];
            const totalDays = line.points.length;
            const total = last?.cumulative ?? 0;
            const peak = Math.max(...line.points.map((p) => p.totalPassages));
            return (
              <View key={line.season} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: line.color + "66" }]}>
                <View style={[styles.summaryDot, { backgroundColor: line.color }]} />
                <View style={styles.summaryContent}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{line.season}</Text>
                  <View style={styles.summaryStats}>
                    <View style={styles.summaryStat}>
                      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{total.toLocaleString()}</Text>
                      <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>{t.chartsFirstEntries.toLowerCase()}</Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totalDays}</Text>
                      <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>{t.periodDays}</Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{peak.toLocaleString()}</Text>
                      <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>{t.periodBusiestDay.toLowerCase()}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
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
  subtitle: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  selectorSection: { marginBottom: 16, paddingHorizontal: 16 },
  selectorLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  seasonRow: { flexDirection: "row", gap: 6 },
  seasonChip: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, gap: 5 },
  colorDot: { width: 7, height: 7, borderRadius: 4 },
  seasonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLine: { width: 18, height: 3, borderRadius: 2 },
  legendText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  chartCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, borderWidth: 1, padding: 14, overflow: "hidden" },
  chartTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  chartSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 12 },
  chartHint: { fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 10 },
  chartWrapper: { width: "100%" },
  chartSkeleton: { borderRadius: 8 },
  emptyChart: { alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptySubText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  summarySection: { paddingHorizontal: 16, gap: 10 },
  summaryCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, borderWidth: 1.5, padding: 14, gap: 10 },
  summaryDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  summaryContent: { flex: 1, gap: 6 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryStats: { flexDirection: "row", gap: 20 },
  summaryStat: { gap: 2 },
  summaryValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
