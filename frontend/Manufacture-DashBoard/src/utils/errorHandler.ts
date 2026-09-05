import { AxiosError } from 'axios';

export interface ParsedApiError {
  message: string;
  statusCode?: number;
  code?: string;
  isAuthError: boolean;
  isNetworkError: boolean;
  isKycPending: boolean;
  isS3Error: boolean;
  raw?: any;
}

/**
 * Normalizes any error (AxiosError, standard Error, string, or unknown) into a user-friendly format
 */
export const parseApiError = (error: unknown, fallbackMessage = 'An unexpected error occurred'): ParsedApiError => {
  if (!error) {
    return {
      message: fallbackMessage,
      isAuthError: false,
      isNetworkError: false,
      isKycPending: false,
      isS3Error: false,
    };
  }

  // Handle AxiosError
  if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
    const axiosErr = error as AxiosError<any>;
    const status = axiosErr.response?.status;
    const responseData = axiosErr.response?.data;
    const errCode = responseData?.code || axiosErr.code;

    // Check if error is specifically KYC_PENDING
    const isKycPending = status === 403 && (errCode === 'KYC_PENDING' || responseData?.kycStatus === 'PENDING');

    // Extract custom backend message if present
    let message = responseData?.message || responseData?.error;

    // If validation error array exists (e.g. { errors: [{ message: '...' }] })
    if (responseData?.errors && Array.isArray(responseData.errors)) {
      message = responseData.errors.map((e: any) => e.message || e).join('; ');
    }

    // Default status code interpretations if no specific message was returned
    if (!message) {
      switch (status) {
        case 400:
          message = 'Invalid request parameters. Please verify your form inputs.';
          break;
        case 401:
          message = 'Authentication session invalid or expired. Please sign in again.';
          break;
        case 403:
          message = isKycPending
            ? 'Account pending CDSCO Form 28-D KYC clearance. Batch operations locked.'
            : 'Access forbidden. You do not have permission to execute this operation.';
          break;
        case 404:
          message = 'The requested resource (batch, pack, or entity) was not found.';
          break;
        case 409:
          message = 'Conflict detected: A resource with this identifier or signing key already exists.';
          break;
        case 422:
          message = 'Validation failed. Please verify required pharmaceutical attributes.';
          break;
        case 429:
          message = 'Rate limit exceeded. Please wait a moment before sending more requests.';
          break;
        case 500:
          message = 'Internal service error. The manufacturer backend encountered an issue.';
          break;
        case 502:
        case 503:
        case 504:
          message = 'Manufacturer microservice cluster is currently unreachable. Please try again.';
          break;
        default:
          if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
            message = 'Connection timed out. The server took too long to respond.';
          } else if (axiosErr.code === 'ERR_NETWORK' || !axiosErr.response) {
            message = 'Network connection failed. Please ensure the backend server is active.';
          } else {
            message = fallbackMessage;
          }
      }
    }

    // Detect AWS S3 specific errors
    const isS3Error =
      Boolean(errCode?.includes('S3')) ||
      Boolean(responseData?.code?.includes('S3')) ||
      Boolean(message?.includes('AWS S3')) ||
      Boolean(message?.includes('S3 storage')) ||
      Boolean(message?.includes('S3 bucket')) ||
      Boolean(message?.includes('The specified key does not exist'));

    if (isS3Error && !responseData?.message) {
      if (errCode === 'S3_NOT_CONFIGURED') {
        message = 'AWS S3 cloud storage is not configured. Batches must be stored in AWS S3.';
      } else if (errCode === 'S3_ARTIFACT_NOT_FOUND') {
        message = 'Batch CSV manifest was not found in AWS S3 storage.';
      } else if (errCode === 'S3_STREAM_FAILED' || errCode === 'S3_EXPORT_FAILED') {
        message = 'Failed to stream batch CSV manifest from AWS S3. Please verify S3 connectivity.';
      }
    }

    return {
      message,
      statusCode: status,
      code: errCode,
      isAuthError: status === 401,
      isNetworkError: !axiosErr.response || axiosErr.code === 'ERR_NETWORK',
      isKycPending,
      isS3Error,
      raw: responseData,
    };
  }

  // Handle standard JS Error
  if (error instanceof Error) {
    const isS3Error = error.message.includes('S3') || error.message.includes('AWS S3');
    return {
      message: error.message || fallbackMessage,
      isAuthError: error.message.toLowerCase().includes('unauthorized') || error.message.toLowerCase().includes('token'),
      isNetworkError: error.message.toLowerCase().includes('network'),
      isKycPending: error.message.toLowerCase().includes('kyc'),
      isS3Error,
      raw: error,
    };
  }

  // Handle plain string error
  if (typeof error === 'string') {
    const isS3Error = error.includes('S3') || error.includes('AWS S3');
    return {
      message: error,
      isAuthError: false,
      isNetworkError: false,
      isKycPending: false,
      isS3Error,
    };
  }

  return {
    message: fallbackMessage,
    isAuthError: false,
    isNetworkError: false,
    isKycPending: false,
    isS3Error: false,
  };
};
