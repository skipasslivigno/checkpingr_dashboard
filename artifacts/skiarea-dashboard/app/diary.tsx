import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useMemo, useState } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getGetOperationalNotesQueryKey, useGetOperationalNotes, useGetOperationalNoteLifts } from "@workspace/api-client-react";
import type { GetOperationalNotesParams } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useResponsive } from "@/hooks/useResponsive";
import { useSelectedDate } from "@/contexts/SelectedDateContext";
import { addDays, isRealDate, NOTES_QUERY_OPTIONS } from "@/lib/diary";
import {
  Chip, NoteFormModal, NotesError, NotesList, NotesSkeleton, st, useCanWriteNotes, useDiary,
} from "@/components/OperationalNotes";

type Filter = "all" | "general" | "lift";

export default function DiaryScreen() {
  const colors = useColors();
  const s = useDiary();
  const router = useRouter();
  const { containerStyle } = useResponsive();
  const insets = useSafeAreaInsets();
  const canWrite = useCanWriteNotes();
  const { selectedDate } = useSelectedDate();
  const p = useLocalSearchParams<{ date?: string; from?: string; to?: string; liftId?: string }>();

  const init = useMemo(() => {
    const base = isRealDate(p.date) ? p.date : isRealDate(selectedDate) ? selectedDate : new Date().toISOString().slice(0, 10);
    let from = isRealDate(p.from) ? p.from : isRealDate(p.date) ? p.date : addDays(base, -6);
    let to = isRealDate(p.to) ? p.to : base;
    if (from > to) [from, to] = [to, from];
    const lid = p.liftId != null && /^\d+$/.test(p.liftId) ? Number(p.liftId) : null;
    return { from, to, liftId: lid, date: base };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [fromIn, setFromIn] = useState(init.from);
  const [toIn, setToIn] = useState(init.to);
  const [range, setRange] = useState({ from: init.from, to: init.to });
  const [rangeErr, setRangeErr] = useState(false);
  const [filter, setFilter] = useState<Filter>(init.liftId != null ? "lift" : "all");
  const [liftId, setLiftId] = useState<number | null>(init.liftId);
  const [includeGeneral, setIncludeGeneral] = useState(true);
  const [liftSearch, setLiftSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const liftsQ = useGetOperationalNoteLifts();
  const lifts = liftsQ.data ?? [];
  const selectedLift = lifts.find((l) => l.id === liftId);
  const shownLifts = useMemo(() => {
    const q = liftSearch.trim().toLowerCase();
    return (q ? lifts.filter((l) => l.name.toLowerCase().includes(q)) : lifts).slice(0, 80);
  }, [lifts, liftSearch]);

  const params: GetOperationalNotesParams =
    filter === "lift" && liftId != null
      ? { from: range.from, to: range.to, scope: "lift", liftId, includeGeneral: includeGeneral ? "true" : "false" }
      : { from: range.from, to: range.to, scope: filter === "general" ? "general" : "all" };
  const needsLift = filter === "lift" && liftId == null;
  const q = useGetOperationalNotes(params, { query: { queryKey: getGetOperationalNotesQueryKey(params), ...NOTES_QUERY_OPTIONS, enabled: !needsLift } });

  function apply() {
    if (!isRealDate(fromIn) || !isRealDate(toIn) || fromIn > toIn) { setRangeErr(true); return; }
    setRangeErr(false);
    setRange({ from: fromIn, to: toIn });
  }

  async function onRefresh() {
    setRefreshing(true);
    try { await Promise.all([q.refetch(), liftsQ.refetch()]); } finally { setRefreshing(false); }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const defaults = { date: range.to >= init.date && range.from <= init.date ? init.date : range.to, liftId: filter === "lift" ? liftId : null };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.nav, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={[styles.navInner, containerStyle]}>
          <TouchableOpacity testID="diary-back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.back}>
            <Feather name="chevron-left" size={22} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{s.title}</Text>
            <Text style={[st.meta, { color: colors.mutedForeground }]}>{canWrite ? s.subtitle : s.readOnly}</Text>
          </View>
          {canWrite ? (
            <TouchableOpacity testID="diary-add" onPress={() => setAdding(true)} style={[st.btn, { backgroundColor: colors.primary, height: 38, paddingHorizontal: 12 }]}>
              <Feather name="plus" size={15} color={colors.primaryForeground} />
              <Text style={[st.btnText, { color: colors.primaryForeground }]}>{s.add}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, containerStyle, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[st.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rangeRow}>
            {([["from", fromIn, setFromIn, s.from], ["to", toIn, setToIn, s.to]] as const).map(([k, v, set, label]) => (
              <View key={k} style={{ flex: 1, minWidth: 130 }}>
                <Text style={[st.label, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput
                  testID={`diary-${k}`}
                  value={v}
                  onChangeText={set}
                  maxLength={10}
                  autoCapitalize="none"
                  placeholder="AAAA-MM-GG"
                  placeholderTextColor={colors.mutedForeground}
                  onSubmitEditing={apply}
                  style={[st.input, { color: colors.foreground, borderColor: rangeErr ? colors.destructive : colors.border, backgroundColor: colors.background }]}
                />
              </View>
            ))}
            <TouchableOpacity testID="diary-apply" onPress={apply} style={[st.btn, { backgroundColor: colors.primary, alignSelf: "flex-end" }]}>
              <Text style={[st.btnText, { color: colors.primaryForeground }]}>{s.apply}</Text>
            </TouchableOpacity>
          </View>
          {rangeErr ? <Text style={[st.fieldErr, { color: colors.destructive }]}>{s.invalidRange}</Text> : null}

          <View style={st.chipRow}>
            <Chip testID="diary-filter-all" label={s.filterAll} active={filter === "all"} onPress={() => setFilter("all")} />
            <Chip testID="diary-filter-general" label={s.filterGeneral} active={filter === "general"} onPress={() => setFilter("general")} />
            <Chip testID="diary-filter-lift" label={selectedLift && filter === "lift" ? selectedLift.name : s.filterLift} active={filter === "lift"} onPress={() => setFilter("lift")} />
          </View>

          {filter === "lift" ? (
            <View style={{ gap: 8 }}>
              <TouchableOpacity testID="diary-include-general" onPress={() => setIncludeGeneral((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Feather name={includeGeneral ? "check-square" : "square"} size={16} color={colors.primary} />
                <Text style={[st.linkText, { color: colors.foreground }]}>{s.includeGeneral}</Text>
              </TouchableOpacity>
              <TextInput
                testID="diary-lift-search"
                value={liftSearch}
                onChangeText={setLiftSearch}
                placeholder={s.searchLift}
                placeholderTextColor={colors.mutedForeground}
                style={[st.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              />
              {liftsQ.isLoading ? <NotesSkeleton rows={1} /> : liftsQ.isError ? <NotesError message={s.liftsError} onRetry={() => liftsQ.refetch()} /> : (
                <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  <View style={st.chipRow}>
                    {shownLifts.length === 0 ? <Text style={[st.emptyHint, { color: colors.mutedForeground }]}>{s.noLifts}</Text> :
                      shownLifts.map((l) => <Chip key={l.id} testID={`diary-lift-${l.id}`} label={l.name} active={l.id === liftId} onPress={() => setLiftId(l.id)} />)}
                  </View>
                </ScrollView>
              )}
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 14 }}>
          {needsLift ? <Text style={[st.emptyHint, { color: colors.mutedForeground }]}>{s.chooseLift}</Text>
            : q.isLoading ? <NotesSkeleton rows={3} />
            : q.isError ? <NotesError onRetry={() => q.refetch()} />
            : <NotesList notes={q.data ?? []} groupByDate emptyText={s.empty} emptyHint={s.emptyHint} defaults={defaults} />}
        </View>
      </ScrollView>

      <NoteFormModal visible={adding} defaults={defaults} onClose={() => setAdding(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1 },
  navInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  back: { padding: 4 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  rangeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "flex-end" },
});
