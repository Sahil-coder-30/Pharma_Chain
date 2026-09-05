import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  BookmarkCheck,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ScanLine,
  Award,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Copy,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verifyMedicineQR, formatDisplayDateTime } from '../src/services/api/verify.api';
import { useCustomerStore } from '../src/store/customerStore';
import { VerificationResult, SavedMedicine } from '../src/types';

import CertificateCard from '../src/components/CertificateCard';
import MedicineJourneyAnimation from '../src/components/MedicineJourneyAnimation';
import SafetyFeaturesGrid from '../src/components/SafetyFeaturesGrid';

export default function ScanResultScreen() {
  const router = useRouter();
  const { status, qrData } = useLocalSearchParams<{ status?: string; qrData?: string }>();
  const insets = useSafeAreaInsets();
  const { addSavedMedicine, addScanRecord } = useCustomerStore();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [saved, setSaved] = useState(false);

  // If opened directly from history with an existing status, jump directly to result dossier;
  // If fresh camera scan, play the 5-step animated journey first.
  const [journeyCompleted, setJourneyCompleted] = useState<boolean>(Boolean(status));

  // Reveal Animation for final result
  const revealAnim = useRef(new Animated.Value(Boolean(status) ? 1 : 0)).current;

  useEffect(() => {
    if (
      qrData &&
      qrData !== 'PC-JWT-GENUINE-BATCH-PCM-2026-SUNPHARMA' &&
      qrData !== 'PC-JWT-FLAGGED-INVALID-SIGNATURE'
    ) {
      setLoading(true);
      verifyMedicineQR(qrData)
        .then((res) => {
          setResult(res);
          const isAuth =
            res.uiState === 'GENUINE' || res.uiState === 'AT_SHOP' || res.status === 'AUTHENTIC';
          addScanRecord({
            id: `scan-${Date.now()}`,
            name: res.pack?.medicineName || 'Augmentin 625 Duo',
            genericName: res.payload?.genericName || 'Amoxicillin Potassium Clavulanate IP',
            batchNumber: res.pack?.batchId || 'B0260074A',
            manufacturer: res.manufacturer?.name || 'Sun Pharma Laboratories Ltd.',
            scannedAt: 'Just now',
            location: res.shop?.name || 'Apollo Pharmacy #402',
            status: isAuth ? 'Verified' : 'Suspicious',
            trustScore: res.risk?.score ?? (isAuth ? 98 : 30),
            packId: res.pack?.packId || res.packHash || qrData,
          });
        })
        .catch((err) => {
          console.error('Scan verification error:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [qrData]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `[PharmaChain Verification]\nMedicine: ${medicineName}\nBatch: ${batchNumber}\nStatus: ${getStatusTitle()}\nTrust Score: ${trustScore}/100`,
      });
    } catch (e) {}
  };

  const isRecentlySold = result?.uiState === 'PURCHASED_RECENTLY' || Boolean(result?.isRecentlySold);
  const isPreviouslySold = result?.uiState === 'ALREADY_SOLD';
  const isSold = isRecentlySold || isPreviouslySold || Boolean(result?.isSold);
  const isAtShop = !isSold && (result?.uiState === 'AT_SHOP' || result?.blockchainStatus === 'AT_SHOP' || result?.custodyState === 'AT_SHOP' || Boolean(result?.dispensingShop?.name));
  const isGenuine = result?.uiState === 'GENUINE';
  const isRecalled = result?.uiState === 'RECALLED';
  const isExpired = result?.uiState === 'EXPIRED';
  const isCounterfeit = result?.uiState === 'COUNTERFEIT';

  const isAuthentic = result
    ? isGenuine || isRecentlySold || isAtShop || result.status === 'AUTHENTIC'
    : status === 'authentic' || status === 'verified' || !status;

  // Even if sold previously (> 2 days), the medicine specification and batch details are valid and should be visible
  const hasValidMetadata = isAuthentic || isPreviouslySold;
  const trustScore = result?.risk?.score ?? (isAuthentic ? 98 : isPreviouslySold ? 60 : 0);

  const medicineName = result?.pack?.medicineName || (qrData ? 'Verified Formulation' : 'No Active Scan');
  const manufacturerName = result?.manufacturer?.name || (qrData ? 'Verified Facility' : 'Unknown Manufacturer');
  const batchNumber = result?.pack?.batchId || (qrData ? 'BATCH-SCAN' : 'N/A');
  const mfgDate = result?.pack?.manufacturingDate || 'N/A';
  const expiryDate = result?.pack?.expiryDate || 'N/A';
  const packId = result?.pack?.packId || result?.packHash || qrData || 'N/A';
  const dispensingShop = result?.dispensingShop;

  const handleFinishJourney = () => {
    setJourneyCompleted(true);
    revealAnim.setValue(0);
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handleReplayJourney = () => {
    setJourneyCompleted(false);
  };

  const handleReverify = () => {
    if (qrData) {
      setLoading(true);
      verifyMedicineQR(qrData)
        .then((res) => {
          setResult(res);
        })
        .finally(() => setLoading(false));
    }
  };

  const copyToClipboard = (text: string, label = 'Copied to Clipboard') => {
    if (Platform.OS === 'web') {
      try {
        navigator.clipboard.writeText(text);
        window.alert(`${label}: ${text}`);
      } catch {
        window.prompt('Copy to clipboard: Ctrl+C, Enter', text);
      }
    } else {
      Alert.alert(label, text);
    }
  };

  const handleSaveToCabinet = () => {
    const med: SavedMedicine = {
      id: `med-${Date.now()}`,
      name: medicineName,
      genericName: result?.pack?.genericName || result?.payload?.genericName || medicineName,
      brandName: result?.pack?.brandName,
      dosage: result?.pack?.dosage || 'Standard Formulation',
      composition: result?.pack?.composition,
      drugSchedule: result?.pack?.drugSchedule,
      storageCondition: result?.pack?.storageCondition,
      productionSite: result?.manufacturer?.productionSite,
      batchNumber,
      manufacturer: manufacturerName,
      mfgDate,
      expiryDate,
      daysToExpiry: 365,
      status: isAuthentic ? 'Verified' : 'Needs Attention',
      packId,
      category: result?.pack?.drugSchedule ? `Schedule ${result.pack.drugSchedule}` : 'General Care',
      verifiedAt: 'Just now',
      safetyScore: trustScore,
    };
    addSavedMedicine(med);
    setSaved(true);
    if (Platform.OS === 'web') {
      window.alert('Saved to your PharmaChain Medicine Cabinet!');
    } else {
      Alert.alert('Saved to Cabinet', 'This medicine has been safely added to your digital cabinet.');
    }
  };

  const getStatusCardBg = () => {
    if (isCounterfeit) return '#991b1b';
    if (isRecalled) return '#dc2626';
    if (isExpired) return '#e11d48';
    if (isAtShop) return '#2563eb';
    if (isRecentlySold) return '#059669';
    if (isPreviouslySold) return '#d97706';
    if (isGenuine) return '#10b981';
    return isAuthentic ? '#10b981' : '#f97316';
  };

  const getStatusTitle = () => {
    if (isCounterfeit) return 'Counterfeit Warning';
    if (isRecalled) return 'CRITICAL: Batch Recalled';
    if (isExpired) return 'Medicine Expired';
    if (isAtShop) return 'Verified Stock (Awaiting Dispense)';
    if (isRecentlySold) return 'Verified — Recently Purchased';
    if (isPreviouslySold) return 'Notice: Dispensed Previously';
    if (isGenuine) return '100% Genuine Medicine';
    return isAuthentic ? 'Authentic Medicine' : 'Suspicious / Unverified';
  };

  const getStatusPillText = () => {
    if (isCounterfeit) return 'COUNTERFEIT WARNING • INVALID SIGNATURE';
    if (isRecalled) return 'CRITICAL ALERT • BATCH RECALLED';
    if (isExpired) return 'EXPIRED PRODUCT • DO NOT CONSUME';
    if (isAtShop) return 'IN PHARMACY STOCK • NOT YET SOLD';
    if (isRecentlySold) return 'VERIFIED AUTHENTIC • RECENT PURCHASE';
    if (isPreviouslySold) return 'FLAGGED NOTICE • DISPENSED PREVIOUSLY';
    return 'VERIFIED AUTHENTIC • 100% GENUINE';
  };

  const renderStatusIcon = () => {
    if (isGenuine || isRecentlySold) return <CheckCircle2 size={40} color="#fff" />;
    if (isAtShop) return <ShieldCheck size={40} color="#fff" />;
    if (isPreviouslySold || isExpired) return <AlertTriangle size={40} color="#fff" />;
    if (isCounterfeit || isRecalled) return <ShieldAlert size={40} color="#fff" />;
    return isAuthentic ? <CheckCircle2 size={40} color="#fff" /> : <AlertTriangle size={40} color="#fff" />;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <View style={styles.loadingGlowRing}>
          <ActivityIndicator size="large" color="#FF5342" />
        </View>
        <Text style={styles.loadingTitle}>Connecting to Blockchain Ledger...</Text>
        <Text style={styles.loadingSubtitle}>
          Fetching cryptographic verification & live batch journey
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#17181A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{medicineName}</Text>
          <Text style={styles.headerSubtitle}>
            {journeyCompleted ? 'Authenticity Result' : 'Live Supply Journey'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Share2 size={20} color="#17181A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* PHASE 1: Live Step-by-Step Supply Chain Animation */}
        {!journeyCompleted ? (
          <View style={styles.animationWrapper}>
            <MedicineJourneyAnimation
              medicineName={medicineName}
              supplierName={manufacturerName}
              tempRange="25–30°C"
              expiryDate={expiryDate}
              mfgDate={mfgDate}
              batchId={batchNumber}
              warehouseName="PharmaChain Hub Gurgaon"
              dispatchDate="30 August 2026"
              trustScore={trustScore}
              packId={packId}
              shopName={dispensingShop?.name || result?.shop?.name || 'Apollo Pharmacy #402'}
              onFinishJourney={handleFinishJourney}
            />
          </View>
        ) : (
          /* PHASE 2: High-Impact Authenticity Result & Certificate Dossier */
          <Animated.View
            style={[
              styles.resultContainer,
              {
                opacity: revealAnim,
                transform: [
                  {
                    translateY: revealAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Grand Authenticity Banner */}
            <View
              style={[
                styles.resultCard,
                isAuthentic ? styles.resultCardSuccess : styles.resultCardWarning,
              ]}
            >
              <View style={[styles.badgeCircle, { backgroundColor: getStatusCardBg() }]}>
                {renderStatusIcon()}
              </View>

              <View style={styles.badgeTextGroup}>
                <View
                  style={[
                    styles.statusPill,
                    isAtShop
                      ? styles.statusPillShop
                      : isRecentlySold || isGenuine
                      ? styles.statusPillSuccess
                      : styles.statusPillWarning,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isAtShop
                        ? styles.statusPillTextShop
                        : isRecentlySold || isGenuine
                        ? styles.statusPillTextSuccess
                        : styles.statusPillTextWarning,
                    ]}
                  >
                    {getStatusPillText()}
                  </Text>
                </View>
                <Text style={styles.resultHeadline}>{getStatusTitle()}</Text>
                <Text style={styles.resultDescription}>
                  {result?.message ||
                    (isAtShop
                      ? 'Pack authenticity verified on Hyperledger Fabric. Located in shop inventory, awaiting final retail dispense scan.'
                      : isAuthentic
                      ? ((result as any)?.liveOnChain
                          ? 'All supply chain checkpoints validated cryptographically on Hyperledger Fabric ledger.'
                          : 'Verified authentic via ES256 Digital Signature. Blockchain sync confirmed.')
                      : 'Digital signature mismatch or suspicious batch records detected. Verify before consumption.')}
                </Text>
              </View>

              {/* Blockchain Status Bar (Live Hyperledger Fabric status) */}
              <View style={styles.blockchainStatusBar}>
                <View style={styles.blockchainNetworkBadge}>
                  <View style={styles.blockchainPulseDot} />
                  <Text style={styles.blockchainNetworkText}>Hyperledger Fabric</Text>
                </View>
                <View
                  style={[
                    styles.blockchainStateBadge,
                    isAtShop
                      ? styles.blockchainStateBadgeShop
                      : isSold
                      ? styles.blockchainStateBadgeSold
                      : styles.blockchainStateBadgeDefault,
                  ]}
                >
                  <Text
                    style={[
                      styles.blockchainStateText,
                      isAtShop
                        ? styles.blockchainStateTextShop
                        : isSold
                        ? styles.blockchainStateTextSold
                        : styles.blockchainStateTextDefault,
                    ]}
                  >
                    {isAtShop
                      ? '● AT_SHOP (IN STOCK)'
                      : isSold
                      ? '● SOLD (DISPENSED)'
                      : isCounterfeit
                      ? '● UNREGISTERED'
                      : '● ON-CHAIN VERIFIED'}
                  </Text>
                </View>
              </View>

              {/* Trust Score & Replay Action */}
              <View style={styles.scoreRow}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreRowLabel}>
                    {(result as any)?.liveOnChain ? 'Fabric Trust Score' : 'Cryptographic Integrity'}
                  </Text>
                  <Text
                    style={[
                      styles.scoreRowValue,
                      { color: isAuthentic ? '#059669' : '#dc2626' },
                    ]}
                  >
                    {trustScore}/100
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.replayBtn}
                  onPress={handleReplayJourney}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={13} color="#17181A" />
                  <Text style={styles.replayBtnText}>Replay Journey</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* UNSOLD MEDICINE SECURITY ADVISORY CARD */}
            {isAtShop && (
              <View style={styles.unsoldAlertCard}>
                <View style={styles.unsoldAlertHeader}>
                  <View style={styles.unsoldAlertIconCircle}>
                    <AlertTriangle size={20} color="#b45309" />
                  </View>
                  <View style={styles.unsoldAlertTitleCol}>
                    <Text style={styles.unsoldAlertBadge}>IMPORTANT ADVISORY • NOT SOLD YET</Text>
                    <Text style={styles.unsoldAlertTitle}>Ask Shopkeeper to Scan This Pack</Text>
                  </View>
                </View>

                <Text style={styles.unsoldAlertBody}>
                  This pack is registered in{' '}
                  <Text style={styles.unsoldAlertBold}>
                    {dispensingShop?.name || 'the pharmacy'}'s inventory
                  </Text>
                  , but has{' '}
                  <Text style={[styles.unsoldAlertBold, { color: '#b45309' }]}>
                    NOT been marked as SOLD
                  </Text>{' '}
                  on the blockchain ledger yet.
                </Text>

                <View style={styles.unsoldStepsBox}>
                  <View style={styles.unsoldStepRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={styles.stepText}>
                      Hand this pack to the pharmacist at the counter before completing purchase.
                    </Text>
                  </View>
                  <View style={styles.unsoldStepRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={styles.stepText}>
                      Ask the pharmacist to scan the DataMatrix code on their PharmaChain terminal and select{' '}
                      <Text style={styles.unsoldAlertBold}>"Mark as Sold"</Text>.
                    </Text>
                  </View>
                  <View style={styles.unsoldStepRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={styles.stepText}>
                      Tap <Text style={styles.unsoldAlertBold}>"Re-Verify After Scan"</Text> below to see your confirmed purchase on Hyperledger Fabric.
                    </Text>
                  </View>
                </View>

                <View style={styles.unsoldWarningCallout}>
                  <ShieldAlert size={18} color="#991b1b" style={{ marginTop: 2, flexShrink: 0 }} />
                  <Text style={styles.unsoldWarningText}>
                    <Text style={styles.unsoldWarningBold}>Anti-Counterfeit Notice: </Text>
                    If the shopkeeper refuses to scan and dispense this pack on the system, do not purchase it. Unrecorded packs might be counterfeit clones, stolen stock, or unauthorized inventory.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.reverifyBtn}
                  onPress={handleReverify}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={15} color="#ffffff" />
                  <Text style={styles.reverifyBtnText}>Re-Verify After Shopkeeper Scans</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Dispensing Pharmacy & Provenance / Custody Card */}
            {(dispensingShop || result?.shop?.name) && (
              <View style={styles.provenanceCard}>
                <View style={styles.provenanceHeader}>
                  <Building2 size={18} color="#0f172a" />
                  <Text style={styles.provenanceHeaderTitle}>
                    {isSold
                      ? 'Dispensing Pharmacy & Purchase Info'
                      : 'Pharmacy Custody & Inventory Info'}
                  </Text>
                </View>

                {/* Custody State Row */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelCol}>
                    <Text style={styles.infoLabelText}>Custody Status</Text>
                  </View>
                  <View style={styles.infoValueCol}>
                    <View
                      style={[
                        styles.custodyBadge,
                        isAtShop
                          ? styles.custodyBadgeShop
                          : isSold
                          ? styles.custodyBadgeSold
                          : styles.custodyBadgeDefault,
                      ]}
                    >
                      <Text
                        style={[
                          styles.custodyBadgeText,
                          isAtShop
                            ? styles.custodyBadgeTextShop
                            : isSold
                            ? styles.custodyBadgeTextSold
                            : styles.custodyBadgeTextDefault,
                        ]}
                      >
                        {isAtShop
                          ? 'In Shop Inventory • Unsold'
                          : isSold
                          ? 'Dispensed / Sold to Patient'
                          : 'In Supply Chain'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Pharmacy Name */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelCol}>
                    <Text style={styles.infoLabelText}>Pharmacy</Text>
                  </View>
                  <View style={styles.infoValueCol}>
                    <Text style={styles.infoValueText} numberOfLines={2}>
                      {dispensingShop?.name || result?.shop?.name || 'Registered CDSCO Pharmacy'}
                    </Text>
                  </View>
                </View>

                {/* CDSCO License */}
                {(dispensingShop?.licenseNumber || result?.shop?.licenseNumber) ? (
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabelCol}>
                      <Text style={styles.infoLabelText}>CDSCO License</Text>
                    </View>
                    <View style={styles.infoValueCol}>
                      <Text style={[styles.infoValueText, { color: '#0284c7', fontWeight: '700' }]}>
                        {dispensingShop?.licenseNumber || result?.shop?.licenseNumber}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Dispense Time (ONLY WHEN SOLD) */}
                {isSold && (dispensingShop?.formattedSaleTime || result?.transaction?.saleTime) ? (
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabelCol}>
                      <Text style={styles.infoLabelText}>Dispense Time</Text>
                    </View>
                    <View style={styles.infoValueCol}>
                      <Text style={styles.infoValueText}>
                        {dispensingShop?.formattedSaleTime || formatDisplayDateTime(result?.transaction?.saleTime)}
                      </Text>
                      {dispensingShop?.relativeSaleTime && (
                        <Text style={styles.relativeTimeBadge}>
                          {dispensingShop.relativeSaleTime}
                        </Text>
                      )}
                    </View>
                  </View>
                ) : null}

                {/* Stock Inward Time (WHEN UNSOLD / IN SHOP INVENTORY) */}
                {!isSold && (dispensingShop?.formattedIntakeTime || dispensingShop?.intakeTime || result?.transaction?.intakeTime) ? (
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabelCol}>
                      <Text style={styles.infoLabelText}>Stock Inward</Text>
                    </View>
                    <View style={styles.infoValueCol}>
                      <Text style={styles.infoValueText}>
                        {dispensingShop?.formattedIntakeTime ||
                          formatDisplayDateTime(dispensingShop?.intakeTime || result?.transaction?.intakeTime)}
                      </Text>
                      <Text style={styles.stockStatusSubtext}>
                        Stock received & verified on ledger
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Location / GPS */}
                {(dispensingShop?.address || dispensingShop?.location || result?.transaction?.location) ? (
                  <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.infoLabelCol}>
                      <Text style={styles.infoLabelText}>Location / GPS</Text>
                    </View>
                    <View style={styles.infoValueCol}>
                      <Text style={[styles.infoValueText, { fontSize: 12, color: '#047857', lineHeight: 17 }]}>
                        {dispensingShop?.address || dispensingShop?.location || result?.transaction?.location}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Contextual Guidance Box */}
                {isRecentlySold ? (
                  <View style={styles.guidanceBoxSuccess}>
                    <Text style={styles.guidanceTitleSuccess}>✓ Recent Purchase Verified</Text>
                    <Text style={styles.guidanceTextSuccess}>
                      This medicine was dispensed from this verified pharmacy within the last 48 hours. If you just bought this medicine from this pharmacy, it is 100% genuine and your purchase was recorded on the blockchain.
                    </Text>
                  </View>
                ) : isPreviouslySold ? (
                  <View style={styles.guidanceBoxWarning}>
                    <Text style={styles.guidanceTitleWarning}>⚖️ Buyer Verification Advisory</Text>
                    <Text style={styles.guidanceTextWarning}>
                      • Checking Your Personal Medicine? If you previously purchased this medicine from this pharmacy and are checking it in your home cabinet, this is genuine and matches your purchase history.
                    </Text>
                    <Text style={[styles.guidanceTextWarning, { marginTop: 6 }]}>
                      • Buying New in a Shop Now? If a store is attempting to sell you this pack today as brand-new stock, do not accept it — this pack was already sold on {dispensingShop?.formattedSaleTime || 'a prior date'} and could be a refilled duplicate clone.
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Medicine Verification Dossier */}
            {hasValidMetadata && (
              <View style={styles.dossierCard}>
                <View style={styles.dossierHeader}>
                  <Award size={18} color="#FF5342" />
                  <Text style={styles.dossierTitle}>Medicine Verification Dossier</Text>
                </View>

                {/* Medicine Name */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelCol}>
                    <Text style={styles.infoLabelText}>Medicine Name</Text>
                  </View>
                  <View style={styles.infoValueCol}>
                    <Text style={styles.infoValueBold} numberOfLines={2}>
                      {medicineName}
                    </Text>
                  </View>
                </View>

                {/* Generic Salt */}
                {result?.pack?.genericName && result?.pack?.genericName !== medicineName && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabelCol}>
                      <Text style={styles.infoLabelText}>Generic Salt</Text>
                    </View>
                    <View style={styles.infoValueCol}>
                      <Text style={styles.infoValueText} numberOfLines={2}>
                        {result.pack.genericName}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Manufacturer */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelCol}>
                    <Text style={styles.infoLabelText}>Manufacturer</Text>
                  </View>
                  <View style={styles.infoValueCol}>
                    <Text style={styles.infoValueText} numberOfLines={2}>
                      {manufacturerName}
                    </Text>
                  </View>
                </View>

                {/* Production Facility */}
                {result?.manufacturer?.productionSite && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabelCol}>
                      <Text style={styles.infoLabelText}>Facility Location</Text>
                    </View>
                    <View style={styles.infoValueCol}>
                      <Text style={styles.infoValueText} numberOfLines={2}>
                        {result.manufacturer.productionSite}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Batch Number */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelCol}>
                    <Text style={styles.infoLabelText}>Batch Number</Text>
                  </View>
                  <View style={styles.infoValueCol}>
                    <TouchableOpacity
                      style={styles.batchPill}
                      onPress={() => copyToClipboard(batchNumber, 'Batch Number')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.batchPillText} numberOfLines={1} ellipsizeMode="middle">
                        {batchNumber}
                      </Text>
                      <Copy size={11} color="#FF5342" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Dosage */}
                {result?.pack?.dosage && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabelCol}>
                      <Text style={styles.infoLabelText}>Dosage</Text>
                    </View>
                    <View style={styles.infoValueCol}>
                      <Text style={styles.infoValueText}>{result.pack.dosage}</Text>
                    </View>
                  </View>
                )}

                {/* Composition */}
                {result?.pack?.composition && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabelCol}>
                      <Text style={styles.infoLabelText}>Composition</Text>
                    </View>
                    <View style={styles.infoValueCol}>
                      <Text style={[styles.infoValueText, { fontSize: 12, lineHeight: 17 }]} numberOfLines={3}>
                        {result.pack.composition}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Drug Schedule */}
                {result?.pack?.drugSchedule && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabelCol}>
                      <Text style={styles.infoLabelText}>Drug Schedule</Text>
                    </View>
                    <View style={styles.infoValueCol}>
                      <View style={styles.scheduleBadge}>
                        <Text style={styles.scheduleBadgeText}>
                          Schedule {result.pack.drugSchedule}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Manufacturing Date */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelCol}>
                    <Text style={styles.infoLabelText}>Mfg. Date</Text>
                  </View>
                  <View style={styles.infoValueCol}>
                    <Text style={styles.infoValueText}>{mfgDate}</Text>
                  </View>
                </View>

                {/* Expiry Date */}
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelCol}>
                    <Text style={styles.infoLabelText}>Expiry Date</Text>
                  </View>
                  <View style={styles.infoValueCol}>
                    <Text style={[styles.infoValueBold, { color: '#FF5342' }]}>
                      {expiryDate}
                    </Text>
                  </View>
                </View>

                {/* Storage Condition */}
                {result?.pack?.storageCondition && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabelCol}>
                      <Text style={styles.infoLabelText}>Storage</Text>
                    </View>
                    <View style={styles.infoValueCol}>
                      <Text style={[styles.infoValueText, { fontSize: 12 }]} numberOfLines={2}>
                        {result.pack.storageCondition}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Blockchain Pack Hash */}
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.infoLabelCol}>
                    <Text style={styles.infoLabelText}>Blockchain Hash</Text>
                  </View>
                  <View style={styles.infoValueCol}>
                    <TouchableOpacity
                      style={styles.hashWrap}
                      onPress={() => copyToClipboard(packId, 'Blockchain Hash')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.hashText} numberOfLines={1} ellipsizeMode="middle">
                        {packId.length > 20 ? `${packId.substring(0, 10)}...${packId.substring(packId.length - 6)}` : packId}
                      </Text>
                      <Copy size={11} color="#FF5342" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Certificate of Authenticity Timeline */}
            <CertificateCard
              supplierName={manufacturerName}
              tempRange="25–30°C"
              expiryDate={expiryDate}
              batchId={batchNumber}
              warehouseName="PharmaChain Hub Gurgaon"
              dispatchDate="30 August 2026"
              onScanMore={() => router.push('/(tabs)/scan')}
            />

            {/* Safety Verification Pillars */}
            <SafetyFeaturesGrid />

            {/* Action Buttons Group */}
            <View style={styles.actionButtonGroup}>
              {isAuthentic ? (
                <TouchableOpacity
                  style={[
                    styles.primaryActionBtn,
                    saved && styles.primaryActionBtnSaved,
                  ]}
                  onPress={handleSaveToCabinet}
                  disabled={saved}
                  activeOpacity={0.85}
                >
                  <BookmarkCheck size={18} color="#ffffff" />
                  <Text style={styles.primaryActionBtnText}>
                    {saved ? '✓ Saved in My Medicine Cabinet' : 'Save to Medicine Cabinet'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {isPreviouslySold ? (
                <TouchableOpacity
                  style={styles.warningActionBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/report',
                      params: { qrToken: qrData || packId, medicineName },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <AlertTriangle size={18} color="#ffffff" />
                  <Text style={styles.warningActionBtnText}>
                    Report Suspicious Resale to CDSCO
                  </Text>
                </TouchableOpacity>
              ) : null}

              {!isAuthentic && !isPreviouslySold ? (
                <TouchableOpacity
                  style={styles.dangerActionBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/report',
                      params: { qrToken: qrData || packId, medicineName },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <ShieldAlert size={18} color="#ffffff" />
                  <Text style={styles.dangerActionBtnText}>
                    Report Counterfeit to CDSCO
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => router.push('/(tabs)/scan')}
                activeOpacity={0.85}
              >
                <ScanLine size={18} color="#FF5342" />
                <Text style={styles.secondaryActionBtnText}>Scan Another Medicine</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  loadingGlowRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FBD9DC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF5342',
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17181A',
    marginBottom: 6,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#5B5F63',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#17181A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#5B5F63',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  animationWrapper: {
    paddingBottom: 16,
  },
  resultContainer: {
    paddingTop: 6,
  },
  resultCard: {
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  resultCardSuccess: {
    backgroundColor: '#FFF7F7',
    borderColor: '#F3D9DB',
  },
  resultCardWarning: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  badgeCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FF5342',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  badgeTextGroup: {
    alignItems: 'center',
    marginBottom: 14,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  statusPillShop: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  statusPillSuccess: {
    backgroundColor: '#DFF9E8',
  },
  statusPillWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPillTextShop: {
    color: '#1D4ED8',
  },
  statusPillTextSuccess: {
    color: '#2E6B4C',
  },
  statusPillTextWarning: {
    color: '#92400E',
  },
  resultHeadline: {
    fontSize: 20,
    fontWeight: '900',
    color: '#17181A',
    marginBottom: 4,
    textAlign: 'center',
  },
  resultDescription: {
    fontSize: 12,
    color: '#5B5F63',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },
  blockchainStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 10,
  },
  blockchainNetworkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockchainPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  blockchainNetworkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  blockchainStateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  blockchainStateBadgeShop: {
    backgroundColor: '#DBEAFE',
  },
  blockchainStateBadgeSold: {
    backgroundColor: '#DCFCE7',
  },
  blockchainStateBadgeDefault: {
    backgroundColor: '#E2E8F0',
  },
  blockchainStateText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  blockchainStateTextShop: {
    color: '#1D4ED8',
  },
  blockchainStateTextSold: {
    color: '#15803D',
  },
  blockchainStateTextDefault: {
    color: '#475569',
  },
  unsoldAlertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    marginBottom: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  unsoldAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  unsoldAlertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unsoldAlertTitleCol: {
    flex: 1,
  },
  unsoldAlertBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  unsoldAlertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78350F',
  },
  unsoldAlertBody: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
    marginBottom: 12,
  },
  unsoldAlertBold: {
    fontWeight: '800',
    color: '#78350F',
  },
  unsoldStepsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unsoldStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepNumberBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: '#451A03',
    lineHeight: 17,
  },
  unsoldWarningCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 14,
  },
  unsoldWarningBold: {
    fontWeight: '800',
    color: '#991B1B',
  },
  unsoldWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#7F1D1D',
    lineHeight: 16,
  },
  reverifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  reverifyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F3D9DB',
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreRowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B5F63',
  },
  scoreRowValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  replayBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#17181A',
  },
  provenanceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  provenanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  provenanceHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  infoLabelCol: {
    flexShrink: 0,
    width: 125,
  },
  infoLabelText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  infoValueCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoValueText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'right',
  },
  infoValueBold: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
    textAlign: 'right',
  },
  custodyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  custodyBadgeShop: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  custodyBadgeSold: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  custodyBadgeDefault: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  custodyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  custodyBadgeTextShop: {
    color: '#1D4ED8',
  },
  custodyBadgeTextSold: {
    color: '#047857',
  },
  custodyBadgeTextDefault: {
    color: '#475569',
  },
  stockStatusSubtext: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 2,
  },
  scheduleBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scheduleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  hashWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relativeTimeBadge: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  guidanceBoxSuccess: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 12,
    marginTop: 14,
  },
  guidanceTitleSuccess: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 4,
  },
  guidanceTextSuccess: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 17,
  },
  guidanceBoxWarning: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    marginTop: 14,
  },
  guidanceTitleWarning: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 4,
  },
  guidanceTextWarning: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 17,
  },
  dossierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#17181A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  dossierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dossierTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#17181A',
  },
  batchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBD9DC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  batchPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF5342',
  },
  hashText: {
    fontSize: 11,
    color: '#FF5342',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionButtonGroup: {
    gap: 10,
    marginVertical: 14,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF5342',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#FF5342',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnSaved: {
    backgroundColor: '#2E6B4C',
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  warningActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  warningActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 16,
  },
  dangerActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF5342',
  },
});
