import axios from 'axios';
import { ShopkeeperUser } from '../../../types';
import { getISTISOString } from '../../dashboard/services/shopkeeper.api';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${BASE_URL}/api/shopkeeper`;

// Axios instance with token injection
export const authClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

authClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('shopkeeper_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle suspension & unauthorized states
authClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const code = error.response?.data?.code;
      if (code === 'ACCOUNT_SUSPENDED' || code === 'ACCOUNT_REJECTED' || code === 'ACCOUNT_PENDING') {
        window.dispatchEvent(
          new CustomEvent('shopkeeper_status_changed', {
            detail: {
              code,
              message: error.response?.data?.message,
              reason: error.response?.data?.reason,
            },
          })
        );
      }
    } else if (error.response?.status === 401) {
      localStorage.removeItem('shopkeeper_token');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  async login(payload: { email: string; password: string }): Promise<{
    token: string;
    user: ShopkeeperUser;
    requires2FA?: boolean;
  }> {
    const res = await axios.post(`${API_BASE}/login`, {
      identifier: payload.email,
      password: payload.password,
    });

    const data = res.data;
    const token = data.accessToken || data.data?.accessToken || data.token;
    const backendUser = data.shopkeeper || data.data?.shopkeeper || data.user || {};

    const user: ShopkeeperUser = {
      id: backendUser.shopId || backendUser._id || backendUser.id || 'SHOP-USER',
      shopId: backendUser.shopId || 'SHOP-DEFAULT',
      shopName: backendUser.shopName || backendUser.shop?.name || backendUser.displayName || payload.email.split('@')[0],
      ownerName: backendUser.ownerName || backendUser.owner?.name || 'Pharmacy Owner',
      email: backendUser.ownerEmail || backendUser.owner?.email || backendUser.shopEmail || payload.email,
      phone: backendUser.ownerPhone || backendUser.owner?.phone || backendUser.shopPhone || '+91 00000 00000',
      licenseNumber: backendUser.drugLicenseNumber || backendUser.license?.drugLicenseNumber || 'DL-PENDING',
      gstin: backendUser.gstin || '07AAAAA0000A1Z5',
      pharmacistRegNo: backendUser.pharmacistRegNo || 'PR-REG-ACTIVE',
      address: backendUser.address || backendUser.shop?.address || 'Pharmacy Address',
      city: backendUser.city || backendUser.shop?.city || 'Delhi',
      state: backendUser.state || backendUser.shop?.state || 'Delhi',
      pincode: backendUser.pincode || backendUser.shop?.pincode || '110001',
      kycStatus: (backendUser.verificationStatus?.toUpperCase() === 'APPROVED' || backendUser.verificationStatus?.toUpperCase() === 'VERIFIED') ? 'APPROVED' : 'PENDING',
      createdAt: backendUser.createdAt ? getISTISOString(backendUser.createdAt) : getISTISOString(),
    };

    if (token) {
      localStorage.setItem('shopkeeper_token', token);
    }

    return {
      token,
      user,
      requires2FA: false,
    };
  },

  async register(payload: Partial<ShopkeeperUser> & { password?: string }): Promise<{
    success: boolean;
    user: ShopkeeperUser;
  }> {
    const now = new Date();
    const fiveYearsLater = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());

    const backendPayload = {
      shopName: payload.shopName,
      shopPhone: payload.phone,
      shopEmail: payload.email,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
      ownerName: payload.ownerName,
      ownerPhone: payload.phone,
      ownerEmail: payload.email,
      drugLicenseNumber: payload.licenseNumber,
      licenseType: 'retail',
      issuingAuthority: 'State Drug Control Administration',
      licenseIssueDate: getISTISOString(now),
      licenseExpiryDate: getISTISOString(fiveYearsLater),
      password: payload.password,
    };

    const res = await axios.post(`${API_BASE}/register`, backendPayload);
    const regData = res.data?.data || res.data;

    const user: ShopkeeperUser = {
      id: regData?.shopId || 'SHOP-PENDING',
      shopId: regData?.shopId || 'SHOP-PENDING',
      shopName: regData?.shopName || payload.shopName || '',
      ownerName: regData?.ownerName || payload.ownerName || '',
      email: payload.email || '',
      phone: payload.phone || '',
      licenseNumber: payload.licenseNumber || '',
      gstin: payload.gstin || '',
      pharmacistRegNo: payload.pharmacistRegNo || '',
      address: payload.address || '',
      city: payload.city || '',
      state: payload.state || '',
      pincode: payload.pincode || '',
      kycStatus: 'PENDING',
      createdAt: getISTISOString(),
    };

    return {
      success: true,
      user,
    };
  },

  async verify2FA(code: string): Promise<{ token: string; user: ShopkeeperUser }> {
    const res = await axios.post(`${API_BASE}/auth/2fa/verify`, { code });
    return res.data;
  },

  async getProfile(): Promise<ShopkeeperUser> {
    const res = await authClient.get('/profile');
    const p = res.data?.data?.shopkeeper || res.data?.shopkeeper || res.data?.data || res.data;
    return {
      id: p.shopId || p._id || 'SHOP-USER',
      shopId: p.shopId || 'SHOP-001',
      shopName: p.shopName || p.shop?.name || 'Licensed Chemist',
      ownerName: p.ownerName || p.owner?.name || 'Registered Pharmacist',
      email: p.ownerEmail || p.owner?.email || p.shopEmail || '',
      phone: p.ownerPhone || p.owner?.phone || p.shopPhone || '',
      licenseNumber: p.drugLicenseNumber || p.license?.drugLicenseNumber || '',
      gstin: p.gstin || '07AAAAA0000A1Z5',
      pharmacistRegNo: p.pharmacistRegNo || 'PCI-REG',
      address: p.address || p.shop?.address || '',
      city: p.city || p.shop?.city || '',
      state: p.state || p.shop?.state || '',
      pincode: p.pincode || p.shop?.pincode || '',
      kycStatus: (p.verificationStatus?.toUpperCase() === 'APPROVED' || p.verificationStatus?.toUpperCase() === 'VERIFIED') ? 'APPROVED' : 'PENDING',
      createdAt: p.createdAt ? getISTISOString(p.createdAt) : getISTISOString(),
    };
  },

  async updateProfile(payload: Partial<ShopkeeperUser>): Promise<ShopkeeperUser> {
    await authClient.patch('/profile', {
      shopName: payload.shopName,
      shopPhone: payload.phone,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
    });
    return await this.getProfile();
  },
};
