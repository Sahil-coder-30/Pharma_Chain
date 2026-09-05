import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import {
  setAuthView,
  setAuthLoading,
  setAuthError,
  clearAuthError,
  setPendingLoginEmail,
  loginSuccess,
  registerSuccess,
  setKYCStatus,
  setBlocked,
  setUnblocked,
  updateUser,
  logout as logoutAction,
} from '../slice/auth.slice';
import {
  loginAPI,
  registerAPI,
  verify2FAAPI,
  forgotPasswordAPI,
  resetPasswordAPI,
  approveKYCAPI,
  fetchAccountStatusAPI,
  logoutAPI,
} from '../services/auth.api';
import {
  LoginPayload,
  ManufacturerRegisterPayload,
  ResetPasswordPayload,
  AuthViewMode,
} from '../types/auth.types';
import { useToast } from '../../../context/ToastContext';
import { parseApiError } from '../../../utils/errorHandler';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);
  const { showToast } = useToast();

  const handleLogin = useCallback(
    async (credentials: LoginPayload) => {
      try {
        dispatch(setAuthLoading(true));
        dispatch(clearAuthError());
        const response = await loginAPI(credentials);

        if (response.requires2FA) {
          dispatch(setPendingLoginEmail(credentials.email));
          showToast({
            type: 'info',
            title: 'Security Verification Required',
            message: 'A 6-digit cryptographic verification code has been dispatched.',
          });
          return response;
        }

        dispatch(
          loginSuccess({
            token: response.token,
            manufacturer: response.manufacturer,
            rememberMe: credentials.rememberMe,
          })
        );

        showToast({
          type: 'success',
          title: 'Authentication Successful',
          message: `Welcome back, ${response.manufacturer.name}. Key Vault initialized.`,
        });

        return response;
      } catch (err: any) {
        // Handle account blocked at login time
        if (err?.isBlocked) {
          dispatch(setBlocked({ reason: err.reason, blockedAt: err.blockedAt }));
          showToast({
            type: 'error',
            title: 'Account Blocked',
            message: err.reason || 'Your account has been blocked by the CDSCO regulatory authority.',
            duration: 8000,
          });
          return;
        }
        const parsed = parseApiError(err, 'Login failed. Please check your credentials.');
        dispatch(setAuthError(parsed.message));
        showToast({
          type: 'error',
          title: 'Authentication Failed',
          message: parsed.message,
        });
        throw new Error(parsed.message);
      } finally {
        dispatch(setAuthLoading(false));
      }
    },
    [dispatch, showToast]
  );

  const handleRegister = useCallback(
    async (payload: ManufacturerRegisterPayload) => {
      try {
        dispatch(setAuthLoading(true));
        dispatch(clearAuthError());
        const response = await registerAPI(payload);

        dispatch(
          registerSuccess({
            token: response.token,
            manufacturer: response.manufacturer,
          })
        );

        showToast({
          type: 'info',
          title: 'Registration Submitted',
          message: 'Your CDSCO Form 28-D KYC application is now under review.',
          duration: 6000,
        });

        return response;
      } catch (err: any) {
        const parsed = parseApiError(err, 'Registration failed. Please review your form data.');
        dispatch(setAuthError(parsed.message));
        showToast({
          type: 'error',
          title: 'Registration Error',
          message: parsed.message,
        });
        throw new Error(parsed.message);
      } finally {
        dispatch(setAuthLoading(false));
      }
    },
    [dispatch, showToast]
  );

  const handleVerify2FA = useCallback(
    async (code: string) => {
      if (!authState.pendingLoginEmail) return;
      try {
        dispatch(setAuthLoading(true));
        const response = await verify2FAAPI(authState.pendingLoginEmail, code);
        dispatch(
          loginSuccess({
            token: response.token,
            manufacturer: response.manufacturer,
          })
        );
        showToast({
          type: 'success',
          title: '2FA Verification Passed',
          message: 'Zero-trust cryptographic session established.',
        });
        return response;
      } catch (err: any) {
        const parsed = parseApiError(err, 'Incorrect 2FA code. Please try again.');
        dispatch(setAuthError(parsed.message));
        showToast({
          type: 'error',
          title: 'Verification Failed',
          message: parsed.message,
        });
        throw new Error(parsed.message);
      } finally {
        dispatch(setAuthLoading(false));
      }
    },
    [dispatch, authState.pendingLoginEmail, showToast]
  );

  const handleForgotPassword = useCallback(
    async (email: string) => {
      try {
        dispatch(setAuthLoading(true));
        const res = await forgotPasswordAPI(email);
        showToast({
          type: 'info',
          title: 'OTP Dispatched',
          message: res.message,
        });
        return res;
      } catch (err: any) {
        const parsed = parseApiError(err, 'Unable to dispatch password reset instructions.');
        showToast({
          type: 'error',
          title: 'Password Reset Request Failed',
          message: parsed.message,
        });
        throw new Error(parsed.message);
      } finally {
        dispatch(setAuthLoading(false));
      }
    },
    [dispatch, showToast]
  );

  const handleResetPassword = useCallback(
    async (payload: ResetPasswordPayload) => {
      try {
        dispatch(setAuthLoading(true));
        const res = await resetPasswordAPI(payload);
        showToast({
          type: 'success',
          title: 'Password Updated',
          message: res.message,
        });
        dispatch(setAuthView('login'));
        return res;
      } catch (err: any) {
        const parsed = parseApiError(err, 'Unable to reset password.');
        showToast({
          type: 'error',
          title: 'Reset Failed',
          message: parsed.message,
        });
        throw new Error(parsed.message);
      } finally {
        dispatch(setAuthLoading(false));
      }
    },
    [dispatch, showToast]
  );

  const handleSimulateKYCApproval = useCallback(async () => {
    if (!authState.user) return;
    try {
      dispatch(setAuthLoading(true));
      const updated = await approveKYCAPI(authState.user);
      dispatch(updateUser(updated));
      dispatch(setKYCStatus('APPROVED'));
      dispatch(setAuthView('login'));
      showToast({
        type: 'success',
        title: 'CDSCO KYC Approved!',
        message: `${updated.name} verified by CDSCO! Please sign in with your password to activate your batch-signing session.`,
        duration: 6000,
      });
    } catch (e: any) {
      const parsed = parseApiError(e, 'KYC approval endorsement failed on backend.');
      showToast({
        type: 'error',
        title: 'Approval Request Failed',
        message: parsed.message,
      });
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, authState.user, showToast]);

  const handleCheckKYCStatus = useCallback(async () => {
    try {
      dispatch(setAuthLoading(true));
      const result = await fetchAccountStatusAPI();
      if (result && result.kycStatus === 'APPROVED') {
        dispatch(setUnblocked());
        showToast({
          type: 'success',
          title: 'CDSCO Clearance Granted',
          message: 'Facility license and cryptographic root keys have been endorsed.',
        });
      } else {
        showToast({
          type: 'info',
          title: 'Status: Under Regulatory Review',
          message: 'Your manufacturing license and facility documents are currently being processed by the CDSCO Directorate.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'info',
        title: 'Status Checked',
        message: 'Application remains in the statutory review queue.',
      });
    } finally {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, showToast]);

  const handleLogout = useCallback(() => {
    logoutAPI().catch(() => {});
    dispatch(logoutAction());
    showToast({
      type: 'info',
      title: 'Logged Out',
      message: 'Manufacturer session terminated safely.',
    });
  }, [dispatch, showToast]);

  return {
    ...authState,
    login: handleLogin,
    register: handleRegister,
    verify2FA: handleVerify2FA,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    logout: handleLogout,
    setAuthView: (v: AuthViewMode) => dispatch(setAuthView(v)),
    simulateKYCApproval: handleSimulateKYCApproval,
    checkKYCStatus: handleCheckKYCStatus,
    clearError: () => dispatch(clearAuthError()),
    blockedReason: authState.blockedReason,
    blockedAt: authState.blockedAt,
  };
};
