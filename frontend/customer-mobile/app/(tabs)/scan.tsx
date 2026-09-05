import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {
  ShieldCheck,
  Zap,
  ZapOff,
  ScanLine,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 280);

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [verifyingModal, setVerifyingModal] = useState<string | null>(null);

  // Laser animation loop
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const laserLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: SCAN_BOX_SIZE - 20,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    laserLoop.start();
    pulseLoop.start();

    return () => {
      laserLoop.stop();
      pulseLoop.stop();
    };
  }, []);

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      // Haptics optional fallback
    }
  };

  const handleBarcodeScanned = ({ type, data }: any) => {
    if (scanned) return;
    setScanned(true);
    triggerHaptic();

    setVerifyingModal('Verifying QR Code on Hyperledger Fabric...');

    setTimeout(() => {
      setVerifyingModal(null);
      setScanned(false);
      router.push({ pathname: '/scan-result', params: { qrData: data } });
    }, 700);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <View style={styles.permissionIconCircle}>
          <Camera size={44} color="#FF5342" />
        </View>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionSubtitle}>
          PharmaChain needs camera access to scan 2D DataMatrix cryptographic codes and verify tamper-proof provenance.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <ShieldCheck size={18} color="#ffffff" />
          <Text style={styles.permissionBtnText}>Enable Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'datamatrix'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 20) + 8,
            paddingBottom: (insets.bottom || 10) + 16,
          },
        ]}
      >
        {/* Top Floating Bar */}
        <View style={styles.topBar}>
          <View style={styles.scannerBadge}>
            <View style={styles.liveDot} />
            <ShieldCheck size={16} color="#FF5342" />
            <Text style={styles.scannerBadgeText}>PharmaChain Scanner</Text>
          </View>

          <TouchableOpacity
            style={[styles.torchBtn, torchOn && styles.torchBtnActive]}
            onPress={() => setTorchOn(!torchOn)}
            activeOpacity={0.8}
          >
            {torchOn ? (
              <Zap size={20} color="#fbbf24" />
            ) : (
              <ZapOff size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Viewfinder Centerpiece with Neon Reticle */}
        <View style={styles.viewFinderContainer}>
          <Animated.View
            style={[
              styles.scanFrame,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {/* Glowing Corner Accents */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Crosshair */}
            <View style={styles.crosshairH} />
            <View style={styles.crosshairV} />

            {/* Glowing Laser Sweep Beam */}
            <Animated.View
              style={[
                styles.laserBeamContainer,
                { transform: [{ translateY: laserAnim }] },
              ]}
            >
              <View style={styles.laserBeam} />
              <View style={styles.laserGlow} />
            </Animated.View>
          </Animated.View>

          <Text style={styles.instructionTitle}>Align QR or 2D DataMatrix</Text>
          <Text style={styles.instructionSub}>
            Position the medicine packaging's security matrix within the illuminated frame
          </Text>
        </View>

        {/* Bottom Interactive Controls */}
        <View style={styles.bottomSection}>
          <View style={styles.securityFooterBadge}>
            <ShieldCheck size={13} color="#FF5342" />
            <Text style={styles.securityFooterText}>
              Hyperledger Fabric Consensus • Rule 96 Verified
            </Text>
          </View>
        </View>
      </View>

      {/* Verification HUD Modal Overlay */}
      {verifyingModal && (
        <View style={styles.hudOverlay}>
          <View style={styles.hudCard}>
            <View style={styles.hudSpinnerBox}>
              <ActivityIndicator size="large" color="#FF5342" />
            </View>
            <Text style={styles.hudTitle}>Cryptographic Scan</Text>
            <Text style={styles.hudSubtitle}>{verifyingModal}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FBD9DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#17181A',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 13,
    color: '#5B5F63',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF5342',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  permissionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 25, 23, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF5342',
  },
  scannerBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  torchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(28, 25, 23, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  torchBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.35)',
    borderColor: '#fbbf24',
  },
  viewFinderContainer: {
    alignItems: 'center',
  },
  scanFrame: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    backgroundColor: 'transparent',
    borderRadius: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#FF5342',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  crosshairH: {
    position: 'absolute',
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255, 83, 66, 0.6)',
  },
  crosshairV: {
    position: 'absolute',
    width: 2,
    height: 24,
    backgroundColor: 'rgba(255, 83, 66, 0.6)',
  },
  laserBeamContainer: {
    position: 'absolute',
    top: 10,
    width: '90%',
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laserBeam: {
    width: '100%',
    height: 3,
    backgroundColor: '#FF5342',
  },
  laserGlow: {
    position: 'absolute',
    width: '100%',
    height: 14,
    backgroundColor: 'rgba(255, 83, 66, 0.4)',
    borderRadius: 7,
  },
  instructionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  instructionSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 270,
    lineHeight: 18,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 12,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  demoBtnSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF5342',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  demoBtnTextSuccess: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  demoBtnWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(28, 25, 23, 0.88)',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
  },
  demoBtnTextWarning: {
    color: '#fed7aa',
    fontSize: 12,
    fontWeight: '700',
  },
  securityFooterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(28, 25, 23, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  securityFooterText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontWeight: '600',
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 9999,
  },
  hudCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  hudSpinnerBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FBD9DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  hudTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#17181A',
    marginBottom: 6,
  },
  hudSubtitle: {
    fontSize: 12,
    color: '#5B5F63',
    textAlign: 'center',
    lineHeight: 18,
  },
});
