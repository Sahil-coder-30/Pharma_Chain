import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../features/dashboard/Hooks/dashboard.hooks';
import {
  Receipt,
  Download,
  Printer,
  CheckCircle2,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { SaleTransaction } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';

export const SalesHistoryView: React.FC = () => {
  const { sales, refreshSales, setActiveReceipt, setIsReceiptModalOpen } = useDashboard();
  const { showToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshSales?.();
  }, [refreshSales]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshSales?.();
    setIsRefreshing(false);
    showToast({
      type: 'info',
      title: 'Sales Ledger Updated',
      message: 'Latest counter transactions fetched from blockchain ledger.',
    });
  };

  const handleReprintReceipt = (tx: SaleTransaction) => {
    setActiveReceipt(tx);
    setIsReceiptModalOpen(true);
  };

  const handleExportSales = () => {
    if (sales.length === 0) {
      showToast({
        type: 'warning',
        title: 'No Sales to Export',
        message: 'There are no counter sales transactions to export.',
      });
      return;
    }

    const headers = ['Invoice No', 'Timestamp', 'Patient Name', 'Phone', 'Payment Mode', 'Grand Total', 'Fabric Tx ID', 'Block Number'];
    const rows = sales.map((s) => [
      `"${s.invoiceNo}"`,
      `"${s.timestamp}"`,
      `"${(s.patientName || '').replace(/"/g, '""')}"`,
      `"${s.patientPhone || ''}"`,
      s.paymentMode,
      s.grandTotal,
      `"${s.fabricTxId || ''}"`,
      s.blockNumber,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    link.setAttribute('download', `Pharmacy_Sales_Audit_${istDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Sales Ledger Exported',
      message: 'Retail pharmacy sales CSV audit downloaded successfully.',
    });
  };

  const columns: Column<SaleTransaction>[] = [
    {
      key: 'invoiceNo',
      header: 'Invoice # & Timestamp',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-xs text-[var(--text-primary)] block">
            {item.invoiceNo}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {new Date(item.timestamp).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'patientName',
      header: 'Patient & Prescriber',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-bold text-xs text-[var(--text-primary)] block">{item.patientName}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{item.doctorName || item.patientPhone}</span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Dispensed Medicines',
      render: (item) => (
        <div className="space-y-0.5">
          {item.items.map((it, idx) => (
            <div key={idx} className="text-[11px]">
              <span className="font-medium text-[var(--text-primary)]">{it.medicineName}</span>
              <span className="text-[10px] text-[var(--text-muted)] ml-1">x {it.quantity}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Amount Paid',
      align: 'right',
      sortable: true,
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-sm text-[var(--text-primary)] block">
            ₹{item.grandTotal.toFixed(2)}
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {item.paymentMode}
          </span>
        </div>
      ),
    },
    {
      key: 'fabricTxId',
      header: 'Hyperledger Proof',
      render: (item) => (
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Block #{item.blockNumber}
          </span>
          <span className="font-mono text-[9px] text-[var(--text-muted)] block truncate max-w-[120px]">
            {item.fabricTxId}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => handleReprintReceipt(item)}
          className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Print Receipt"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Sales & Dispense Ledger</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {sales.length} Transactions
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Complete audit trail of pharmacy counter sales committed permanently to the Hyperledger Fabric ledger
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Ledger'}</span>
          </button>
          <button
            onClick={handleExportSales}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-element)] hover:bg-[var(--bg-active)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Sales Audit (CSV)</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={sales}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable={true}
        searchPlaceholder="Search by invoice number, patient name, doctor..."
        searchFilter={(item, query) =>
          item.invoiceNo.toLowerCase().includes(query) ||
          item.patientName.toLowerCase().includes(query) ||
          (item.doctorName && item.doctorName.toLowerCase().includes(query)) ||
          item.fabricTxId.toLowerCase().includes(query)
        }
        pageSize={8}
      />
    </div>
  );
};
