import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import {
  getGetOperationalNotesQueryKey,
  useCreateOperationalNote,
  useDeleteOperationalNote,
  useGetOperationalNoteLifts,
  useUpdateOperationalNote,
} from "@workspace/api-client-react";
import type { OperationalNote, OperationalNoteInput } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { diaryStrings } from "@/i18n/diary";
import { ConfirmDialog, apiErrorMessage } from "@/components/email/shared";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  NOTE_CATEGORIES, NOTE_MAX, formatNoteDate, formatNoteStamp, isRealDate, sortNotes, wasEdited,
} from "@/lib/diary";

export function useDiary() {
  const { language } = useTranslation();
  return diaryStrings(language);
}

export function useCanWriteNotes(): boolean {
  const { user } = useAuth();
  return user?.role === "admin" || user?.role === "operator";
}

/** All mutations invalidate the shared notes prefix so every view refreshes. */
export function useNoteMutations() {
  const qc = useQueryClient();
  const onSettled = () => qc.invalidateQueries({ queryKey: getGetOperationalNotesQueryKey() });
  const create = useCreateOperationalNote({ mutation: { onSettled } });
  const update = useUpdateOperationalNote({ mutation: { onSettled } });
  const remove = useDeleteOperationalNote({ mutation: { onSettled } });
  return { create, update, remove };
}

// ── Small states ──────────────────────────────────────────────────────────────

export function NotesSkeleton({ rows = 2 }: { rows?: number }) {
  const colors = useColors();
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[st.skel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.skelLine, { width: "40%", backgroundColor: colors.secondary }]} />
          <View style={[st.skelLine, { width: "85%", backgroundColor: colors.secondary }]} />
        </View>
      ))}
    </View>
  );
}

export function NotesError({ onRetry, message }: { onRetry: () => void; message?: string }) {
  const colors = useColors();
  const s = useDiary();
  return (
    <View testID="notes-error" style={[st.stateBox, { borderColor: colors.destructive + "55", backgroundColor: colors.destructive + "10" }]}>
      <Feather name="alert-circle" size={16} color={colors.destructive} />
      <Text style={[st.stateText, { color: colors.destructive }]}>{message ?? s.loadError}</Text>
      <TouchableOpacity testID="notes-retry" onPress={onRetry} style={[st.smallBtn, { borderColor: colors.destructive }]}>
        <Text style={[st.smallBtnText, { color: colors.destructive }]}>{s.retry}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function NotesEmpty({ text, hint }: { text: string; hint?: string }) {
  const colors = useColors();
  return (
    <View style={[st.empty, { borderColor: colors.border }]}>
      <Feather name="book-open" size={20} color={colors.mutedForeground} />
      <Text style={[st.emptyText, { color: colors.mutedForeground }]}>{text}</Text>
      {hint ? <Text style={[st.emptyHint, { color: colors.mutedForeground }]}>{hint}</Text> : null}
    </View>
  );
}

// ── Note card ────────────────────────────────────────────────────────────────

export function NoteCard({ note, showDate, onEdit, onDelete, compact }: {
  note: OperationalNote; showDate?: boolean; compact?: boolean;
  onEdit?: (n: OperationalNote) => void; onDelete?: (n: OperationalNote) => void;
}) {
  const colors = useColors();
  const s = useDiary();
  const { language } = useTranslation();
  const general = note.liftId == null;
  const accent = general ? colors.warning : colors.primary;
  return (
    <View testID={`note-${note.id}`} style={[st.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: accent }]}>
      <View style={st.cardHead}>
        <View style={[st.tag, { backgroundColor: accent + "18" }]}>
          <Feather name={general ? "globe" : "navigation"} size={10} color={accent} />
          <Text style={[st.tagText, { color: accent }]} numberOfLines={1}>
            {general ? s.general : note.liftName ?? `#${note.liftId}`}
          </Text>
        </View>
        <View style={[st.tag, { backgroundColor: colors.secondary }]}>
          <Text style={[st.tagText, { color: colors.foreground }]}>{s.categories[note.category] ?? note.category}</Text>
        </View>
        {showDate ? <Text style={[st.cardDate, { color: colors.mutedForeground }]}>{formatNoteDate(note.date, language)}</Text> : null}
        <View style={{ flex: 1 }} />
        {onEdit ? (
          <TouchableOpacity testID={`note-edit-${note.id}`} accessibilityLabel={s.edit} onPress={() => onEdit(note)} hitSlop={8} style={st.iconBtn}>
            <Feather name="edit-2" size={14} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        {onDelete ? (
          <TouchableOpacity testID={`note-delete-${note.id}`} accessibilityLabel={s.delete} onPress={() => onDelete(note)} hitSlop={8} style={st.iconBtn}>
            <Feather name="trash-2" size={14} color={colors.destructive} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[st.cardText, { color: colors.foreground }]} numberOfLines={compact ? 3 : undefined}>{note.text}</Text>
      <Text style={[st.meta, { color: colors.mutedForeground }]}>
        {s.createdBy(note.authorName, formatNoteStamp(note.createdAt, language))}
      </Text>
      {wasEdited(note) ? (
        <Text style={[st.meta, { color: colors.mutedForeground }]}>
          {s.editedBy(note.updatedByName, formatNoteStamp(note.updatedAt, language))}
        </Text>
      ) : null}
    </View>
  );
}

// ── Notes list with built-in edit/delete wiring ─────────────────────────────

export function NotesList({ notes, showDate, groupByDate, emptyText, emptyHint, defaults }: {
  notes: readonly OperationalNote[]; showDate?: boolean; groupByDate?: boolean;
  emptyText: string; emptyHint?: string; defaults?: { date: string; liftId: number | null };
}) {
  const colors = useColors();
  const s = useDiary();
  const { language } = useTranslation();
  const canWrite = useCanWriteNotes();
  const { remove } = useNoteMutations();
  const [editing, setEditing] = useState<OperationalNote | null>(null);
  const [deleting, setDeleting] = useState<OperationalNote | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const sorted = useMemo(() => sortNotes(notes), [notes]);

  async function confirmDelete() {
    if (!deleting || remove.isPending) return;
    setDeleteError(null);
    try {
      await remove.mutateAsync({ id: deleting.id });
      setDeleting(null);
    } catch (e) {
      setDeleteError(apiErrorMessage(e, s.deleteError));
    }
  }

  if (sorted.length === 0) return <NotesEmpty text={emptyText} hint={emptyHint} />;

  let lastDate = "";
  return (
    <View style={{ gap: 8 }}>
      {sorted.map((n) => {
        const header = groupByDate && n.date !== lastDate;
        lastDate = n.date;
        return (
          <React.Fragment key={n.id}>
            {header ? <Text style={[st.dayHeader, { color: colors.mutedForeground }]}>{formatNoteDate(n.date, language)}</Text> : null}
            <NoteCard
              note={n}
              showDate={showDate && !groupByDate}
              onEdit={canWrite ? setEditing : undefined}
              onDelete={canWrite ? (x) => { setDeleteError(null); setDeleting(x); } : undefined}
            />
          </React.Fragment>
        );
      })}
      <NoteFormModal visible={!!editing} note={editing} defaults={defaults} onClose={() => setEditing(null)} />
      <ConfirmDialog
        visible={!!deleting}
        title={s.confirmDeleteTitle}
        icon="trash-2"
        tone="destructive"
        pending={remove.isPending}
        error={deleteError}
        confirmLabel={s.delete}
        pendingLabel={s.deleting}
        cancelLabel={s.cancel}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        colors={colors}
        testIDPrefix="note-delete"
      >
        <Text style={[st.emptyHint, { color: colors.mutedForeground }]}>{s.confirmDeleteBody}</Text>
        {deleting ? <Text style={[st.cardText, { color: colors.foreground }]} numberOfLines={3}>{deleting.text}</Text> : null}
      </ConfirmDialog>
    </View>
  );
}

// ── Shared create/edit form ─────────────────────────────────────────────────

export function NoteFormModal({ visible, note, defaults, onClose }: {
  visible: boolean; note?: OperationalNote | null;
  defaults?: { date: string; liftId: number | null }; onClose: () => void;
}) {
  const colors = useColors();
  const s = useDiary();
  const insets = useSafeAreaInsets();
  const { create, update } = useNoteMutations();
  const liftsQ = useGetOperationalNoteLifts();
  const [date, setDate] = useState("");
  const [liftId, setLiftId] = useState<number | null>(null);
  const [category, setCategory] = useState<OperationalNoteInput["category"]>("other");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!visible) return;
    setDate(note?.date ?? defaults?.date ?? new Date().toISOString().slice(0, 10));
    setLiftId(note ? note.liftId : defaults?.liftId ?? null);
    setCategory(note?.category ?? "other");
    setText(note?.text ?? "");
    setSearch("");
    setError(null);
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, note?.id]);

  const lifts = liftsQ.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? lifts.filter((l) => l.name.toLowerCase().includes(q) || String(l.id) === q) : lifts;
    return list.slice(0, 60);
  }, [lifts, search]);
  const selectedLift = lifts.find((l) => l.id === liftId);

  const trimmed = text.trim();
  const dateErr = !isRealDate(date) ? s.invalidDate : null;
  const textErr = trimmed.length === 0 ? s.textRequired : text.length > NOTE_MAX ? s.textTooLong : null;
  const valid = !dateErr && !textErr;

  async function submit() {
    setTouched(true);
    if (!valid || pending) return;
    setError(null);
    const data: OperationalNoteInput = { date, liftId, category, text: trimmed };
    try {
      if (note) await update.mutateAsync({ id: note.id, data });
      else await create.mutateAsync({ data });
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, s.saveError));
    }
  }

  const close = () => { if (!pending) onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={[st.overlay, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View testID="note-form" style={[st.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={st.sheetHead}>
            <Text style={[st.sheetTitle, { color: colors.foreground }]}>{note ? s.editTitle : s.newTitle}</Text>
            <TouchableOpacity onPress={close} hitSlop={10} accessibilityLabel={s.cancel}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
            <View>
              <Text style={[st.label, { color: colors.mutedForeground }]}>{s.date}</Text>
              <TextInput
                testID="note-date"
                value={date}
                onChangeText={setDate}
                placeholder="2025-01-18"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                maxLength={10}
                editable={!pending}
                style={[st.input, { color: colors.foreground, borderColor: touched && dateErr ? colors.destructive : colors.border, backgroundColor: colors.card }]}
              />
              {touched && dateErr ? <Text style={[st.fieldErr, { color: colors.destructive }]}>{dateErr}</Text> : null}
            </View>

            <View>
              <Text style={[st.label, { color: colors.mutedForeground }]}>{s.scope}</Text>
              <View style={st.chipRow}>
                <Chip testID="note-scope-general" label={s.general} active={liftId == null} onPress={() => setLiftId(null)} disabled={pending} />
                {selectedLift ? <Chip label={selectedLift.name} active onPress={() => undefined} disabled={pending} /> : null}
                {!selectedLift && liftId != null ? <Chip label={`#${liftId}`} active onPress={() => undefined} /> : null}
              </View>
              <TextInput
                testID="note-lift-search"
                value={search}
                onChangeText={setSearch}
                placeholder={s.searchLift}
                placeholderTextColor={colors.mutedForeground}
                editable={!pending}
                style={[st.input, { marginTop: 8, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              />
              {liftsQ.isLoading ? <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} /> :
                liftsQ.isError ? <NotesError message={s.liftsError} onRetry={() => liftsQ.refetch()} /> : (
                  <ScrollView style={{ maxHeight: 120, marginTop: 6 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    <View style={st.chipRow}>
                      {filtered.length === 0 ? <Text style={[st.emptyHint, { color: colors.mutedForeground }]}>{s.noLifts}</Text> :
                        filtered.map((l) => (
                          <Chip key={l.id} testID={`note-lift-${l.id}`} label={l.name} active={l.id === liftId} onPress={() => setLiftId(l.id)} disabled={pending} />
                        ))}
                    </View>
                  </ScrollView>
                )}
            </View>

            <View>
              <Text style={[st.label, { color: colors.mutedForeground }]}>{s.category}</Text>
              <View style={st.chipRow}>
                {NOTE_CATEGORIES.map((c) => (
                  <Chip key={c} testID={`note-cat-${c}`} label={s.categories[c]} active={category === c} onPress={() => setCategory(c)} disabled={pending} />
                ))}
              </View>
            </View>

            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[st.label, { color: colors.mutedForeground }]}>{s.text}</Text>
                <Text style={[st.label, { color: text.length > NOTE_MAX ? colors.destructive : colors.mutedForeground }]}>{text.length}/{NOTE_MAX}</Text>
              </View>
              <TextInput
                testID="note-text"
                value={text}
                onChangeText={setText}
                multiline
                placeholder={s.textPlaceholder}
                placeholderTextColor={colors.mutedForeground}
                editable={!pending}
                style={[st.input, st.textArea, { color: colors.foreground, borderColor: touched && textErr ? colors.destructive : colors.border, backgroundColor: colors.card }]}
              />
              {touched && textErr ? <Text style={[st.fieldErr, { color: colors.destructive }]}>{textErr}</Text> : null}
            </View>

            {error ? (
              <View testID="note-form-error" style={[st.stateBox, { borderColor: colors.destructive + "55", backgroundColor: colors.destructive + "10" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[st.stateText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}
          </KeyboardAwareScrollViewCompat>
          <View style={st.actions}>
            <TouchableOpacity onPress={close} disabled={pending} style={[st.btn, { borderColor: colors.border, borderWidth: 1 }]}>
              <Text style={[st.btnText, { color: colors.foreground }]}>{s.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="note-save" onPress={submit} disabled={pending} style={[st.btn, { backgroundColor: colors.primary, opacity: pending || (touched && !valid) ? 0.6 : 1 }]}>
              {pending ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : null}
              <Text style={[st.btnText, { color: colors.primaryForeground }]}>{pending ? s.saving : s.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Chip({ label, active, onPress, disabled, testID }: {
  label: string; active: boolean; onPress: () => void; disabled?: boolean; testID?: string;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[st.chip, { backgroundColor: active ? colors.primary : colors.secondary, borderColor: active ? colors.primary : colors.border }]}
    >
      <Text style={[st.chipText, { color: active ? colors.primaryForeground : colors.foreground }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

export const st = StyleSheet.create({
  skel: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 8 },
  skelLine: { height: 10, borderRadius: 5 },
  stateBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, flexWrap: "wrap" },
  stateText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", minWidth: 120 },
  smallBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  smallBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", gap: 4, borderWidth: 1, borderStyle: "dashed", borderRadius: 10, paddingVertical: 16, paddingHorizontal: 12 },
  emptyText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderWidth: 1, borderLeftWidth: 3, borderRadius: 10, padding: 10, gap: 4 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, maxWidth: 200 },
  tagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardDate: { fontSize: 11, fontFamily: "Inter_500Medium" },
  iconBtn: { padding: 4 },
  cardText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dayHeader: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: "rgba(7,30,42,0.45)", justifyContent: "center", alignItems: "center", padding: 16 },
  sheet: { width: "100%", maxWidth: 520, maxHeight: "92%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  fieldErr: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 240 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 42, paddingHorizontal: 18, borderRadius: 10 },
  btnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  panel: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  panelHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  panelTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold" },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  linkText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
