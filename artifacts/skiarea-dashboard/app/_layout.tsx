import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTranslation } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SelectedDateProvider } from "@/contexts/SelectedDateContext";
import { SeasonProvider } from "@/contexts/SeasonContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantSettingsProvider } from "@/contexts/TenantSettingsContext";

// Configure API base URL for Expo (runs outside the shared proxy)
if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function SessionErrorScreen() {
  const { refreshSession, logout } = useAuth();
  const { t } = useTranslation();
  const colors = useColors();
  const [busy, setBusy] = React.useState(false);
  async function retry() {
    setBusy(true);
    try { await refreshSession(); } finally { setBusy(false); }
  }
  return (
    <View testID="session-error" style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
      <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center" }}>{t.sessionErrorTitle}</Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", maxWidth: 360 }}>{t.sessionErrorBody}</Text>
      <Pressable testID="session-retry" accessibilityRole="button" onPress={retry} disabled={busy}
        style={{ height: 46, minWidth: 200, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, opacity: busy ? 0.6 : 1 }}>
        {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t.errorTryAgain}</Text>}
      </Pressable>
      <Pressable testID="session-logout" accessibilityRole="button" onPress={() => logout()} disabled={busy} style={{ padding: 10 }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 }}>{t.logout}</Text>
      </Pressable>
    </View>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, sessionError, mustChangePassword } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const onLoginScreen = segments[0] === "login";
  const onChangePassword = segments[0] === "change-password";

  useEffect(() => {
    if (isLoading || sessionError) return;
    if (!isAuthenticated) {
      if (!onLoginScreen) router.replace("/login");
    } else if (mustChangePassword) {
      if (!onChangePassword) router.replace("/change-password");
    } else if (onLoginScreen || onChangePassword) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, sessionError, mustChangePassword, onLoginScreen, onChangePassword]);

  if (isLoading) return <View style={{ flex: 1, backgroundColor: "#F1F8FC" }} />;
  if (sessionError) return <SessionErrorScreen />;
  const allowed = !isAuthenticated
    ? onLoginScreen
    : mustChangePassword ? onChangePassword : !onLoginScreen && !onChangePassword;
  if (!allowed) return <View style={{ flex: 1, backgroundColor: "#F1F8FC" }} />;

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="lift/[ggnr]" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="login" />
      <Stack.Screen name="change-password" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SelectedDateProvider>
                <TenantSettingsProvider>
                <SeasonProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <AuthGuard>
                      <RootLayoutNav />
                    </AuthGuard>
                  </KeyboardProvider>
                </GestureHandlerRootView>
                </SeasonProvider>
                </TenantSettingsProvider>
              </SelectedDateProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
