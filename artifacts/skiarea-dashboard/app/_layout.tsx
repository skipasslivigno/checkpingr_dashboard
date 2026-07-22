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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SelectedDateProvider } from "@/contexts/SelectedDateContext";
import { SeasonProvider } from "@/contexts/SeasonContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Configure API base URL for Expo (runs outside the shared proxy)
if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const onLoginScreen = segments[0] === "login";
    if (!isAuthenticated && !onLoginScreen) {
      router.replace("/login");
    } else if (isAuthenticated && onLoginScreen) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="lift/[ggnr]" />
      <Stack.Screen name="login" />
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
                <SeasonProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <AuthGuard>
                      <RootLayoutNav />
                    </AuthGuard>
                  </KeyboardProvider>
                </GestureHandlerRootView>
                </SeasonProvider>
              </SelectedDateProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
