import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  const [showDropdown, setShowDropdown] = useState(false);

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
    if (extractions.length === 0) { onExtractionChange(undefined); return; }
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

  const currentIdx = dates.indexOf(selectedDate);
  const canGoNewer = currentIdx > 0;
  const canGoOlder = currentIdx < dates.length - 1;

  function goNewer() {
    if (canGoNewer) { onDateChange(dates![currentIdx - 1]); onExtractionChange(undefined); }
  }
  function goOlder() {
    if (canGoOlder) { onDateChange(dates![currentIdx + 1]); onExtractionChange(undefined); }
  }

  const hasExtractions = extractions && extractions.length > 0;
  const selectedTime = selectedExtraction ? dupdToTime(selectedExtraction) : "—";
  const isLatest = selectedExtraction === extractions?.[extractions.length - 1];

  const dropdown = (
    <ScrollView style={[styles.dropdownPanel, { backgroundColor: colors.card, borderColor: colors.border }]}
      showsVerticalScrollIndicator={false}>
      {extractions?.map((ex) => {
        const active = ex === selectedExtraction;
        const isLast = ex === extractions[extractions.length - 1];
        return (
          <TouchableOpacity
            key={ex}
            style={[styles.dropdownItem, active && { backgroundColor: colors.primaryLight }]}
            onPress={() => { onExtractionChange(ex); setShowDropdown(false); }}
          >
            <Feather name="clock" size={12} color={active ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.dropdownItemText, { color: active ? colors.primary : colors.foreground }]}>
              {dupdToTime(ex)}
            </Text>
            {isLast && (
              <View style={[styles.liveChip, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
                <Text style={[styles.liveChipText, { color: colors.primary }]}>live</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.wrapper}>
      {/* Single row: date navigator + time combo */}
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Left arrow */}
        <TouchableOpacity
          onPress={goOlder}
          disabled={!canGoOlder}
          style={[styles.arrowBtn, !canGoOlder && styles.arrowDisabled]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
        >
          <Feather name="chevron-left" size={20} color={canGoOlder ? colors.primary : colors.border} />
        </TouchableOpacity>

        {/* Date label */}
        <View style={styles.dateLabelBlock}>
          <Feather name="calendar" size={13} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.foreground }]}>
            {dateLabel(selectedDate)}
          </Text>
        </View>

        {/* Right arrow */}
        <TouchableOpacity
          onPress={goNewer}
          disabled={!canGoNewer}
          style={[styles.arrowBtn, !canGoNewer && styles.arrowDisabled]}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        >
          <Feather name="chevron-right" size={20} color={canGoNewer ? colors.primary : colors.border} />
        </TouchableOpacity>

        {/* Divider */}
        {hasExtractions && (
          <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
        )}

        {/* Time combo button */}
        {hasExtractions && (
          <TouchableOpacity
            style={styles.timeCombo}
            onPress={() => setShowDropdown((v) => !v)}
            activeOpacity={0.7}
          >
            <Feather name="clock" size={13} color={colors.primary} />
            <Text style={[styles.timeText, { color: colors.foreground }]}>
              {selectedTime}
            </Text>
            {isLatest && (
              <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
            )}
            <Feather name={showDropdown ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown — inline on web, modal on native */}
      {showDropdown && hasExtractions && (
        Platform.OS === "web" ? (
          <View>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowDropdown(false)} />
            {dropdown}
          </View>
        ) : (
          <Modal transparent animationType="fade" onRequestClose={() => setShowDropdown(false)}>
            <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={[styles.modalPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {dropdown}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  arrowBtn: {
    padding: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: { opacity: 0.3 },
  dateLabelBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  verticalDivider: {
    width: 1,
    height: 22,
    marginHorizontal: 8,
  },
  timeCombo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingRight: 4,
  },
  timeText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    minWidth: 38,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dropdownPanel: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  liveChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveChipText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalPanel: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 320,
    overflow: "hidden",
  },
});
