import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Package,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Hash,
  Filter,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getHistory } from '../../src/services/api/shopkeeper';
import { PharmaTheme } from '../../src/constants/theme';
import { SkeletonHistoryCard } from '../../src/components/common/Skeleton';

const TABS = ['All', 'Verified', 'Suspicious', 'Counterfeit'] as const;

const formatISTDisplay = (timeVal?: string, timestamp?: string) => {
  if (timeVal && !timeVal.includes('T') && !timeVal.includes('Z')) return timeVal;
  const raw = timestamp || timeVal;
  if (!raw) return 'Recently Logged';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timeVal || 'Recently Logged';
  }
};

export default function TransactionsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('All');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getHistory({ limit: 50 });
      if (res?.data?.history) {
        setHistoryList(res.data.history);
      } else if (Array.isArray(res?.history)) {
        setHistoryList(res.history);
      } else if (Array.isArray(res)) {
        setHistoryList(res);
      }
    } catch (err: any) {
      console.warn('[TransactionsScreen] fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const filteredData = useMemo(() => {
    return activeTab === 'All'
      ? historyList
      : historyList.filter((item) => item.status === activeTab);
  }, [historyList, activeTab]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isVerified =
      item.status === 'Verified' ||
      item.status === 'Stock Received' ||
      item.action === 'RECEIVE';
    const isSuspicious = item.status === 'Suspicious' || item.status === 'Duplicate';

    return (
      <View style={styles.timelineItemWrapper}>
        {/* Timeline Indicator Column */}
        <View style={styles.timelineTrackCol}>
          <View
            style={[
              styles.timelineNodeDot,
              isVerified
                ? { backgroundColor: '#10b981', borderColor: '#a7f3d0' }
                : isSuspicious
                ? { backgroundColor: '#f59e0b', borderColor: '#fde68a' }
                : { backgroundColor: '#ef4444', borderColor: '#fecaca' },
            ]}
          />
          {index < filteredData.length - 1 && <View style={styles.timelineVerticalLine} />}
        </View>

        {/* Transaction Glass Card */}
        <TouchableOpacity
          style={styles.historyGlassCard}
          onPress={() => {
            if (item.packId) {
              router.push({ pathname: '/verification', params: { qrData: item.packId, mode: 'VERIFY' } });
            }
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.iconWrapper,
              isVerified
                ? { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }
                : isSuspicious
                ? { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
                : { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
            ]}
          >
            {isVerified ? (
              <ShieldCheck color="#059669" size={20} />
            ) : isSuspicious ? (
              <AlertTriangle color="#d97706" size={20} />
            ) : (
              <ShieldAlert color="#dc2626" size={20} />
            )}
          </View>

          <View style={styles.infoWrapper}>
            <View style={styles.titleRow}>
              <Text style={styles.medicineNameText} numberOfLines={1}>
                {item.name || item.medicineName || 'Pharmaceutical Unit'}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isVerified
                    ? { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }
                    : isSuspicious
                    ? { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
                    : { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
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

            <Text style={styles.metaText}>
              Action: <Text style={{ fontWeight: '800', color: '#0f172a' }}>{item.action || 'SCAN'}</Text> • Batch: <Text style={styles.batchMonoText}>{item.batch || item.batchNo || 'N/A'}</Text>
            </Text>

            <View style={styles.timeRow}>
              <Clock size={11} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.timeText}>{formatISTDisplay(item.time, item.timestamp || item.createdAt)}</Text>
            </View>
          </View>
          <ChevronRight size={16} color="#cbd5e1" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(shopkeeper)/dashboard');
          }}
          style={styles.iconButton}
          activeOpacity={0.8}
        >
          <ArrowLeft color="#0f172a" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Custody & Audit Ledger</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const count =
            tab === 'All'
              ? historyList.length
              : historyList.filter((item) => item.status === tab).length;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content Stream */}
      {loading && !refreshing ? (
        <View style={{ padding: 16 }}>
          <SkeletonHistoryCard />
          <SkeletonHistoryCard />
          <SkeletonHistoryCard />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PharmaTheme.colors.primary]}
              tintColor={PharmaTheme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Package size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No Transaction Records</Text>
              <Text style={styles.emptySubtitle}>
                Inbound intake scans and point-of-sale dispenses recorded in your store will appear in this ledger.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  tabButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeTabButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  activeTabText: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  timelineItemWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineTrackCol: {
    width: 24,
    alignItems: 'center',
    marginRight: 8,
    paddingTop: 16,
  },
  timelineNodeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    zIndex: 2,
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginTop: 4,
    marginBottom: -16,
  },
  historyGlassCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  infoWrapper: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  medicineNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  batchMonoText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#0f172a',
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
