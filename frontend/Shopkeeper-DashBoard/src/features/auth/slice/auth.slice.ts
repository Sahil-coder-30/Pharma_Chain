import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ShopkeeperUser, KYCStatus } from '../../../types';

export type AuthView = 'login' | 'register' | 'forgot-password' | 'pending-kyc';

interface AuthState {
  isAuthenticated: boolean;
  user: ShopkeeperUser | null;
  token: string | null;
  kycStatus: KYCStatus;
  authView: AuthView;
  loading: boolean;
  error: string | null;
  requires2FA: boolean;
  pendingLoginEmail: string | null;
}

const initialToken = typeof localStorage !== 'undefined' ? localStorage.getItem('shopkeeper_token') : null;

const initialState: AuthState = {
  isAuthenticated: !!initialToken,
  user: null,
  token: initialToken,
  kycStatus: 'PENDING',
  authView: 'login',
  loading: false,
  error: null,
  requires2FA: false,
  pendingLoginEmail: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setAuthView: (state, action: PayloadAction<AuthView>) => {
      state.authView = action.payload;
      state.error = null;
    },
    set2FARequired: (state, action: PayloadAction<{ required: boolean; email?: string }>) => {
      state.requires2FA = action.payload.required;
      state.pendingLoginEmail = action.payload.email || null;
    },
    loginSuccess: (
      state,
      action: PayloadAction<{ user: ShopkeeperUser; token: string }>
    ) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.kycStatus = action.payload.user.kycStatus;
      state.loading = false;
      state.error = null;
      state.requires2FA = false;
      localStorage.setItem('shopkeeper_token', action.payload.token);
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.kycStatus = 'PENDING';
      state.requires2FA = false;
      state.authView = 'login';
      localStorage.removeItem('shopkeeper_token');
    },
    setKycStatus: (state, action: PayloadAction<KYCStatus>) => {
      state.kycStatus = action.payload;
      if (state.user) {
        state.user.kycStatus = action.payload;
      }
    },
    updateProfileSuccess: (state, action: PayloadAction<ShopkeeperUser>) => {
      state.user = action.payload;
      state.kycStatus = action.payload.kycStatus;
    },
  },
});

export const {
  setAuthLoading,
  setAuthError,
  setAuthView,
  set2FARequired,
  loginSuccess,
  logout,
  setKycStatus,
  updateProfileSuccess,
} = authSlice.actions;

export default authSlice.reducer;
