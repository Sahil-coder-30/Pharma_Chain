/**
 * useBlockStatusPoller
 *
 * One-time startup account status verification:
 * 1. Checks GET /auth/me once on initial mount / reload.
 * 2. If the user was BLOCKED and is now UNBLOCKED (approved in DB),
 *    restores dashboard access.
 * 3. All subsequent runtime blocking enforcement is handled organically by
 *    identifyUser middleware on every authenticated request + Axios 403 interceptors,
 *    eliminating periodic polling overhead and server log spam.
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { setBlocked, setUnblocked } from '../slice/auth.slice';
import { fetchAccountStatusAPI } from '../services/auth.api';

export const useBlockStatusPoller = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, kycStatus, token } = useSelector((state: RootState) => state.auth);

  const checkStatus = useCallback(async () => {
    const activeToken =
      token ||
      (typeof window !== 'undefined' && (localStorage.getItem('pharma_token') || sessionStorage.getItem('pharma_token')));

    if (!activeToken || activeToken === 'pending_token' || activeToken.split('.').length !== 3) {
      return;
    }

    try {
      const result = await fetchAccountStatusAPI();
      if (!result) return; // 403 interceptor handles ACCOUNT_BLOCKED, network fails silently

      if (result.kycStatus === 'BLOCKED' || result.kycStatus === 'SUSPENDED') {
        if (kycStatus !== 'BLOCKED') {
          console.warn(`[useBlockStatusPoller] Account is now ${result.kycStatus}. Freezing dashboard.`);
          dispatch(
            setBlocked({
              reason: result.blockedReason,
              blockedAt: result.blockedAt,
            })
          );
        }
      } else if (result.kycStatus === 'APPROVED') {
        if (kycStatus === 'BLOCKED' || kycStatus === 'SUSPENDED' || kycStatus === 'PENDING') {
          console.log('[useBlockStatusPoller] Account verified as APPROVED. Restoring dashboard access.');
          dispatch(setUnblocked());
        }
      }
    } catch (e) {
      // 403 response interceptor already handles ACCOUNT_BLOCKED
    }
  }, [dispatch, kycStatus, token]);

  useEffect(() => {
    const hasStoredToken =
      token || (typeof window !== 'undefined' && localStorage.getItem('pharma_token'));

    if (!isAuthenticated && !hasStoredToken) {
      return;
    }

    // Run check once on initial mount/reload to verify account standing
    checkStatus();
  }, [isAuthenticated, token, checkStatus]);
};

