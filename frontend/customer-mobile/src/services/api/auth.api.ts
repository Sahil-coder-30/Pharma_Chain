import { consumerApiClient } from './client';
import type { ConsumerUser } from '../../store/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthResponse {
  status: string;
  token: string;
  user: ConsumerUser;
}

interface MeResponse {
  status: string;
  user: ConsumerUser;
}

// ── API Calls ─────────────────────────────────────────────────────────────────

/**
 * Sends the native Google ID Token to the consumer-service backend.
 * The backend verifies the token directly with Google and returns a PharmaChain JWT.
 * No redirect URIs or client secrets required!
 *
 * @param idToken The Google ID token from @react-native-google-signin/google-signin
 */
export const signInWithGoogleToken = async (
  idToken: string
): Promise<{ token: string; user: ConsumerUser }> => {
  const response = await consumerApiClient.post<AuthResponse>('/auth/google', {
    idToken,
  });
  return { token: response.data.token, user: response.data.user };
};

/**
 * Validates an existing PharmaChain JWT and returns the current user identity.
 * Used on app boot to restore a saved session from SecureStore.
 */
export const getMe = async (token: string): Promise<ConsumerUser> => {
  const response = await consumerApiClient.get<MeResponse>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.user;
};

/**
 * Updates consumer profile in MongoDB Atlas (name, phone, address).
 */
export const updateProfile = async (data: {
  name?: string;
  phone?: string;
  address?: string;
}): Promise<ConsumerUser> => {
  const response = await consumerApiClient.put<MeResponse>('/auth/profile', data);
  return response.data.user;
};
