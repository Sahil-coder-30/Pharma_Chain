import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ShieldCheck,
  Zap,
  ZapOff,
  ScanLine,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Camera,
  Radio,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PharmaTheme } from '../../src/constants/theme';

type ScanMode = 'VERIFY' | 'RECEIVE' | 'DISPENSE';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = Math.min(SCREEN_WIDTH * 0.72, 270);

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: ScanMode }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>(params.mode || 'DISPENSE');

  // Animation values
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (params.mode && (params.mode === 'RECEIVE' || params.mode === 'DISPENSE' || params.mode === 'VERIFY')) {
      setScanMode(params.mode);
    }
  }, [params.mode]);

  // 1. Continuous Laser Line Sweep Animation
  useEffect(() => {
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: FRAME_SIZE - 6,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 6,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    sweep.start();

    return () => sweep.stop();
  }, [laserAnim]);

  // 2. Pulsing Corner Brackets
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <View style={styles.permissionIconCircle}>
          <Camera size={44} color={PharmaTheme.colors.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera Terminal Access</Text>
        <Text style={styles.permissionSubtitle}>
          PharmaChain requires camera permission to capture and cryptographically verify 2D DataMatrix packaging tokens.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permissionBtnText}>Enable Camera Terminal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {}

    setTimeout(() => {
      setLoading(false);
      setScanned(false);
      router.push({ pathname: '/verification', params: { qrData: data, mode: scanMode } });
    }, 450);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torchOn}
        onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'datamatrix', 'code128'],
        }}
      />

      {/* Futuristic Titanium HUD Overlay */}
      <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 20) + 8 }]}>
        {/* Top Controls Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(shopkeeper)/dashboard');
            }}
            activeOpacity={0.8}
          >
            <ArrowLeft color="#ffffff" size={20} />
          </TouchableOpacity>

          <View style={styles.hudTelemetryPill}>
            <View style={styles.pulseDot} />
            <Text style={styles.hudTelemetryText}>Ready to Scan</Text>
          </View>

          <TouchableOpacity
            style={[styles.glassBtn, torchOn && styles.torchBtnActive]}
            onPress={() => setTorchOn(!torchOn)}
            activeOpacity={0.8}
          >
            {torchOn ? <Zap size={18} color="#f59e0b" /> : <ZapOff size={18} color="#ffffff" />}
          </TouchableOpacity>
        </View>

        {/* Scan Mode Switcher */}
        <View style={styles.modeSwitcherContainer}>
          <TouchableOpacity
            style={[styles.modeBtn, scanMode === 'VERIFY' && styles.modeBtnActive]}
            onPress={() => setScanMode('VERIFY')}
            activeOpacity={0.8}
          >
            <ShieldCheck size={14} color={scanMode === 'VERIFY' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.modeBtnText, scanMode === 'VERIFY' && styles.modeBtnTextActive]}>
              Verify
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, scanMode === 'RECEIVE' && styles.modeBtnActive]}
            onPress={() => setScanMode('RECEIVE')}
            activeOpacity={0.8}
          >
            <ArrowDownLeft size={14} color={scanMode === 'RECEIVE' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.modeBtnText, scanMode === 'RECEIVE' && styles.modeBtnTextActive]}>
              Inbound
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, scanMode === 'DISPENSE' && styles.modeBtnActive]}
            onPress={() => setScanMode('DISPENSE')}
            activeOpacity={0.8}
          >
            <ArrowUpRight size={14} color={scanMode === 'DISPENSE' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.modeBtnText, scanMode === 'DISPENSE' && styles.modeBtnTextActive]}>
              Dispense
            </Text>
          </TouchableOpacity>
        </View>

        {/* Viewfinder Target Reticle with Animated Laser */}
        <View style={styles.viewFinderContainer}>
          {/* Pulsing Target Frame */}
          <Animated.View
            style={[
              styles.scanFrame,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {/* Luminous Electric Cobalt Reticles */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Crosshair Center Aim */}
            <View style={styles.centerCrosshairH} />
            <View style={styles.centerCrosshairV} />

            {/* Animated Laser Beam */}
            <Animated.View
              style={[
                styles.laserLineContainer,
                {
                  transform: [{ translateY: laserAnim }],
                },
              ]}
            >
              <View style={styles.laserBeam} />
              <View style={styles.laserGlow} />
            </Animated.View>
          </Animated.View>

          <Text style={styles.instructionTitle}>
            {scanMode === 'VERIFY'
              ? 'Verify Medicine'
              : scanMode === 'RECEIVE'
              ? 'Receive Inbound Stock'
              : 'Dispense Medicine'}
          </Text>
          <Text style={styles.instructionSub}>
            Align QR or 2D DataMatrix code within the frame
          </Text>
        </View>

        {/* Bottom Spacer for Tab Bar Clearance */}
        <View style={{ height: 90 }} />
      </View>

      {/* Loading Radar Overlay */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Verifying Medicine...</Text>
          <Text style={styles.loadingSub}>Checking authenticity on PharmaChain ledger</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f17',
  },
  permissionContainer: {
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  permissionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 23, 0.45)',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glassBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  hudTelemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  hudTelemetryText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  torchBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderColor: '#f59e0b',
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    gap: 4,
    alignSelf: 'center',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 5,
  },
  modeBtnActive: {
    backgroundColor: '#2563eb',
  },
  modeBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  viewFinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    borderRadius: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#38bdf8',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  centerCrosshairH: {
    position: 'absolute',
    width: 28,
    height: 1.5,
    backgroundColor: 'rgba(56, 189, 248, 0.4)',
  },
  centerCrosshairV: {
    position: 'absolute',
    width: 1.5,
    height: 28,
    backgroundColor: 'rgba(56, 189, 248, 0.4)',
  },
  laserLineContainer: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    alignItems: 'center',
  },
  laserBeam: {
    width: '100%',
    height: 2.5,
    backgroundColor: '#38bdf8',
    borderRadius: 2,
  },
  laserGlow: {
    width: '90%',
    height: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 4,
    marginTop: -5,
  },
  instructionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 4,
  },
  instructionSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 23, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 14,
  },
  loadingSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
});
