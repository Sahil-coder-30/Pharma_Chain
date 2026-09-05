import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Search,
  Package,
  Boxes,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  X,
  ChevronRight,
  ArrowDownLeft,
  Building2,
  Barcode,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Copy,
  Plus,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getInventory } from '../../src/services/api/shopkeeper';
import { InventoryItem, StockStatus } from '../../src/types';
import { PharmaTheme } from '../../src/constants/theme';
import { SkeletonInventoryCard } from '../../src/components/common/Skeleton';

const TABS: Array<'All' | StockStatus> = [
  'All',
  'In Stock',
  'Low Stock',
  'Expiring Soon',
  'Quarantined',
];

export default function InventoryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'All' | StockStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveInventory = useCallback(async () => {
    try {
      const res = await getInventory();
      if (res?.data?.inventory) {
        setInventoryList(res.data.inventory);
      } else if (Array.isArray(res?.inventory)) {
        setInventoryList(res.inventory);
      } else if (Array.isArray(res)) {
        setInventoryList(res);
      }
    } catch (err: any) {
      console.warn('[InventoryScreen] Fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLiveInventory();
    }, [fetchLiveInventory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveInventory();
  };

  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      const matchesTab = activeTab === 'All' || item.status === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.batchNumber || '').toLowerCase().includes(q) ||
        (item.genericName || '').toLowerCase().includes(q) ||
        (item.locationRack || '').toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [inventoryList, activeTab, searchQuery]);

  const getStatusBadgeConfig = (status: StockStatus) => {
    switch (status) {
      case 'In Stock':
        return {
          bg: '#ecfdf5',
          text: '#059669',
          border: '#a7f3d0',
          indicator: '#10b981',
          icon: <ShieldCheck size={13} color="#059669" />,
        };
      case 'Low Stock':
        return {
          bg: '#fff7ed',
          text: '#ea580c',
          border: '#fed7aa',
          indicator: '#f97316',
          icon: <AlertTriangle size={13} color="#ea580c" />,
        };
      case 'Expiring Soon':
        return {
          bg: '#fffbeb',
          text: '#d97706',
          border: '#fde68a',
          indicator: '#f59e0b',
          icon: <Clock size={13} color="#d97706" />,
        };
      case 'Quarantined':
        return {
          bg: '#fef2f2',
          text: '#dc2626',
          border: '#fecaca',
          indicator: '#ef4444',
          icon: <ShieldAlert size={13} color="#dc2626" />,
        };
      default:
        return {
          bg: '#ecfdf5',
          text: '#059669',
          border: '#a7f3d0',
          indicator: '#10b981',
          icon: <ShieldCheck size={13} color="#059669" />,
        };
    }
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const badge = getStatusBadgeConfig(item.status);

    return (
      <TouchableOpacity
        style={styles.stockCard}
        onPress={() => setSelectedItem(item)}
        activeOpacity={0.8}
      >
        {/* Status Indicator Stripe */}
        <View style={[styles.statusStripe, { backgroundColor: badge.indicator }]} />

        <View style={styles.cardMainContent}>
          <View style={styles.cardTopRow}>
            <View style={styles.iconBox}>
              <Package size={20} color={PharmaTheme.colors.primary} />
            </View>
            <View style={styles.titleInfoCol}>
              <Text style={styles.itemNameText} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemGenericText} numberOfLines={1}>
                {item.genericName || item.name}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: badge.bg, borderColor: badge.border },
              ]}
            >
              {badge.icon}
              <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                {item.status}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardMetaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabelText}>BATCH NUMBER</Text>
              <Text style={styles.batchMonoText}>{item.batchNumber}</Text>
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.metaLabelText}>AVAILABLE</Text>
              <Text
                style={[
                  styles.stockUnitsBold,
                  item.quantity <= 10 && { color: '#ea580c' },
                ]}
              >
                {item.quantity} Units
              </Text>
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.metaLabelText}>EXPIRY DATE</Text>
              <Text
                style={[
                  styles.expiryDateText,
                  item.daysToExpiry <= 30 && { color: '#ea580c', fontWeight: '800' },
                ]}
              >
                {item.expiryDate}
              </Text>
            </View>

            <View style={styles.actionArrowBox}>
              <ChevronRight size={16} color={PharmaTheme.colors.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.headerTitle}>Inventory & Stock</Text>
            <Text style={styles.headerSubtitle}>
              {inventoryList.length} authenticated batches in stock
            </Text>
          </View>
          <TouchableOpacity
            style={styles.intakeButton}
            onPress={() => router.push({ pathname: '/(shopkeeper)/scan', params: { mode: 'RECEIVE' } })}
            activeOpacity={0.85}
          >
            <Plus size={15} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.intakeButtonText}>Receive Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={17} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by brand, generic, batch or rack..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Horizontal Category Filter Pills */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              const count =
                tab === 'All'
                  ? inventoryList.length
                  : inventoryList.filter((i) => i.status === tab).length;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {tab} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Inventory Items List */}
        {loading && !refreshing ? (
          <View style={{ padding: 16 }}>
            <SkeletonInventoryCard />
            <SkeletonInventoryCard />
            <SkeletonInventoryCard />
          </View>
        ) : (
          <FlatList
            data={filteredInventory}
            keyExtractor={(item) => item.id}
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
                  <Boxes size={32} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No Matching Medicine Found' : 'No Batches in Stock'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'Try adjusting your search terms or clearing the filter.'
                    : 'Scan your first inbound medicine delivery to log verified stock into your vault.'}
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
            }
          />
        )}

        {/* Batch Traceability Modal Sheet */}
        <Modal
          visible={!!selectedItem}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedItem(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              {selectedItem && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalSheetTitle}>Batch Traceability Certificate</Text>
                      <Text style={styles.modalSheetSubtitle}>
                        PharmaChain Cryptographic Ledger Record
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.modalCloseBtn}
                      onPress={() => setSelectedItem(null)}
                    >
                      <X size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                    <View
                      style={[
                        styles.modalStatusBanner,
                        {
                          backgroundColor: getStatusBadgeConfig(selectedItem.status).bg,
                          borderColor: getStatusBadgeConfig(selectedItem.status).border,
                        },
                      ]}
                    >
                      <View style={styles.modalStatusIconWrapper}>
                        {getStatusBadgeConfig(selectedItem.status).icon}
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text
                          style={[
                            styles.modalStatusTitle,
                            { color: getStatusBadgeConfig(selectedItem.status).text },
                          ]}
                        >
                          Vault State: {selectedItem.status}
                        </Text>
                        <Text style={styles.modalStatusDesc}>
                          {selectedItem.quantity} units available for verified pharmacy dispensing
                        </Text>
                      </View>
                    </View>

                    {/* Product Specs */}
                    <View style={styles.modalGroup}>
                      <Text style={styles.modalGroupName}>Product Identification</Text>

                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Brand Name</Text>
                        <Text style={styles.modalValueBold}>{selectedItem.name}</Text>
                      </View>

                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Active Generic</Text>
                        <Text style={styles.modalValue}>{selectedItem.genericName}</Text>
                      </View>

                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Manufacturer</Text>
                        <Text style={styles.modalValue}>{selectedItem.manufacturer}</Text>
                      </View>

                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Batch Identifier</Text>
                        <Text style={[styles.modalValueBold, { color: PharmaTheme.colors.primary }]}>
                          {selectedItem.batchNumber}
                        </Text>
                      </View>

                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Expiry Date</Text>
                        <Text style={[styles.modalValueBold, { color: '#ea580c' }]}>
                          {selectedItem.expiryDate}
                        </Text>
                      </View>
                    </View>

                    {/* Storage & Pedigree */}
                    <View style={styles.modalGroup}>
                      <Text style={styles.modalGroupName}>Storage & Logistics</Text>

                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Storage Rack</Text>
                        <Text style={styles.modalValue}>{selectedItem.locationRack}</Text>
                      </View>

                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Distributor</Text>
                        <Text style={styles.modalValue}>{selectedItem.distributor}</Text>
                      </View>

                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Invoice Number</Text>
                        <Text style={styles.modalValue}>{selectedItem.invoiceNumber}</Text>
                      </View>

                      <View style={[styles.modalRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.modalLabel}>Pack Serial ID</Text>
                        <Text style={[styles.modalValue, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                          {selectedItem.packSerialId}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.modalDismissBtn}
                      onPress={() => setSelectedItem(null)}
                    >
                      <Text style={styles.modalDismissBtnText}>Done / Close Certificate</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  intakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 5,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  intakeButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  filtersWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  stockCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  statusStripe: {
    width: 5,
  },
  cardMainContent: {
    flex: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  titleInfoCol: {
    flex: 1,
  },
  itemNameText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  itemGenericText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabelText: {
    fontSize: 9.5,
    color: '#94a3b8',
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  batchMonoText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  stockUnitsBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  expiryDateText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    fontWeight: '600',
  },
  actionArrowBox: {
    paddingLeft: 4,
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
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    gap: 6,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 23, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSheetSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    marginBottom: 8,
  },
  modalStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalStatusIconWrapper: {
    padding: 2,
  },
  modalStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalStatusDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalGroup: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalGroupName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  modalValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  modalValueBold: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '800',
    maxWidth: '60%',
    textAlign: 'right',
  },
  modalDismissBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  modalDismissBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
