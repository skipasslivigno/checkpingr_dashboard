import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
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
  const prevSeasonRef = useRef(season);

  const { data: dates } = useGetLiftDates(season ? { season } : {});

  const { data: extractions } = useGetLiftExtractions(
    selectedDate ? (season ? { date: selectedDate, season } : { date: selectedDate }) : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!selectedDate } as any }
  );

  useEffect(() => {
    if (!dates || dates.length === 0) return;
    const seasonChanged = prevSeasonRef.current !== season;
    prevSeasonRef.current = season;
    if (seasonChanged || !dates.includes(selectedDate)) {
      onDateChange(dates[0]);
      onExtractionChange(undefined);
    }
  }, [dates, season]);

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

  const locale = language === "it" ? "it-IT" : "en-GB";

  function dateLabel(dateStr: string): string {
    const today = todayIso();
    const yesterday = yesterdayIso();
    if (dateStr === today) return t.today;
    if (dateStr === yesterday) return t.yesterday;
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  }

  if (!dates || dates.length === 0) return null;

  // dates are DESC — index 0 is most recent, last index is oldest
  const currentIdx = dates.indexOf(selectedDate);
  const canGoNewer = currentIdx > 0;
  const canGoOlder = currentIdx < dates.length - 1;

  function goNewer() {
    if (canGoNewer) {
      onDateChange(dates![currentIdx - 1]);
      onExtractionChange(undefined);
    }
  }

  function goOlder() {
    if (canGoOlder) {
      onDateChange(dates![currentIdx + 1]);
      onExtractionChange(undefined);
    }
  }

  return (
    <View style={[styles.wrapper, { borderColor: colors.border }]}>
      {/* Date navigator */}
      <View style={[styles.dateRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={goOlder}
          disabled={!canGoOlder}
          style={[styles.arrowBtn, !canGoOlder && styles.arrowDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={20} color={canGoOlder ? colors.primary : colors.border} />
        </TouchableOpacity>

        <View style={styles.dateLabelBlock}>
          <Feather name="calendar" size={13} color={colors.primary} style={styles.calIcon} />
          <Text style={[styles.dateText, { color: colors.foreground }]}>
            {dateLabel(selectedDate)}
          </Text>
          <Text style={[styles.dateIso, { color: colors.mutedForeground }]}>
            {selectedDate}
          </Text>
        </View>

        <TouchableOpacity
          onPress={goNewer}
          disabled={!canGoNewer}
          style={[styles.arrowBtn, !canGoNewer && styles.arrowDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-right" size={20} color={canGoNewer ? colors.primary : colors.border} />
        </TouchableOpacity>
      </View>

      {/* Extraction time slots */}
      {extractions && extractions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeRow}
        >
          {extractions.map((ex) => {
            const active = ex === selectedExtraction;
            const isLast = ex === extractions[extractions.length - 1];
            return (
              <TouchableOpacity
                key={ex}
                style={[
                  styles.timeSlot,
                  {
                    backgroundColor: active ? colors.primaryLight : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => onExtractionChange(ex)}
              >
                <Feather
                  name="clock"
                  size={10}
                  color={active ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.timeText, { color: active ? colors.primary : colors.mutedForeground }]}>
                  {dupdToTime(ex)}
                </Text>
                {isLast && (
                  <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                )}
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
    gap: 8,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  dateLabelBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  calIcon: {
    marginTop: 1,
  },
  dateText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  dateIso: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  timeRow: {
    flexDirection: "row",
    gap: 6,
  },
  timeSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  timeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
