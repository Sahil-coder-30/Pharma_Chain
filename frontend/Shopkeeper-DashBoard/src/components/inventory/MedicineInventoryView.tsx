import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import {
  Boxes,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { ShopInventoryItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';

export const MedicineInventoryView: React.FC = () => {
  const { inventory, refreshInventory, loading } = useDashboard();
  const { showToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshInventory?.();
  }, [refreshInventory]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshInventory?.();
    setIsRefreshing(false);
    showToast({
      type: 'info',
      title: 'Inventory Synchronized',
      message: 'Shelf inventory synced with live backend ledger.',
    });
  };

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const categories = ['ALL', 'Gastrointestinal', 'Antibiotics', 'Cardiovascular', 'Antidiabetic', 'Analgesics'];

  const filteredInventory = inventory.filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });

  const handleExportCSV = () => {
    if (filteredInventory.length === 0) {
      showToast({
        type: 'warning',
        title: 'No Data to Export',
        message: 'There are no inventory records to export.',
      });
      return;
    }

    const headers = ['SKU', 'Medicine Name', 'Generic Name', 'Batch ID', 'Manufacturer', 'Stock', 'Unit MRP', 'Expiry Date', 'Status'];
    const rows = filteredInventory.map((i) => [
      `"${i.sku || ''}"`,
      `"${(i.medicineName || '').replace(/"/g, '""')}"`,
      `"${(i.genericName || '').replace(/"/g, '""')}"`,
      `"${i.batchId || ''}"`,
      `"${(i.manufacturerName || '').replace(/"/g, '""')}"`,
      i.packCount,
      i.unitMrp,
      i.expiryDate,
      i.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    link.setAttribute('download', `Pharmacy_Inventory_${istDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Inventory Exported',
      message: 'Retail pharmacy stock CSV manifest downloaded successfully.',
    });
  };

  const columns: Column<ShopInventoryItem>[] = [
    {
      key: 'medicineName',
      header: 'Medicine & Generic Formula',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-bold text-[var(--text-primary)] block text-xs">{item.medicineName}</span>
          <span className="text-[11px] text-[var(--text-muted)]">
            {item.genericName} • {item.strength} ({item.form})
          </span>
        </div>
      ),
    },
    {
      key: 'batchId',
      header: 'Batch ID & Manufacturer',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
            {item.batchId}
          </span>
          <span className="block text-[10px] text-[var(--text-muted)]">{item.manufacturerName}</span>
        </div>
      ),
    },
    {
      key: 'packCount',
      header: 'Current Stock',
      align: 'right',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
            {item.packCount.toLocaleString()}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block">Packs</span>
        </div>
      ),
    },
    {
      key: 'unitMrp',
      header: 'Unit MRP',
      align: 'right',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-[var(--text-primary)]">
          ₹{item.unitMrp.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Shelf Expiry',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-mono text-xs text-[var(--text-primary)] block">{item.expiryDate}</span>
          <span
            className={`text-[10px] font-semibold ${
              item.daysToExpiry < 60 ? 'text-amber-500 font-bold' : 'text-[var(--text-muted)]'
            }`}
          >
            {item.daysToExpiry > 0 ? `${item.daysToExpiry} days left` : 'Expired / Locked'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Stock Status',
      align: 'center',
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Live Medicine Inventory</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {inventory.length} SKUs Listed
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time pharmacy shelf stock synchronized with blockchain intake and counter dispense events
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Stock'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Stock (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer whitespace-nowrap ${
              categoryFilter === cat
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        data={filteredInventory}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable={true}
        searchPlaceholder="Search by medicine name, generic salt, batch ID..."
        searchFilter={(item, query) =>
          item.medicineName.toLowerCase().includes(query) ||
          item.genericName.toLowerCase().includes(query) ||
          item.batchId.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
        }
        pageSize={8}
      />
    </div>
  );
};
