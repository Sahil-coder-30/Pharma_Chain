import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import {
  getDashboardDataAPI,
  getBatchesAPI,
  createBatchAPI,
  mintBatchAPI,
  getBatchDetailsAPI,
  getBatchPreviewAPI,
  initiateRecallAPI,
  lookupPackGlobalAPI,
  getBatchExportCsvUrl,
  downloadBatchCsvAPI,
  updateOrderStatusAPI,
  resolveAlertAPI,
  updateBatchAPI,
  deleteBatchAPI,
  verifyPackStatusAPI,
} from '../service/dashboard.api';
import {
  getCachedPage,
  setCachedPage,
  invalidateBatchCache,
  getBatchCacheMeta,
  clearAllBatchCache,
} from '../service/batchCache.service';
import {
  setDashboardData,
  setDashboardLoading,
  setDashboardError,
  addBatch,
  updateBatch,
  removeBatch,
  addRecall,
  updateOrderStatus,
  resolveAlert,
  setActiveRoute,
  setTheme,
  setSelectedBatch,
  setBatchToRecall,
  setDateRange,
  setSidebarCollapsed,
  toggleSidebar,
  setMobileSidebarOpen,
  setSearchModalOpen,
  setHelpModalOpen,
  setRecallModalOpen,
  NavRoute,
} from '../slice/dashboard.slice';
import { useToast } from '../../../context/ToastContext';
import { Batch } from '../../../types';
import { parseApiError } from '../../../utils/errorHandler';

export const useDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((reduxState: RootState) => reduxState.dashboard);
  const { showToast } = useToast();

  const loadDashboard = useCallback(async () => {
    try {
      dispatch(setDashboardLoading(true));
      const data = await getDashboardDataAPI();
      dispatch(setDashboardData(data));
      return data;
    } catch (err: any) {
      const parsed = parseApiError(err, 'Failed to fetch dashboard data');
      dispatch(setDashboardError(parsed.message));
      if (!parsed.isAuthError) {
        showToast({
          type: 'warning',
          title: 'Blockchain Sync Notice',
          message: parsed.message,
        });
      }
      return null;
    } finally {
      dispatch(setDashboardLoading(false));
    }
  }, [dispatch, showToast]);

  const loadBatches = useCallback(async (params?: { status?: string; search?: string }) => {
    try {
      dispatch(setDashboardLoading(true));
      const batches = await getBatchesAPI(params);
      dispatch(setDashboardData({ batches }));
      return batches;
    } catch (err: any) {
      dispatch(setDashboardError(err?.message || 'Failed to load batches'));
      throw err;
    } finally {
      dispatch(setDashboardLoading(false));
    }
  }, [dispatch]);

  const registerNewBatch = useCallback(
    async (batchData: Partial<Batch>) => {
      try {
        dispatch(setDashboardLoading(true));
        const createdBatch = await createBatchAPI(batchData);
        createdBatch.mintStatus = 'MINTED';
        createdBatch.packsMinted = createdBatch.totalQuantity;
        dispatch(addBatch(createdBatch));
        showToast({
          type: 'success',
          title: 'Batch Created & Minted Successfully',
          message: `${createdBatch.id} (${createdBatch.medicineName}) created and cryptographically signed.`,
        });
        return createdBatch;
      } catch (err: any) {
        const parsed = parseApiError(err, 'Error occurred during batch creation.');
        dispatch(setDashboardError(parsed.message));
        showToast({
          type: 'error',
          title: 'Batch Registration Failed',
          message: parsed.message,
        });
        throw new Error(parsed.message);
      } finally {
        dispatch(setDashboardLoading(false));
      }
    },
    [dispatch, showToast]
  );

  const mintBatch = useCallback(
    async (batchId: string) => {
      try {
        const res = await mintBatchAPI(batchId);
        showToast({
          type: 'info',
          title: 'Minting Job Queued',
          message: `ES256 signing scheduled on pharma-core for batch ${batchId}.`,
        });
        return res;
      } catch (err: any) {
        const parsed = parseApiError(err, 'Failed to trigger batch minting.');
        showToast({
          type: 'error',
          title: parsed.isS3Error ? 'AWS S3 Storage Failure' : 'Minting Failed',
          message: parsed.message,
          duration: 8000,
        });
        throw new Error(parsed.message);
      }
    },
    [showToast]
  );

  const fetchBatchDetails = useCallback(
    async (batchId: string) => {
      return await getBatchDetailsAPI(batchId);
    },
    []
  );

  const fetchBatchPreview = useCallback(
    async (batchId: string, page = 1, limit = 50, search = '') => {
      // ── Cache-first: serve from localStorage, skip S3 round-trip ──
      const cached = getCachedPage(batchId, page, limit, search);
      if (cached) {
        return {
          packs: cached.packs,
          totalPacks: cached.totalPacks,
          totalPages: cached.totalPages,
          currentPage: cached.currentPage,
          _fromCache: true,
        };
      }

      // ── Cache miss: fetch from S3 via API, then persist locally ──
      const result = await getBatchPreviewAPI(batchId, page, limit, search);
      if (result?.packs) {
        setCachedPage(batchId, page, limit, search, {
          packs: result.packs,
          totalPacks: result.totalPacks ?? result.packs.length,
          totalPages: result.totalPages ?? 1,
          currentPage: result.currentPage ?? page,
        });
      }
      return result;
    },
    []
  );

  const triggerRecall = useCallback(
    async (batchId: string, reason: string, severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' = 'CRITICAL') => {
      try {
        dispatch(setDashboardLoading(true));
        const recallRecord = await initiateRecallAPI({ batchId, reason, severity });
        dispatch(addRecall(recallRecord));
        // Batch status changed — invalidate all cached pages for this batch
        invalidateBatchCache(batchId);
        showToast({
          type: 'error',
          title: 'Batch Recall Broadcasted',
          message: `Immutable :RECALL transition committed for batch ${batchId}.`,
          duration: 6000,
        });
        return recallRecord;
      } catch (err: any) {
        const parsed = parseApiError(err, 'Failed to initiate recall.');
        dispatch(setDashboardError(parsed.message));
        showToast({
          type: 'error',
          title: 'Recall Failed',
          message: parsed.message,
        });
        throw new Error(parsed.message);
      } finally {
        dispatch(setDashboardLoading(false));
      }
    },
    [dispatch, showToast]
  );

  const lookupIdentifier = useCallback(
    async (identifier: string) => {
      return await lookupPackGlobalAPI(identifier);
    },
    []
  );

  const updateOrderState = useCallback(
    async (orderId: string, status: any) => {
      try {
        await updateOrderStatusAPI(orderId, status);
        dispatch(updateOrderStatus({ orderId, status }));
        showToast({
          type: 'info',
          title: 'Order Status Updated',
          message: `Order ${orderId} transitioned to ${status}.`,
        });
      } catch (err: any) {
        dispatch(setDashboardError(err?.message || 'Failed to update order'));
      }
    },
    [dispatch, showToast]
  );

  const resolveSecurityAlert = useCallback(
    async (alertId: string) => {
      try {
        await resolveAlertAPI(alertId);
        dispatch(resolveAlert(alertId));
        showToast({
          type: 'success',
          title: 'Alert Incident Resolved',
          message: `Incident ${alertId} marked as resolved and filed with compliance archive.`,
        });
      } catch (err: any) {
        dispatch(setDashboardError(err?.message || 'Failed to resolve alert'));
      }
    },
    [dispatch, showToast]
  );

  const toggleThemeMode = useCallback(
    () => {
      dispatch(setTheme('light'));
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    },
    [dispatch]
  );

  const navigateTo = useCallback(
    (route: NavRoute) => {
      dispatch(setActiveRoute(route));
      dispatch(setMobileSidebarOpen(false));
    },
    [dispatch]
  );

  const updateBatchData = useCallback(
    async (batchId: string, updates: Partial<Batch>) => {
      try {
        dispatch(setDashboardLoading(true));
        const updated = await updateBatchAPI(batchId, updates);
        dispatch(updateBatch(updated));
        // Metadata changed — invalidate cached pack pages so next load re-fetches
        invalidateBatchCache(batchId);
        showToast({
          type: 'success',
          title: 'Batch Metadata Updated',
          message: `Batch ${batchId} QA & operational specifications have been updated.`,
        });
        return updated;
      } catch (err: any) {
        const parsed = parseApiError(err, 'Failed to update batch metadata.');
        showToast({
          type: 'error',
          title: 'Update Failed',
          message: parsed.message,
        });
        throw new Error(parsed.message);
      } finally {
        dispatch(setDashboardLoading(false));
      }
    },
    [dispatch, showToast]
  );

  const deleteBatchData = useCallback(
    async (batchId: string) => {
      try {
        dispatch(setDashboardLoading(true));
        const res = await deleteBatchAPI(batchId);
        dispatch(removeBatch(batchId));
        // Batch deleted — purge all its cached pages immediately
        invalidateBatchCache(batchId);
        showToast({
          type: 'success',
          title: 'Batch Deleted',
          message: res.message,
        });
        navigateTo('batches');
        return res;
      } catch (err: any) {
        const parsed = parseApiError(err, 'Failed to delete batch.');
        showToast({
          type: 'error',
          title: 'Deletion Blocked',
          message: parsed.message,
          duration: 8000,
        });
        throw new Error(parsed.message);
      } finally {
        dispatch(setDashboardLoading(false));
      }
    },
    [dispatch, showToast, navigateTo]
  );

  const verifyPackStatus = useCallback(
    async (batchId: string, payload: { signedToken?: string; packHash?: string; serialNumber?: string }) => {
      try {
        return await verifyPackStatusAPI(batchId, payload);
      } catch (err: any) {
        const parsed = parseApiError(err, 'Pack status verification failed.');
        showToast({
          type: 'warning',
          title: 'Verification Incomplete',
          message: parsed.message,
        });
        throw new Error(parsed.message);
      }
    },
    [showToast]
  );

  return {
    ...state,
    updateBatch: updateBatchData,
    deleteBatch: deleteBatchData,
    verifyPackStatus,
    loadDashboard,
    loadBatches,
    registerNewBatch,
    mintBatch,
    fetchBatchDetails,
    fetchBatchPreview,
    triggerRecall,
    lookupIdentifier,
    // Cache utilities — exposed for diagnostics or manual invalidation
    getBatchCacheMeta,
    invalidateBatchCache,
    clearAllBatchCache,
    getExportCsvUrl: getBatchExportCsvUrl,
    downloadBatchCsv: useCallback(
      async (batchId: string, type: 'packs' | 'boxes' | 'cartons' = 'packs') => {
        try {
          showToast({
            type: 'info',
            title: 'Preparing Download',
            message: `Fetching ${type.toUpperCase()} manifest for batch ${batchId}...`,
          });
          await downloadBatchCsvAPI(batchId, type);
          showToast({
            type: 'success',
            title: 'Download Ready',
            message: `Batch ${batchId} ${type.toUpperCase()} CSV manifest downloaded.`,
          });
        } catch (err: any) {
          const parsed = parseApiError(err, 'Failed to download batch CSV manifest.');
          showToast({
            type: 'error',
            title: parsed.isS3Error ? 'AWS S3 Export Unavailable' : 'Export Unavailable',
            message: parsed.message,
            duration: 8000,
          });
        }
      },
      [showToast]
    ),
    updateOrderState,
    resolveSecurityAlert,
    toggleThemeMode,
    navigateTo,
    setActiveNav: navigateTo,
    activeNav: state.activeRoute,
    selectBatch: (b: Batch | null) => dispatch(setSelectedBatch(b)),
    setSelectedBatch: (b: Batch | null) => dispatch(setSelectedBatch(b)),
    setBatchToRecall: (b: Batch | null) => dispatch(setBatchToRecall(b)),
    setDateRange: (r: any) => dispatch(setDateRange(r)),
    setIsSidebarCollapsed: (c: boolean) => dispatch(setSidebarCollapsed(c)),
    toggleSidebar: () => dispatch(toggleSidebar()),
    setIsMobileSidebarOpen: (o: boolean) => dispatch(setMobileSidebarOpen(o)),
    setIsSearchOpen: (o: boolean) => dispatch(setSearchModalOpen(o)),
    setIsHelpOpen: (o: boolean) => dispatch(setHelpModalOpen(o)),
    setIsRecallModalOpen: (o: boolean) => dispatch(setRecallModalOpen(o)),
    initiateRecall: triggerRecall,
    addBatch: (b: Batch) => dispatch(addBatch(b)),
    updateOrderStatus: (id: string, s: any) => updateOrderState(id, s),
    resolveAlert: resolveSecurityAlert,
  };
};

