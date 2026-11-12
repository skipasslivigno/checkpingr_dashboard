import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSeasonStarts,
  useUpdateSeasonStart,
  getGetSeasonStartsQueryKey,
  getGetPeriodComparisonQueryKey,
} from "@workspace/api-client-react";
import type { SeasonStart } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { formatSeason } from "@/contexts/SeasonContext";

function validIso(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
const isSaturday = (s: string) => new Date(`${s}T12:00:00Z`).getUTCDay() === 6;

function Row({ row }: { row: SeasonStart }) {
  const colors = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();
  // Draft is null until the user edits: poll results never overwrite unsaved input.
  const [draft, setDraft] = useState<string | null>(null);
  const [endDraft, setEndDraft] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const m = useUpdateSeasonStart();
  const value = draft ?? row.startDate ?? "";
  const endValue = endDraft ?? row.endDate ?? "";
  const dirty = (draft !== null && draft !== (row.startDate ?? ""))
    || (endDraft !== null && endDraft !== (row.endDate ?? ""));
  const validDates = (value === "" || validIso(value)) && (endValue === "" || validIso(endValue));
  const validOrder = !value || !endValue || endValue >= value;
  const ok = validDates && validOrder;

  const submit = (startDate: string | null, endDate: string | null) => {
    setMsg(null);
    m.mutate({ season: row.season, data: { startDate, endDate } }, {
      onSuccess: async (updated) => {
        qc.setQueryData<SeasonStart[]>(getGetSeasonStartsQueryKey(), (old) =>
          old ? old.map((r) => (r.season === updated.season ? updated : r)) : old);
        setDraft(null);
        setEndDraft(null);
        setMsg({ ok: true, text: t.pc.ssSaved });
        await qc.invalidateQueries({ queryKey: getGetSeasonStartsQueryKey() });
        await qc.invalidateQueries({ queryKey: getGetPeriodComparisonQueryKey() });
      },
      onError: (e) => {
        const err = e as { data?: { error?: unknown } | null; message?: string };
        const detail = typeof err?.data?.error === "string" ? err.data.error : err?.message ?? "";
        setMsg({ ok: false, text: detail ? `${t.pc.ssError}: ${detail}` : t.pc.ssError });
      },
    });
  };

  const id = row.season;
  return (
    <View testID={`row-season-start-${id}`} style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.tr}>
        <View style={styles.cSeason}>
          <Text style={[styles.season, { color: colors.foreground }]} numberOfLines={1}>{formatSeason(row.season)}</Text>
          <Text style={[styles.badge, { color: row.startDate ? colors.success : colors.mutedForeground }]} numberOfLines={1}>
            {row.startDate ? t.pc.ssConfigured : t.pc.ssNotSet}
          </Text>
        </View>
        <View style={styles.cDate}>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{t.pc.colStart}</Text>
        <TextInput
          testID={`input-season-start-${id}`}
          accessibilityLabel={`${t.pc.ssTitle} ${formatSeason(row.season)}`}
          value={value}
          editable={!m.isPending}
          onChangeText={(v) => { setDraft(v.replace(/[^0-9-]/g, "")); setMsg(null); }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.mutedForeground}
          maxLength={10}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: ok ? colors.border : colors.destructive, opacity: m.isPending ? 0.6 : 1 }]}
        />
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{t.seasonBounds.end}</Text>
        <TextInput
          testID={`input-season-end-${id}`}
          accessibilityLabel={`${t.seasonBounds.end} ${formatSeason(row.season)}`}
          value={endValue}
          editable={!m.isPending}
          onChangeText={v => { setEndDraft(v.replace(/[^0-9-]/g, "")); setMsg(null); }}
          placeholder={t.seasonBounds.optional}
          placeholderTextColor={colors.mutedForeground}
          maxLength={10}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: ok ? colors.border : colors.destructive, opacity: m.isPending ? 0.6 : 1 }]}
        />
        </View>
        <TouchableOpacity
          testID={`button-save-season-start-${id}`}
          accessibilityRole="button"
          accessibilityLabel={`${t.pc.ssSave} ${formatSeason(row.season)}`}
          disabled={!dirty || !ok || m.isPending}
          onPress={() => submit(value || null, endValue || null)}
          style={[styles.btn, { backgroundColor: colors.primary, opacity: !dirty || !ok || m.isPending ? 0.4 : 1 }]}
        >
          {m.isPending ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Text style={[styles.btnText, { color: colors.primaryForeground }]}>{t.pc.ssSave}</Text>}
        </TouchableOpacity>
      </View>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {t.pc.ssFirstData}: {row.firstDataDate ?? "—"}  ·  {t.pc.ssSuggested}: {row.suggestedStartDate ?? "—"}
      </Text>
      <View style={styles.actions}>
        {row.suggestedStartDate && value !== row.suggestedStartDate && (
          <TouchableOpacity testID={`button-use-suggested-${id}`} disabled={m.isPending} style={{ opacity: m.isPending ? 0.4 : 1 }} onPress={() => { setDraft(row.suggestedStartDate!); setMsg(null); }}>
            <Text style={[styles.link, { color: colors.primary }]}>{t.pc.ssUseSuggested}</Text>
          </TouchableOpacity>
        )}
        {(row.startDate || row.endDate) && (
          <TouchableOpacity testID={`button-clear-season-start-${id}`} disabled={m.isPending} onPress={() => submit(null, null)}>
            <Text style={[styles.link, { color: colors.destructive }]}>{t.seasonBounds.clear}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!ok && <Text style={[styles.meta, { color: colors.destructive }]}>{!validDates ? t.pc.ssInvalid : t.seasonBounds.invalidRange}</Text>}
      {ok && value !== "" && !isSaturday(value) && (
        <Text testID={`text-not-saturday-${id}`} style={[styles.meta, { color: colors.destructive }]}>{t.pc.ssNotSaturday}</Text>
      )}
      {msg && <Text testID={`status-season-start-${id}`} style={[styles.meta, { color: msg.ok ? colors.success : colors.destructive }]}>{msg.text}</Text>}
    </View>
  );
}

export function SeasonStartsSettings() {
  const colors = useColors();
  const { t } = useTranslation();
  const q = useGetSeasonStarts();
  return (
    <>
      <Text style={[styles.section, { color: colors.foreground }]}>{t.seasonBounds.title}</Text>
      <View testID="card-season-starts" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t.seasonBounds.hint}</Text>
        {q.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : q.isError ? (
          <TouchableOpacity testID="button-season-starts-retry" onPress={() => q.refetch()}>
            <Text style={[styles.hint, { color: colors.destructive }]}>{t.pc.ssLoadError} {t.pc.retry}</Text>
          </TouchableOpacity>
        ) : !q.data?.length ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t.pc.ssEmpty}</Text>
        ) : (
          <View accessibilityRole="list">
            <View style={[styles.tr, styles.th, { borderBottomColor: colors.border }]}>
              <Text style={[styles.thText, styles.cSeason, { color: colors.mutedForeground }]}>{t.pc.colSeason}</Text>
              <Text style={[styles.thText, styles.cDate, { color: colors.mutedForeground }]}>{t.seasonBounds.dates}</Text>
              <Text style={[styles.thText, styles.cAct, { color: colors.mutedForeground }]}>{t.pc.colAction}</Text>
            </View>
            {q.data.map((r) => <Row key={r.season} row={r} />)}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 12, marginBottom: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 4 },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 6 },
  row: { paddingVertical: 10, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  tr: { flexDirection: "row", alignItems: "center", gap: 8 },
  th: { paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  thText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  cSeason: { width: 92, flexShrink: 0 },
  cDate: { flex: 1, minWidth: 0 },
  cAct: { width: 72, textAlign: "center" },
  season: { fontSize: 15, fontFamily: "Inter_700Bold" },
  badge: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  input: { width: "100%", minWidth: 0, height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, fontSize: 14, fontFamily: "Inter_500Medium", marginVertical: 3 },
  btn: { height: 44, width: 72, paddingHorizontal: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 16 },
  link: { fontSize: 12, fontFamily: "Inter_600SemiBold", paddingVertical: 2 },
});
