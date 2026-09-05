import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import {
  setActiveRoute,
  toggleSidebar,
  setMobileSidebarOpen,
  setTheme,
  setActiveScanMode,
  setCurrentScanResult,
  setInventory,
  setSales,
  setInbounds,
  setRecalls,
  setFraudReports,
  addToCart,
  removeFromCart,
  clearCart,
  addInboundEvent,
  addSaleTransaction,
  setIsScanModalOpen,
  setIsReceiptModalOpen,
  setIsIncidentModalOpen,
  setIsSearchOpen,
  setIsHelpOpen,
  setActiveReceipt,
  setDashboardLoading,
  setDashboardError,
} from '../slice/dashboard.slice';
import { shopkeeperApi, getISTISOString } from '../services/shopkeeper.api';
import { NavRoute, ScanMode, POSCartItem, SaleTransaction } from '../../../types';
import { useToast } from '../../../context/ToastContext';

export const useDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((s: RootState) => s.dashboard);
  const user = useSelector((s: RootState) => s.auth.user);
  const { showToast } = useToast();

  const navigateTo = useCallback(
    (route: NavRoute) => {
      dispatch(setActiveRoute(route));
      dispatch(setMobileSidebarOpen(false));
    },
    [dispatch]
  );

  const toggleThemeMode = useCallback(
    (targetTheme?: 'dark' | 'light') => {
      const nextTheme = targetTheme || (state.theme === 'dark' ? 'light' : 'dark');
      dispatch(setTheme(nextTheme));
      if (nextTheme === 'light') {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.remove('light-theme');
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    },
    [dispatch, state.theme]
  );

  // Live Inventory, Sales, Inbounds, Recalls Fetching
  const refreshInventory = useCallback(async () => {
    try {
      const items = await shopkeeperApi.getInventory();
      dispatch(setInventory(items));
      return items;
    } catch (err: any) {
      console.warn('[Dashboard Hook] refreshInventory error:', err.message);
    }
  }, [dispatch]);

  const refreshSales = useCallback(async () => {
    try {
      const sales = await shopkeeperApi.getSalesHistory();
      dispatch(setSales(sales));
      return sales;
    } catch (err: any) {
      console.warn('[Dashboard Hook] refreshSales error:', err.message);
    }
  }, [dispatch]);

  const refreshInbounds = useCallback(async () => {
    try {
      const inbounds = await shopkeeperApi.getInbounds();
      dispatch(setInbounds(inbounds));
      return inbounds;
    } catch (err: any) {
      console.warn('[Dashboard Hook] refreshInbounds error:', err.message);
    }
  }, [dispatch]);

  const refreshRecalls = useCallback(async () => {
    try {
      const recalls = await shopkeeperApi.getRecalls();
      dispatch(setRecalls(recalls));
      return recalls;
    } catch (err: any) {
      console.warn('[Dashboard Hook] refreshRecalls error:', err.message);
    }
  }, [dispatch]);

  // Scan & Verify Token / QR
  const verifyScan = useCallback(
    async (scannedText: string, mode: ScanMode = state.activeScanMode) => {
      try {
        dispatch(setDashboardLoading(true));
        const res = await shopkeeperApi.verifyScan(scannedText, mode);
        dispatch(setCurrentScanResult(res));
        dispatch(setDashboardLoading(false));

        if (res.valid) {
          showToast({
            type: 'success',
            title: 'ECDSA Signature Verified',
            message: `${res.medicineName} (${res.batchId}) - Chain State: ${res.status}`,
          });

          // If in DISPENSE mode, auto add to POS Cart
          if (mode === 'DISPENSE' && res.packHash && res.medicineName) {
            dispatch(
              addToCart({
                packHash: res.packHash,
                signedToken: res.signedToken || scannedText,
                batchId: res.batchId || 'BATCH-LIVE',
                medicineName: res.medicineName,
                genericName: res.genericName || '',
                dosage: res.dosage || '',
                unitMrp: res.unitMrp || 150.0,
                expiryDate: res.expiryDate || '2028-02-01',
                manufacturerName: res.manufacturerName || 'Licensed Pharma Manufacturer',
                quantity: 1,
                scannedAt: getISTISOString(),
                status: 'VALID',
              })
            );
          }
        } else {
          showToast({
            type: 'error',
            title: `Verification Failed: ${res.status}`,
            message: res.message || 'Pack rejected by cryptographic gate.',
          });
        }
        return res;
      } catch (err: any) {
        dispatch(setDashboardLoading(false));
        showToast({
          type: 'error',
          title: 'Scan Error',
          message: err?.message || 'Could not verify token with blockchain peer',
        });
        throw err;
      }
    },
    [dispatch, showToast, state.activeScanMode]
  );

  // Submit POS Sale Checkout
  const completePOSSale = useCallback(
    async (payload: {
      patientName: string;
      patientPhone: string;
      doctorName?: string;
      paymentMode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
    }) => {
      try {
        if (state.cartItems.length === 0) {
          showToast({
            type: 'warning',
            title: 'Empty Cart',
            message: 'Scan at least one verified medicine pack before checkout.',
          });
          return;
        }

        dispatch(setDashboardLoading(true));
        const res = await shopkeeperApi.submitSale({
          ...payload,
          items: state.cartItems.map((it) => ({
            packHash: it.packHash,
            batchId: it.batchId,
            quantity: it.quantity,
            unitPrice: it.unitMrp,
          })),
        });

        dispatch(addSaleTransaction(res));
        dispatch(setDashboardLoading(false));

        showToast({
          type: 'success',
          title: `Invoice Generated: ${res.invoiceNo}`,
          message: `Sale committed to Hyperledger Fabric (Block #${res.blockNumber}).`,
        });

        // Background refresh inventory and sales
        refreshInventory();
        refreshSales();

        return res;
      } catch (err: any) {
        dispatch(setDashboardLoading(false));
        showToast({
          type: 'error',
          title: 'Checkout Error',
          message: err?.message || 'Transaction could not be committed to ledger',
        });
        throw err;
      }
    },
    [dispatch, showToast, state.cartItems, refreshInventory, refreshSales]
  );

  // Inbound Delivery Intake
  const submitInboundIntake = useCallback(
    async (payload: {
      scannedText: string;
      deliveryChallanNo: string;
      distributorName: string;
      packsReceived: number;
      batchId?: string;
      medicineName?: string;
    }) => {
      try {
        dispatch(setDashboardLoading(true));
        const res = await shopkeeperApi.submitIntake(payload);
        const newIntake = {
          id: `intk_${Date.now().toString().slice(-4)}`,
          deliveryChallanNo: payload.deliveryChallanNo,
          distributorName: payload.distributorName,
          batchId: payload.batchId || 'BATCH-LIVE',
          medicineName: payload.medicineName || 'Prescription Medicine',
          packsReceived: payload.packsReceived,
          signatureVerified: true,
          fabricTxId: res.fabricTxId,
          timestamp: getISTISOString(),
          status: 'SUCCESS' as const,
        };

        dispatch(addInboundEvent(newIntake));
        dispatch(setDashboardLoading(false));

        showToast({
          type: 'success',
          title: 'Delivery Stock Received',
          message: `+${payload.packsReceived} units added to live inventory (State -> AT_SHOP).`,
        });

        // Refresh inventory and inbounds
        refreshInventory();
        refreshInbounds();
      } catch (err: any) {
        dispatch(setDashboardLoading(false));
        showToast({
          type: 'error',
          title: 'Intake Rejection',
          message: err?.message || 'Intake failed duplicate or signature validation.',
        });
      }
    },
    [dispatch, showToast, refreshInventory, refreshInbounds]
  );

  return {
    ...state,
    user,
    navigateTo,
    toggleThemeMode,
    toggleSidebar: () => dispatch(toggleSidebar()),
    setMobileSidebarOpen: (o: boolean) => dispatch(setMobileSidebarOpen(o)),
    setActiveScanMode: (m: ScanMode) => dispatch(setActiveScanMode(m)),
    verifyScan,
    completePOSSale,
    submitInboundIntake,
    refreshInventory,
    refreshSales,
    refreshInbounds,
    refreshRecalls,
    addToCart: (item: POSCartItem) => dispatch(addToCart(item)),
    removeFromCart: (hash: string) => dispatch(removeFromCart(hash)),
    clearCart: () => dispatch(clearCart()),
    setIsScanModalOpen: (o: boolean) => dispatch(setIsScanModalOpen(o)),
    setIsReceiptModalOpen: (o: boolean) => dispatch(setIsReceiptModalOpen(o)),
    setIsIncidentModalOpen: (o: boolean) => dispatch(setIsIncidentModalOpen(o)),
    setIsSearchOpen: (o: boolean) => dispatch(setIsSearchOpen(o)),
    setIsHelpOpen: (o: boolean) => dispatch(setIsHelpOpen(o)),
    setActiveReceipt: (tx: SaleTransaction | null) => dispatch(setActiveReceipt(tx)),
  };
};
