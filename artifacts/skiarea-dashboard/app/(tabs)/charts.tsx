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
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import {
  getGetSeasonTrendQueryKey,
  getGetSeasonsQueryKey,
  useGetSeasonTrend,
  useGetSeasons,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";

const SEASON_COLORS = ["#4B9FE1", "#E67E22", "#2ECC71", "#E74C3C"];

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

interface DataPoint {
  dayIndex: number;
  totalPassages: number;
  cumulative: number;
}

interface SeasonLine {
  season: string;
  color: string;
  points: DataPoint[];
}

function buildSeasonLines(
  rawData: Array<{ season: string; data: Array<{ date: string; dayIndex: number; totalPassages: number; totalGuests: number }> }>,
  colorOffset = 0
): SeasonLine[] {
  return rawData.map((s, i) => {
    let cum = 0;
    const points = s.data.map((d) => {
      cum += d.totalPassages;
      return { dayIndex: d.dayIndex, totalPassages: d.totalPassages, cumulative: cum };
    });
    return { season: s.season, color: SEASON_COLORS[(i + colorOffset) % SEASON_COLORS.length]!, points };
  });
}

const PX_PER_DAY = 6;
const MIN_CHART_CONTENT_W = 260;

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

  const allPoints = lines.flatMap((l) => l.points);
  const maxX = allPoints.length > 0 ? Math.max(...allPoints.map((p) => p.dayIndex)) : 1;

  // Make chart at least as wide as the container; expand for long seasons
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

  return (
    <Svg width={width} height={height}>
      <G x={PAD.left} y={PAD.top}>
        {/* Grid lines */}
        {yTicks.map((v) => (
          <G key={v}>
            <Line
              x1={0}
              y1={toY(v)}
              x2={chartW}
              y2={toY(v)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <SvgText
              x={-6}
              y={toY(v) + 4}
              textAnchor="end"
              fontSize={9}
              fill={colors.mutedForeground}
              fontFamily="Inter_400Regular"
            >
              {formatBigNumber(v)}
            </SvgText>
          </G>
        ))}

        {/* X ticks */}
        {xTicks.filter((v) => v > 0).map((v) => (
          <G key={v}>
            <Line
              x1={toX(v)}
              y1={0}
              x2={toX(v)}
              y2={chartH}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="2,4"
            />
            <SvgText
              x={toX(v)}
              y={chartH + 14}
              textAnchor="middle"
              fontSize={9}
              fill={colors.mutedForeground}
              fontFamily="Inter_400Regular"
            >
              {v}
            </SvgText>
          </G>
        ))}

        {/* Chart border bottom */}
        <Line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke={colors.border} strokeWidth={1} />
        <Line x1={0} y1={0} x2={0} y2={chartH} stroke={colors.border} strokeWidth={1} />

        {/* Season lines */}
        {lines.map((line) => {
          if (line.points.length < 2) {
            const p = line.points[0];
            if (!p) return null;
            return (
              <Circle
                key={line.season}
                cx={toX(p.dayIndex)}
                cy={toY(p[valueKey])}
                r={3}
                fill={line.color}
              />
            );
          }
          const d = line.points
            .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.dayIndex).toFixed(1)},${toY(p[valueKey]).toFixed(1)}`)
            .join(" ");
          return (
            <Path
              key={line.season}
              d={d}
              stroke={line.color}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Axis labels */}
        <SvgText
          x={chartW / 2}
          y={chartH + 32}
          textAnchor="middle"
          fontSize={9}
          fill={colors.mutedForeground}
          fontFamily="Inter_500Medium"
        >
          {xLabel}
        </SvgText>
      </G>
    </Svg>
  );
}

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

  const seasonLines = useMemo(() => {
    if (!trendData) return [];
    return buildSeasonLines(trendData);
  }, [trendData]);

  const hasAnyData = seasonLines.some((l) => l.points.length > 0);

  const topPadding = Platform.OS === "web" ? 67 : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetSeasonTrendQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetSeasonsQueryKey() }),
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
            {t.chartsSubtitle}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.charts}</Text>
        </View>
      </View>

      {/* Season selector */}
      {allSeasons && allSeasons.length > 0 && (
        <View style={styles.selectorSection}>
          <Text style={[styles.selectorLabel, { color: colors.mutedForeground }]}>
            {t.chartsSeasonSelector}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.seasonRow}
          >
            {allSeasons.map((s, i) => {
              const current = resolvedSeasons;
              const active = current.includes(s);
              const color = SEASON_COLORS[allSeasons.indexOf(s) % SEASON_COLORS.length]!;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.seasonChip,
                    {
                      backgroundColor: active ? color + "22" : colors.secondary,
                      borderColor: active ? color : colors.border,
                    },
                  ]}
                  onPress={() => toggleSeason(s)}
                >
                  {active && (
                    <View style={[styles.colorDot, { backgroundColor: color }]} />
                  )}
                  <Text
                    style={[
                      styles.seasonText,
                      { color: active ? color : colors.mutedForeground },
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Legend */}
          {seasonLines.length > 0 && (
            <View style={styles.legendRow}>
              {seasonLines.map((line) => (
                <View key={line.season} style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: line.color }]} />
                  <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                    {line.season}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Daily passages chart */}
      <View
        style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.chartTitle, { color: colors.foreground }]}>
          {t.chartsDailyPassages}
        </Text>

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
            <ChartWithWidth
              lines={seasonLines}
              valueKey="totalPassages"
              height={CHART_HEIGHT}
              colors={colors}
              yLabel={t.chartsPassages}
              xLabel={t.chartsDay}
            />
          </View>
        )}
      </View>

      {/* Cumulative chart */}
      <View
        style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.chartTitle, { color: colors.foreground }]}>
          {t.chartsCumulative}
        </Text>

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
            <ChartWithWidth
              lines={seasonLines}
              valueKey="cumulative"
              height={CHART_HEIGHT}
              colors={colors}
              yLabel={t.chartsPassages}
              xLabel={t.chartsDay}
            />
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
              <View
                key={line.season}
                style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: line.color + "66" }]}
              >
                <View style={[styles.summaryDot, { backgroundColor: line.color }]} />
                <View style={styles.summaryContent}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                    {line.season}
                  </Text>
                  <View style={styles.summaryStats}>
                    <View style={styles.summaryStat}>
                      <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                        {total.toLocaleString()}
                      </Text>
                      <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>
                        {t.chartsPassages.toLowerCase()}
                      </Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                        {totalDays}
                      </Text>
                      <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>
                        {t.periodDays}
                      </Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                        {peak.toLocaleString()}
                      </Text>
                      <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>
                        {t.periodBusiestDay.toLowerCase()}
                      </Text>
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
    <View
      style={{ width: "100%" }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        scrollIndicatorInsets={{ right: 1 }}
        bounces={false}
      >
        <LineChart
          lines={lines}
          valueKey={valueKey}
          containerWidth={containerWidth}
          height={height}
          colors={colors}
          yLabel={yLabel}
          xLabel={xLabel}
        />
      </ScrollView>
    </View>
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
  selectorSection: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  selectorLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  seasonRow: {
    flexDirection: "row",
    gap: 6,
  },
  seasonChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    gap: 5,
  },
  colorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  seasonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLine: { width: 18, height: 3, borderRadius: 2 },
  legendText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
  },
  chartTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  chartWrapper: {
    width: "100%",
  },
  chartSkeleton: {
    borderRadius: 8,
  },
  emptyChart: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptySubText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  summarySection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  summaryContent: { flex: 1, gap: 6 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryStats: { flexDirection: "row", gap: 20 },
  summaryStat: { gap: 2 },
  summaryValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
