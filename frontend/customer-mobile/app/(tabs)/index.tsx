import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  QrCode,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Pill,
  X,
  FileText,
  Sparkles,
  Check,
  ScanLine,
  BookmarkCheck,
  Zap,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomerStore } from '../../src/store/customerStore';
import { useAuthStore } from '../../src/store/authStore';
import {
  SAFETY_ALERTS,
  HEALTH_INSIGHTS,
} from '../../src/data/customerData';
import { SavedMedicine, HealthInsight, SafetyAlert } from '../../src/types';

export default function CustomerHomeDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { savedMedicines } = useCustomerStore();
  const { user } = useAuthStore();

  const userName = user?.name || (user as any)?.displayName || user?.email?.split('@')[0] || 'Patient';
  const avatarLetter = userName.charAt(0).toUpperCase();

  const [selectedAlert, setSelectedAlert] = useState<SafetyAlert | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<HealthInsight | null>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<SavedMedicine | null>(null);

  const getStatusBadgeConfig = (status?: string) => {
    switch (status) {
      case 'Verified':
        return {
          bg: '#ecfdf5',
          text: '#065f46',
          border: '#a7f3d0',
          dot: '#10b981',
          icon: <ShieldCheck size={14} color="#059669" />,
        };
      case 'Expiring Soon':
        return {
          bg: '#fffbeb',
          text: '#92400e',
          border: '#fde68a',
          dot: '#f59e0b',
          icon: <Clock size={14} color="#d97706" />,
        };
      case 'Needs Attention':
        return {
          bg: '#fff7ed',
          text: '#9a3412',
          border: '#fed7aa',
          dot: '#ea580c',
          icon: <AlertCircle size={14} color="#ea580c" />,
        };
      default:
        return {
          bg: '#f3f4f6',
          text: '#4b5563',
          border: '#e5e7eb',
          dot: '#9ca3af',
          icon: <ShieldCheck size={14} color="#6b7280" />,
        };
    }
  };

  const verifiedCount = savedMedicines.filter((m) => m.status === 'Verified').length;
  const overallSafetyScore =
    savedMedicines.length > 0
      ? Math.round(
          savedMedicines.reduce((sum, m) => sum + (m.safetyScore || 95), 0) /
            savedMedicines.length
        )
      : 100;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 8,
            paddingBottom: (insets.bottom || 10) + 30,
          },
        ]}
      >
        {/* 1. Header & Brand Context */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarPill}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.headerTextContainer}>
              <View style={styles.userTitleRow}>
                <Text style={styles.greeting}>Hi, {userName}</Text>
                <View style={styles.verifiedUserBadge}>
                  <Check size={11} color="#ea580c" strokeWidth={3} />
                </View>
              </View>
              <Text style={styles.subGreeting}>PharmaChain Verified Patient</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.brandBadge}>
            <ShieldCheck size={14} color="#ea580c" />
            <Text style={styles.brandBadgeText}>PharmaChain</Text>
          </View>
        </View>

        {/* 2. Hero Quick-Scan Card (Warm Sunset Fire Aesthetic) */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroTagRow}>
              <Sparkles size={13} color="#fde047" />
              <Text style={styles.heroTagText}>BLOCKCHAIN SECURITY</Text>
            </View>
            <Text style={styles.heroTitle}>Verify Your Medicine</Text>
            <Text style={styles.heroSubtitle}>
              Scan 2D DataMatrix on your packaging to verify batch purity and Hyperledger provenance.
            </Text>

            <TouchableOpacity
              style={styles.heroScanBtn}
              onPress={() => router.push('/(tabs)/scan')}
              activeOpacity={0.85}
            >
              <ScanLine size={18} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.heroScanBtnText}>Open Security Scanner</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroGraphicContainer}>
            <View style={styles.heroGlowCircle}>
              <QrCode size={52} color="#fdba74" strokeWidth={1.8} />
            </View>
          </View>
        </View>

        {/* 3. Safety Stats Strip (Warm Amber & Coral) */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{savedMedicines.length}</Text>
            <Text style={styles.statLabel}>Saved Medicines</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#ea580c' }]}>
              {verifiedCount}
            </Text>
            <Text style={styles.statLabel}>100% Authentic</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#e11d48' }]}>
              {overallSafetyScore}%
            </Text>
            <Text style={styles.statLabel}>Cabinet Safety</Text>
          </View>
        </View>

        {/* 4. My Medicine Cabinet (Zero Dummy Data) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <BookmarkCheck size={18} color="#ea580c" />
              <Text style={styles.sectionTitle}>My Medicine Cabinet</Text>
            </View>
            {savedMedicines.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/history')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All ({savedMedicines.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {savedMedicines.length === 0 ? (
            <View style={styles.emptyCabinetCard}>
              <View style={styles.emptyCabinetIconCircle}>
                <Pill size={32} color="#ff5a36" />
              </View>
              <Text style={styles.emptyCabinetTitle}>No Medicines in Cabinet Yet</Text>
              <Text style={styles.emptyCabinetDesc}>
                Scan your medicine packaging with PharmaChain to verify authenticity and save it here.
              </Text>
              <TouchableOpacity
                style={styles.emptyCabinetBtn}
                onPress={() => router.push('/(tabs)/scan')}
                activeOpacity={0.85}
              >
                <ScanLine size={16} color="#ffffff" />
                <Text style={styles.emptyCabinetBtnText}>Scan First Medicine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.medicineList}>
              {savedMedicines.slice(0, 3).map((med) => (
                <TouchableOpacity
                  key={med.id}
                  style={styles.medicineCard}
                  onPress={() => setSelectedMedicine(med)}
                  activeOpacity={0.8}
                >
                  <View style={styles.medicineCardLeft}>
                    <View style={styles.medicineIconCircle}>
                      <Pill size={20} color="#ea580c" />
                    </View>
                    <View style={styles.medicineInfo}>
                      <Text style={styles.medicineName} numberOfLines={1}>
                        {med.name}
                      </Text>
                      <Text style={styles.medicineBatch}>
                        Batch: {med.batchNumber} • {med.dosage}
                      </Text>
                      <Text style={styles.medicineExpiry}>
                        Expires: {med.expiryDate}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.verifiedBadgeSmall}>
                    <ShieldCheck size={13} color="#c2410c" />
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 5. National Safety & Recall Advisories */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <AlertTriangle size={18} color="#ea580c" />
              <Text style={styles.sectionTitle}>CDSCO Safety Bulletins</Text>
            </View>
          </View>

          {SAFETY_ALERTS.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
              onPress={() => setSelectedAlert(alert)}
              activeOpacity={0.8}
            >
              <View style={styles.alertTopRow}>
                <View style={styles.alertSourceBadge}>
                  <Text style={styles.alertSourceText}>{alert.source}</Text>
                </View>
                <Text style={styles.alertDate}>{alert.date}</Text>
              </View>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertSummary} numberOfLines={2}>
                {alert.summary}
              </Text>
              <View style={styles.alertFooter}>
                <Text style={styles.alertActionText}>Read CDSCO Directive</Text>
                <ChevronRight size={14} color="#ea580c" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 6. Health & Counterfeit Intelligence Feed (Warm Pastel Cards) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <Sparkles size={18} color="#e11d48" />
              <Text style={styles.sectionTitle}>Patient Safety Education</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalFeed}
          >
            {HEALTH_INSIGHTS.map((insight) => (
              <TouchableOpacity
                key={insight.id}
                style={styles.insightCard}
                onPress={() => setSelectedInsight(insight)}
                activeOpacity={0.8}
              >
                <View style={styles.insightCategoryBadge}>
                  <Text style={styles.insightCategoryText}>{insight.category}</Text>
                </View>
                <Text style={styles.insightTitle} numberOfLines={2}>
                  {insight.title}
                </Text>
                <Text style={styles.insightSummary} numberOfLines={3}>
                  {insight.summary}
                </Text>
                <View style={styles.insightFooter}>
                  <Text style={styles.insightReadTime}>{insight.readTime}</Text>
                  <Text style={styles.insightTap}>Read Guide →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 7. Pharmacovigilance & Helpline Card (Warm Coral Sunset) */}
        <View style={styles.helplineCard}>
          <View style={styles.helplineLeft}>
            <Text style={styles.helplineTitle}>Suspect a Fake Medicine?</Text>
            <Text style={styles.helplineDesc}>
              Directly lodge an encrypted report to the National Pharmacovigilance Cell.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.helplineBtn}
            onPress={() => router.push('/report')}
            activeOpacity={0.85}
          >
            <FileText size={16} color="#ffffff" />
            <Text style={styles.helplineBtnText}>File Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* Detail Modal: Saved Medicine                                              */}
      {/* ========================================================================= */}
      <Modal
        visible={!!selectedMedicine}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMedicine(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: (insets.bottom || 10) + 16 }]}>
            {selectedMedicine && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleBox}>
                    <Text style={styles.modalSheetTitle}>Medicine Authenticity Record</Text>
                    <Text style={styles.modalSheetSubtitle}>PharmaChain Digital Passport</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedMedicine(null)}
                  >
                    <X size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                  {/* Status Banner */}
                  <View
                    style={[
                      styles.modalStatusBanner,
                      {
                        backgroundColor: getStatusBadgeConfig(selectedMedicine.status).bg,
                        borderColor: getStatusBadgeConfig(selectedMedicine.status).border,
                      },
                    ]}
                  >
                    <View style={styles.modalStatusIconWrapper}>
                      {getStatusBadgeConfig(selectedMedicine.status).icon}
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.modalStatusTitle,
                          { color: getStatusBadgeConfig(selectedMedicine.status).text },
                        ]}
                      >
                        Verification Status: {selectedMedicine.status}
                      </Text>
                      <Text style={styles.modalStatusDesc}>
                        Safety Score: {selectedMedicine.safetyScore}/100 • Verified via cryptographic signature
                      </Text>
                    </View>
                  </View>

                  {/* Medicine Details */}
                  <View style={styles.modalDetailsGroup}>
                    <Text style={styles.modalGroupName}>Medicine Specification</Text>

                    <View style={styles.modalFieldRow}>
                      <Text style={styles.modalFieldLabel}>Product Name</Text>
                      <Text style={styles.modalFieldValueBold}>{selectedMedicine.name}</Text>
                    </View>

                    <View style={styles.modalFieldRow}>
                      <Text style={styles.modalFieldLabel}>Generic Composition</Text>
                      <Text style={styles.modalFieldValue}>{selectedMedicine.genericName}</Text>
                    </View>

                    {selectedMedicine.composition && (
                      <View style={styles.modalFieldRow}>
                        <Text style={styles.modalFieldLabel}>Active Ingredients</Text>
                        <Text style={[styles.modalFieldValue, { fontSize: 12 }]}>{selectedMedicine.composition}</Text>
                      </View>
                    )}

                    {selectedMedicine.drugSchedule && (
                      <View style={styles.modalFieldRow}>
                        <Text style={styles.modalFieldLabel}>Drug Schedule</Text>
                        <Text style={[styles.modalFieldValue, { color: '#0369a1', fontWeight: '700' }]}>
                          Schedule {selectedMedicine.drugSchedule}
                        </Text>
                      </View>
                    )}

                    <View style={styles.modalFieldRow}>
                      <Text style={styles.modalFieldLabel}>Dosage / Strength</Text>
                      <Text style={styles.modalFieldValue}>{selectedMedicine.dosage}</Text>
                    </View>

                    <View style={styles.modalFieldRow}>
                      <Text style={styles.modalFieldLabel}>Manufacturer</Text>
                      <Text style={styles.modalFieldValue}>{selectedMedicine.manufacturer}</Text>
                    </View>

                    {selectedMedicine.productionSite && (
                      <View style={styles.modalFieldRow}>
                        <Text style={styles.modalFieldLabel}>Facility Location</Text>
                        <Text style={styles.modalFieldValue}>{selectedMedicine.productionSite}</Text>
                      </View>
                    )}

                    {selectedMedicine.storageCondition && (
                      <View style={styles.modalFieldRow}>
                        <Text style={styles.modalFieldLabel}>Storage</Text>
                        <Text style={[styles.modalFieldValue, { fontSize: 12, color: '#4b5563' }]}>
                          {selectedMedicine.storageCondition}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalDetailsGroup}>
                    <Text style={styles.modalGroupName}>Batch & Expiry Trace</Text>

                    <View style={styles.modalFieldRow}>
                      <Text style={styles.modalFieldLabel}>Batch Number</Text>
                      <Text style={[styles.modalFieldValueBold, { color: '#3b00b9' }]}>
                        {selectedMedicine.batchNumber}
                      </Text>
                    </View>

                    <View style={styles.modalFieldRow}>
                      <Text style={styles.modalFieldLabel}>Pack Serial ID</Text>
                      <Text style={styles.modalFieldValue}>{selectedMedicine.packId}</Text>
                    </View>

                    <View style={styles.modalFieldRow}>
                      <Text style={styles.modalFieldLabel}>Manufacturing Date</Text>
                      <Text style={styles.modalFieldValue}>{selectedMedicine.mfgDate}</Text>
                    </View>

                    <View style={styles.modalFieldRow}>
                      <Text style={styles.modalFieldLabel}>Expiry Date</Text>
                      <Text style={[styles.modalFieldValueBold, { color: '#dc2626' }]}>
                        {selectedMedicine.expiryDate}
                      </Text>
                    </View>
                  </View>

                  {selectedMedicine.instructions && (
                    <View style={styles.modalDetailsGroup}>
                      <Text style={styles.modalGroupName}>Prescription Guidelines</Text>
                      <Text style={styles.modalInstructionText}>
                        {selectedMedicine.instructions}
                      </Text>
                      {selectedMedicine.prescribedBy && (
                        <Text style={styles.modalDoctorText}>
                          Prescribed by: {selectedMedicine.prescribedBy}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.modalActionButtons}>
                    <TouchableOpacity
                      style={styles.modalPrimaryBtn}
                      onPress={() => {
                        setSelectedMedicine(null);
                        router.push({
                          pathname: '/scan-result',
                          params: { status: 'authentic' },
                        });
                      }}
                    >
                      <ShieldCheck size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.modalPrimaryBtnText}>View Full Certificate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalSecondaryBtn}
                      onPress={() => {
                        setSelectedMedicine(null);
                        router.push('/report');
                      }}
                    >
                      <AlertTriangle size={18} color="#ea580c" style={{ marginRight: 6 }} />
                      <Text style={styles.modalSecondaryBtnText}>Report Irregularity</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Health Insight Modal */}
      <Modal visible={Boolean(selectedInsight)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalTag, { backgroundColor: '#fff1f2' }]}>
                <Text style={[styles.modalTagText, { color: '#e11d48' }]}>
                  {selectedInsight?.category}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedInsight(null)}>
                <X size={20} color="#78716c" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalTitle}>{selectedInsight?.title}</Text>
            <Text style={styles.modalSource}>{selectedInsight?.readTime}</Text>

            <View style={styles.modalPointsList}>
              {selectedInsight?.content.map((pt, idx) => (
                <View key={idx} style={styles.modalPointRow}>
                  <View style={styles.modalPointDot} />
                  <Text style={styles.modalPointText}>{pt}</Text>
                </View>
              ))}
            </View>

            <View style={styles.modalActionBox}>
              <Text style={styles.modalActionTitle}>Key Takeaway:</Text>
              <Text style={styles.modalActionDesc}>{selectedInsight?.keyTakeaway}</Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedInsight(null)}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffbf7', // Warm ivory/cream
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff5a36',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#ff5a36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerTextContainer: {
    gap: 2,
  },
  userTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greeting: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1c1917',
  },
  verifiedUserBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  subGreeting: {
    fontSize: 11,
    color: '#78716c',
    fontWeight: '600',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffedd5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c2410c',
  },
  heroCard: {
    backgroundColor: '#1c1917', // Obsidian with warm fire glow
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
    shadowColor: '#ff5a36',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
    paddingRight: 10,
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fdba74',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#d6d3d1',
    lineHeight: 17,
    marginBottom: 16,
  },
  heroScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ff5a36',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignSelf: 'flex-start',
    shadowColor: '#ff5a36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  heroScanBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroGraphicContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGlowCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 90, 54, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(253, 186, 116, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1c1917',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78716c',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#fed7aa',
    alignSelf: 'center',
  },
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1c1917',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  emptyCabinetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderStyle: 'dashed',
  },
  emptyCabinetIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyCabinetTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1c1917',
    marginBottom: 6,
  },
  emptyCabinetDesc: {
    fontSize: 12,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 260,
  },
  emptyCabinetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ff5a36',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: '#ff5a36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyCabinetBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  medicineList: {
    gap: 10,
  },
  medicineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  medicineCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  medicineIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1c1917',
    marginBottom: 2,
  },
  medicineBatch: {
    fontSize: 11,
    color: '#78716c',
    marginBottom: 2,
  },
  medicineExpiry: {
    fontSize: 10,
    color: '#ea580c',
    fontWeight: '800',
  },
  verifiedBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  alertTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertSourceBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  alertSourceText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#c2410c',
  },
  alertDate: {
    fontSize: 10,
    color: '#a8a29e',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1c1917',
    marginBottom: 4,
  },
  alertSummary: {
    fontSize: 11,
    color: '#78716c',
    lineHeight: 16,
    marginBottom: 8,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  horizontalFeed: {
    gap: 12,
    paddingRight: 10,
  },
  insightCard: {
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'space-between',
  },
  insightCategoryBadge: {
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  insightCategoryText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#e11d48',
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1c1917',
    marginBottom: 6,
    lineHeight: 18,
  },
  insightSummary: {
    fontSize: 11,
    color: '#78716c',
    lineHeight: 16,
    marginBottom: 12,
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3ede8',
    paddingTop: 8,
  },
  insightReadTime: {
    fontSize: 10,
    color: '#a8a29e',
  },
  insightTap: {
    fontSize: 10,
    fontWeight: '800',
    color: '#e11d48',
  },
  helplineCard: {
    backgroundColor: '#ff5a36',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#ff5a36',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  helplineLeft: {
    flex: 1,
    paddingRight: 12,
  },
  helplineTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  helplineDesc: {
    fontSize: 11,
    color: '#ffedd5',
    lineHeight: 16,
  },
  helplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c2410c',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  helplineBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTag: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1c1917',
    marginBottom: 4,
  },
  modalSource: {
    fontSize: 11,
    color: '#78716c',
    marginBottom: 14,
  },
  modalBody: {
    fontSize: 13,
    color: '#44403c',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalPointsList: {
    gap: 10,
    marginBottom: 16,
  },
  modalPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  modalPointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e11d48',
    marginTop: 6,
  },
  modalPointText: {
    fontSize: 12,
    color: '#44403c',
    lineHeight: 18,
    flex: 1,
  },
  modalActionBox: {
    backgroundColor: '#fffaf5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  modalActionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1c1917',
    marginBottom: 4,
  },
  modalActionDesc: {
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '700',
    lineHeight: 17,
  },
  modalCloseBtn: {
    backgroundColor: '#1c1917',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '88%',
  },
  modalHeaderTitleBox: {
    flex: 1,
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  modalSheetSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  modalScroll: {
    marginTop: 16,
  },
  modalStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalStatusIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalStatusDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  modalDetailsGroup: {
    marginBottom: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalGroupName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  modalFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalFieldLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  modalFieldValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  modalFieldValueBold: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  modalInstructionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  modalDoctorText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  modalActionButtons: {
    gap: 10,
    marginTop: 6,
    marginBottom: 20,
  },
  modalPrimaryBtn: {
    backgroundColor: '#3b00b9',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b00b9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  modalPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  modalSecondaryBtnText: {
    color: '#ea580c',
    fontSize: 14,
    fontWeight: '700',
  },
});
