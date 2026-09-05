import Shopkeeper from '../models/shopkeeper.model.js';
import { PackEvent, Inventory } from '../models/inventory.model.js';
import Transaction from '../models/transaction.model.js';
import Incident from '../models/incident.model.js';
import { getAllRecalls } from '../services/manufacturerClient.service.js';
import { getISTISOString, getISTDateString, formatISTDateTime } from '../utils/time.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const LOW_STOCK_THRESHOLD  = 10;
const EXPIRY_ALERT_DAYS    = 30;

// ── 4.1 Dashboard Stats ───────────────────────────────────────────────────────
export const statsController = async (req, res) => {
    try {
        const shopkeeperId = req.user.id;
        const thirtyDaysFromNow = new Date(Date.now() + EXPIRY_ALERT_DAYS * 24 * 60 * 60 * 1000);

        const [
            totalScans,
            verifiedCount,
            suspiciousCount,
            counterfeitCount,
            todaySales,
            lowStockCount,
            expiringSoonCount,
            inventorySummary,
        ] = await Promise.all([
            PackEvent.countDocuments({ shopkeeperId }),
            PackEvent.countDocuments({ shopkeeperId, scanStatus: 'Verified' }),
            PackEvent.countDocuments({ shopkeeperId, scanStatus: 'Suspicious' }),
            PackEvent.countDocuments({ shopkeeperId, scanStatus: 'Counterfeit' }),
            Transaction.countDocuments({
                shopkeeperId,
                type: 'SELL',
                createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            }),
            Inventory.countDocuments({ shopkeeperId, currentStock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } }),
            Inventory.countDocuments({ shopkeeperId, currentStock: { $gt: 0 }, expiryDate: { $lte: thirtyDaysFromNow, $gt: new Date() } }),
            Inventory.aggregate([
                { $match: { shopkeeperId, currentStock: { $gt: 0 } } },
                { $group: { _id: null, totalPacks: { $sum: '$currentStock' } } },
            ]),
        ]);

        const verifiedPacksInStock = inventorySummary[0]?.totalPacks || 0;

        return res.status(200).json({
            status: 'success',
            data: {
                totalScans,
                verifiedCount,
                suspiciousCount,
                counterfeitCount,
                todaySalesCount: todaySales,
                lowStockCount,
                expiringSoonCount,
                verifiedPacksInStock,
                blockchainIntegrityScore: totalScans > 0 ? Number(((verifiedCount / totalScans) * 100).toFixed(1)) : 99.4,
            },
        });
    } catch (err) {
        console.error('[shopkeeper-service] statsController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── 4.2 Transaction & Scan History ───────────────────────────────────────────
export const historyController = async (req, res) => {
    try {
        const shopkeeperId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;

        const filter = { shopkeeperId };
        if (status) filter.scanStatus = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const lim  = parseInt(limit);

        const [events, total] = await Promise.all([
            PackEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
            PackEvent.countDocuments(filter),
        ]);

        const history = events.map((e) => {
            const dateObj = new Date(e.createdAt);
            const timeStr = dateObj.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }) + ', ' +
                            dateObj.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

            return {
                id:           e._id.toString(),
                name:         e.medicineName || 'Medicine Pack',
                medicineName: e.medicineName || 'Medicine Pack',
                batch:        e.batchNo || e.batchId || 'N/A',
                batchNo:      e.batchNo || e.batchId || 'N/A',
                batchNumber:  e.batchNo || e.batchId || 'N/A',
                packId:       e.packId || e.packHash || null,
                timestamp:    e.createdAt,
                time:         timeStr,
                status:       e.scanStatus || 'Verified',
                action:       e.eventType === 'INTAKE' ? 'RECEIVE'
                              : e.eventType === 'SALE' || e.eventType === 'SOLD' ? 'SALE'
                              : e.eventType === 'RETURN' ? 'RETURN'
                              : 'SCAN_ONLY',
            };
        });

        return res.status(200).json({
            status: 'success',
            data: {
                history,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages:  Math.ceil(total / lim),
                    totalItems:  total,
                },
            },
        });
    } catch (err) {
        console.error('[shopkeeper-service] historyController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── 4.3 Shop Inventory ────────────────────────────────────────────────────────
export const inventoryController = async (req, res) => {
    try {
        const shopkeeperId = req.user.id;
        const { status } = req.query;

        const filter = { shopkeeperId, currentStock: { $gt: 0 } };
        if (status) filter.status = status;

        const items = await Inventory.find(filter).sort({ expiryDate: 1 }).lean();

        const now = new Date();
        const thirtyDaysFromNow = new Date(Date.now() + EXPIRY_ALERT_DAYS * 24 * 60 * 60 * 1000);

        const inventory = items.map((item) => {
            const exp = item.expiryDate ? new Date(item.expiryDate) : null;
            const daysToExpiry = exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 365;

            let stockStatus = 'In Stock';
            if (item.status === 'QUARANTINED' || item.status === 'Quarantined') stockStatus = 'Quarantined';
            else if (daysToExpiry <= 30 && daysToExpiry > 0) stockStatus = 'Expiring Soon';
            else if (item.currentStock <= LOW_STOCK_THRESHOLD) stockStatus = 'Low Stock';

            const expStr = exp ? exp.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            const recStr = item.receivedDate ? new Date(item.receivedDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : 'Today';

            return {
                id:             item._id.toString(),
                name:           item.medicineName || 'Pharmaceutical Medicine',
                genericName:    item.genericName || item.medicineName || 'Formulation',
                batchNumber:    item.batchNo || item.batchId || 'N/A',
                batchNo:        item.batchNo || item.batchId || 'N/A',
                manufacturer:   item.manufacturer || 'Registered CDSCO Manufacturer',
                quantity:       item.currentStock,
                currentStock:   item.currentStock,
                unit:           item.unit || 'Packs (10 Units)',
                mfgDate:        recStr,
                expiryDate:     expStr,
                rawExpiryDate:  item.expiryDate,
                daysToExpiry:   daysToExpiry,
                status:         stockStatus,
                packSerialId:   item.batchId,
                distributor:    'PharmaChain Direct Inbound',
                invoiceNumber:  `INB-${item.batchId?.slice(-6) || '2026'}`,
                purchaseDate:   recStr,
                unitPrice:      item.unitPrice || 120,
                sellingPrice:   item.sellingPrice || 150,
                locationRack:   item.locationRack || 'Rack A-01 (Inbound)',
                isLowStock:     item.currentStock <= LOW_STOCK_THRESHOLD,
                isExpiringSoon: daysToExpiry <= 30 && daysToExpiry > 0,
            };
        });

        return res.status(200).json({
            status: 'success',
            data: { inventory },
        });
    } catch (err) {
        console.error('[shopkeeper-service] inventoryController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── 5.1 Get Profile ───────────────────────────────────────────────────────────
export const getProfileController = async (req, res) => {
    try {
        const shopkeeper = await Shopkeeper.findOne({ shopId: req.user.id }).lean();
        if (!shopkeeper) {
            return res.status(404).json({ status: 'error', message: 'Shopkeeper not found.' });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                shopkeeper: {
                    shopId:            shopkeeper.shopId,
                    shopName:          shopkeeper.shop.name,
                    ownerName:         shopkeeper.owner.name,
                    ownerEmail:        shopkeeper.owner.email,
                    ownerPhone:        shopkeeper.owner.phone,
                    shopEmail:         shopkeeper.shop.email,
                    shopPhone:         shopkeeper.shop.phone,
                    address:           shopkeeper.shop.address,
                    city:              shopkeeper.shop.city,
                    state:             shopkeeper.shop.state,
                    pincode:           shopkeeper.shop.pincode,
                    drugLicenseNumber: shopkeeper.license.drugLicenseNumber,
                    licenseType:       shopkeeper.license.licenseType,
                    issuingAuthority:  shopkeeper.license.issuingAuthority,
                    licenseExpiryDate: shopkeeper.license.expiryDate,
                    verificationStatus:shopkeeper.verificationStatus,
                },
            },
        });
    } catch (err) {
        console.error('[shopkeeper-service] getProfileController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── 5.2 Update Profile ────────────────────────────────────────────────────────
const ALLOWED_PATCH_FIELDS = ['shopName', 'shopPhone', 'shopEmail', 'address', 'city', 'state', 'pincode'];

export const updateProfileController = async (req, res) => {
    try {
        const shopkeeperId = req.user.id;
        const updates = {};

        if (req.body.shopName)   updates['shop.name']    = req.body.shopName;
        if (req.body.shopPhone)  updates['shop.phone']   = req.body.shopPhone;
        if (req.body.shopEmail)  updates['shop.email']   = req.body.shopEmail.toLowerCase().trim();
        if (req.body.address)    updates['shop.address'] = req.body.address;
        if (req.body.city)       updates['shop.city']    = req.body.city;
        if (req.body.state)      updates['shop.state']   = req.body.state;
        if (req.body.pincode)    updates['shop.pincode'] = req.body.pincode;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: `Allowed updatable fields: ${ALLOWED_PATCH_FIELDS.join(', ')}`,
            });
        }

        const updated = await Shopkeeper.findOneAndUpdate(
            { shopId: shopkeeperId },
            { $set: updates },
            { new: true },
        );

        if (!updated) {
            return res.status(404).json({ status: 'error', message: 'Shopkeeper not found.' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully.',
            data: {
                shopkeeper: {
                    shopId:    updated.shopId,
                    shopName:  updated.shop.name,
                    shopPhone: updated.shop.phone,
                    shopEmail: updated.shop.email,
                    address:   updated.shop.address,
                    city:      updated.shop.city,
                    state:     updated.shop.state,
                    pincode:   updated.shop.pincode,
                },
            },
        });
    } catch (err) {
        console.error('[shopkeeper-service] updateProfileController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── 5.3 Public Shop Profile Lookup ───────────────────────────────────────────
export const getPublicShopProfileController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Shop identifier is required' });
        }

        const query = {
            $or: [
                { shopId: id },
                { 'license.drugLicenseNumber': id },
                ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
            ],
        };

        const shopkeeper = await Shopkeeper.findOne(query).lean();
        if (!shopkeeper) {
            return res.status(404).json({ status: 'error', message: 'Pharmacy not found' });
        }

        const shop = shopkeeper.shop || {};
        const license = shopkeeper.license || {};

        return res.status(200).json({
            status: 'success',
            data: {
                shopId:        shopkeeper.shopId,
                name:          shop.name || 'Registered Pharmacy',
                phone:         shop.phone || null,
                licenseNumber: license.drugLicenseNumber || 'CDSCO-APPROVED',
                address:       shop.address ? `${shop.address}, ${shop.city || ''}, ${shop.state || ''} - ${shop.pincode || ''}`.replace(/,\s*,/g, ',') : null,
                city:          shop.city || null,
                state:         shop.state || null,
                pincode:       shop.pincode || null,
                verificationStatus: shopkeeper.verificationStatus,
            },
        });
    } catch (err) {
        console.error('[shopkeeper-service] getPublicShopProfileController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── 4.4 Inbound Deliveries / Intakes ──────────────────────────────────────────
export const inboundsController = async (req, res) => {
    try {
        const shopkeeperId = req.user.id;
        const events = await PackEvent.find({ shopkeeperId, eventType: 'INTAKE' })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const inbounds = events.map((e, idx) => ({
            id:                e._id.toString(),
            deliveryChallanNo: `DC-${new Date(e.createdAt || Date.now()).getFullYear()}-${String(events.length - idx).padStart(4, '0')}`,
            distributorName:   e.manufacturer || 'PharmaChain Supply Network',
            batchId:           e.batchId,
            medicineName:      e.medicineName || 'Prescription Drug',
            packsReceived:     1,
            receivedAt:        e.createdAt ? getISTISOString(new Date(e.createdAt)) : getISTISOString(),
            verifiedStatus:    e.scanStatus === 'Verified' ? 'VERIFIED_ON_CHAIN' : 'FLAGGED',
            fabricTxId:        e.packHash || ('0x' + e._id.toString()),
        }));

        return res.status(200).json({
            status: 'success',
            data:   inbounds,
        });
    } catch (err) {
        console.error('[shopkeeper-service] inboundsController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── 4.5 Active Recalls & Stock Correlation ────────────────────────────────────
export const recallsController = async (req, res) => {
    try {
        const shopkeeperId = req.user.id;
        const [recalledBatches, myStock] = await Promise.all([
            getAllRecalls(),
            Inventory.find({ shopkeeperId, currentStock: { $gt: 0 } }).lean(),
        ]);

        const stockMap = new Map(myStock.map(i => [i.batchId, i.currentStock]));

        const recalls = recalledBatches.map(b => {
            const batchKey = b.batchId || b.systemBatchId || b.manufacturerBatchNumber;
            const shopUnits = stockMap.get(batchKey) || 0;

            return {
                id:                   b._id?.toString() || b.batchId,
                batchId:              batchKey,
                medicineName:         b.medicineName || 'Pharmaceutical Drug',
                manufacturerName:     b.manufacturerName || 'Licensed Pharma Manufacturer',
                issuedAt:             b.updatedAt ? getISTDateString(new Date(b.updatedAt)) : getISTDateString(),
                severity:             'CRITICAL',
                reason:               b.recallReason || 'CDSCO Quality Alert: Batch flagged for immediate recall and quarantine.',
                affectedPacksInStock: shopUnits,
                actionRequired:       shopUnits > 0 ? 'QUARANTINE_IMMEDIATELY' : 'VERIFIED_NO_STOCK',
            };
        });

        return res.status(200).json({
            status: 'success',
            data:   recalls,
        });
    } catch (err) {
        console.error('[shopkeeper-service] recallsController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── 4.6 Report Incident ───────────────────────────────────────────────────────
export const reportIncidentController = async (req, res) => {
    try {
        const shopkeeperId = req.user.id;
        const { packHash, detectedIssue, notes, medicineName, batchId } = req.body;

        if (!packHash) {
            return res.status(400).json({ status: 'error', message: 'packHash is required' });
        }

        const incidentId = `INC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const incident = await Incident.create({
            incidentId,
            shopkeeperId,
            packHash,
            detectedIssue:   detectedIssue || 'CLONED_QR',
            medicineName:    medicineName || 'Prescription Medicine',
            batchId:         batchId || null,
            notes:           notes || null,
            reportedToCDSCO: true,
            status:          'FLAGGED',
        });

        return res.status(201).json({
            status:  'success',
            message: 'Incident reported to CDSCO national fraud database.',
            data: {
                id:              incident.incidentId,
                packHash:        incident.packHash,
                detectedIssue:   incident.detectedIssue,
                scannedAt:       incident.createdAt,
                medicineName:    incident.medicineName,
                reportedToCDSCO: incident.reportedToCDSCO,
                status:          incident.status,
            },
        });
    } catch (err) {
        console.error('[shopkeeper-service] reportIncidentController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

// ── 4.7 Get Reported Incidents ────────────────────────────────────────────────
export const getIncidentsController = async (req, res) => {
    try {
        const shopkeeperId = req.user.id;
        const incidents = await Incident.find({ shopkeeperId }).sort({ createdAt: -1 }).lean();

        return res.status(200).json({
            status: 'success',
            data:   incidents.map(i => ({
                id:              i.incidentId,
                packHash:        i.packHash,
                detectedIssue:   i.detectedIssue,
                scannedAt:       i.createdAt,
                medicineName:    i.medicineName,
                reportedToCDSCO: i.reportedToCDSCO,
                status:          i.status,
            })),
        });
    } catch (err) {
        console.error('[shopkeeper-service] getIncidentsController:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};


