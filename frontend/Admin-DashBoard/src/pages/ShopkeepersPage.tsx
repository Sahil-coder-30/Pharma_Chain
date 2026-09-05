import React, { useState, useMemo } from 'react';
import { useAdminData } from '../context/AdminDataContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { RejectDialog } from '../components/common/RejectDialog';
import { LicenseInspectorModal } from '../components/document/LicenseInspectorModal';
import { ShopkeeperRecord, ShopkeeperStatus, LicenseType } from '../types/admin';
import {
  Store,
  Search,
  FileText,
  Eye,
  Sparkles,
} from 'lucide-react';

export const ShopkeepersPage: React.FC = () => {
  const {
    shopkeepers,
    approveShopkeeper,
    rejectShopkeeper,
    suspendShopkeeper,
    unsuspendShopkeeper,
  } = useAdminData();

  const [activeTab, setActiveTab] = useState<'all' | ShopkeeperStatus>('pending');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState<'all' | LicenseType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inspector & Modal States
  const [inspectingShop, setInspectingShop] = useState<ShopkeeperRecord | null>(null);
  const [rejectingShop, setRejectingShop] = useState<ShopkeeperRecord | null>(null);
  const [suspendingShop, setSuspendingShop] = useState<ShopkeeperRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab Counts
  const pendingCount = shopkeepers.filter((s) => s.verificationStatus === 'pending').length;
  const approvedCount = shopkeepers.filter((s) => s.verificationStatus === 'approved' || s.verificationStatus === 'verified').length;
  const rejectedCount = shopkeepers.filter((s) => s.verificationStatus === 'rejected').length;
  const suspendedCount = shopkeepers.filter((s) => s.verificationStatus === 'suspended').length;

  const filteredData = useMemo(() => {
    return shopkeepers.filter((s) => {
      const matchTab = activeTab === 'all' || s.verificationStatus === activeTab;
      const matchType = licenseTypeFilter === 'all' || s.licenseType === licenseTypeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        s.shopName.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.drugLicenseNumber.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.shopId.toLowerCase().includes(q);
      return matchTab && matchType && matchSearch;
    });
  }, [shopkeepers, activeTab, licenseTypeFilter, searchQuery]);

  const handleApprove = async (shop: ShopkeeperRecord) => {
    setActionLoading(true);
    try {
      await approveShopkeeper(shop.shopId);
      setInspectingShop(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectingShop) return;
    setActionLoading(true);
    try {
      await rejectShopkeeper(rejectingShop.shopId, reason);
      setRejectingShop(null);
      setInspectingShop(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSuspend = async (reason: string) => {
    if (!suspendingShop) return;
    setActionLoading(true);
    try {
      await suspendShopkeeper(suspendingShop.shopId, reason);
      setSuspendingShop(null);
      setInspectingShop(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async (shop: ShopkeeperRecord) => {
    setActionLoading(true);
    try {
      await unsuspendShopkeeper(shop.shopId);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header with Quick Metric Chips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-3 py-0.5 rounded-full border border-blue-200/80 dark:border-blue-800/80 uppercase inline-flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-500" />
              National Retail & Wholesale Distribution
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">• Form 20/21/20B/21B</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
            Pharmacy & Retail Drug License Approvals
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl font-medium">
            Statutory review of registered pharmacist credentials and State Licensing Authority wholesale/retail permits.
          </p>
        </div>

        {/* Quick Summary Pill Meter */}
        <div className="flex items-center gap-3 bg-white dark:bg-[#0b172a] p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm self-start md:self-center">
          <div className="px-3 py-1 text-center border-r border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Pending</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">{pendingCount}</span>
          </div>
          <div className="px-3 py-1 text-center border-r border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Verified</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">{approvedCount}</span>
          </div>
          <div className="px-3 py-1 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono">{shopkeepers.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-[#152745] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-blue-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Pending Review</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'pending' ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'approved'
                ? 'bg-white dark:bg-[#152745] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-blue-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Verified Dispensaries</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'approved' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'rejected'
                ? 'bg-white dark:bg-[#152745] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-blue-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Rejected</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'rejected' ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {rejectedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suspended')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'suspended'
                ? 'bg-white dark:bg-[#152745] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-blue-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Suspended</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'suspended' ? 'bg-red-200 dark:bg-red-950 text-red-900 dark:text-red-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {suspendedCount}
            </span>
          </button>
        </div>

        {/* License Type Pill Filter & Search */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={licenseTypeFilter}
            onChange={(e) => setLicenseTypeFilter(e.target.value as any)}
            className="text-xs rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="all">All License Categories</option>
            <option value="retail">Retail Chemist (Form 20/21)</option>
            <option value="wholesale">Wholesale Depot (Form 20B/21B)</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search pharmacy, owner, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 pl-10 pr-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Pharmacies Data Table */}
      <div className="bg-white dark:bg-[#0c1527] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0f1b33] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Dispensary & Location</th>
                <th className="px-6 py-4">Registered Pharmacist</th>
                <th className="px-6 py-4">License Specification</th>
                <th className="px-6 py-4">Certificate Document</th>
                <th className="px-6 py-4">Verification Status</th>
                <th className="px-6 py-4 text-right">Regulatory Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400 dark:text-slate-500">
                    <Store className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No pharmacy records matching filter</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try resetting search or filter tabs</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((shop) => {
                  const isPending = shop.verificationStatus === 'pending';
                  const isApproved = shop.verificationStatus === 'approved' || shop.verificationStatus === 'verified';
                  const isSuspended = shop.verificationStatus === 'suspended';
                  const isExpired = new Date(shop.licenseExpiryDate) < new Date();

                  return (
                    <tr key={shop.shopId} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors group">
                      {/* Pharmacy & Location */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-800 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                            {shop.shopName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[220px]">{shop.shopName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{shop.city}, {shop.state} - {shop.pincode}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">ID: {shop.shopId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Owner / Pharmacist */}
                      <td className="px-6 py-4.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{shop.ownerName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{shop.ownerPhone}</div>
                      </td>

                      {/* License Info */}
                      <td className="px-6 py-4.5">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">{shop.drugLicenseNumber}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant={shop.licenseType} size="sm" />
                          <span className={`text-[10px] font-bold ${isExpired ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            Exp: {shop.licenseExpiryDate}
                          </span>
                        </div>
                      </td>

                      {/* Certificate Document Thumbnail */}
                      <td className="px-6 py-4.5">
                        {shop.documentUrl ? (
                          <button
                            onClick={() => setInspectingShop(shop)}
                            className="inline-flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all shadow-sm font-semibold"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Inspect Form</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">No document attached</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        <Badge variant={shop.verificationStatus} />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInspectingShop(shop)}
                            icon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Review
                          </Button>

                          {isPending && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRejectingShop(shop)}
                              >
                                Reject
                              </Button>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleApprove(shop)}
                              >
                                Approve
                              </Button>
                            </>
                          )}

                          {isApproved && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setSuspendingShop(shop)}
                            >
                              Suspend
                            </Button>
                          )}

                          {isSuspended && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleUnsuspend(shop)}
                            >
                              Unsuspend
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* License Inspector Modal */}
      <LicenseInspectorModal
        isOpen={!!inspectingShop}
        onClose={() => setInspectingShop(null)}
        shopkeeper={inspectingShop}
        onApprove={inspectingShop?.verificationStatus === 'pending' ? () => handleApprove(inspectingShop) : undefined}
        onReject={inspectingShop?.verificationStatus === 'pending' ? () => setRejectingShop(inspectingShop) : undefined}
        onSuspend={inspectingShop?.verificationStatus === 'approved' || inspectingShop?.verificationStatus === 'verified' ? () => setSuspendingShop(inspectingShop) : undefined}
      />

      {/* Rejection Modal */}
      <RejectDialog
        isOpen={!!rejectingShop}
        onClose={() => setRejectingShop(null)}
        onReject={handleConfirmReject}
        title="Reject Pharmacy License Registration"
        targetName={rejectingShop?.shopName || ''}
        loading={actionLoading}
      />

      {/* Suspension Modal */}
      <RejectDialog
        isOpen={!!suspendingShop}
        onClose={() => setSuspendingShop(null)}
        onReject={handleConfirmSuspend}
        title="Emergency Pharmacy License Suspension"
        targetName={suspendingShop?.shopName || ''}
        isSuspension={true}
        loading={actionLoading}
      />
    </div>
  );
};
