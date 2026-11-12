import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getGetEmailSettingsQueryKey, useGetEmailSettings } from "@workspace/api-client-react";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { EmailSettingsForm } from "@/components/email/EmailSettingsForm";
import { apiErrorMessage } from "@/components/email/shared";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function EmailSettingsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading, isError, error, refetch, isFetching } = useGetEmailSettings({
    query: { enabled: !!isAdmin, queryKey: getGetEmailSettingsQueryKey(), staleTime: 0 },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }, Platform.OS === "web" && { paddingTop: 67 }]}>
        <Pressable testID="email-settings-back" accessibilityRole="button" accessibilityLabel={t.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin"))} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{t.emLink}</Text>
        <View style={styles.backBtn} />
      </View>
      {!isAdmin ? (
        <View style={styles.center} testID="email-settings-forbidden">
          <Feather name="lock" size={28} color={colors.mutedForeground} />
          <Text style={[styles.msg, { color: colors.mutedForeground }]}>{t.emAdminOnly}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : isError || !data ? (
        <View style={styles.center} testID="email-settings-load-error">
          <Feather name="alert-circle" size={28} color={colors.destructive} />
          <Text style={[styles.msg, { color: colors.mutedForeground }]}>{apiErrorMessage(error, t.emLoadError)}</Text>
          <Pressable testID="email-settings-retry" accessibilityRole="button" disabled={isFetching} onPress={() => refetch()}>
            <Text style={[styles.msg, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{t.errorTryAgain}</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAwareScrollViewCompat contentContainerStyle={styles.body} bottomOffset={24}>
          <View style={styles.inner}>
            {/* key on sender so a different admin session gets a fresh form; refetches do not reset edits */}
            <EmailSettingsForm key={data.senderEmail} settings={data} colors={colors} />
          </View>
        </KeyboardAwareScrollViewCompat>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  msg: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 420 },
  body: { padding: 16, paddingBottom: Platform.OS === "web" ? 50 : 32 },
  inner: { width: "100%", maxWidth: 720, alignSelf: "center" },
});
