import React, { useEffect, useRef } from "react";
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useGetLiftDates, useGetLiftExtractions } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function dupdToTime(dupd: string): string {
  if (!dupd || dupd.length < 12) return dupd;
  return `${dupd.slice(8, 10)}:${dupd.slice(10, 12)}`;
}

interface DateExtractionPickerProps {
  selectedDate: string;
  selectedExtraction: string | undefined;
  season?: string;
  onDateChange: (date: string) => void;
  onExtractionChange: (extraction: string | undefined) => void;
}

export function DateExtractionPicker({
  selectedDate,
  selectedExtraction,
  season,
  onDateChange,
  onExtractionChange,
}: DateExtractionPickerProps) {
  const colors = useColors();
  const { t, language } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const prevSeasonRef = useRef(season);
  // Map date string → { x, width } measured by onLayout on each chip
  const chipLayoutRef = useRef<Record<string, { x: number; width: number }>>({});
  // Visible width of the ScrollView container
  const containerWidthRef = useRef<number>(0);

  const { data: dates } = useGetLiftDates(season ? { season } : {});

  const { data: extractions } = useGetLiftExtractions(
    selectedDate ? (season ? { date: selectedDate, season } : { date: selectedDate }) : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!selectedDate } as any }
  );

  // Auto-select the most recent date when dates load or the season changes.
  // API returns dates DESC so dates[0] is always the most recent.
  useEffect(() => {
    if (!dates || dates.length === 0) return;
    const seasonChanged = prevSeasonRef.current !== season;
    prevSeasonRef.current = season;
    if (seasonChanged || !dates.includes(selectedDate)) {
      onDateChange(dates[0]);
      onExtractionChange(undefined);
    }
  }, [dates, season]);

  // Auto-select last extraction when date changes
  useEffect(() => {
    if (!extractions) return;
    if (extractions.length === 0) {
      onExtractionChange(undefined);
      return;
    }
    const last = extractions[extractions.length - 1];
    if (selectedExtraction === undefined || !extractions.includes(selectedExtraction)) {
      onExtractionChange(last);
    }
  }, [extractions, selectedDate]);

  // Scroll the selected date chip into the center of the visible area.
  // Uses measured chip positions so the scroll offset is always exact,
  // regardless of variable chip widths or the row's horizontal padding.
  useEffect(() => {
    if (!selectedDate || !scrollRef.current) return;
    const layout = chipLayoutRef.current[selectedDate];
    if (!layout) return;
    const containerW = containerWidthRef.current;
    const targetX = layout.x - containerW / 2 + layout.width / 2;
    scrollRef.current.scrollTo({ x: Math.max(0, targetX), animated: true });
  }, [selectedDate, dates]);

  const locale = language === "it" ? "it-IT" : "en-GB";

  function dateChipLabel(dateStr: string): string {
    const today = todayIso();
    const yesterday = yesterdayIso();
    if (dateStr === today) return t.today;
    if (dateStr === yesterday) return t.yesterday;

    const d = new Date(dateStr + "T12:00:00Z");
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

    if (diffDays <= 6) {
      return d.toLocaleDateString(locale, { weekday: "short", day: "numeric" });
    }
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  }

  if (!dates || dates.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      {/* Date chips — most recent first (API returns DESC) */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        onLayout={(e: LayoutChangeEvent) => {
          containerWidthRef.current = e.nativeEvent.layout.width;
        }}
      >
        {dates.map((d) => {
          const active = d === selectedDate;
          return (
            <TouchableOpacity
              key={d}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onLayout={(e: LayoutChangeEvent) => {
                chipLayoutRef.current[d] = {
                  x: e.nativeEvent.layout.x,
                  width: e.nativeEvent.layout.width,
                };
              }}
              onPress={() => {
                onDateChange(d);
                onExtractionChange(undefined);
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {dateChipLabel(d)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Extraction time chips */}
      {extractions && extractions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {extractions.map((ex) => {
            const active = ex === selectedExtraction;
            const isLast = ex === extractions[extractions.length - 1];
            return (
              <TouchableOpacity
                key={ex}
                style={[
                  styles.chip,
                  styles.timeChip,
                  {
                    backgroundColor: active ? colors.accent : colors.card,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => onExtractionChange(ex)}
              >
                <Text
                  style={[
                    styles.chipText,
                    styles.timeText,
                    { color: active ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {dupdToTime(ex)}
                  {isLast ? " ★" : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 6,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  timeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
