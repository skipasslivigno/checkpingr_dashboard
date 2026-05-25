import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
import { useTranslation } from "@/contexts/LanguageContext";
import { useSelectedDate } from "@/contexts/SelectedDateContext";

export default function LiftsScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { selectedDate, setSelectedDate, selectedExtraction, setSelectedExtraction } = useSelectedDate();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

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

  const companies = useMemo(() => {
    if (!lifts) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const l of lifts) {
      const name = l.nomeSocieta ?? null;
      if (name && !seen.has(name)) {
        seen.add(name);
        list.push(name);
      }
    }
    return list.sort((a, b) => a.localeCompare(b));
  }, [lifts]);

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
  const showChips = companies.length > 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>{t.allLifts}</Text>

        <DateExtractionPicker
          selectedDate={selectedDate}
          selectedExtraction={selectedExtraction}
          onDateChange={(d) => {
            setSelectedDate(d);
            setSelectedExtraction(undefined);
          }}
          onExtractionChange={setSelectedExtraction}
        />

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
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

        {showChips && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            <TouchableOpacity
              style={[
                styles.chip,
                {
                  backgroundColor: selectedCompany === null ? colors.primary : colors.card,
                  borderColor: selectedCompany === null ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedCompany(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedCompany === null ? "#fff" : colors.foreground },
                ]}
              >
                {t.all}
              </Text>
            </TouchableOpacity>

            {companies.map((company) => {
              const active = selectedCompany === company;
              return (
                <TouchableOpacity
                  key={company}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCompany(active ? null : company)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}
                    numberOfLines={1}
                  >
                    {company}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {selectedCompany !== null && (
          <View style={[styles.filterBar, { marginHorizontal: 16 }]}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>
              {filtered.length} {filtered.length !== 1 ? t.lifts : t.lift} · {selectedCompany}
            </Text>
            <TouchableOpacity onPress={() => setSelectedCompany(null)} hitSlop={8}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={isLoading ? Array.from<(typeof filtered)[number] | undefined>({ length: 10 }) : filtered}
        keyExtractor={(item, i) => (item ? String(item.ggnr) : String(i))}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          !isLoading ? (
            <View style={[styles.emptyState]}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  chipScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    maxWidth: 140,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 2,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
