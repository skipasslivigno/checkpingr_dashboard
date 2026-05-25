import React, { useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useGetLiftExtractions } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function offsetDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function dateChipLabel(dateStr: string): string {
  const today = todayIso();
  const yesterday = offsetDate(-1);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en", { weekday: "short", day: "numeric" });
}

export function dupdToTime(dupd: string): string {
  if (!dupd || dupd.length < 12) return dupd;
  return `${dupd.slice(8, 10)}:${dupd.slice(10, 12)}`;
}

function generateRecentDates(count: number): string[] {
  return Array.from({ length: count }, (_, i) => offsetDate(-(count - 1 - i)));
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
  const dates = generateRecentDates(14);

  const { data: extractions } = useGetLiftExtractions(
    season ? { date: selectedDate, season } : { date: selectedDate }
  );

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

  return (
    <View style={styles.wrapper}>
      {/* Date chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
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
