import { Feather } from "@expo/vector-icons";
import { keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetAccessLogs, getGetAccessLogsQueryKey } from "@workspace/api-client-react";
import type { AccessLog, GetAccessLogsOutcome, GetAccessLogsParams } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { accessLogStrings } from "@/i18n/access-logs";

type Outcome = GetAccessLogsOutcome;
const OUTCOMES: Outcome[] = ["all", "success", "failure"];

function formatRome(iso: string, locale: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  const date = new Intl.DateTimeFormat(locale, { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat(locale, { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short" }).format(d);
  return { date, time };
}

function describeAgent(ua: string): string | null {
  if (!ua) return null;
  const browser =
    /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari"
    : /Expo|okhttp|CFNetwork|Dalvik/i.test(ua) ? "App" : null;
  const os =
    /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : null;
  if (!browser && !os) return null;
  return [browser, os].filter(Boolean).join(" · ");
}

export default function AccessLogsScreen() {
  const colors = useColors();
  const { language } = useTranslation();
  const s = accessLogStrings(language);
  const locale = language === "it" ? "it-IT" : "en-GB";
  const { user } = useAuth();
  const router = useRouter();
  const { containerStyle } = useResponsive();
  const isAdmin = user?.role === "admin";

  const [page, setPage] = useState(1);
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");

  const params: GetAccessLogsParams = { page, outcome, ...(search ? { search } : {}) };
  const { data, isLoading, isError, isFetching, refetch } = useGetAccessLogs(params, {
    query: { enabled: isAdmin, queryKey: getGetAccessLogsQueryKey(params), placeholderData: keepPreviousData, staleTime: 0 },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / Math.max(1, data.pageSize))) : 1;
  const filtered = outcome !== "all" || !!search;

  function applySearch() { setSearch(draft.trim().slice(0, 254)); setPage(1); }
  function clearSearch() { setDraft(""); setSearch(""); setPage(1); }
  function pickOutcome(o: Outcome) { setOutcome(o); setPage(1); }

  function reasonLabel(l: AccessLog) {
    return l.reason === "success" ? s.reasonSuccess : l.reason === "account_inactive" ? s.reasonInactive : s.reasonInvalid;
  }

  const header = (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity testID="access-logs-back" accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconBtn}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.foreground }]} accessibilityRole="header">{s.title}</Text>
      {isAdmin ? (
        <TouchableOpacity testID="access-logs-refresh" accessibilityRole="button" accessibilityLabel={s.refresh} disabled={isFetching}
          onPress={() => refetch()} style={[styles.iconBtn, styles.round, { borderColor: colors.border }]}>
          {isFetching ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="refresh-cw" size={16} color={colors.primary} />}
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
        {header}
        <View style={styles.center}>
          <Feather name="lock" size={28} color={colors.mutedForeground} />
          <Text style={[styles.centerText, { color: colors.mutedForeground }]}>{s.forbidden}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {header}
      <ScrollView contentContainerStyle={[styles.body, containerStyle]} keyboardShouldPersistTaps="handled">
        <View testID="access-logs-note" style={[styles.note, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="info" size={15} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{s.note}</Text>
        </View>

        <View style={styles.controls}>
          <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {OUTCOMES.map((o) => {
              const active = o === outcome;
              return (
                <TouchableOpacity key={o} testID={`access-logs-filter-${o}`} accessibilityRole="button" accessibilityState={{ selected: active }}
                  onPress={() => pickOutcome(o)} style={[styles.segBtn, active && { backgroundColor: colors.primary }]}>
                  <Text style={[styles.segText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>{s[o]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput testID="access-logs-search" value={draft} onChangeText={setDraft} onSubmitEditing={applySearch}
              placeholder={s.searchPlaceholder} placeholderTextColor={colors.mutedForeground} maxLength={254}
              autoCapitalize="none" autoCorrect={false} returnKeyType="search" accessibilityLabel={s.searchPlaceholder}
              style={[styles.searchInput, { color: colors.foreground }]} />
            {draft || search ? (
              <TouchableOpacity testID="access-logs-search-clear" accessibilityRole="button" accessibilityLabel={s.clear} onPress={clearSearch}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity testID="access-logs-search-submit" accessibilityRole="button" onPress={applySearch}
              style={[styles.searchBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.searchBtnText, { color: colors.primaryForeground }]}>{s.search}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text testID="access-logs-total" style={[styles.meta, { color: colors.foreground }]}>{data ? s.total(data.total) : " "}</Text>
          <View style={styles.tzRow}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{s.tz}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.skelRow, { borderBottomColor: colors.border, borderBottomWidth: i === 4 ? 0 : 1 }]}>
                <View style={[styles.skel, { width: "28%", backgroundColor: colors.secondary }]} />
                <View style={[styles.skel, { width: "40%", backgroundColor: colors.secondary }]} />
                <View style={[styles.skel, { width: "18%", backgroundColor: colors.secondary }]} />
              </View>
            ))}
          </View>
        ) : isError && !data ? (
          <View style={styles.center} testID="access-logs-error">
            <Feather name="alert-circle" size={28} color={colors.destructive} />
            <Text style={[styles.centerText, { color: colors.foreground }]}>{s.error}</Text>
            <TouchableOpacity testID="access-logs-retry" accessibilityRole="button" onPress={() => refetch()}
              style={[styles.pageBtn, { borderColor: colors.primary }]}>
              <Text style={[styles.pageBtnText, { color: colors.primary }]}>{s.retry}</Text>
            </TouchableOpacity>
          </View>
        ) : !data || data.items.length === 0 ? (
          <View style={styles.center} testID="access-logs-empty">
            <Feather name={filtered ? "filter" : "log-in"} size={28} color={colors.mutedForeground} />
            <Text style={[styles.centerText, { color: colors.mutedForeground }]}>{filtered ? s.emptyFiltered : s.empty}</Text>
          </View>
        ) : (
          <>
            {isError ? (
              <View style={[styles.inlineErr, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
                <Text style={[styles.meta, { color: colors.destructive, flex: 1 }]}>{s.error}</Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => refetch()}>
                  <Text style={[styles.meta, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{s.retry}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.card, opacity: isFetching ? 0.6 : 1 }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={{ minWidth: TABLE_W }}>
                  <View style={[styles.tr, { backgroundColor: colors.secondary, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                    {[[s.colDate, COLS.date], [s.colUser, COLS.user], [s.colOutcome, COLS.outcome], [s.colIp, COLS.ip], [s.colDevice, COLS.device]].map(([label, w]) => (
                      <Text key={String(label)} style={[styles.th, { width: w as number, color: colors.mutedForeground }]}>{String(label).toUpperCase()}</Text>
                    ))}
                  </View>
                  {data.items.map((l, i) => {
                    const when = formatRome(l.createdAt, locale);
                    const device = describeAgent(l.userAgent);
                    const tone = l.success ? colors.success : colors.destructive;
                    return (
                      <View key={l.id} testID={`access-log-row-${l.id}`} style={[styles.tr, { borderBottomColor: colors.border, borderBottomWidth: i === data.items.length - 1 ? 0 : 1 }]}>
                        <View style={[styles.td, { width: COLS.date }]}>
                          <Text style={[styles.primaryText, { color: colors.foreground }]}>{when.date}</Text>
                          <Text style={[styles.mono, { color: colors.mutedForeground }]}>{when.time}</Text>
                        </View>
                        <View style={[styles.td, { width: COLS.user }]}>
                          <Text selectable numberOfLines={1} style={[styles.primaryText, { color: colors.foreground }]}>{l.email}</Text>
                          <Text numberOfLines={1} style={[styles.secondaryText, { color: colors.mutedForeground, fontStyle: l.name ? "normal" : "italic" }]}>{l.name ?? s.noName}</Text>
                        </View>
                        <View style={[styles.td, { width: COLS.outcome }]}>
                          <View style={[styles.badge, { backgroundColor: tone + "18" }]}>
                            <Feather name={l.success ? "check" : "x"} size={12} color={tone} />
                            <Text style={[styles.badgeText, { color: tone }]}>{l.success ? s.success : s.failure}</Text>
                          </View>
                          <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>{reasonLabel(l)}</Text>
                        </View>
                        <View style={[styles.td, { width: COLS.ip }]}>
                          <Text selectable testID={`access-log-ip-${l.id}`} style={[styles.mono, { color: colors.foreground }]}>{l.ipAddress ?? s.ipUnavailable}</Text>
                        </View>
                        <View style={[styles.td, { width: COLS.device }]}>
                          <Text style={[styles.primaryText, { color: colors.foreground }]}>{device ?? s.unknownDevice}</Text>
                          {l.userAgent ? <Text selectable numberOfLines={2} style={[styles.mono, { color: colors.mutedForeground }]}>{l.userAgent}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View style={styles.pager}>
              <TouchableOpacity testID="access-logs-prev" accessibilityRole="button" accessibilityLabel={s.prev} disabled={page <= 1 || isFetching}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                style={[styles.pageBtn, { borderColor: colors.border, opacity: page <= 1 ? 0.4 : 1 }]}>
                <Feather name="chevron-left" size={16} color={colors.foreground} />
                <Text style={[styles.pageBtnText, { color: colors.foreground }]}>{s.prev}</Text>
              </TouchableOpacity>
              <Text testID="access-logs-page" style={[styles.meta, { color: colors.mutedForeground }]}>{s.pageOf(data.page, totalPages)}</Text>
              <TouchableOpacity testID="access-logs-next" accessibilityRole="button" accessibilityLabel={s.next} disabled={page >= totalPages || isFetching}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={[styles.pageBtn, { borderColor: colors.border, opacity: page >= totalPages ? 0.4 : 1 }]}>
                <Text style={[styles.pageBtnText, { color: colors.foreground }]}>{s.next}</Text>
                <Feather name="chevron-right" size={16} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const COLS = { date: 170, user: 260, outcome: 190, ip: 190, device: 300 };
const TABLE_W = COLS.date + COLS.user + COLS.outcome + COLS.ip + COLS.device + 24;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  round: { borderRadius: 18, borderWidth: 1 },
  body: { padding: 16, gap: 14, paddingBottom: Platform.OS === "web" ? 50 : 24 },
  note: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 10, padding: 3 },
  segBtn: { paddingHorizontal: 14, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  segText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  searchBox: { flexGrow: 1, flexBasis: 260, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingLeft: 12, paddingRight: 4, height: 42 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 40 },
  searchBtn: { height: 32, paddingHorizontal: 12, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  searchBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 },
  tzRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { fontSize: 13, fontFamily: "Inter_500Medium" },
  table: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  tr: { flexDirection: "row", paddingHorizontal: 12, alignItems: "flex-start" },
  th: { fontSize: 11, letterSpacing: 0.6, fontFamily: "Inter_600SemiBold", paddingVertical: 12, paddingRight: 12 },
  td: { paddingVertical: 12, paddingRight: 12, gap: 4 },
  primaryText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  secondaryText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mono: { fontSize: 12, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  skelRow: { flexDirection: "row", gap: 16, padding: 16 },
  skel: { height: 12, borderRadius: 6 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12, paddingHorizontal: 24 },
  centerText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  inlineErr: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pageBtn: { flexDirection: "row", alignItems: "center", gap: 4, height: 38, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  pageBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
