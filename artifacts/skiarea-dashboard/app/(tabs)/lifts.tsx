import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  useGetLatestLifts,
  getGetLatestLiftsQueryKey,
} from "@workspace/api-client-react";
import { DateExtractionPicker } from "@/components/DateExtractionPicker";
import { LiftRow } from "@/components/LiftRow";
import { LiftRowSkeleton } from "@/components/SkeletonLoader";
import { useColors } from "@/hooks/useColors";
import { useResponsive, CONTENT_MAX_WIDTH } from "@/hooks/useResponsive";
import { useTranslation } from "@/contexts/LanguageContext";
import { useSelectedDate } from "@/contexts/SelectedDateContext";

interface CompanyEntry {
  name: string;
  nsoc: number;
}

export default function LiftsScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { selectedDate, setSelectedDate, selectedExtraction, setSelectedExtraction } = useSelectedDate();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companySortMode, setCompanySortMode] = useState<"id" | "name">("id");

  const queryParams = {
    date: selectedDate,
    ...(selectedExtraction ? { extraction: selectedExtraction } : {}),
  };

  const { data: lifts, isLoading } = useGetLatestLifts(queryParams);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: getGetLatestLiftsQueryKey() });
    setRefreshing(false);
  };

  const companies = useMemo<CompanyEntry[]>(() => {
    if (!lifts) return [];
    const map = new Map<string, number>();
    for (const l of lifts) {
      if (!l.nomeSocieta) continue;
      const existing = map.get(l.nomeSocieta);
      const nsoc = l.nsoc ?? 9999;
      if (existing === undefined || nsoc < existing) map.set(l.nomeSocieta, nsoc);
    }
    const list = Array.from(map.entries()).map(([name, nsoc]) => ({ name, nsoc }));
    return list.sort(
      companySortMode === "id"
        ? (a, b) => a.nsoc - b.nsoc
        : (a, b) => a.name.localeCompare(b.name)
    );
  }, [lifts, companySortMode]);

  const filtered = useMemo(() => {
    return (lifts ?? [])
      .filter((l) => {
        const matchesSearch = l.ggbz.toLowerCase().includes(search.toLowerCase());
        const matchesCompany = selectedCompany === null || l.nomeSocieta === selectedCompany;
        return matchesSearch && matchesCompany;
      })
      .sort((a, b) => (a.nsoc ?? 9999) - (b.nsoc ?? 9999));
  }, [lifts, search, selectedCompany]);

  const topPadding = Platform.OS === "web" ? 67 : 0;
  const hasCompanies = companies.length > 1;
  const { isWide } = useResponsive();

  const selectedEntry = companies.find((c) => c.name === selectedCompany);

  const dropdownContent = (
    <View style={[styles.dropdownPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Sort toggle */}
      <View style={[styles.sortRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sortLabel, { color: colors.mutedForeground }]}>
          {t.sortBy}:
        </Text>
        <View style={[styles.sortToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {(["id", "name"] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.sortTab, companySortMode === mode && { backgroundColor: colors.primary }]}
              onPress={() => setCompanySortMode(mode)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sortTabText, { color: companySortMode === mode ? colors.primaryForeground : colors.mutedForeground }]}>
                {mode === "id" ? t.sortById : t.sortByName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
        {/* "Tutte" row */}
        <TouchableOpacity
          style={[styles.companyRow, selectedCompany === null && { backgroundColor: colors.primaryLight }]}
          onPress={() => { setSelectedCompany(null); setShowCompanyDropdown(false); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.companyNsoc, { color: colors.mutedForeground }]}>—</Text>
          <Text style={[styles.companyName, { color: selectedCompany === null ? colors.primary : colors.foreground }]}>
            {t.allCompanies}
          </Text>
          {selectedCompany === null && (
            <Feather name="check" size={14} color={colors.primary} />
          )}
        </TouchableOpacity>

        {companies.map((c) => {
          const active = selectedCompany === c.name;
          return (
            <TouchableOpacity
              key={c.name}
              style={[styles.companyRow, active && { backgroundColor: colors.primaryLight }]}
              onPress={() => { setSelectedCompany(c.name); setShowCompanyDropdown(false); }}
              activeOpacity={0.7}
            >
              <View style={[styles.nsocBadge, { backgroundColor: active ? colors.primary : colors.secondary, borderColor: active ? colors.primary : colors.border }]}>
                <Text style={[styles.nsocText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                  {c.nsoc}
                </Text>
              </View>
              <Text style={[styles.companyName, { color: active ? colors.primary : colors.foreground }]} numberOfLines={1}>
                {c.name}
              </Text>
              {active && <Feather name="check" size={14} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16, backgroundColor: colors.background }]}>
        <View style={[styles.inner, isWide && styles.innerWide]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.allLifts}</Text>

          <DateExtractionPicker
            selectedDate={selectedDate}
            selectedExtraction={selectedExtraction}
            onDateChange={(d) => { setSelectedDate(d); setSelectedExtraction(undefined); }}
            onExtractionChange={setSelectedExtraction}
          />

          {/* Search + company dropdown on same row */}
          <View style={styles.filterRow}>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder={t.searchLift}
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
                clearButtonMode="while-editing"
              />
              {search.length > 0 && Platform.OS !== "ios" && (
                <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                  <Feather name="x" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {hasCompanies && (
              <TouchableOpacity
                style={[
                  styles.companyButton,
                  {
                    backgroundColor: selectedCompany ? colors.primary : colors.card,
                    borderColor: selectedCompany ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setShowCompanyDropdown((v) => !v)}
                activeOpacity={0.8}
              >
                <Feather name="briefcase" size={14} color={selectedCompany ? colors.primaryForeground : colors.mutedForeground} />
                {selectedEntry ? (
                  <Text style={[styles.companyButtonText, { color: colors.primaryForeground }]} numberOfLines={1}>
                    {selectedEntry.nsoc}
                  </Text>
                ) : (
                  <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Active filter pill */}
          {selectedCompany !== null && (
            <View style={[styles.filterBar]}>
              <View style={[styles.filterPill, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
                <Text style={[styles.filterPillText, { color: colors.primary }]} numberOfLines={1}>
                  {selectedEntry && `#${selectedEntry.nsoc} · `}{selectedCompany}
                </Text>
                <TouchableOpacity onPress={() => setSelectedCompany(null)} hitSlop={8}>
                  <Feather name="x" size={13} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.filterCount, { color: colors.mutedForeground }]}>
                {filtered.length} {filtered.length !== 1 ? t.lifts : t.lift}
              </Text>
            </View>
          )}

          {/* Inline dropdown (web) */}
          {showCompanyDropdown && hasCompanies && Platform.OS === "web" && (
            <View style={styles.dropdownWrapper}>
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCompanyDropdown(false)} />
              {dropdownContent}
            </View>
          )}
        </View>
      </View>

      {/* Modal dropdown (native) */}
      {showCompanyDropdown && hasCompanies && Platform.OS !== "web" && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowCompanyDropdown(false)}>
          <TouchableWithoutFeedback onPress={() => setShowCompanyDropdown(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {dropdownContent}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      <View style={[styles.listWrap, isWide && styles.listWrapWide]}>
        <FlatList
          data={isLoading ? Array.from<(typeof filtered)[number] | undefined>({ length: 10 }) : filtered}
          keyExtractor={(item, i) => (item ? String(item.ggnr) : String(i))}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 100 : 100 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          scrollEnabled={!!filtered.length}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyState}>
                <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {search || selectedCompany ? t.noLiftsMatchFilters : t.noLiftDataAvailable}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            item ? (
              <LiftRow
                name={item.ggbz}
                passages={item.npas ?? null}
                guests={item.nuin ?? null}
                firstPassage={item.npin ?? null}
                company={item.nomeSocieta}
                group={item.descrGrp}
                onPress={() =>
                  router.push({ pathname: "/lift/[ggnr]", params: { ggnr: item.ggnr, name: item.ggbz } })
                }
              />
            ) : (
              <LiftRowSkeleton />
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 8 },
  inner: { width: "100%" },
  innerWide: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  listWrap: { flex: 1, width: "100%" },
  listWrapWide: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  title: {
    fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5,
    marginBottom: 12, paddingHorizontal: 16,
  },
  filterRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, gap: 8, marginTop: 8,
  },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    gap: 8, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  companyButton: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    flexShrink: 0,
  },
  companyButtonText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  filterBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 8, gap: 8,
  },
  filterPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, flex: 1,
  },
  filterPillText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  filterCount: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 0 },
  dropdownWrapper: { paddingHorizontal: 16, marginTop: 4, zIndex: 999 },
  dropdownPanel: {
    borderWidth: 1, borderRadius: 12, overflow: "hidden",
    maxHeight: 280,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  sortRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sortLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sortToggle: {
    flexDirection: "row", borderRadius: 8, borderWidth: 1,
    overflow: "hidden", padding: 2, gap: 2,
  },
  sortTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  sortTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  dropdownScroll: { maxHeight: 220 },
  companyRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
  },
  nsocBadge: {
    minWidth: 32, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, alignItems: "center",
  },
  nsocText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  companyNsoc: { fontSize: 13, fontFamily: "Inter_400Regular", minWidth: 32, textAlign: "center" },
  companyName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center", alignItems: "center", padding: 32,
  },
  modalPanel: {
    width: "100%", borderRadius: 14, borderWidth: 1,
    maxHeight: 400, overflow: "hidden",
  },
});
