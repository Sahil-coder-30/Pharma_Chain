import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  ScanLine,
  ShieldCheck,
  ArrowRight,
  QrCode,
  Sparkles,
} from "lucide-react-native";
import { useAuthStore } from "../../src/store/authStore";
import { signInWithGoogleToken } from "../../src/services/api/auth.api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
        offlineAccess: false,
      });
    } catch (err) {
      console.warn("[MediaCare Auth] GoogleSignin configure notice:", err);
    }
  }, []);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const laserAnim = useRef(new Animated.Value(0)).current;

  // Background floating ambient particles & orbs
  const orb1Anim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const orb2Anim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const orb3Anim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const orbOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Scanner pulse & laser
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const laserLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 80,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Floating background ambient orbs
    const orb1Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, {
          toValue: { x: 30, y: 40 },
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orb1Anim, {
          toValue: { x: -20, y: -20 },
          duration: 7000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orb1Anim, {
          toValue: { x: 0, y: 0 },
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const orb2Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, {
          toValue: { x: -40, y: -30 },
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orb2Anim, {
          toValue: { x: 20, y: 30 },
          duration: 7000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orb2Anim, {
          toValue: { x: 0, y: 0 },
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const orb3Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orb3Anim, {
          toValue: { x: 25, y: -40 },
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orb3Anim, {
          toValue: { x: -30, y: 20 },
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orb3Anim, {
          toValue: { x: 0, y: 0 },
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const opacityLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbOpacity, {
          toValue: 0.65,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 0.35,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    laserLoop.start();
    orb1Loop.start();
    orb2Loop.start();
    orb3Loop.start();
    opacityLoop.start();

    return () => {
      pulseLoop.stop();
      laserLoop.stop();
      orb1Loop.stop();
      orb2Loop.stop();
      orb3Loop.stop();
      opacityLoop.stop();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
        offlineAccess: false,
      });

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Clear any prior cached session so the user gets the native account chooser
      await GoogleSignin.signOut().catch(() => {});
      const signInResult = await GoogleSignin.signIn();

      // Handle both v12 and v13 return shapes
      const idToken =
        (signInResult as any)?.data?.idToken ||
        (signInResult as any)?.idToken;

      if (!idToken) {
        throw new Error("No ID token returned by Google.");
      }

      const { user, token } = await signInWithGoogleToken(idToken);
      await SecureStore.setItemAsync("pharmaToken", token);
      setAuth(user, token);
      router.replace("/(tabs)");
    } catch (error: any) {
      setLoading(false);
      console.error("[MediaCare Auth] Google Sign-In error:", error);

      if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
        // User cancelled the login flow
        return;
      } else if (error?.code === statusCodes?.IN_PROGRESS) {
        // Operation already in progress
        return;
      } else if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          "Play Services Unavailable",
          "Google Play Services is not available or needs to be updated on this device."
        );
      } else {
        Alert.alert(
          "Authentication Notice",
          error?.response?.data?.message ||
          error?.message ||
          "Failed to sign in with Google. Please try again."
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Dynamic Animated Ambient Background Orbs */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Animated.View
          style={[
            styles.ambientOrb,
            styles.orb1,
            {
              opacity: orbOpacity,
              transform: [
                { translateX: orb1Anim.x },
                { translateY: orb1Anim.y },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ambientOrb,
            styles.orb2,
            {
              opacity: orbOpacity,
              transform: [
                { translateX: orb2Anim.x },
                { translateY: orb2Anim.y },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ambientOrb,
            styles.orb3,
            {
              opacity: orbOpacity,
              transform: [
                { translateX: orb3Anim.x },
                { translateY: orb3Anim.y },
              ],
            },
          ]}
        />

        {/* Subtle decorative dot grid in background */}
        <View style={styles.gridDashes} />
      </View>

      <View
        style={[
          styles.contentWrapper,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 18,
          },
        ]}
      >
        {/* 1. Minimalist Top Brand Header */}
        <View style={styles.header}>
          <View style={styles.brandIconWrapper}>
            <ShieldCheck size={28} color="#ffffff" strokeWidth={2.4} />
          </View>
          <Text style={styles.brandTitle}>PharmaChain</Text>
          <Text style={styles.brandSubtitle}>
            Verify genuine medicines in seconds
          </Text>
        </View>

        {/* 2. Hero Scanner Card (Clean, Simple, Centered) */}
        <View style={styles.scannerWrapper}>
          <TouchableOpacity
            style={styles.scannerCard}
            onPress={() => router.push("/(public)/scan")}
            activeOpacity={0.9}
          >
            {/* Viewfinder Target */}
            <Animated.View
              style={[
                styles.viewfinder,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />

              <QrCode size={56} color="#ffedd5" strokeWidth={1.4} />

              {/* Glowing Laser Sweep */}
              <Animated.View
                style={[
                  styles.laser,
                  { transform: [{ translateY: laserAnim }] },
                ]}
              />
            </Animated.View>

            <View style={styles.scannerTextWrap}>
              <Text style={styles.scannerTitle}>Scan 2D QR on Medicine</Text>
              <Text style={styles.scannerDesc}>
                Instant step-by-step supply journey & authenticity check
              </Text>
            </View>

            <View style={styles.scanButton}>
              <ScanLine size={18} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.scanButtonText}>Tap to Scan Now</Text>
              <ArrowRight size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Clean, Uncluttered Bottom Sign-In */}
        <View style={styles.bottomSection}>
          <View style={styles.dividerWrap}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR SIGN IN</Text>
            <View style={styles.divider} />
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#FF5342" />
              <Text style={styles.loadingText}>Signing in...</Text>
            </View>
          ) : (
            <View style={styles.buttonStack}>
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                activeOpacity={0.88}
              >
                <View style={styles.googleG}>
                  <Text style={styles.googleGText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footerNote}>
            End-to-end encrypted • CDSCO Verified Protocol
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  ambientOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  orb1: {
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    backgroundColor: "rgba(255, 83, 66, 0.15)",
  },
  orb2: {
    bottom: 120,
    left: -80,
    width: 260,
    height: 260,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
  },
  orb3: {
    top: "40%",
    right: -60,
    width: 200,
    height: 200,
    backgroundColor: "rgba(244, 63, 94, 0.12)",
  },
  gridDashes: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    backgroundColor: "transparent",
  },
  header: {
    alignItems: "center",
    marginTop: 6,
  },
  brandIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF5342",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#FF5342",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  scannerWrapper: {
    alignItems: "center",
    marginVertical: 10,
  },
  scannerCard: {
    width: "100%",
    backgroundColor: "#1c1917", // Clean dark obsidian
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#FF5342",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 237, 213, 0.2)",
  },
  viewfinder: {
    width: 130,
    height: 130,
    borderRadius: 22,
    backgroundColor: "rgba(255, 83, 66, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 237, 213, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 18,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#FF5342",
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 14,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 14,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 14,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 14,
  },
  laser: {
    position: "absolute",
    top: 20,
    width: "80%",
    height: 2.5,
    backgroundColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  scannerTextWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
  },
  scannerDesc: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 17,
  },
  scanButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF5342",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#FF5342",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  bottomSection: {
    gap: 12,
    marginBottom: 4,
  },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#f3f4f6",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.5,
  },
  googleButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleG: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ea4335",
    justifyContent: "center",
    alignItems: "center",
  },
  googleGText: {
    fontWeight: "900",
    color: "#ffffff",
    fontSize: 12,
  },
  googleButtonText: {
    color: "#1f2937",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingBox: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 13,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#FF5342",
    fontWeight: "600",
  },
  buttonStack: {
    width: "100%",
    gap: 8,
  },
  guestButton: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  guestButtonText: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  footerNote: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 2,
  },
});
