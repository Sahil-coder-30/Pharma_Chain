export type BatchMintStatus = 'DRAFT' | 'PENDING' | 'MINTING' | 'MINTED' | 'FAILED' | 'PACKAGED' | 'DISTRIBUTED' | 'RECALLED';


export type PackStatus = 'PACKAGED' | 'AT_SHOP' | 'SOLD' | 'RECALLED' | 'COUNTERFEIT';

export type ConsumerVerificationState = 
  | 'GENUINE'
  | 'ALREADY_SOLD'
  | 'RECALLED'
  | 'EXPIRED'
  | 'AT_SHOP'
  | 'COUNTERFEIT'
  | 'NOT_FOUND';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type RecallSeverity = 'CRITICAL' | 'MAJOR' | 'MODERATE';

export type AlertType = 'CRITICAL' | 'WARNING' | 'SUCCESS' | 'INFO';

export interface ManufacturerProfile {
  id: string;
  name: string;
  code: string;
  email: string;
  licenseNumber: string;
  kycStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'BLOCKED' | 'SUSPENDED';
  keyId: string;
  keyAlgorithm: 'ES256 (ECDSA P-256)' | string;
  publicKeyPem: string;
  keyStatus: string;
  headquarters: string;
  plantLocations: { name: string; address: string; facilityId: string; isActive: boolean }[];
  authorizedPersonnel: { name: string; role: string; email: string; phone: string }[];
  registeredAt: string;
  gstin: string;
  cdscoRegistration: string;
  blockedReason?: string;
  blockedAt?: string;
  cin?: string;
}


/**
 * Tier 1: The QR Code JWT Payload (Signed by pharma-core, travels on physical packs)
 */
export interface Tier1QRPayload {
  batchId: string;        // Resolves all batch data
  serial: string;         // Pack identity within batch (e.g. "00001")
  expiryDate: string;     // Expiry check at scan time (e.g. "2028-08-21")
  manufacturerId: string; // Key resolver for JWKS (e.g. "MFR_CIPLA_001")
  nonce: string;          // 8-char CSPRNG entropy (e.g. "a3f7b2c1")
  ts: string;             // Nanosecond entropy timestamp (e.g. "3460914344715500")
}

/**
 * Full Batch Record: Tier 2 Manufacturer DB metadata + Tier 1 Genesis Blueprint
 */
export interface Batch {
  // Primary Identifiers
  id: string; // systemBatchId (e.g. "BATCH-CIPLA-2026-001")
  manufacturerBatchNumber?: string; // Factory ERP free-text batch ID
  manufacturerId: string; // e.g. "MFR_MEDCORE_001"

  // 1. Medicine Identity & Formulation
  medicineName: string;
  genericName: string;
  brandName?: string;
  therapeuticCategory?: string;
  drugSchedule?: 'Schedule H' | 'Schedule H1' | 'Schedule X' | 'Schedule G' | 'OTC' | string;
  pharmacopoeiaStandard?: 'IP (Indian Pharmacopoeia)' | 'BP' | 'USP' | string;
  composition: string;
  dosage: string;
  strength: string;
  form: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Drops';
  route?: 'Oral' | 'Intravenous (IV)' | 'Intramuscular (IM)' | 'Topical' | 'Ophthalmic' | string;
  color?: string;
  shape?: string;
  coating?: 'Film Coated' | 'Enteric Coated' | 'Sugar Coated' | 'Uncoated' | string;

  // 2. Storage, Shelf Life & Manufacturing Line
  storageConditions?: string;
  shelfLifeMonths?: number;
  manufacturingDate: string;
  expiryDate: string;
  productionSite: string;
  productionAddress?: string;
  manufacturingLicenseNo?: string;
  productionLineId?: string;
  supervisorId?: string;
  shiftCode?: string;
  equipmentBatchId?: string;

  // 3. Packaging & Logistics Hierarchy
  totalQuantity: number;
  packsMinted: number;
  packSize: number;
  packType?: 'Alu-Alu Blister Strip' | 'PVC Blister' | 'HDPE Bottle' | 'Glass Vial' | 'Ampoule' | string;
  unitsPerCarton?: number;

  // 4. Regulatory, Statutory & Cold Chain
  cdscoApprovalNo?: string;
  gstin?: string;
  hsn?: string;
  controlledSubstance?: boolean;
  coldChainRequired?: boolean;
  temperatureRange?: string;

  // 5. Quality Assurance, Release & COA
  qaOfficerId?: string;
  qaApprovalDate?: string;
  retestDate?: string;
  coaReferenceNo?: string;
  microbialTestStatus?: 'PASSED' | 'PENDING' | 'FAILED' | string;
  dissolutionTestStatus?: 'PASSED' | 'PENDING' | 'FAILED' | string;
  assayResult?: string;
  internalBatchNotes?: string;
  tags?: string[];

  // Blockchain & Minting Lifecycle
  mintStatus: BatchMintStatus;
  mintError?: string;
  recallReason?: string;
  recallDate?: string;
  createdAt: string;
  qrPackageStatus: 'READY' | 'GENERATING' | 'NOT_STARTED';
  txHash?: string;
  blockNumber?: number;
  s3DownloadUrl?: string;
  s3FileKey?: string;
  s3Mode?: 'aws' | 'local' | string;
  blockchainStatus?: 'COMMITTED' | 'PARTIAL' | 'FAILED' | 'PENDING' | string;
  blockchainError?: string;
  blockchainRecordedCount?: number;
}


export interface Pack {
  id: string;
  batchId: string;
  serialNumber: string;
  packHash: string;
  signedToken: string;
  status: PackStatus;
  currentHolder: string;
  lastEventDate: string;
  intakeShopName?: string;
  saleDate?: string;
}

export interface TransitionRecord {
  docType?: string;
  hash: string;
  fromId?: string;
  toId?: string;
  sellingDate?: string;
  sellingTime?: string;
  sellerId?: string;
  blockNumber?: number;
  txId?: string;
  timestamp: string;
  state?: 'COMMITTED' | 'RECALLED' | 'QUARANTINED' | 'INTAKE' | 'SALE';
  payload?: any;
  rawPayload?: any;
}

export interface RecallRecord {
  id: string;
  batchId: string;
  medicineName: string;
  dosage: string;
  reason: string;
  date: string;
  affectedPacks: number;
  status: 'ACTIVE' | 'RESOLVED' | 'INVESTIGATING';
  initiatedBy: string;
  severity: RecallSeverity;
  quarantineActionsTaken: string[];
}

export interface QualityAlert {
  id: string;
  title: string;
  description: string;
  type: AlertType;
  timestamp: string;
  batchId?: string;
  packHash?: string;
  resolved: boolean;
  category: 'COUNTERFEIT_SCAN' | 'UNUSUAL_ACTIVITY' | 'LICENSE_EXPIRY' | 'MINTING_STATUS' | 'TEMPERATURE_ALERT';
  location?: string;
  reporter?: string;
}

export interface OrderItem {
  medicineName: string;
  dosage: string;
  quantity: number;
  batchId: string;
  unitPrice: number;
}

export interface B2BOrder {
  id: string;
  orderNumber: string;
  pharmacyName: string;
  pharmacyLicense: string;
  shippingAddress: string;
  items: OrderItem[];
  totalQuantity: number;
  totalAmount: number;
  status: OrderStatus;
  orderDate: string;
  expectedDeliveryDate: string;
  trackingNumber?: string;
  dispatchedAt?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  medicineName: string;
  genericName: string;
  form: string;
  strength: string;
  activeBatchesCount: number;
  totalPacks: number;
  lowStockThreshold: number;
  status: 'HEALTHY' | 'LOW_STOCK' | 'CRITICAL' | 'RECALLED';
  unitPrice: number;
  category: 'Antibiotics' | 'Analgesics' | 'Cardiovascular' | 'Antidiabetic' | 'Respiratory' | 'Gastrointestinal';
}

export interface ExpiryMonitoringItem {
  id: string;
  batchId: string;
  medicineName: string;
  dosage: string;
  manufacturingDate: string;
  expiryDate: string;
  daysRemaining: number;
  quantity: number;
  risk: 'EXPIRED' | 'CRITICAL_30' | 'WARNING_60' | 'MONITOR_90' | 'SAFE';
  status: 'QUARANTINE_REQUIRED' | 'PRIORITY_DISPATCH' | 'NORMAL';
}

export interface TopProductMetric {
  id: string;
  medicineName: string;
  dosage: string;
  batchesCount: number;
  packsCount: number;
  productionVelocity: 'High' | 'Medium' | 'Steady';
  status: 'Active' | 'Under Review';
  revenueShare: number; // e.g. 28%
}

export interface DashboardStats {
  totalBatches: number;
  totalBatchesTrend?: number;
  mintedPacks: string;
  mintedPacksNumber: number;
  mintedPacksTrend?: number;
  activeProducts?: number;
  activeProductsTrend?: number;
  verifiedPackages?: string;
  verifiedPackagesNumber?: number;
  verificationRate?: number | string;
  recalledBatches: number;
  recalledBatchesTrend?: number;
  pendingActions?: number;
  traceabilityHealth?: number;
  blockchainRecordsCount?: string;
  unresolvedAlertsCount?: number;
  recalledPacksCount?: number;
  qrGeneratedCount?: string;
  downloadedPackagesCount?: number;
  pendingExportsCount?: number;
  activeRecalls?: number;
  totalRevenue?: string;
  activeDispatches?: number;
  activeOrders?: number;
  failedVerifications?: number;
  criticalAlerts?: number;
  activeQualityAlerts?: number;
  inventoryUtilization?: string;
  warehouseCapacity?: string;
  ledgerBlocks?: number;
}

export interface FormulationItem {
  _id: string;
  medicineName: string;
  genericName?: string;
  brandName?: string;
  therapeuticCategory?: string;
  drugSchedule?: string;
  pharmacopoeiaStandard?: string;
  composition?: string;
  dosage?: string;
  strength?: string;
  form?: string;
  route?: string;
  storageConditions?: string;
  shelfLifeMonths?: number;
  totalQuantityProduced: number;
  batchCount: number;
  activeBatches: number;
  recalledBatches: number;
  latestManufacturingDate?: string;
  latestExpiryDate?: string;
  latestBatchId?: string;
}

