import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import {
  Building2,
  ShieldCheck,
  Truck,
  Thermometer,
  Package,
  Sparkles,
  QrCode,
  CheckCircle2,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STEP_DURATION = 1200; // Fast & snappy transitions: ~1.2s per stage (~6s total journey)

interface JourneyProps {
  medicineName?: string;
  supplierName?: string;
  tempRange?: string;
  expiryDate?: string;
  mfgDate?: string;
  batchId?: string;
  warehouseName?: string;
  dispatchDate?: string;
  trustScore?: number;
  packId?: string;
  shopName?: string;
  onFinishJourney?: () => void;
}

export default function MedicineJourneyAnimation({
  medicineName = 'Augmentin 625 Duo',
  supplierName = 'Sun Pharma Laboratories Ltd.',
  tempRange = '25–30°C',
  expiryDate = '31 July 2028',
  mfgDate = '01 August 2026',
  batchId = 'B0260074A',
  warehouseName = 'PharmaChain Hub Gurgaon',
  dispatchDate = '30 August 2026',
  trustScore = 98,
  packId = 'PC-B0260074A-HASH',
  shopName = 'Apollo Pharmacy #402',
  onFinishJourney,
}: JourneyProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Animated values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  // Continuous motion loops
  const conveyorAnim = useRef(new Animated.Value(0)).current;
  const riderAnim = useRef(new Animated.Value(0)).current;
  const roadAnim = useRef(new Animated.Value(0)).current;
  const scanLaserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Conveyor loop
    const conveyorLoop = Animated.loop(
      Animated.timing(conveyorAnim, {
        toValue: 40,
        duration: 700,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 2. Rider & road
    const riderLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(riderAnim, {
          toValue: -5,
          duration: 250,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(riderAnim, {
          toValue: 3,
          duration: 250,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const roadLoop = Animated.loop(
      Animated.timing(roadAnim, {
        toValue: -40,
        duration: 400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 3. QR Laser
    const laserLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLaserAnim, {
          toValue: 50,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLaserAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // 4. Pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    conveyorLoop.start();
    riderLoop.start();
    roadLoop.start();
    laserLoop.start();
    pulseLoop.start();

    return () => {
      conveyorLoop.stop();
      riderLoop.stop();
      roadLoop.stop();
      laserLoop.stop();
      pulseLoop.stop();
    };
  }, []);

  // 5 Step-by-step Supply Journey stages with live data
  const stepsData = [
    {
      id: 'sourcing',
      stepNumber: 1,
      title: 'Step 1: Manufacture & Genesis Stamping',
      body: `Formulated and quality-tested at ${supplierName} under batch ID ${batchId}. Cryptographic genesis record logged on Hyperledger.`,
      tag: 'STAGE 1/5 • SYNTHESIS & SOURCING',
      accentColor: '#FF5342',
      specs: [
        { label: 'Origin Manufacturer', val: supplierName },
        { label: 'Batch ID', val: batchId },
        { label: 'Mfg Date', val: mfgDate },
      ],
    },
    {
      id: 'storage',
      stepNumber: 2,
      title: `Step 2: Warehouse Storage at ${tempRange}`,
      body: `Safely stored in ${warehouseName} with 24/7 IoT climate sensors ensuring chemical stability.`,
      tag: 'STAGE 2/5 • TEMPERATURE REGULATION',
      accentColor: '#FF5342',
      specs: [
        { label: 'Storage Facility', val: warehouseName },
        { label: 'Active Temp', val: '25.2°C (Strictly Regulated)' },
        { label: 'Integrity Seal', val: 'Verified OK' },
      ],
    },
    {
      id: 'verified',
      stepNumber: 3,
      title: 'Step 3: Pharmacist & Lab Quality Audit',
      body: `Licensed pharmacist verified dosage potency for ${medicineName} and confirmed expiry matches state ledger.`,
      tag: 'STAGE 3/5 • PHARMACIST AUDIT',
      accentColor: '#FF5342',
      specs: [
        { label: 'Formulation', val: medicineName },
        { label: 'Expiry Date', val: expiryDate },
        { label: 'Potency Check', val: '100% CDSCO Compliant' },
      ],
    },
    {
      id: 'dispatch',
      stepNumber: 4,
      title: 'Step 4: Secure Dispatch with Holographic Seal',
      body: `Packed in tamper-evident holographic packaging and dispatched on ${dispatchDate}.`,
      tag: 'STAGE 4/5 • DISPATCH HUB',
      accentColor: '#FF5342',
      specs: [
        { label: 'Dispatch Date', val: dispatchDate },
        { label: 'Tamper Seal', val: 'Holographic Barcode Encrypted' },
        { label: 'Tracking Node', val: 'Secure Transit Protocol' },
      ],
    },
    {
      id: 'transit',
      stepNumber: 5,
      title: 'Step 5: Handover & Consensus Verification',
      body: `Transported safely with thermal insulation to ${shopName}. Ready for final authenticity validation.`,
      tag: 'STAGE 5/5 • PHARMACY HANDOVER',
      accentColor: '#FF5342',
      specs: [
        { label: 'Dispensing Pharmacy', val: shopName },
        { label: 'Pack Hash', val: packId.length > 18 ? `${packId.substring(0, 10)}...` : packId },
        { label: 'Consensus Score', val: `${trustScore}/100 Authentic` },
      ],
    },
  ];

  const currentData = stepsData[currentStep];

  const goToStep = (nextIdx: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -6,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextIdx);
      translateYAnim.setValue(6);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Strict non-interruptible auto-progression timeline
  useEffect(() => {
    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STEP_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    anim.start(({ finished }) => {
      if (finished) {
        if (currentStep === stepsData.length - 1) {
          // Finished the entire supply chain story!
          if (onFinishJourney) {
            onFinishJourney();
          }
        } else {
          goToStep(currentStep + 1);
        }
      }
    });

    return () => anim.stop();
  }, [currentStep]);

  // 5 Step-by-Step Scenes
  const renderIllustration = () => {
    switch (currentStep) {
      case 0: // State 1 — Conveyor Belt Sourcing
        return (
          <View style={styles.illustrationCanvas}>
            <View style={styles.factoryGrid}>
              <View style={styles.factoryColumn} />
              <View style={styles.factoryColumn} />
              <View style={styles.factoryColumn} />
            </View>

            <View style={styles.conveyorBoxRow}>
              <View style={[styles.productBox, { transform: [{ scale: 0.8 }] }]}>
                <Building2 size={16} color="#FF5342" />
                <Text style={styles.boxTinyText}>GENESIS</Text>
              </View>
              <Animated.View
                style={[
                  styles.productBox,
                  styles.productBoxMain,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <View style={styles.boxLogoRow}>
                  <ShieldCheck size={14} color="#ffffff" />
                  <Text style={styles.productBoxBrand}>PharmaChain</Text>
                </View>
                <Text style={styles.productBoxBatch} numberOfLines={1}>
                  {batchId}
                </Text>
              </Animated.View>
              <View style={[styles.productBox, { transform: [{ scale: 0.8 }] }]}>
                <Building2 size={16} color="#FF5342" />
                <Text style={styles.boxTinyText}>GENESIS</Text>
              </View>
            </View>

            <View style={styles.conveyorTrackContainer}>
              <Animated.View
                style={[
                  styles.conveyorBeltMove,
                  { transform: [{ translateX: conveyorAnim }] },
                ]}
              >
                <View style={styles.conveyorRoller} />
                <View style={styles.conveyorRoller} />
                <View style={styles.conveyorRoller} />
                <View style={styles.conveyorRoller} />
                <View style={styles.conveyorRoller} />
                <View style={styles.conveyorRoller} />
              </Animated.View>
            </View>

            <View style={styles.sceneBadgePill}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.sceneBadgeText}>Blockchain Genesis Stamped</Text>
            </View>
          </View>
        );

      case 1: // State 2 — Warehouse Storage (25-30°C)
        return (
          <View style={styles.illustrationCanvas}>
            <View style={styles.warehouseRacks}>
              <View style={styles.rackShelf}>
                <View style={styles.shelfBin}><Text style={styles.shelfBinText}>BIN-01</Text></View>
                <View style={[styles.shelfBin, styles.shelfBinActive]}><Text style={styles.shelfBinText}>ACTIVE</Text></View>
                <View style={styles.shelfBin}><Text style={styles.shelfBinText}>BIN-03</Text></View>
              </View>
              <View style={styles.rackShelf}>
                <View style={[styles.shelfBin, styles.shelfBinActive]}><Text style={styles.shelfBinText}>25°C</Text></View>
                <View style={styles.shelfBin}><Text style={styles.shelfBinText}>BIN-05</Text></View>
                <View style={styles.shelfBin}><Text style={styles.shelfBinText}>BIN-06</Text></View>
              </View>
            </View>

            <Animated.View
              style={[
                styles.tempBadgeLarge,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Thermometer size={24} color="#FF5342" />
              <Text style={styles.tempTextLarge}>25.2°C</Text>
              <Text style={styles.tempSubText}>Optimal Climate Controlled</Text>
            </Animated.View>

            <View style={styles.sceneBadgePill}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.sceneBadgeText}>IoT Climate Telemetry Active</Text>
            </View>
          </View>
        );

      case 2: // State 3 — Single Box with QR + Scanner Reading It
        return (
          <View style={styles.illustrationCanvas}>
            <View style={styles.scanTargetBox}>
              <View style={styles.qrCodeBadge}>
                <QrCode size={52} color="#17181A" strokeWidth={1.8} />
              </View>
              <Animated.View
                style={[
                  styles.scanLaserBeam,
                  { transform: [{ translateY: scanLaserAnim }] },
                ]}
              />
            </View>

            <View style={styles.pharmacistBadgePill}>
              <ShieldCheck size={14} color="#2E6B4C" />
              <Text style={styles.pharmacistBadgeText}>Dose, Strength & Expiry Verified</Text>
            </View>
          </View>
        );

      case 3: // State 4 — Delivery Rider on Scooter
        return (
          <View style={styles.illustrationCanvas}>
            <View style={styles.citySkyline}>
              <View style={[styles.building, { height: 50, width: 26 }]} />
              <View style={[styles.building, { height: 75, width: 34 }]} />
              <View style={[styles.building, { height: 45, width: 22 }]} />
              <View style={[styles.building, { height: 85, width: 36 }]} />
              <View style={[styles.building, { height: 60, width: 28 }]} />
            </View>

            <Animated.View
              style={[
                styles.riderVehicle,
                { transform: [{ translateY: riderAnim }] },
              ]}
            >
              <View style={styles.scooterIconBox}>
                <Truck size={44} color="#FF5342" />
              </View>
              <View style={styles.packageOnRider}>
                <Package size={18} color="#ffffff" />
              </View>
            </Animated.View>

            <View style={styles.roadContainer}>
              <Animated.View
                style={[
                  styles.movingRoad,
                  { transform: [{ translateX: roadAnim }] },
                ]}
              >
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
                <View style={styles.roadDash} />
              </Animated.View>
            </View>

            <View style={styles.sceneBadgePill}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.sceneBadgeText}>Dispatched with Hologram Seal</Text>
            </View>
          </View>
        );

      case 4: // State 5 — Handover & Cold-Chain Shield
      default:
        return (
          <View style={styles.illustrationCanvas}>
            <Animated.View
              style={[
                styles.bagInnerCard,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <ShieldCheck size={52} color="#FF5342" strokeWidth={2.4} />
              <Text style={styles.bagLabel}>Delivered to {shopName}</Text>
            </Animated.View>

            <View style={styles.sceneBadgePill}>
              <Sparkles size={12} color="#2E6B4C" />
              <Text style={[styles.sceneBadgeText, { color: '#2E6B4C', fontWeight: '800' }]}>
                Validating Cryptographic Proof...
              </Text>
            </View>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header with Live Progress */}
      <View style={styles.headingRow}>
        <View style={styles.headingTextGroup}>
          <View style={styles.liveHeadingTag}>
            <View style={styles.liveRedDot} />
            <Text style={styles.liveHeadingTagText}>
              LIVE SUPPLY CHAIN JOURNEY (STAGE {currentStep + 1} OF 5)
            </Text>
          </View>
          <Text style={styles.headingTitle}>Tracing Your Medicine</Text>
          <Text style={styles.headingSubtitle}>
            Verifying end-to-end provenance before authenticity reveal
          </Text>
        </View>
      </View>

      {/* 2. Automated Non-Interruptible Progress Track */}
      <View style={styles.progressTrack}>
        {stepsData.map((step, idx) => {
          let fillWidth: any = '0%';
          if (idx < currentStep) {
            fillWidth = '100%';
          } else if (idx === currentStep) {
            fillWidth = progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            });
          }

          return (
            <View key={step.id} style={styles.progressSegmentWrap}>
              <View style={styles.progressSegmentBg}>
                <Animated.View
                  style={[
                    styles.progressSegmentFill,
                    { width: fillWidth },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* 3. Stage Card with Dynamic Animation Canvas */}
      <View style={styles.stageCard}>
        <View style={styles.stageHeader}>
          <View style={styles.stageTag}>
            <Text style={styles.stageTagText}>{currentData.tag}</Text>
          </View>
          <View style={styles.stageNumberBadge}>
            <Text style={styles.stageNumberText}>{currentStep + 1}/5</Text>
          </View>
        </View>

        {/* Dynamic Animated Scene & Details in Synchronized Smooth Motion */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          }}
        >
          {renderIllustration()}

          <View style={styles.cardInfoBox}>
            <Text style={styles.cardTitle}>{currentData.title}</Text>
            <Text style={styles.cardBody}>{currentData.body}</Text>

            {/* Live Data Specs Grid */}
            <View style={styles.specsRow}>
              {currentData.specs.map((spec, i) => (
                <View key={i} style={styles.specBox}>
                  <Text style={styles.specLabel}>{spec.label}</Text>
                  <Text style={styles.specValue} numberOfLines={1}>
                    {spec.val}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Stage Step Indicators (Visual Only) */}
      <View style={styles.chapterDotsRow}>
        {stepsData.map((step, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          return (
            <View
              key={step.id}
              style={[
                styles.chapterDot,
                isActive && styles.chapterDotActive,
                isDone && styles.chapterDotDone,
              ]}
            >
              {isDone ? (
                <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.6} />
              ) : (
                <Text
                  style={[
                    styles.chapterDotText,
                    (isActive || isDone) && styles.chapterDotTextActive,
                  ]}
                >
                  {step.stepNumber}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headingRow: {
    marginBottom: 12,
  },
  headingTextGroup: {
    paddingRight: 10,
  },
  liveHeadingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  liveRedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF5342',
  },
  liveHeadingTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF5342',
    letterSpacing: 0.8,
  },
  headingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#17181A',
    letterSpacing: -0.4,
  },
  headingSubtitle: {
    fontSize: 12,
    color: '#5B5F63',
    marginTop: 2,
    fontWeight: '500',
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  progressSegmentWrap: {
    flex: 1,
    paddingVertical: 4,
  },
  progressSegmentBg: {
    height: 4,
    backgroundColor: '#ECEEF1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressSegmentFill: {
    height: '100%',
    backgroundColor: '#FF5342',
    borderRadius: 2,
  },
  stageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEEF1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stageTag: {
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE2E2',
  },
  stageTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF5342',
    letterSpacing: 0.6,
  },
  stageNumberBadge: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ECEEF1',
  },
  stageNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
  },
  illustrationCanvas: {
    height: 165,
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF0F2',
    marginBottom: 14,
  },
  factoryGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    opacity: 0.1,
  },
  factoryColumn: {
    width: 20,
    height: '100%',
    backgroundColor: '#64748b',
  },
  conveyorTrackContainer: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    height: 10,
    backgroundColor: '#cbd5e1',
    overflow: 'hidden',
  },
  conveyorBeltMove: {
    flexDirection: 'row',
    gap: 16,
  },
  conveyorRoller: {
    width: 18,
    height: 10,
    backgroundColor: '#64748b',
    borderRadius: 2,
  },
  conveyorBoxRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginBottom: 20,
  },
  productBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#FF5342',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBoxMain: {
    minWidth: 130,
    paddingVertical: 14,
    backgroundColor: '#FF5342',
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  boxLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productBoxBrand: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  productBoxBatch: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffedd5',
    marginTop: 2,
  },
  boxTinyText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FF5342',
    marginTop: 2,
  },
  sceneBadgePill: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F3D9DB',
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E6B4C',
  },
  sceneBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#17181A',
  },
  warehouseRacks: {
    position: 'absolute',
    opacity: 0.4,
    gap: 10,
  },
  rackShelf: {
    flexDirection: 'row',
    gap: 12,
  },
  shelfBin: {
    width: 54,
    height: 28,
    backgroundColor: '#cbd5e1',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shelfBinActive: {
    backgroundColor: '#FF5342',
  },
  shelfBinText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ffffff',
  },
  tempBadgeLarge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF5342',
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  tempTextLarge: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF5342',
    marginTop: 2,
  },
  tempSubText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5B5F63',
    marginTop: 2,
  },
  scanTargetBox: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF5342',
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  qrCodeBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLaserBeam: {
    position: 'absolute',
    top: 6,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#FF5342',
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  pharmacistBadgePill: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DFF9E8',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#B8ECCB',
  },
  pharmacistBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2E6B4C',
  },
  citySkyline: {
    position: 'absolute',
    bottom: 35,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    opacity: 0.2,
  },
  building: {
    backgroundColor: '#64748B',
    borderRadius: 3,
  },
  roadContainer: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    height: 4,
    backgroundColor: '#94a3b8',
    overflow: 'hidden',
  },
  movingRoad: {
    flexDirection: 'row',
    gap: 16,
  },
  roadDash: {
    width: 20,
    height: 4,
    backgroundColor: '#ffffff',
  },
  riderVehicle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  scooterIconBox: {
    padding: 8,
    backgroundColor: '#FBD9DC',
    borderRadius: 16,
  },
  packageOnRider: {
    position: 'absolute',
    top: -8,
    right: -6,
    backgroundColor: '#FF5342',
    padding: 4,
    borderRadius: 8,
  },
  bagInnerCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF5342',
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  bagLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#17181A',
    marginTop: 6,
  },
  cardInfoBox: {
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#17181A',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    color: '#5B5F63',
    lineHeight: 18,
    marginBottom: 14,
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECEEF1',
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#17181A',
  },
  chapterDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  chapterDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chapterDotActive: {
    backgroundColor: '#FF5342',
    borderColor: '#FF5342',
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 2,
  },
  chapterDotDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  chapterDotText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  chapterDotTextActive: {
    color: '#FFFFFF',
  },
});
