export type BackendUIState =
  | "GENUINE"
  | "PURCHASED_RECENTLY"
  | "ALREADY_SOLD"
  | "RECALLED"
  | "EXPIRED"
  | "AT_SHOP"
  | "COUNTERFEIT"
  | "NOT_FOUND";

export type VerificationStatus =
  | "AUTHENTIC"
  | "AUTHENTIC_RECEIVED"
  | "AUTHENTIC_SOLD"
  | "AUTHENTIC_RETURNED"
  | "AUTHENTIC_AVAILABLE"
  | "SUSPICIOUS"
  | "QR_DUPLICATION_SUSPECTED"
  | "INVALID"
  | "EXPIRED"
  | "RECALLED"
  | "COUNTERFEIT"
  | "GENUINE"
  | "PURCHASED_RECENTLY"
  | "AT_SHOP"
  | "ALREADY_SOLD"
  | "NOT_FOUND";

export interface VerificationPayload {
  batchId: string;
  expiryDate: string;
  manufacturerId: string;
  medicineName?: string;
  genericName?: string;
  brandName?: string;
  dosage?: string;
  form?: string;
  mfgDate?: string;
  manufacturingDate?: string;
  serial?: string;
  packSize?: number;
  [key: string]: any;
}

export interface DispensingShop {
  shopId?: string | null;
  name?: string | null;
  licenseNumber?: string | null;
  location?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  address?: string | null;
  phone?: string | null;
  isSold?: boolean;
  custodyState?: string | null;
  intakeTime?: string | null;
  formattedIntakeTime?: string | null;
  sellingDate?: string | null;
  sellingTime?: string | null;
  timestamp?: string | null;
  formattedSaleTime?: string | null;
  relativeSaleTime?: string | null;
  hoursSinceSale?: number | null;
  daysSinceSale?: number | null;
  isRecentSale?: boolean;
}

export interface VerificationResult {
  success: boolean;
  status: VerificationStatus;
  uiState?: BackendUIState;
  message?: string;
  valid?: boolean;
  packHash?: string;
  scannedHash?: string;
  blockchainStatus?: string;
  custodyState?: string | null;
  isSold?: boolean;
  detail?: any;

  isRecentlySold?: boolean;
  hoursSinceSale?: number | null;
  daysSinceSale?: number | null;
  dispensingShop?: DispensingShop | null;

  payload?: VerificationPayload;

  pack?: {
    packId: string;
    medicineName: string;
    genericName?: string;
    brandName?: string;
    batchId: string;
    manufacturingDate: string;
    expiryDate: string;
    dosage?: string;
    composition?: string;
    drugSchedule?: string;
    storageCondition?: string;
    serial?: string;
  };

  manufacturer?: {
    name: string;
    id?: string;
    productionSite?: string;
    licenseNumber?: string;
  };

  shop?: {
    name: string;
    id?: string;
    licenseNumber?: string;
    location?: string;
  };

  transaction?: {
    status: string;
    saleTime?: string | null;
    intakeTime?: string | null;
    isSold?: boolean;
    location?: string | null;
  };

  risk?: {
    level: string;
    score?: number;
    qrDuplicationSuspected: boolean;
  };
}

export interface ReportSubmissionPayload {
  qrToken: string;
  location?: string;
  notes?: string;
  photoUrl?: string;
  medicineName?: string;
}

export interface ReportSubmissionResponse {
  status: 'success' | 'error';
  message: string;
  reportId?: string;
}

export type MedicineItemStatus = 'Verified' | 'Needs Attention' | 'Expiring Soon' | 'Suspicious' | 'Expired';

export interface SavedMedicine {
  id: string;
  name: string;
  genericName: string;
  brandName?: string;
  dosage: string;
  composition?: string;
  drugSchedule?: string;
  storageCondition?: string;
  productionSite?: string;
  batchNumber: string;
  manufacturer: string;
  mfgDate: string;
  expiryDate: string;
  daysToExpiry: number;
  status: MedicineItemStatus;
  packId: string;
  category: string;
  notes?: string;
  prescribedBy?: string;
  instructions?: string;
  verifiedAt: string;
  safetyScore: number;
}

export interface SafetyAlert {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  status: 'Verified' | 'Warning' | 'Expired' | 'Suspicious';
  source: string;
  date: string;
  summary: string;
  affectedBatches: string[];
  recommendedAction: string;
  isNationalAdvisory?: boolean;
}

export interface HealthInsight {
  id: string;
  title: string;
  category: 'Counterfeit Awareness' | 'Storage & Safety' | 'Expiry & Disposal' | 'Best Practices';
  readTime: string;
  summary: string;
  content: string[];
  keyTakeaway: string;
  iconName: string;
}

export interface MedicineSafetyMetrics {
  verifiedCount: number;
  attentionNeededCount: number;
  expiringSoonCount: number;
  suspiciousAlertsCount: number;
  overallSafetyScore: number;
  lastUpdated: string;
}
