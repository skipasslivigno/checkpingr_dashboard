import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { getGetOperationalNotesQueryKey, useGetOperationalNotes } from "@workspace/api-client-react";
import type { OperationalNote } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { NOTES_QUERY_OPTIONS, formatNoteDate, sortNotes } from "@/lib/diary";
import {
  NoteCard, NoteFormModal, NotesError, NotesList, NotesSkeleton, st, useCanWriteNotes, useDiary,
} from "@/components/OperationalNotes";

function openDiary(router: ReturnType<typeof useRouter>, p: { date?: string; from?: string; to?: string; liftId?: number }) {
  const params: Record<string, string> = {};
  if (p.date) params.date = p.date;
  if (p.from) params.from = p.from;
  if (p.to) params.to = p.to;
  if (p.liftId != null) params.liftId = String(p.liftId);
  router.push({ pathname: "/diary", params } as never);
}

function PanelHeader({ title, count, onOpen, onAdd }: { title: string; count?: number; onOpen: () => void; onAdd?: () => void }) {
  const colors = useColors();
  const s = useDiary();
  return (
    <View style={st.panelHead}>
      <Feather name="book-open" size={16} color={colors.primary} />
      <Text style={[st.panelTitle, { color: colors.foreground }]} numberOfLines={1}>
        {title}{count != null ? <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>{"  "}{s.count(count)}</Text> : null}
      </Text>
      {onAdd ? (
        <TouchableOpacity testID="notes-add" accessibilityLabel={s.add} onPress={onAdd} style={[st.linkBtn, { borderColor: colors.primary, backgroundColor: colors.primary }]}>
          <Feather name="plus" size={13} color={colors.primaryForeground} />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity testID="notes-open-diary" onPress={onOpen} style={[st.linkBtn, { borderColor: colors.border }]}>
        <Text style={[st.linkText, { color: colors.primary }]}>{s.open}</Text>
        <Feather name="chevron-right" size={13} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

/** Dashboard: selected-day summary, independent of extraction availability. */
export function DayNotesSummary({ date }: { date: string }) {
  const colors = useColors();
  const s = useDiary();
  const router = useRouter();
  const canWrite = useCanWriteNotes();
  const [adding, setAdding] = useState(false);
  const params = { from: date, to: date, scope: "all" as const };
  const q = useGetOperationalNotes(params, { query: { queryKey: getGetOperationalNotesQueryKey(params), ...NOTES_QUERY_OPTIONS } });
  const notes = sortNotes(q.data ?? []);
  const shown = notes.slice(0, 3);
  return (
    <View testID="dashboard-notes" style={[st.panel, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginTop: 10 }]}>
      <PanelHeader
        title={s.title}
        count={q.data ? notes.length : undefined}
        onOpen={() => openDiary(router, { date })}
        onAdd={canWrite ? () => setAdding(true) : undefined}
      />
      {q.isLoading ? <NotesSkeleton rows={1} /> : q.isError ? <NotesError onRetry={() => q.refetch()} /> :
        notes.length === 0 ? <Text style={[st.emptyHint, { color: colors.mutedForeground, textAlign: "left" }]}>{s.emptyDay}</Text> : (
          <View style={{ gap: 6 }}>
            {shown.map((n) => <NoteCard key={n.id} note={n} compact />)}
            {notes.length > shown.length ? (
              <TouchableOpacity onPress={() => openDiary(router, { date })}>
                <Text style={[st.linkText, { color: colors.primary }]}>{s.more(notes.length - shown.length)}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      <NoteFormModal visible={adding} defaults={{ date, liftId: null }} onClose={() => setAdding(false)} />
    </View>
  );
}

/** Lift detail: general and lift notes shown in two distinct blocks. */
export function LiftNotesPanel({ date, liftId }: { date: string; liftId: number }) {
  const colors = useColors();
  const s = useDiary();
  const router = useRouter();
  const canWrite = useCanWriteNotes();
  const [adding, setAdding] = useState(false);
  const params = { from: date, to: date, scope: "lift" as const, liftId, includeGeneral: "true" as const };
  const q = useGetOperationalNotes(params, { query: { queryKey: getGetOperationalNotesQueryKey(params), ...NOTES_QUERY_OPTIONS, enabled: Number.isSafeInteger(liftId) && liftId >= 0 } });
  const all = q.data ?? [];
  const general = all.filter((n) => n.liftId == null);
  const mine = all.filter((n) => n.liftId === liftId);
  const defaults = { date, liftId };
  return (
    <View testID="lift-notes" style={[st.panel, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
      <PanelHeader
        title={s.title}
        count={q.data ? all.length : undefined}
        onOpen={() => openDiary(router, { date, liftId })}
        onAdd={canWrite ? () => setAdding(true) : undefined}
      />
      {q.isLoading ? <NotesSkeleton /> : q.isError ? <NotesError onRetry={() => q.refetch()} /> : (
        <>
          <Text style={[st.dayHeader, { color: colors.primary }]}>{s.liftNotes}</Text>
          <NotesList notes={mine} emptyText={s.emptyDay} defaults={defaults} />
          <Text style={[st.dayHeader, { color: colors.warning }]}>{s.generalNotes}</Text>
          <NotesList notes={general} emptyText={s.emptyDay} defaults={defaults} />
        </>
      )}
      <NoteFormModal visible={adding} defaults={defaults} onClose={() => setAdding(false)} />
    </View>
  );
}

function IntervalNotes({ title, from, to, q }: {
  title: string; from: string; to: string;
  q: { data?: OperationalNote[]; isLoading: boolean; isError: boolean; refetch: () => unknown };
}) {
  const colors = useColors();
  const s = useDiary();
  const { language } = useTranslation();
  const router = useRouter();
  return (
    <View style={{ gap: 8 }}>
      <View style={st.panelHead}>
        <View style={{ flex: 1 }}>
          <Text style={[st.dayHeader, { color: colors.foreground, marginTop: 0 }]}>{title}</Text>
          <Text style={[st.meta, { color: colors.mutedForeground }]}>{formatNoteDate(from, language)} — {formatNoteDate(to, language)}</Text>
        </View>
        <TouchableOpacity onPress={() => openDiary(router, { from, to })} style={[st.linkBtn, { borderColor: colors.border }]}>
          <Text style={[st.linkText, { color: colors.primary }]}>{s.open}</Text>
        </TouchableOpacity>
      </View>
      {q.isLoading ? <NotesSkeleton /> : q.isError ? <NotesError onRetry={() => q.refetch()} /> :
        <NotesList notes={q.data ?? []} groupByDate emptyText={s.empty} defaults={{ date: from, liftId: null }} />}
    </View>
  );
}

export function PeriodNotesPanel({ current, compared, currentQ, comparedQ }: {
  current: { from: string; to: string };
  compared: { from: string; to: string } | null;
  currentQ: React.ComponentProps<typeof IntervalNotes>["q"];
  comparedQ: React.ComponentProps<typeof IntervalNotes>["q"];
}) {
  const colors = useColors();
  const s = useDiary();
  return (
    <View testID="period-notes" style={[st.panel, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginTop: 12 }]}>
      <View style={st.panelHead}>
        <Feather name="book-open" size={16} color={colors.primary} />
        <Text style={[st.panelTitle, { color: colors.foreground }]}>{s.periodNotes}</Text>
      </View>
      <IntervalNotes title={s.currentInterval} from={current.from} to={current.to} q={currentQ} />
      {compared ? (
        <>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <IntervalNotes title={s.comparedInterval} from={compared.from} to={compared.to} q={comparedQ} />
        </>
      ) : null}
    </View>
  );
}
