import { extractTokenAndHash } from '../utils/qrParser.util.js';
import { verifyToken, getPackStatus, recordIntake, recordSale, setPackStateV2, getPackStateV2, checkPackBit } from '../services/coreClient.service.js';
import { getPublicBatchMetadata } from '../services/manufacturerClient.service.js';
import { PackEvent, Inventory } from '../models/inventory.model.js';
import Shopkeeper from '../models/shopkeeper.model.js';
import { getISTISOString, formatISTDateTime } from '../utils/time.js';

// ── Intake Scan — POST /api/shopkeeper/scan/intake ────────────────────────────
export const intakeScanController = async (req, res) => {
    try {
        const rawInput     = req.body.signedToken || req.body.qrData || req.body.token;
        const shopkeeperId = req.user.id;
        const operatorId   = req.user.id;

        if (!rawInput) {
            return res.status(400).json({ status: 'error', message: 'signedToken, qrData, or token is required.' });
        }

        const { token: signedToken, hash: scannedHash } = extractTokenAndHash(rawInput);

        // Tier 1: ES256 cryptographic signature
        const verifyResult = await verifyToken(signedToken);
        if (!verifyResult.valid) {
            return res.status(200).json({
                status:      'error',
                code:        'INVALID_SIGNATURE',
                message:     'Invalid QR code — cryptographic signature verification failed. Pack may be counterfeit.',
                scannedHash: scannedHash || null,
            });
        }

        const { payload, packHash } = verifyResult;
        const isV2 = payload && (payload.b !== undefined && payload.i !== undefined);
        const batchId = isV2 ? payload.b : payload.batchId;
        const packIndex = isV2 ? parseInt(payload.i, 10) : null;
        let expiryDate = payload.expiryDate;
        let manufacturerId = payload.manufacturerId;
        const serial = isV2 ? `idx-${payload.i}` : payload.serial;

        // Fetch batch metadata if V2
        let batchMeta = null;
        if (isV2) {
            batchMeta = await getPublicBatchMetadata(batchId).catch(() => null);
            const batchInfo = batchMeta?.batch || batchMeta;
            if (batchInfo?.expiryDate) expiryDate = batchInfo.expiryDate;
            if (batchInfo?.manufacturerId) manufacturerId = batchInfo.manufacturerId;

            // V2 bounds check
            if (batchInfo?.totalPacks != null && packIndex >= batchInfo.totalPacks) {
                return res.status(400).json({
                    status: 'error',
                    code: 'OUT_OF_BOUNDS',
                    message: `Pack index ${packIndex} exceeds batch total packs ${batchInfo.totalPacks}. Counterfeit detected.`,
                });
            }

            // V2.1 Nibble: Atomically register pack at pharmacy (MINTED → AT_SHOP) + record forensic custody
            let intakeStateResult;
            try {
                intakeStateResult = await setPackStateV2({
                    batchId,
                    packIndex,
                    newState: 'AT_SHOP',
                    shopId: shopkeeperId,
                    operatorId,
                    location: req.body.location || 'Registered Pharmacy Intake Location',
                    timestamp: getISTISOString(),
                    authToken: req.headers.authorization?.replace(/^Bearer\s+/i, ''),
                });
            } catch (stateErr) {
                console.error(`[shopkeeper-service Scan] V2.1 AT_SHOP state error: ${stateErr.message}`);
                // Non-fatal — continue intake even if Fabric is unreachable
            }
            const intakeStatus = intakeStateResult?.status || 'OK';
            if (intakeStatus === 'ALREADY_SOLD' || intakeStatus === 'REVOKED') {
                return res.status(409).json({
                    status: 'error',
                    code: intakeStatus === 'REVOKED' ? 'RECALLED' : 'ALREADY_SOLD',
                    message: intakeStatus === 'REVOKED'
                        ? 'CRITICAL: Batch has been recalled by CDSCO. Cannot intake.'
                        : 'This pack has already been sold. Duplicate intake rejected.',
                });
            }
            if (intakeStatus === 'ALREADY_AT_SHOP') {
                console.warn(`[shopkeeper-service Scan] Pack ${batchId}:${packIndex} already AT_SHOP — duplicate intake allowed (idempotent).`);
            }
        }

        // Expiry check
        if (expiryDate && new Date(expiryDate) < new Date()) {
            return res.status(400).json({
                status:  'error',
                code:    'EXPIRED',
                message: `Medicine expired on ${expiryDate}. Cannot intake expired stock.`,
            });
        }

        // Duplicate intake guard
        const alreadyIntaken = await PackEvent.exists({ packHash, eventType: 'INTAKE' });
        if (alreadyIntaken) {
            return res.status(409).json({
                status:  'error',
                code:    'DUPLICATE_INTAKE',
                message: 'This pack has already been received into inventory. Duplicate intake rejected.',
            });
        }

        // Fetch Shopkeeper Profile for Provenance & GPS
        const shopkeeper = await Shopkeeper.findOne({ shopId: shopkeeperId }).lean().catch(() => null);
        const shopName = shopkeeper?.shop?.name || `Verified Pharmacy (${shopkeeperId})`;
        const licenseNumber = shopkeeper?.license?.drugLicenseNumber || 'DL-REGISTERED';
        const shopAddress = shopkeeper?.shop?.address ? `${shopkeeper.shop.address}, ${shopkeeper.shop.city}, ${shopkeeper.shop.state} - ${shopkeeper.shop.pincode}` : 'Registered CDSCO Pharmacy Location';
        const latitude = req.body.latitude || req.body.gps?.latitude || '28.6139';
        const longitude = req.body.longitude || req.body.gps?.longitude || '77.2090';
        const location = req.body.location || `${latitude}, ${longitude} | ${shopAddress}`;
        const timestamp = getISTISOString();

        // Fabric transition MINTED → AT_SHOP (for V1 only; V2 uses pure bitmap)
        if (!isV2) {
            await recordIntake({
                packHash,
                shopId: shopkeeperId,
                operatorId,
                manufacturerId,
                shopName,
                licenseNumber,
                location,
                latitude,
                longitude,
                timestamp,
            }).catch(err => console.warn(`[shopkeeper-service Scan] Fabric intake failed (non-fatal): ${err.message}`));
        }

        // Fetch medicine name
        if (!batchMeta) {
            batchMeta = await getPublicBatchMetadata(batchId).catch(() => null);
        }
        const medicineName = payload.medicineName || batchMeta?.medicineName || batchMeta?.batch?.medicineName || `Batch ${batchId}`;
        const expiryAsDate = expiryDate ? new Date(expiryDate) : null;

        // Write audit trail
        await PackEvent.create({
            shopkeeperId,
            packHash,
            packId:      packHash,
            batchId,
            eventType:   'INTAKE',
            operatorId,
            medicineName,
            batchNo:     batchId,
            expDate:     expiryAsDate,
            scanStatus:  'Verified',
            manufacturer: manufacturerId || null,
        });

        // Upsert inventory — updates current stock and sets metadata
        await Inventory.findOneAndUpdate(
            { shopkeeperId, batchId },
            {
                $inc: { currentStock: 1 },
                $set: {
                    medicineName,
                    batchNo: batchId,
                    lastIntakeAt: new Date(),
                },
                $setOnInsert: {
                    expiryDate:  expiryAsDate,
                    manufacturer: manufacturerId || null,
                    status:      'AVAILABLE',
                    receivedDate: new Date(),
                },
            },
            { upsert: true, new: true },
        );

        console.log(`[shopkeeper-service Scan] Intake accepted — pack ${packHash} serial ${serial || '?'} → shop ${shopkeeperId}`);

        return res.status(200).json({
            status:  'success',
            message: 'Stock added successfully ✅',
            data:    {
                packHash,
                batchId,
                serial: serial || null,
                expiryDate,
                manufacturerId,
                medicineName,
                custody: intakeStateResult?.custody || null,
            },
        });
    } catch (err) {
        console.error('[shopkeeper-service Scan] intakeScanController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};


// ── Sale Scan — POST /api/shopkeeper/scan/sale ────────────────────────────────
export const saleScanController = async (req, res) => {
    try {
        const rawInput     = req.body.signedToken || req.body.qrData || req.body.token;
        const shopkeeperId = req.user.id;
        const operatorId   = req.user.id;

        if (!rawInput) {
            return res.status(400).json({ status: 'error', message: 'signedToken, qrData, or token is required.' });
        }

        const { token: signedToken, hash: scannedHash } = extractTokenAndHash(rawInput);

        // Tier 1: ES256 signature
        const verifyResult = await verifyToken(signedToken);
        if (!verifyResult.valid) {
            return res.status(200).json({
                status:      'error',
                code:        'INVALID_SIGNATURE',
                message:     'Invalid QR code — cryptographic signature failed. Do not sell.',
                scannedHash: scannedHash || null,
            });
        }

        const { payload, packHash } = verifyResult;
        const isV2 = payload && (payload.b !== undefined && payload.i !== undefined);
        const batchId = isV2 ? payload.b : payload.batchId;
        const packIndex = isV2 ? parseInt(payload.i, 10) : null;
        let expiryDate = payload.expiryDate;
        const serial = isV2 ? `idx-${payload.i}` : payload.serial;

        // If V2, fetch batch metadata for expiryDate and bounds check
        if (isV2) {
            const batchMeta = await getPublicBatchMetadata(batchId).catch(() => null);
            const batchInfo = batchMeta?.batch || batchMeta;
            if (batchInfo?.expiryDate) {
                expiryDate = batchInfo.expiryDate;
            }
            if (batchInfo?.totalPacks != null && packIndex >= batchInfo.totalPacks) {
                return res.status(400).json({
                    status: 'error',
                    code: 'OUT_OF_BOUNDS',
                    message: `Pack index ${packIndex} exceeds batch total packs ${batchInfo.totalPacks}. Counterfeit detected.`,
                });
            }
        }

        // Expiry before sale
        if (expiryDate && new Date(expiryDate) < new Date()) {
            return res.status(400).json({
                status:  'error',
                code:    'EXPIRED',
                message: `Medicine expired on ${expiryDate}. Sale blocked.`,
            });
        }

        // Fetch Shopkeeper Profile for Provenance & GPS
        const shopkeeper = await Shopkeeper.findOne({ shopId: shopkeeperId }).lean().catch(() => null);
        const shopName = shopkeeper?.shop?.name || `Verified Pharmacy (${shopkeeperId})`;
        const licenseNumber = shopkeeper?.license?.drugLicenseNumber || 'DL-REGISTERED';
        const shopAddress = shopkeeper?.shop?.address ? `${shopkeeper.shop.address}, ${shopkeeper.shop.city}, ${shopkeeper.shop.state} - ${shopkeeper.shop.pincode}` : 'Registered CDSCO Pharmacy Location';
        const latitude = req.body.latitude || req.body.gps?.latitude || '28.6139';
        const longitude = req.body.longitude || req.body.gps?.longitude || '77.2090';
        const location = req.body.location || `${latitude}, ${longitude} | ${shopAddress}`;
        const timestamp = getISTISOString();

        // Tier 2: V2.1 Nibble state machine — advance AT_SHOP → SOLD atomically + record forensic custody
        let saleStateResult = null;
        if (isV2) {
            try {
                saleStateResult = await setPackStateV2({
                    batchId,
                    packIndex,
                    newState: 'SOLD',
                    sellerId: shopkeeperId,
                    operatorId,
                    location,
                    timestamp,
                    authToken: req.headers.authorization?.replace(/^Bearer\s+/i, ''),
                });
            } catch (saleErr) {
                const errData = saleErr.response?.data;
                if (errData?.status === 'ALREADY_SOLD' || saleErr.message?.includes('ALREADY_SOLD')) {
                    return res.status(409).json({
                        status: 'error',
                        code: 'ALREADY_SOLD',
                        message: 'This pack has already been sold. Possible duplicate or counterfeit.',
                        originalSaleCustody: errData?.originalSaleCustody || null,
                    });
                }
                if (errData?.status === 'REVOKED' || saleErr.message?.includes('RECALLED')) {
                    return res.status(409).json({ status: 'error', code: 'RECALLED', message: 'CRITICAL: This batch has been recalled. Sale blocked.' });
                }
                throw saleErr;
            }

            if (saleStateResult?.status === 'ALREADY_SOLD') {
                return res.status(409).json({
                    status: 'error',
                    code: 'ALREADY_SOLD',
                    message: 'This pack has already been sold. Possible duplicate or counterfeit.',
                    originalSaleCustody: saleStateResult?.originalSaleCustody || null,
                });
            }
            if (saleStateResult?.status === 'REVOKED' || saleStateResult?.reason === 'BATCH_RECALLED') {
                return res.status(409).json({ status: 'error', code: 'RECALLED', message: 'CRITICAL: This batch has been recalled. Sale blocked.' });
            }
            // Supply-chain diversion: pack never passed through a verified pharmacy
            if (saleStateResult?.alert === 'SUPPLY_CHAIN_DIVERSION' || saleStateResult?.currentState === 'MINTED') {
                return res.status(409).json({
                    status: 'error',
                    code: 'SUPPLY_CHAIN_DIVERSION',
                    message: '⚠️ ALERT: This medicine was never registered at any pharmacy. It may have been stolen in transit. Do NOT sell.',
                    currentState: saleStateResult?.currentState,
                });
            }
        } else {
            const statusResult = await getPackStatus(packHash, batchId);
            const ledgerStatus = statusResult.status || statusResult.custodyState || 'NOT_FOUND';

            if (ledgerStatus === 'RECALLED' || ledgerStatus === 'Recalled') {
                return res.status(409).json({ status: 'error', code: 'RECALLED', message: 'CRITICAL: This batch has been recalled. Sale blocked.' });
            }
            if (ledgerStatus === 'SOLD' || ledgerStatus === 'Sold') {
                return res.status(409).json({ status: 'error', code: 'ALREADY_SOLD', message: 'This pack has already been sold. Possible duplicate or counterfeit.' });
            }
            if (ledgerStatus !== 'AT_SHOP' && ledgerStatus !== 'AtShop' && ledgerStatus !== 'NOT_FOUND') {
                return res.status(400).json({
                    status:  'error',
                    code:    'NOT_RECEIVED_AT_SHOP',
                    message: `Pack cannot be sold — ledger status: ${ledgerStatus}. Complete intake scan first.`,
                });
            }
        }

        // Fabric transition AT_SHOP → SOLD (non-fatal, V1 legacy only)
        if (!isV2) {
            await recordSale({
                packHash,
                shopId: shopkeeperId,
                operatorId,
                shopName,
                licenseNumber,
                location,
                latitude,
                longitude,
                timestamp,
            }).catch(err => console.warn(`[shopkeeper-service Scan] Fabric sale failed (non-fatal): ${err.message}`));
        }

        // Write audit trail + decrement inventory
        await PackEvent.create({
            shopkeeperId,
            packHash,
            packId:    packHash,
            batchId,
            eventType: 'SOLD',
            operatorId,
            scanStatus: 'Verified',
        });

        await Inventory.findOneAndUpdate(
            { shopkeeperId, batchId },
            { $inc: { currentStock: -1 } },
        );

        console.log(`[shopkeeper-service Scan] Sale confirmed — pack ${packHash} serial ${serial || '?'} → shop ${shopkeeperId} (${shopName})`);

        return res.status(200).json({
            status:  'success',
            message: 'Sale confirmed — hand medicine to consumer 🛒',
            data:    {
                packHash,
                batchId,
                serial: serial || null,
                soldAt: timestamp,
                custody: saleStateResult?.custody || null,
                shop: {
                    shopId: shopkeeperId,
                    name: shopName,
                    licenseNumber,
                    location,
                    address: shopAddress,
                },
            },
        });
    } catch (err) {
        console.error('[shopkeeper-service Scan] saleScanController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── Authenticated Medicine Scan — POST /api/medicine/scan ────────────────────
// Read-only verification for a logged-in shopkeeper (no SOLD transition committed).
export const authenticatedScanController = async (req, res) => {
    try {
        const rawInput = req.body.signedToken || req.body.qrData || req.body.token;
        if (!rawInput) {
            return res.status(400).json({ status: 'error', message: 'signedToken, qrData, or token is required.' });
        }

        const { token: signedToken, hash: scannedHash } = extractTokenAndHash(rawInput);

        const verifyResult = await verifyToken(signedToken);
        if (!verifyResult.valid) {
            return res.status(200).json({
                status:      'error',
                code:        'INVALID_SIGNATURE',
                message:     'Invalid QR — signature failed.',
                scannedHash: scannedHash || null,
            });
        }

        const { payload, packHash } = verifyResult;
        const isV2 = payload && (payload.b !== undefined && payload.i !== undefined);
        const batchId = isV2 ? payload.b : payload.batchId;
        const packIndex = isV2 ? parseInt(payload.i, 10) : null;
        let expiryDate = payload.expiryDate;

        if (isV2) {
            const batchMeta = await getPublicBatchMetadata(batchId).catch(() => null);
            const batchInfo = batchMeta?.batch || batchMeta;
            if (batchInfo?.expiryDate) expiryDate = batchInfo.expiryDate;
        }

        if (expiryDate && new Date(expiryDate) < new Date()) {
            return res.status(200).json({ status: 'error', code: 'EXPIRED', message: `Expired on ${expiryDate}.`, valid: true, payload });
        }

        let ledgerStatus = 'NOT_FOUND';
        let detail = null;

        if (isV2) {
            const bitResult = await checkPackBit({ batchId, packIndex }).catch(() => null);
            if (bitResult?.status === 'DUPLICATE') ledgerStatus = 'SOLD';
            else if (bitResult?.status === 'RECALLED') ledgerStatus = 'RECALLED';
            else if (bitResult?.status === 'OK') ledgerStatus = 'MINTED';
            else ledgerStatus = bitResult?.status || 'UNKNOWN';
        } else {
            const statusResult = await getPackStatus(packHash, batchId);
            ledgerStatus = statusResult.status || 'NOT_FOUND';
            detail = statusResult.detail || null;
        }

        return res.status(200).json({
            status: 'success',
            valid:  true,
            packHash,
            payload,
            ledgerStatus,
            detail,
        });
    } catch (err) {
        console.error('[shopkeeper-service Scan] authenticatedScanController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── Public Customer Scan — POST /api/v1/scan/customer ─────────────────────────
// Public consumer verification endpoint exposed by shopkeeper service
export const customerScanController = async (req, res) => {
    try {
        const rawInput = req.body.signedToken || req.body.qrData || req.body.token;
        if (!rawInput) {
            return res.status(400).json({ status: 'error', message: 'signedToken, qrData, or token is required.' });
        }

        const { token: signedToken, hash: scannedHash } = extractTokenAndHash(rawInput);

        const verifyResult = await verifyToken(signedToken);
        if (!verifyResult.valid) {
            return res.status(200).json({
                status:      'error',
                code:        'INVALID_SIGNATURE',
                uiState:     'COUNTERFEIT',
                message:     'Invalid QR code — cryptographic signature failed. Do not consume.',
                scannedHash: scannedHash || null,
            });
        }

        const { payload, packHash } = verifyResult;
        const isV2 = payload && (payload.b !== undefined && payload.i !== undefined);
        const batchId = isV2 ? payload.b : payload.batchId;
        const packIndex = isV2 ? parseInt(payload.i, 10) : null;
        let expiryDate = payload.expiryDate;

        if (isV2) {
            const batchMeta = await getPublicBatchMetadata(batchId).catch(() => null);
            const batchInfo = batchMeta?.batch || batchMeta;
            if (batchInfo?.expiryDate) expiryDate = batchInfo.expiryDate;
        }

        if (expiryDate && new Date(expiryDate) < new Date()) {
            return res.status(200).json({
                status:  'error',
                code:    'EXPIRED',
                uiState: 'EXPIRED',
                message: `Medicine expired on ${expiryDate}.`,
                valid:   true,
                payload,
            });
        }

        let ledgerStatus = 'NOT_FOUND';
        let detail = {};

        if (isV2) {
            const bitResult = await checkPackBit({ batchId, packIndex }).catch(() => null);
            if (bitResult?.status === 'DUPLICATE') ledgerStatus = 'Sold';
            else if (bitResult?.status === 'RECALLED') ledgerStatus = 'Recalled';
            else if (bitResult?.status === 'OK') ledgerStatus = 'Packaged';
            else ledgerStatus = bitResult?.status || 'UNKNOWN';
        } else {
            const statusResult = await getPackStatus(packHash, batchId);
            ledgerStatus = statusResult.status || 'NOT_FOUND';
            detail = statusResult.detail || {};
        }

        let uiState = 'GENUINE';
        if (ledgerStatus === 'Recalled' || ledgerStatus === 'RECALLED') uiState = 'RECALLED';
        else if (ledgerStatus === 'Sold' || ledgerStatus === 'SOLD') uiState = 'ALREADY_SOLD';
        else if (ledgerStatus === 'AtShop' || ledgerStatus === 'AT_SHOP') uiState = 'AT_SHOP';

        const isSold = uiState === 'ALREADY_SOLD' || ledgerStatus === 'Sold' || ledgerStatus === 'SOLD' || detail.eventType === 'SOLD';
        const isAtShop = uiState === 'AT_SHOP' || ledgerStatus === 'AtShop' || ledgerStatus === 'AT_SHOP' || detail.eventType === 'INTAKE';

        let dispensingShop = (isSold || isAtShop || detail.shopName || detail.sellerId) ? {
            shopId:        detail.sellerId || detail.toId || detail.fromId || null,
            name:          detail.shopName || (detail.sellerId ? `Registered Pharmacy (${detail.sellerId})` : 'Registered Pharmacy'),
            licenseNumber: detail.licenseNumber || 'CDSCO-APPROVED',
            location:      detail.location || null,
            latitude:      detail.latitude || null,
            longitude:     detail.longitude || null,
            address:       null,
            phone:         null,
            sellingDate:   detail.sellingDate || null,
            sellingTime:   detail.sellingTime || null,
            timestamp:     detail.timestamp || null,
        } : null;


        if (dispensingShop?.shopId) {
            try {
                const sk = await Shopkeeper.findOne({
                    $or: [
                        { shopId: dispensingShop.shopId },
                        { 'license.drugLicenseNumber': dispensingShop.shopId },
                    ],
                }).lean();
                if (sk) {
                    if (sk.shop?.name) dispensingShop.name = sk.shop.name;
                    if (sk.license?.drugLicenseNumber) dispensingShop.licenseNumber = sk.license.drugLicenseNumber;
                    if (sk.shop?.address) dispensingShop.address = `${sk.shop.address}, ${sk.shop.city || ''}, ${sk.shop.state || ''} - ${sk.shop.pincode || ''}`.replace(/,\s*,/g, ',');
                    if (sk.shop?.phone) dispensingShop.phone = sk.shop.phone;
                }
            } catch {}
        }

        let isRecentlySold = false;
        let hoursSinceSale = null;
        let daysSinceSale = null;

        if (isSold) {
            let soldDate = null;
            if (detail.timestamp) soldDate = new Date(detail.timestamp);
            else if (detail.sellingDate) {
                const ds = detail.sellingDate;
                const ts = detail.sellingTime || '00:00:00';
                if (/^\d{8}$/.test(ds)) {
                    soldDate = new Date(`${ds.slice(4, 8)}-${ds.slice(2, 4)}-${ds.slice(0, 2)}T${ts}+05:30`);
                } else {
                    soldDate = new Date(`${ds} ${ts} GMT+0530`);
                }
            }

            if (soldDate && !isNaN(soldDate.getTime())) {
                const diffMs = Math.max(0, Date.now() - soldDate.getTime());
                hoursSinceSale = Number((diffMs / (1000 * 60 * 60)).toFixed(1));
                daysSinceSale = Math.floor(hoursSinceSale / 24);

                if (dispensingShop) {
                    dispensingShop.formattedSaleTime = soldDate.toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    const mins = Math.floor(diffMs / (1000 * 60));
                    dispensingShop.relativeSaleTime = mins < 1 ? 'just now' : mins < 60 ? `${mins} mins ago` : `${Math.floor(mins / 60)} hours ago`;
                    dispensingShop.hoursSinceSale = hoursSinceSale;
                    dispensingShop.daysSinceSale = daysSinceSale;
                }

                if (hoursSinceSale <= 48) {
                    isRecentlySold = true;
                    uiState = 'PURCHASED_RECENTLY';
                    if (dispensingShop) dispensingShop.isRecentSale = true;
                } else {
                    isRecentlySold = false;
                    uiState = 'ALREADY_SOLD';
                    if (dispensingShop) dispensingShop.isRecentSale = false;
                }
            }
        }

        return res.status(200).json({
            status: 'success',
            valid:  true,
            uiState,
            isRecentlySold: isSold ? isRecentlySold : false,
            hoursSinceSale: isSold ? hoursSinceSale : null,
            daysSinceSale: isSold ? daysSinceSale : null,
            packHash,
            payload,
            ledgerStatus,
            dispensingShop,
            detail: detail || null,
        });
    } catch (err) {
        console.error('[shopkeeper-service Scan] customerScanController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

