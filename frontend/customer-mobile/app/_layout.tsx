import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../src/store/authStore";
import { getMe } from "../src/services/api/auth.api";

export default function Layout() {
  const { isAuthenticated, isLoading, setAuth, setLoading, logout } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // ── Session Restore ────────────────────────────────────────────────────────
  // On every cold app launch, attempt to restore the saved PharmaChain JWT
  // from SecureStore and validate it against the backend. If valid, the user
  // is silently signed in. If expired or missing, they see the home screen.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await SecureStore.getItemAsync("pharmaToken");
        if (token) {
          const user = await getMe(token);
          setAuth(user, token);
        } else {
          setLoading(false);
        }
      } catch {
        // Token is invalid or expired — clear it and show sign-in
        await SecureStore.deleteItemAsync("pharmaToken").catch(() => {});
        logout();
      }
    };
    restoreSession();
  }, []);

  // ── Navigation Guard ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigationState?.key || isLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inPublicGroup = segments[0] === '(public)';

    if (isAuthenticated && inPublicGroup) {
      router.replace('/(tabs)');
    } else if (!isAuthenticated && inTabsGroup) {
      router.replace('/(public)/home');
    }
  }, [isAuthenticated, isLoading, segments, navigationState?.key]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5342" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan-result" />
        <Stack.Screen name="report" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
