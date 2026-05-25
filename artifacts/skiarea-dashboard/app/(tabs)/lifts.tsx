import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LiftsScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [selectedExtraction, setSelectedExtraction] = useState<string | undefined>(undefined);

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

  const filtered = (lifts ?? [])
    .filter((l) => l.ggbz.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.nsoc ?? 9999) - (b.nsoc ?? 9999));

  const topPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>All Lifts</Text>

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
            placeholder="Search lift..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <FlatList
        data={isLoading ? Array.from({ length: 10 }) : filtered}
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
                {search ? "No lifts match your search" : "No lift data available"}
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
    paddingBottom: 12,
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
