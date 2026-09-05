import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import {
  setAuthLoading,
  setAuthError,
  setAuthView,
  set2FARequired,
  loginSuccess,
  logout,
  setKycStatus,
  AuthView,
} from '../slice/auth.slice';
import { authApi } from '../services/auth.api';
import { ShopkeeperUser, KYCStatus } from '../../../types';
import { useToast } from '../../../context/ToastContext';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((s: RootState) => s.auth);
  const { showToast } = useToast();

  const login = useCallback(
    async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
      try {
        dispatch(setAuthLoading(true));
        const res = await authApi.login(credentials);
        if (res.requires2FA) {
          dispatch(set2FARequired({ required: true, email: credentials.email }));
          dispatch(setAuthLoading(false));
          return;
        }
        dispatch(loginSuccess({ user: res.user, token: res.token }));
        showToast({
          type: 'success',
          title: 'Pharmacy Terminal Connected',
          message: `Authenticated as ${res.user.shopName}. CDSCO License Active.`,
        });
      } catch (err: any) {
        dispatch(setAuthError(err?.message || 'Login failed'));
        showToast({
          type: 'error',
          title: 'Authentication Failed',
          message: err?.message || 'Invalid pharmacy credentials',
        });
        throw err;
      }
    },
    [dispatch, showToast]
  );

  const fetchProfile = useCallback(async () => {
    try {
      dispatch(setAuthLoading(true));
      const user = await authApi.getProfile();
      dispatch({ type: 'auth/updateProfileSuccess', payload: user });
      dispatch(setKycStatus(user.kycStatus));
      dispatch(setAuthLoading(false));
      return user;
    } catch (err: any) {
      dispatch(setAuthLoading(false));
      if (err?.response?.status === 401) {
        dispatch(logout());
      }
      return null;
    }
  }, [dispatch]);

  const verify2FA = useCallback(
    async (code: string) => {
      try {
        dispatch(setAuthLoading(true));
        const res = await authApi.verify2FA(code);
        dispatch(loginSuccess({ user: res.user, token: res.token }));
        showToast({
          type: 'success',
          title: '2FA Token Verified',
          message: 'Workspace authenticated securely.',
        });
      } catch (err: any) {
        dispatch(setAuthError(err?.message || 'Invalid security token'));
      }
    },
    [dispatch, showToast]
  );

  const updateProfile = useCallback(
    async (updated: Partial<ShopkeeperUser>) => {
      if (state.user) {
        try {
          const merged = await authApi.updateProfile(updated);
          dispatch({ type: 'auth/updateProfileSuccess', payload: merged });
          showToast({
            type: 'success',
            title: 'Pharmacy Profile Updated',
            message: 'Establishment details saved to backend.',
          });
        } catch (err: any) {
          showToast({
            type: 'error',
            title: 'Profile Update Failed',
            message: err?.response?.data?.message || err.message,
          });
        }
      }
    },
    [dispatch, state.user, showToast]
  );

  return {
    ...state,
    login,
    fetchProfile,
    verify2FA,
    logout: () => dispatch(logout()),
    setAuthView: (v: AuthView) => dispatch(setAuthView(v)),
    updateProfile,
    clearError: () => dispatch(setAuthError(null)),
  };
};
