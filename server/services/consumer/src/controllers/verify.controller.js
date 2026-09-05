import { verifyToken, getPackStatus } from '../services/coreClient.service.js';
import { getPublicBatchMetadata } from '../services/manufacturerClient.service.js';
import { getPublicShopkeeperProfile } from '../services/shopkeeperClient.service.js';
import { getISTISOString, formatISTDateTime } from '../utils/time.js';

// ── Constants ─────────────────────────────────────────────────────────────────
// The 8 consumer UI verification states as defined in the architecture.
const UI_STATE = Object.freeze({
    GENUINE:            'GENUINE',            // Valid sig, not expired, AtShop or Packaged
    PURCHASED_RECENTLY: 'PURCHASED_RECENTLY', // Valid sig, sold within <= 2 days (48h)
    ALREADY_SOLD:       'ALREADY_SOLD',       // Valid sig, sold > 2 days ago
    RECALLED:           'RECALLED',           // Valid sig, batch recalled
    EXPIRED:            'EXPIRED',            // Valid sig, expiryDate < today
    AT_SHOP:            'AT_SHOP',            // Valid sig, verified at registered pharmacy
    COUNTERFEIT:        'COUNTERFEIT',        // Invalid signature
    NOT_FOUND:          'NOT_FOUND',          // Valid sig, no on-chain MFG event
});

// ── Selling Timestamp & Relative Time Parsers ─────────────────────────────────
const parseSellingTimestamp = (detail) => {
    if (!detail) return null;
    if (detail.timestamp) {
        const d = new Date(detail.timestamp);
        if (!isNaN(d.getTime())) return d;
    }
    if (detail.soldAt) {
        const d = new Date(detail.soldAt);
        if (!isNaN(d.getTime())) return d;
    }
    const dateStr = detail.sellingDate;
    const timeStr = detail.sellingTime || '00:00:00';
    if (!dateStr) return null;

    // Format DDMMYYYY e.g. "02092026"
    if (/^\d{8}$/.test(dateStr)) {
        const day = dateStr.slice(0, 2);
        const month = dateStr.slice(2, 4);
        const year = dateStr.slice(4, 8);
        const d = new Date(`${year}-${month}-${day}T${timeStr}+05:30`);
        if (!isNaN(d.getTime())) return d;
    }
    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const d = new Date(`${dateStr}T${timeStr}+05:30`);
        if (!isNaN(d.getTime())) return d;
    }
    // Format DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split(/[\/\-]/);
        const d = new Date(`${year}-${month}-${day}T${timeStr}+05:30`);
        if (!isNaN(d.getTime())) return d;
    }
    const fallback = new Date(`${dateStr} ${timeStr} GMT+0530`);
    return isNaN(fallback.getTime()) ? null : fallback;
};

const formatRelativeTime = (diffMs) => {
    if (diffMs == null || diffMs < 0) return 'recently';
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
};

const formatSaleDateTime = (dateObj, detail) => {
    if (dateObj && !isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    const dateStr = detail?.sellingDate || 'Unknown date';
    const timeStr = detail?.sellingTime ? ` at ${detail.sellingTime}` : '';
    return `${dateStr}${timeStr}`;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const mapStatusToUiState = (blockchainStatus) => {
    switch (blockchainStatus) {
        case 'Recalled':  return UI_STATE.RECALLED;
        case 'Sold':      return UI_STATE.ALREADY_SOLD;
        case 'AtShop':    return UI_STATE.AT_SHOP;
        case 'Packaged':  return UI_STATE.GENUINE;
        case 'MINTED':    return UI_STATE.GENUINE;
        case 'UNKNOWN':   return UI_STATE.GENUINE;
        case 'NOT_FOUND': return UI_STATE.NOT_FOUND;
        default:          return UI_STATE.NOT_FOUND;
    }
};

// ── URL & Token Parser Helper ──────────────────────────────────────────────────
/**
 * Intelligently extracts the raw signed JWT token and packHash whether the scanner provides:
 *   1. Full verify URL: "https://pharmachain.gov.in/verify/a8f5f167...?token=eyJhbGci..."
 *   2. Path param URL:  "https://pharmachain.gov.in/verify/a8f5f167..."
 *   3. Raw JWT string:  "eyJhbGciOiJFUzI1Ni..."
 */
const extractTokenAndHashFromQrData = (input) => {
    if (!input || typeof input !== 'string') return { token: '', hash: '' };
    
    const raw = input.trim();
    let token = raw;
    let hash  = '';

    if (raw.includes('/verify/')) {
        const afterVerify = raw.split('/verify/')[1];
        if (afterVerify) {
            hash = afterVerify.split('?')[0].split('/')[0];
        }
    }

    if (raw.includes('token=')) {
        try {
            const urlObj = new URL(raw.startsWith('http') ? raw : `https://pharmachain.gov.in/${raw}`);
            token = urlObj.searchParams.get('token') || raw;
        } catch {
            const match = raw.match(/[?&]token=([^&]+)/);
            if (match && match[1]) token = decodeURIComponent(match[1]);
        }
    }

    return { token, hash };
};

// ── Controllers ───────────────────────────────────────────────────────────────

export const verifyQrController = async (req, res) => {
    try {
        const inputData = req.body?.qrData || req.body?.token || req.body?.signedToken || req.query?.token || req.query?.qrData;

        if (!inputData) {
            return res.status(400).json({ status: 'error', message: 'qrData or token is required' });
        }

        const { token: parsedToken, hash: parsedUrlHash } = extractTokenAndHashFromQrData(inputData);

        // ── Tier 1: Cryptographic signature verification ───────────────────────
        const verifyResult = await verifyToken(parsedToken);

        if (!verifyResult.valid) {
            // UI State 6 — COUNTERFEIT
            return res.status(200).json({
                status: 'success',
                uiState: UI_STATE.COUNTERFEIT,
                message: 'COUNTERFEIT WARNING: Invalid digital signature. Do not consume this medicine.',
                valid: false,
                scannedHash: parsedUrlHash || null,
            });
        }

        const { payload, packHash } = verifyResult;
        const { batchId, expiryDate, manufacturerId, medicineName: payloadMedName } = payload;

        // ── Non-blocking metadata enrichment from manufacturer-service ────────
        const batchMetadata = await getPublicBatchMetadata(batchId);

        const medicineInfo = {
            medicineName:      batchMetadata?.medicineName || payloadMedName || 'Verified Medicine',
            genericName:       batchMetadata?.genericName || payload.genericName || payloadMedName || 'Verified Formulation',
            brandName:         batchMetadata?.brandName || payload.brandName || null,
            dosage:            batchMetadata?.dosage || payload.dosage || 'Standard Formulation',
            dosageForm:        batchMetadata?.dosageForm || null,
            composition:       batchMetadata?.composition || null,
            drugSchedule:      batchMetadata?.drugSchedule || 'OTC',
            storageCondition:  batchMetadata?.storageCondition || 'Store below 25°C in a dry place',
            manufacturingDate: batchMetadata?.manufacturingDate || payload.manufacturingDate || payload.mfgDate || 'N/A',
            expiryDate:        batchMetadata?.expiryDate || expiryDate || 'N/A',
            batchId:           batchId,
            manufacturerName:  batchMetadata?.manufacturerName || batchMetadata?.companyName || manufacturerId,
            productionSite:    batchMetadata?.productionSite || null,
            mfgLicenseNumber:  batchMetadata?.mfgLicenseNumber || null,
        };

        // ── Check expiry date ─────────────────────────────────────────────────
        if (new Date(expiryDate) < new Date()) {
            // UI State 4 — EXPIRED
            return res.status(200).json({
                status: 'success',
                uiState: UI_STATE.EXPIRED,
                message: `EXPIRED: Medicine passed expiration date on ${expiryDate}. Do not consume.`,
                valid: true,
                payload,
                medicine: medicineInfo,
                batch: batchMetadata,
            });
        }

        // ── Tier 2: Blockchain status lookup ──────────────────────────────────
        let statusResult = { status: 'MINTED', liveOnChain: false };
        try {
            statusResult = await getPackStatus(packHash, batchId);
        } catch (err) {
            console.warn(`[consumer-service Verify] ⚠️ Blockchain lookup error: ${err.message}`);
        }

        const rawStatus = statusResult.status || statusResult.custodyState || 'MINTED';
        let uiState = mapStatusToUiState(rawStatus);

        let blockchainStatus = statusResult.liveOnChain ? 'COMMITTED (ON-CHAIN)' : 'GENUINE (OFFLINE_VERIFIED)';
        if (uiState === UI_STATE.AT_SHOP) blockchainStatus = 'AT_SHOP';
        else if (uiState === UI_STATE.ALREADY_SOLD) blockchainStatus = 'SOLD';
        else if (uiState === UI_STATE.RECALLED) blockchainStatus = 'RECALLED';
        else if (uiState === UI_STATE.EXPIRED) blockchainStatus = 'EXPIRED';

        if (statusResult.liveOnChain === false && statusResult.error) {
            console.warn(`[consumer-service Verify] ⚠️ Blockchain notice for packHash ${packHash}: ${statusResult.error}`);
        }

        // ── Provenance & Dispensing Shop Extraction ───────────────────────────
        const detail = statusResult.detail || {};
        const isSold = uiState === UI_STATE.ALREADY_SOLD || rawStatus === 'Sold' || rawStatus === 'SOLD' || detail.eventType === 'SOLD';
        const isAtShop = !isSold && (uiState === UI_STATE.AT_SHOP || rawStatus === 'AtShop' || rawStatus === 'AT_SHOP' || detail.eventType === 'INTAKE' || detail.eventType === 'AT_SHOP');

        let dispensingShop = (isSold || isAtShop || detail.shopName || detail.sellerId) ? {
            shopId:              detail.sellerId || detail.toId || detail.fromId || null,
            name:                detail.shopName || (detail.sellerId ? `Registered Pharmacy (${detail.sellerId})` : 'Registered Pharmacy'),
            licenseNumber:       detail.licenseNumber || 'CDSCO-APPROVED',
            location:            detail.location || null,
            latitude:            detail.latitude || null,
            longitude:           detail.longitude || null,
            address:             null,
            phone:               null,
            isSold:              Boolean(isSold),
            custodyState:        isSold ? 'SOLD' : isAtShop ? 'AT_SHOP' : 'MINTED',
            intakeTime:          (isAtShop || detail.eventType === 'INTAKE') ? (detail.timestamp || null) : null,
            formattedIntakeTime: (isAtShop || detail.eventType === 'INTAKE') && detail.timestamp ? formatSaleDateTime(new Date(detail.timestamp), detail) : null,
            sellingDate:         isSold ? (detail.sellingDate || null) : null,
            sellingTime:         isSold ? (detail.sellingTime || null) : null,
            timestamp:           detail.timestamp || null,
            formattedSaleTime:   null,
            relativeSaleTime:    null,
        } : null;

        // ── Enrich pharmacy profile from shopkeeper-service if needed ─────────
        if (dispensingShop?.shopId) {
            try {
                const profile = await getPublicShopkeeperProfile(dispensingShop.shopId);
                if (profile) {
                    if (profile.name) dispensingShop.name = profile.name;
                    if (profile.licenseNumber) dispensingShop.licenseNumber = profile.licenseNumber;
                    if (profile.address) dispensingShop.address = profile.address;
                    if (profile.phone) dispensingShop.phone = profile.phone;
                    if (!dispensingShop.location && (profile.city || profile.state)) {
                        dispensingShop.location = `${profile.city || ''}, ${profile.state || ''}`.trim().replace(/^,|,$/g, '');
                    }
                }
            } catch (profErr) {
                // Non-fatal profile enrichment error
            }
        }

        // ── Sold Catch: 2-Day (48-Hour) Window Logic ───────────────────────────
        let isRecentlySold = false;
        let hoursSinceSale = null;
        let daysSinceSale = null;
        let soldDateObj = null;

        if (isSold) {
            blockchainStatus = 'SOLD';
            soldDateObj = parseSellingTimestamp(detail);
            if (soldDateObj) {
                const now = new Date();
                const diffMs = Math.max(0, now.getTime() - soldDateObj.getTime());
                hoursSinceSale = Number((diffMs / (1000 * 60 * 60)).toFixed(1));
                daysSinceSale = Math.floor(hoursSinceSale / 24);

                if (dispensingShop) {
                    dispensingShop.formattedSaleTime = formatSaleDateTime(soldDateObj, detail);
                    dispensingShop.relativeSaleTime = formatRelativeTime(diffMs);
                    dispensingShop.hoursSinceSale = hoursSinceSale;
                    dispensingShop.daysSinceSale = daysSinceSale;
                }

                // If scanned within 2 days (<= 48 hours) of sale, consider genuine recent purchase
                if (hoursSinceSale <= 48) {
                    isRecentlySold = true;
                    uiState = UI_STATE.PURCHASED_RECENTLY;
                    if (dispensingShop) dispensingShop.isRecentSale = true;
                } else {
                    isRecentlySold = false;
                    uiState = UI_STATE.ALREADY_SOLD;
                    if (dispensingShop) dispensingShop.isRecentSale = false;
                }
            } else {
                uiState = UI_STATE.ALREADY_SOLD;
            }
        }

        // ── Build Contextual Messages ─────────────────────────────────────────
        const shopDisplayName = dispensingShop?.name || 'Registered Pharmacy';
        const formattedDate = dispensingShop?.formattedSaleTime || (soldDateObj ? formatSaleDateTime(soldDateObj, detail) : null);
        const relativeTimeStr = dispensingShop?.relativeSaleTime || 'recently';

        const messages = {
            [UI_STATE.GENUINE]:            '100% Genuine Medicine — Registered & Safe',
            [UI_STATE.PURCHASED_RECENTLY]: `100% Genuine Medicine — Recently Dispensed from ${shopDisplayName} (${relativeTimeStr}).`,
            [UI_STATE.ALREADY_SOLD]:       `Notice: This medicine was dispensed on ${formattedDate || 'a prior date'} by ${shopDisplayName}. If you purchased this earlier, check your seller details below. If buying now as new stock, it may be a duplicate clone.`,
            [UI_STATE.RECALLED]:           'CRITICAL: Batch recalled by manufacturer. Do not consume.',
            [UI_STATE.AT_SHOP]:            dispensingShop?.name ? `In stock at ${dispensingShop.name}. Awaiting pharmacist scan and sale.` : 'In stock at registered pharmacy. Awaiting pharmacist scan and sale.',
            [UI_STATE.NOT_FOUND]:          'Valid manufacturer token, but no on-chain mint event found.',
        };

        console.log(`[consumer-service Verify] packHash: ${packHash} — uiState: ${uiState} — blockchainStatus: ${blockchainStatus} — shop: ${dispensingShop?.name || 'N/A'} — isSold: ${Boolean(isSold)} — isRecentlySold: ${isRecentlySold}`);

        return res.status(200).json({
            status: 'success',
            uiState,
            isSold: Boolean(isSold),
            isRecentlySold: isSold ? isRecentlySold : false,
            custodyState: isSold ? 'SOLD' : isAtShop ? 'AT_SHOP' : 'MINTED',
            hoursSinceSale: isSold ? hoursSinceSale : null,
            daysSinceSale: isSold ? daysSinceSale : null,
            message: messages[uiState] || 'Verification complete',
            valid: true,
            payload,
            packHash,
            blockchainStatus,
            blockchainAvailable: statusResult.liveOnChain !== false,
            blockchainError: statusResult.error || null,
            detail: statusResult.detail || null,
            dispensingShop,
            medicine: medicineInfo,
            batch: batchMetadata,
        });
    } catch (error) {
        console.error('[consumer-service Verify] verifyQrController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
