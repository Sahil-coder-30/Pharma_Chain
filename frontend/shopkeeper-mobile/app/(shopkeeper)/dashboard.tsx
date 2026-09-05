import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import {
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Store,
  Boxes,
  ShoppingCart,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Building2,
  Sparkles,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  Radio,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { getStats, getHistory, getProfile } from '../../src/services/api/shopkeeper';
import { PharmaTheme } from '../../src/constants/theme';
import { SkeletonStatCard, SkeletonHistoryCard } from '../../src/components/common/Skeleton';
import { PharmaChainLogo } from '../../src/components/common/PharmaChainLogo';

export default function DashboardScreen() {
  const router = useRouter();
  const { shopkeeper, user, updateShopkeeper } = useAuthStore();

  const [stats, setStats] = useState({
    verifiedToday: 0,
    suspiciousToday: 0,
    counterfeitToday: 0,
  });

  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, historyRes, profileRes] = await Promise.allSettled([
        getStats(),
        getHistory({ limit: 8 }),
        getProfile(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.stats) {
        setStats(statsRes.value.data.stats);
      } else if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        setStats(statsRes.value.stats);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value?.data?.history) {
        setRecentScans(historyRes.value.data.history);
      } else if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value?.history)) {
        setRecentScans(historyRes.value.history);
      } else if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value)) {
        setRecentScans(historyRes.value);
      }

      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        updateShopkeeper(profileRes.value.data);
      }
    } catch (err: any) {
      console.warn('[Dashboard] fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateShopkeeper]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const shopName =
    shopkeeper?.shopName || user?.displayName || 'Apollo Medicos & Pharmacy';
  const shopId = shopkeeper?.shopId || user?.shopId || 'SHOP-2026';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PharmaTheme.colors.primary]}
            tintColor={PharmaTheme.colors.primary}
          />
        }
      >
        {/* Luxury Titanium Glass Header Bar with Official PharmaChain Logo */}
        <View style={styles.headerGlassCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.avatarGlowContainer}>
              <View style={styles.storeAvatarBox}>
                <PharmaChainLogo size={28} colorScheme="cobalt" />
              </View>
              <View style={styles.avatarOnlineDot} />
            </View>

            <View style={styles.headerTextCol}>
              <View style={styles.tagRow}>
                <View style={styles.livePulsePill}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.livePulseText}>CDSCO NODE LIVE</Text>
                </View>
                <View style={styles.peerPill}>
                  <Radio size={10} color={PharmaTheme.colors.primary} />
                  <Text style={styles.peerPillText}>Online</Text>
                </View>
              </View>
              <Text style={styles.storeTitleText} numberOfLines={1}>
                {shopName}
              </Text>
              <Text style={styles.storeSubText}>ID: #{shopId}</Text>
            </View>
          </View>
        </View>

        {/* Hero Interactive Cobalt Scan Portal */}
        <View style={styles.heroPortalCard}>
          <View style={styles.heroOrbGlow1} />
          <View style={styles.heroOrbGlow2} />

          <View style={styles.heroHeader}>
            <View style={styles.heroBadge}>
              <PharmaChainLogo size={14} colorScheme="white" style={{ marginRight: 4 }} />
              <Text style={styles.heroBadgeText}>PHARMACHAIN PHARMACY POS</Text>
            </View>
            <Text style={styles.heroHeading}>Ready to Scan & Audit</Text>
            <Text style={styles.heroDescription}>
              Instantly verify 2D DataMatrix packaging and record dispensations on the blockchain.
            </Text>
          </View>

          {/* Action Pills */}
          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.heroPrimaryBtn}
              onPress={() => router.push({ pathname: '/(shopkeeper)/scan', params: { mode: 'VERIFY' } })}
              activeOpacity={0.85}
            >
              <ShieldCheck size={16} color={PharmaTheme.colors.primary} />
              <Text style={styles.heroPrimaryBtnText}>Verify Pack</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroSecondaryBtn}
              onPress={() => router.push({ pathname: '/(shopkeeper)/scan', params: { mode: 'RECEIVE' } })}
              activeOpacity={0.85}
            >
              <ArrowDownLeft size={16} color="#ffffff" />
              <Text style={styles.heroSecondaryBtnText}>+ Inbound</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroSecondaryBtn}
              onPress={() => router.push({ pathname: '/(shopkeeper)/scan', params: { mode: 'DISPENSE' } })}
              activeOpacity={0.85}
            >
              <ShoppingCart size={16} color="#ffffff" />
              <Text style={styles.heroSecondaryBtnText}>- Dispense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3D Core Metrics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Verification Stream</Text>
          <View style={styles.syncBadge}>
            <Activity size={12} color="#059669" />
            <Text style={styles.syncBadgeText}>Fabric Sync</Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.statsGrid}>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {/* Verified Card */}
            <View style={[styles.statCard, styles.statCardVerified]}>
              <View style={styles.statTopRow}>
                <View style={[styles.statIconBadge, { backgroundColor: '#ecfdf5' }]}>
                  <CheckCircle2 size={18} color="#059669" />
                </View>
                <View style={styles.trendChip}>
                  <TrendingUp size={10} color="#059669" />
                  <Text style={styles.trendChipText}>100%</Text>
                </View>
              </View>
              <Text style={styles.statLargeNumber}>{stats.verifiedToday}</Text>
              <Text style={styles.statLabelText}>Verified Authentic</Text>
              <Text style={styles.statFootnoteText}>Genuine signature</Text>
            </View>

            {/* Suspicious Card */}
            <View style={[styles.statCard, styles.statCardSuspicious]}>
              <View style={styles.statTopRow}>
                <View style={[styles.statIconBadge, { backgroundColor: '#fffbeb' }]}>
                  <AlertTriangle size={18} color="#d97706" />
                </View>
                <Text style={styles.warningTagText}>WARN</Text>
              </View>
              <Text style={[styles.statLargeNumber, { color: '#d97706' }]}>
                {stats.suspiciousToday}
              </Text>
              <Text style={styles.statLabelText}>Duplicate Alerts</Text>
              <Text style={styles.statFootnoteText}>Double scans</Text>
            </View>

            {/* Counterfeit Card */}
            <View style={[styles.statCard, styles.statCardDanger]}>
              <View style={styles.statTopRow}>
                <View style={[styles.statIconBadge, { backgroundColor: '#fef2f2' }]}>
                  <ShieldAlert size={18} color="#dc2626" />
                </View>
                <Text style={styles.dangerTagText}>ALERT</Text>
              </View>
              <Text style={[styles.statLargeNumber, { color: '#dc2626' }]}>
                {stats.counterfeitToday}
              </Text>
              <Text style={styles.statLabelText}>Counterfeits</Text>
              <Text style={styles.statFootnoteText}>Blocked tokens</Text>
            </View>
          </View>
        )}

        {/* Quick Operations Matrix */}
        <Text style={styles.sectionTitle}>Pharmacy Hub Operations</Text>

        <View style={styles.operationsGrid}>
          {/* Op 1: Receive Stock */}
          <TouchableOpacity
            style={styles.operationGlassTile}
            onPress={() => router.push({ pathname: '/(shopkeeper)/scan', params: { mode: 'RECEIVE' } })}
            activeOpacity={0.82}
          >
            <View style={[styles.opIconCircle, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <ArrowDownLeft size={22} color={PharmaTheme.colors.primary} />
            </View>
            <Text style={styles.opTitleText}>Receive Stock</Text>
            <Text style={styles.opDescText}>Inbound shipment scan</Text>
          </TouchableOpacity>

          {/* Op 2: Dispense POS */}
          <TouchableOpacity
            style={styles.operationGlassTile}
            onPress={() => router.push({ pathname: '/(shopkeeper)/scan', params: { mode: 'DISPENSE' } })}
            activeOpacity={0.82}
          >
            <View style={[styles.opIconCircle, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
              <ShoppingCart size={22} color="#4f46e5" />
            </View>
            <Text style={styles.opTitleText}>Dispense POS</Text>
            <Text style={styles.opDescText}>Record customer dispense</Text>
          </TouchableOpacity>

          {/* Op 3: Inventory */}
          <TouchableOpacity
            style={styles.operationGlassTile}
            onPress={() => router.push('/(shopkeeper)/inventory')}
            activeOpacity={0.82}
          >
            <View style={[styles.opIconCircle, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
              <Boxes size={22} color="#0284c7" />
            </View>
            <Text style={styles.opTitleText}>Inventory</Text>
            <Text style={styles.opDescText}>Batch stock & supply levels</Text>
          </TouchableOpacity>

          {/* Op 4: Audit Trail */}
          <TouchableOpacity
            style={styles.operationGlassTile}
            onPress={() => router.push('/(shopkeeper)/transactions')}
            activeOpacity={0.82}
          >
            <View style={[styles.opIconCircle, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}>
              <History size={22} color="#7c3aed" />
            </View>
            <Text style={styles.opTitleText}>Audit Trail</Text>
            <Text style={styles.opDescText}>Full custody ledger</Text>
          </TouchableOpacity>
        </View>

        {/* Live Custody Activity Feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Custody Events</Text>
          <TouchableOpacity
            onPress={() => router.push('/(shopkeeper)/transactions')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewLedgerLink}>View Full Ledger →</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View>
            <SkeletonHistoryCard />
            <SkeletonHistoryCard />
          </View>
        ) : recentScans.length === 0 ? (
          <View style={styles.emptyFeedContainer}>
            <View style={styles.emptyIconCircle}>
              <Boxes size={30} color="#94a3b8" />
            </View>
            <Text style={styles.emptyFeedTitle}>No Activity Recorded Today</Text>
            <Text style={styles.emptyFeedSubtitle}>
              Inbound stock receipts and Point-of-Sale dispenses will appear here in real time.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push({ pathname: '/(shopkeeper)/scan', params: { mode: 'RECEIVE' } })}
              activeOpacity={0.85}
            >
              <ArrowDownLeft size={14} color="#ffffff" />
              <Text style={styles.emptyActionBtnText}>Scan Inbound Delivery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentScans.map((item, index) => {
            const isVerified =
              item.status === 'Verified' ||
              item.status === 'Stock Received' ||
              item.action === 'RECEIVE';
            const isSuspicious = item.status === 'Suspicious' || item.status === 'Duplicate';

            return (
              <TouchableOpacity
                key={item.id || index}
                style={styles.feedGlassCard}
                onPress={() => {
                  if (item.packId) {
                    router.push({ pathname: '/verification', params: { qrData: item.packId, mode: 'VERIFY' } });
                  }
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.feedIconWrapper,
                    isVerified
                      ? { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }
                      : isSuspicious
                      ? { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
                      : { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
                  ]}
                >
                  {isVerified ? (
                    <ShieldCheck size={18} color="#059669" />
                  ) : isSuspicious ? (
                    <AlertTriangle size={18} color="#d97706" />
                  ) : (
                    <ShieldAlert size={18} color="#dc2626" />
                  )}
                </View>

                <View style={styles.feedInfoCol}>
                  <View style={styles.feedHeaderRow}>
                    <Text style={styles.feedItemTitle} numberOfLines={1}>
                      {item.name || item.medicineName || 'Pharmaceutical Unit'}
                    </Text>
                    <View
                      style={[
                        styles.feedStatusBadge,
                        isVerified
                          ? { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }
                          : isSuspicious
                          ? { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
                          : { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.feedStatusBadgeText,
                          isVerified
                            ? { color: '#059669' }
                            : isSuspicious
                            ? { color: '#d97706' }
                            : { color: '#dc2626' },
                        ]}
                      >
                        {item.status || 'Verified'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.feedMetaText}>
                    Batch: <Text style={styles.feedBatchMono}>{item.batch || item.batchNo || 'N/A'}</Text> • Action: {item.action || 'SCAN'}
                  </Text>
                  <View style={styles.timeRow}>
                    <Clock size={11} color="#94a3b8" style={{ marginRight: 4 }} />
                    <Text style={styles.feedTimeText}>{item.time || 'Recently'}</Text>
                  </View>
                </View>
                <ChevronRight size={16} color="#cbd5e1" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  headerGlassCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGlowContainer: {
    position: 'relative',
    marginRight: 14,
  },
  storeAvatarBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10b981',
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  headerTextCol: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  livePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    gap: 4,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  livePulseText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  peerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
    gap: 3,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  peerPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563eb',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  storeTitleText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  storeSubText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#64748b',
    marginTop: 1,
  },
  heroPortalCard: {
    backgroundColor: '#2563eb',
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOrbGlow1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroOrbGlow2: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
  },
  heroHeader: {
    marginBottom: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroHeading: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroDescription: {
    color: '#ffffff',
    opacity: 0.92,
    fontSize: 12,
    lineHeight: 18,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroPrimaryBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroPrimaryBtnText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
  heroSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  heroSecondaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  syncBadgeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 13,
    borderWidth: 1.5,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardVerified: {
    borderColor: '#a7f3d0',
  },
  statCardSuspicious: {
    borderColor: '#fde68a',
  },
  statCardDanger: {
    borderColor: '#fecaca',
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  trendChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
  },
  warningTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#d97706',
  },
  dangerTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
  },
  statLargeNumber: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  statLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  statFootnoteText: {
    fontSize: 9.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  operationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  operationGlassTile: {
    width: '48.4%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  opIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  opTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  opDescText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  viewLedgerLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  emptyFeedContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyFeedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  emptyFeedSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
    gap: 6,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  feedGlassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  feedIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  feedInfoCol: {
    flex: 1,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  feedItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  feedStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  feedStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  feedMetaText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  feedBatchMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#0f172a',
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  feedTimeText: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
});
