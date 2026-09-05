import axios, { InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../../store/authStore';

/**
 * Builds candidate base URLs in priority order:
 * 1. 127.0.0.1:8080 - adb reverse to Mac's Kubernetes Ingress (works over USB on 5G/cellular)
 * 2. 127.0.0.1:3003 - adb reverse to consumer-service direct port-forward
 * 3. Mac's LAN IP from Metro hostUri (works when phone is on the same Wi-Fi)
 */
const getCandidateHosts = (): string[] => {
  const hosts: string[] = ['http://127.0.0.1:3003', 'http://127.0.0.1:8080'];

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      hosts.push(`http://${host}:3003`);
      hosts.push(`http://${host}`);
      hosts.push(`http://${host}:8080`);
    }
  }

  // Deduplicate
  return [...new Set(hosts)];
};

let activeBaseHost = 'http://127.0.0.1:3003';

const createClient = (pathPrefix: string) => {
  const instance = axios.create({
    baseURL: `${activeBaseHost}${pathPrefix}`,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Attach PharmaChain JWT Bearer token to all requests
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { pharmaToken } = useAuthStore.getState();
    if (pharmaToken) {
      config.headers.set('Authorization', `Bearer ${pharmaToken}`);
    }
    // Synchronize baseURL with activeBaseHost
    config.baseURL = `${activeBaseHost}${pathPrefix}`;
    return config;
  });

  // Resilient network error fallback: automatically failover to candidate hosts
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (!originalRequest) {
        return Promise.reject(error);
      }

      originalRequest._retryCount = originalRequest._retryCount || 0;

      // Only attempt fallback if there's no HTTP response (network failure / timeout / ECONNREFUSED)
      const isNetworkError =
        !error.response &&
        (error.code === 'ERR_NETWORK' ||
          error.message?.includes('Network Error') ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ECONNREFUSED');

      const candidates = getCandidateHosts();

      if (isNetworkError && originalRequest._retryCount < candidates.length) {
        const nextIndex = (candidates.indexOf(activeBaseHost) + 1) % candidates.length;
        activeBaseHost = candidates[nextIndex];
        originalRequest._retryCount += 1;

        console.warn(
          `[MediaCare API] Network error on ${originalRequest.baseURL}. Failing over to: ${activeBaseHost}${pathPrefix} (attempt ${originalRequest._retryCount}/${candidates.length})`
        );

        originalRequest.baseURL = `${activeBaseHost}${pathPrefix}`;
        return instance(originalRequest);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

export const consumerApiClient = createClient('/api/consumer');
export const apiClient = createClient('/api/v1');

