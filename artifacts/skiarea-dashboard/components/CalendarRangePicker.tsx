import { Feather } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";

type PickerMode = "from" | "to";

interface CalendarRangePickerProps {
  visible: boolean;
  mode: PickerMode;
  fromDate: string;
  toDate: string;
  availableDates: string[];
  onSelect: (date: string) => void;
  onClose: () => void;
}

const WEEKDAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAYS_IT = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"];

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function isoToYearMonth(iso: string): { year: number; month: number } {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m };
}

function buildMonthGrid(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Monday = 0 for our grid (ISO week)
  let startDow = firstDay.getUTCDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const cells: (string | null)[] = [
    ...Array<null>(startDow).fill(null),
  ];
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${year}-${mm}-${dd}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function CalendarRangePicker({
  visible,
  mode,
  fromDate,
  toDate,
  availableDates,
  onSelect,
  onClose,
}: CalendarRangePickerProps) {
  const colors = useColors();
  const { t, language } = useTranslation();

  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  const anchorDate = mode === "from" ? fromDate : toDate;
  const initial = isoToYearMonth(anchorDate);
  const [displayYear, setDisplayYear] = useState(initial.year);
  const [displayMonth, setDisplayMonth] = useState(initial.month);

  React.useEffect(() => {
    if (visible) {
      const anc = isoToYearMonth(mode === "from" ? fromDate : toDate);
      setDisplayYear(anc.year);
      setDisplayMonth(anc.month);
    }
  }, [visible, mode, fromDate, toDate]);

  const weeks = useMemo(
    () => buildMonthGrid(displayYear, displayMonth),
    [displayYear, displayMonth]
  );

  const monthNames = language === "it" ? MONTHS_IT : MONTHS_EN;
  const weekdays = language === "it" ? WEEKDAYS_IT : WEEKDAYS_EN;

  const handlePrev = useCallback(() => {
    const p = prevMonth(displayYear, displayMonth);
    setDisplayYear(p.year);
    setDisplayMonth(p.month);
  }, [displayYear, displayMonth]);

  const handleNext = useCallback(() => {
    const n = nextMonth(displayYear, displayMonth);
    setDisplayYear(n.year);
    setDisplayMonth(n.month);
  }, [displayYear, displayMonth]);

  function getDayStyle(day: string | null) {
    if (!day) return {};

    const isAvailable = availableSet.has(day);
    const isFrom = day === fromDate;
    const isTo = day === toDate;
    const inRange = day > fromDate && day < toDate;

    if (isFrom || isTo) {
      return {
        bg: colors.primary,
        fg: colors.primaryForeground,
        opacity: 1,
        bold: true,
        rangeEdge: true,
      };
    }
    if (inRange && isAvailable) {
      return {
        bg: colors.secondary,
        fg: colors.foreground,
        opacity: 1,
        bold: false,
        rangeEdge: false,
      };
    }
    if (inRange && !isAvailable) {
      return {
        bg: colors.secondary,
        fg: colors.mutedForeground,
        opacity: 0.6,
        bold: false,
        rangeEdge: false,
      };
    }
    if (isAvailable) {
      return {
        bg: "transparent",
        fg: colors.foreground,
        opacity: 1,
        bold: false,
        rangeEdge: false,
      };
    }
    return {
      bg: "transparent",
      fg: colors.mutedForeground,
      opacity: 0.4,
      bold: false,
      rangeEdge: false,
    };
  }

  function canSelect(day: string): boolean {
    if (!availableSet.has(day)) return false;
    if (mode === "to" && day < fromDate) return false;
    if (mode === "from" && day > toDate) return false;
    return true;
  }

  const titleText =
    mode === "from" ? t.calendarSelectFrom : t.calendarSelectTo;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={[styles.titleText, { color: colors.foreground }]}>
              {titleText}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Month navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={handlePrev} hitSlop={12} style={styles.navBtn}>
              <Feather name="chevron-left" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.foreground }]}>
              {monthNames[displayMonth - 1]} {displayYear}
            </Text>
            <TouchableOpacity onPress={handleNext} hitSlop={12} style={styles.navBtn}>
              <Feather name="chevron-right" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {weekdays.map((d) => (
              <Text
                key={d}
                style={[styles.weekdayText, { color: colors.mutedForeground }]}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* Day grid */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (!day) {
                  return <View key={di} style={styles.dayCell} />;
                }
                const ds = getDayStyle(day);
                const selectable = canSelect(day);
                const dayNum = parseInt(day.slice(8), 10);

                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      styles.dayCell,
                      ds.rangeEdge && styles.dayCellSelected,
                      { backgroundColor: ds.bg },
                    ]}
                    onPress={() => selectable && onSelect(day)}
                    disabled={!selectable}
                    activeOpacity={selectable ? 0.7 : 1}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: ds.fg,
                          opacity: ds.opacity,
                          fontFamily: ds.bold
                            ? "Inter_700Bold"
                            : "Inter_400Regular",
                        },
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {/* Dot marker for available dates */}
                    {availableSet.has(day) && !ds.rangeEdge && (
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: colors.accent },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Legend */}
          <View style={styles.legend}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.accent }]}
            />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
              {t.calendarHasData}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
          elevation: 8,
        }),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    paddingVertical: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    margin: 1,
  },
  dayCellSelected: {
    borderRadius: 8,
  },
  dayText: {
    fontSize: 13,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
