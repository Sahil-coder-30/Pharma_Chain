import axios from 'axios';
import {
  AuthResponse,
  LoginPayload,
  ManufacturerRegisterPayload,
  ResetPasswordPayload,
} from '../types/auth.types';
import { ManufacturerProfile } from '../../../types';
import { parseApiError } from '../../../utils/errorHandler';

// ── Axios instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/manufacturer',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach Bearer token ───────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pharma_token') || sessionStorage.getItem('pharma_token');
  if (
    token &&
    token !== 'pending_token' &&
    token !== 'session-token' &&
    token.split('.').length === 3 &&
    config.headers
  ) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: catch 403 ACCOUNT_BLOCKED globally ──────────────────
// When any API call returns 403 with code ACCOUNT_BLOCKED, we dispatch setBlocked
// to the Redux store immediately — no matter which feature triggered the request.
// This is the key mechanism for real-time block detection when the backend
// enforces the block mid-session (e.g. during a batch submission request).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    const status = error?.response?.status;

    if (status === 403 && (data?.code === 'ACCOUNT_BLOCKED' || data?.code === 'ACCOUNT_SUSPENDED')) {
      console.warn('[auth.api] 403 ACCOUNT_BLOCKED intercepted — dispatching setBlocked to Redux store');
      // Use dynamic import to avoid circular dependency (store → auth.slice → auth.api)
      // store.ts does NOT import auth.api, so this dynamic import is safe.
      import('../../../store').then(({ store }) => {
        import('../slice/auth.slice').then(({ setBlocked }) => {
          store.dispatch(
            setBlocked({
              reason: data?.reason || data?.message,
              blockedAt: data?.blockedAt,
            })
          );
        });
      });
    }

    return Promise.reject(error);
  }
);

// ── Normalizer ─────────────────────────────────────────────────────────────────
/**
 * Normalizes backend manufacturer data into standard ManufacturerProfile format.
 * Preserves BLOCKED/SUSPENDED/REJECTED statuses as-is.
 */
export const normalizeBackendManufacturer = (raw: any): ManufacturerProfile => {
  const id = raw.id || raw.manufacturerId || raw._id || 'MFR_UNKNOWN';
  const name = raw.companyName || raw.name || 'Pharmaceutical Manufacturer';
  const licenseNumber = raw.licenseNumber || raw.cdscoLicenseNo || 'CDSCO-MFG-PENDING';
  const email = raw.email || '';

  // Preserve ALL statuses — don't force-normalize BLOCKED/SUSPENDED to PENDING
  const rawStatus = raw.kycStatus || 'PENDING';
  const kycStatus = (['APPROVED', 'PENDING', 'REJECTED', 'BLOCKED', 'SUSPENDED'].includes(rawStatus)
    ? rawStatus
    : 'PENDING') as ManufacturerProfile['kycStatus'];

  return {
    id,
    name,
    code: raw.companyCode || `MFR-${id.slice(-4)}`,
    email,
    licenseNumber,
    kycStatus,
    keyId: raw.keyId || `mfr-key-${id.toLowerCase()}`,
    keyAlgorithm: raw.keyAlgorithm || 'ES256 (ECDSA P-256)',
    publicKeyPem: raw.publicKeyPem || '-----BEGIN PUBLIC KEY-----\nProvisioned on CDSCO KYC Approval\n-----END PUBLIC KEY-----',
    keyStatus: kycStatus === 'APPROVED' ? 'Protected in AES-256-GCM Vault' : 'Pending Verification',
    headquarters: raw.headquarters || '',
    plantLocations: raw.plantLocations || [
      {
        name: raw.primaryPlantName || 'Primary Formulation Facility',
        address: raw.primaryPlantAddress || '',
        facilityId: raw.primaryPlantFacilityId || `FAC-${id.slice(-4)}`,
        isActive: kycStatus === 'APPROVED',
      },
    ],
    authorizedPersonnel: raw.authorizedPersonnel || [
      {
        name: raw.authorizedPersonName || 'Authorized Signatory',
        role: raw.authorizedPersonRole || 'Head of Quality Assurance & QP',
        email,
        phone: raw.phone || '',
      },
    ],
    registeredAt: (() => {
      const d = raw.createdAt ? new Date(raw.createdAt) : new Date();
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(isNaN(d.getTime()) ? new Date() : d);
    })(),
    gstin: raw.gstin || '',
    cdscoRegistration: raw.cdscoRegistration || licenseNumber,
    blockedReason: raw.blockedReason || undefined,
    blockedAt: raw.blockedAt || undefined,
    cin: raw.cinNumber || raw.cin || undefined,
  };
};

// ── Login ──────────────────────────────────────────────────────────────────────
export const loginAPI = async (credentials: LoginPayload): Promise<AuthResponse> => {
  try {
    const response = await api.post('/auth/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });

    const data = response.data;
    const token = data.token || data.data?.token;
    const userData = data.data || {};
    const manufacturer = normalizeBackendManufacturer({
      ...userData,
      email: credentials.email,
    });

    if (token) {
      if (credentials.rememberMe) {
        localStorage.setItem('pharma_token', token);
        localStorage.setItem('pharma_user', JSON.stringify(manufacturer));
      } else {
        sessionStorage.setItem('pharma_token', token);
        sessionStorage.setItem('pharma_user', JSON.stringify(manufacturer));
        localStorage.setItem('pharma_token', token);
        localStorage.setItem('pharma_user', JSON.stringify(manufacturer));
      }
    }

    return {
      success: true,
      token: token || '',
      manufacturer,
      message: data.message || 'Authentication successful',
    };
  } catch (err: any) {
    const parsed = parseApiError(err, 'Authentication failed. Please check your credentials.');
    const responseData = err.response?.data;

    // Handle blocked-on-login case
    if (err.response?.status === 403 && responseData?.code === 'ACCOUNT_BLOCKED') {
      throw Object.assign(new Error('ACCOUNT_BLOCKED'), {
        isBlocked: true,
        reason: responseData?.reason,
        blockedAt: responseData?.blockedAt,
      });
    }

    if (parsed.isKycPending) {
      const pendingUser = normalizeBackendManufacturer({
        ...responseData?.data,
        email: credentials.email,
        kycStatus: 'PENDING',
      });
      return {
        success: false,
        token: 'pending_token',
        manufacturer: pendingUser,
        message: 'Account pending CDSCO Form 28-D KYC clearance.',
      };
    }

    throw new Error(parsed.message);
  }
};

// ── Register ───────────────────────────────────────────────────────────────────
export const registerAPI = async (payload: ManufacturerRegisterPayload): Promise<AuthResponse> => {
  try {
    const response = await api.post('/auth/register', {
      companyName: payload.companyName,
      licenseNumber: payload.cdscoLicenseNo || payload.manufacturerId || 'CDSCO-MFG-001',
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    });

    const data = response.data?.data || {};
    const newProfile = normalizeBackendManufacturer({
      ...payload,
      ...data,
      kycStatus: 'PENDING',
    });

    const token = response.data?.token || 'pending_token';
    localStorage.setItem('pharma_user', JSON.stringify(newProfile));

    return {
      success: true,
      token,
      manufacturer: newProfile,
      message: response.data?.message || 'Registration submitted. KYC under CDSCO review.',
    };
  } catch (err: any) {
    const parsed = parseApiError(err, 'Registration failed. Please check your form fields.');
    throw new Error(parsed.message);
  }
};

// ── KYC Approval ───────────────────────────────────────────────────────────────
export const approveKYCAPI = async (user: ManufacturerProfile): Promise<ManufacturerProfile> => {
  try {
    const adminToken = import.meta.env.VITE_ADMIN_TOKEN || '960e412b2690c03cb83337b91010016a572343f23123feb3';
    const payload: { manufacturerId?: string; email?: string } = {};
    if (user.id && user.id !== 'MFR_UNKNOWN') {
      payload.manufacturerId = user.id;
    }
    if (user.email) {
      payload.email = user.email;
    }

    const response = await api.post(
      '/auth/kyc/approve',
      payload,
      {
        headers: {
          'X-Admin-Token': adminToken,
        },
      }
    );

    const data = response.data?.data || response.data;
    const approvedProfile: ManufacturerProfile = {
      ...user,
      ...data,
      kycStatus: 'APPROVED',
      keyStatus: 'Protected in AES-256-GCM Vault',
      publicKeyPem: data.publicKeyPem || user.publicKeyPem,
    };

    localStorage.setItem('pharma_user', JSON.stringify(approvedProfile));
    return approvedProfile;
  } catch (error: any) {
    const parsed = parseApiError(error, 'KYC approval endorsement failed on backend.');
    throw new Error(parsed.message);
  }
};

// ── Check Account Status (used by polling hook) ────────────────────────────────
/**
 * Polls GET /auth/me to fetch the latest account status.
 * Returns null on network error (don't block UI on transient failure).
 * Returns the manufacturer profile with current kycStatus on success.
 * If the account is blocked the response interceptor will have already dispatched setBlocked.
 */
export const fetchAccountStatusAPI = async (): Promise<{ kycStatus: string; blockedReason?: string; blockedAt?: string } | null> => {
  try {
    const token = localStorage.getItem('pharma_token') || sessionStorage.getItem('pharma_token');
    if (!token || token === 'pending_token' || token.split('.').length !== 3) {
      return null;
    }
    const response = await api.get('/auth/me');
    const data = response.data?.data || response.data;
    console.log('[auth.api] fetchAccountStatusAPI response kycStatus:', data?.kycStatus);
    return {
      kycStatus: data?.kycStatus || 'APPROVED',
      blockedReason: data?.blockedReason,
      blockedAt: data?.blockedAt,
    };
  } catch (err: any) {
    // 403 ACCOUNT_BLOCKED is handled by the response interceptor above
    // For other errors (network, 5xx), return null — don't disrupt the UI
    if (err?.response?.status !== 403) {
      console.warn('[auth.api] fetchAccountStatusAPI non-fatal error:', err?.message);
    }
    return null;
  }
};

// ── Logout ─────────────────────────────────────────────────────────────────────
export const logoutAPI = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // Ignore server errors on logout
  } finally {
    localStorage.removeItem('pharma_token');
    localStorage.removeItem('pharma_user');
    sessionStorage.removeItem('pharma_token');
    sessionStorage.removeItem('pharma_user');
  }
};

export const verify2FAAPI = async (_email: string, _code: string): Promise<AuthResponse> => {
  throw new Error('2FA endpoint is not enabled on this environment.');
};

export const forgotPasswordAPI = async (_email: string): Promise<{ success: boolean; message: string }> => {
  throw new Error('Password reset endpoint is not enabled on this environment.');
};

export const resetPasswordAPI = async (_payload: ResetPasswordPayload): Promise<{ success: boolean; message: string }> => {
  throw new Error('Password reset endpoint is not enabled on this environment.');
};

export const simulateKYCApprovalAPI = approveKYCAPI;
