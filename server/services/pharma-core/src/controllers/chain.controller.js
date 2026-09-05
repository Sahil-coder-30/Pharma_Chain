import { submitTransition, submitRecall } from '../services/backendClient.service.js';
import { getISTISOString, getISTDateCompact, getISTTimeString } from '../utils/time.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (d = new Date()) => getISTDateCompact(d);
const formatTime = (d = new Date()) => getISTTimeString(d);

// ── Controllers ───────────────────────────────────────────────────────────────

export const chainIntakeController = async (req, res) => {
    try {
        const { packHash, shopId, operatorId, manufacturerId, shopName, licenseNumber, location, latitude, longitude, timestamp } = req.body;

        if (!packHash || !shopId || !operatorId || !manufacturerId) {
            return res.status(400).json({
                status: 'error',
                message: 'packHash, shopId, operatorId, and manufacturerId are required',
            });
        }

        const now = new Date();
        const transition = {
            packId: packHash,
            eventType: 'INTAKE',
            hash: `${packHash}:INTAKE`,
            fromId: manufacturerId,
            toId: shopId,
            sellingDate: formatDate(now),
            sellingTime: formatTime(now),
            sellerId: operatorId,
            shopName: shopName || '',
            licenseNumber: licenseNumber || '',
            location: location || '',
            latitude: latitude ? String(latitude) : '',
            longitude: longitude ? String(longitude) : '',
            timestamp: timestamp || getISTISOString(now),
        };

        // ── Submit transition to pharma-backend with RS256 Bearer JWT ─────────
        let backendResult = null;
        try {
            backendResult = await submitTransition(transition);
            console.log(`[pharma-core Chain] ✅ Intake transition committed to Fabric for packHash: ${packHash}`);
        } catch (backendErr) {
            console.error(`[pharma-core Chain] ❌ Fabric Intake submission failed for ${packHash}: ${backendErr.message}`);
            return res.status(backendErr.status || 502).json({
                status: 'error',
                code: backendErr.code || 'BLOCKCHAIN_INTAKE_ERROR',
                message: backendErr.message,
                diagnosis: backendErr.diagnosis || 'Check Fabric Gateway connectivity and chaincode state',
                transition,
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Intake transition processed and committed on blockchain',
            transition,
            backendSubmitted: true,
            backendResult,
        });
    } catch (error) {
        console.error('[pharma-core Chain] ❌ chainIntakeController error:', error.message);
        return res.status(error.status || 500).json({ status: 'error', code: error.code || 'INTERNAL_ERROR', message: error.message, diagnosis: error.diagnosis });
    }
};

export const chainSaleController = async (req, res) => {
    try {
        const { packHash, shopId, operatorId, shopName, licenseNumber, location, latitude, longitude, timestamp } = req.body;

        if (!packHash || !shopId || !operatorId) {
            return res.status(400).json({
                status: 'error',
                message: 'packHash, shopId, and operatorId are required',
            });
        }

        const now = new Date();
        const transition = {
            packId: packHash,
            eventType: 'SOLD',
            hash: `${packHash}:SOLD`,
            fromId: shopId,
            toId: 'CONSUMER',
            sellingDate: formatDate(now),
            sellingTime: formatTime(now),
            sellerId: operatorId,
            shopName: shopName || '',
            licenseNumber: licenseNumber || '',
            location: location || '',
            latitude: latitude ? String(latitude) : '',
            longitude: longitude ? String(longitude) : '',
            timestamp: timestamp || getISTISOString(now),
        };

        // ── Submit transition to pharma-backend with RS256 Bearer JWT ─────────
        let backendResult = null;
        try {
            backendResult = await submitTransition(transition);
            console.log(`[pharma-core Chain] ✅ Sale transition committed to Fabric for packHash: ${packHash} (Shop: ${shopName || shopId})`);
        } catch (backendErr) {
            console.error(`[pharma-core Chain] ❌ Fabric Sale submission failed for ${packHash}: ${backendErr.message}`);
            return res.status(backendErr.status || 502).json({
                status: 'error',
                code: backendErr.code || 'BLOCKCHAIN_SALE_ERROR',
                message: backendErr.message,
                diagnosis: backendErr.diagnosis || 'Check Fabric Gateway connectivity and chaincode state',
                transition,
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Sale transition processed and committed on blockchain',
            transition,
            backendSubmitted: true,
            backendResult,
        });
    } catch (error) {
        console.error('[pharma-core Chain] ❌ chainSaleController error:', error.message);
        return res.status(error.status || 500).json({ status: 'error', code: error.code || 'INTERNAL_ERROR', message: error.message, diagnosis: error.diagnosis });
    }
};

export const chainRecallController = async (req, res) => {
    try {
        const { batchId, manufacturerId, reason } = req.body;

        if (!batchId || !manufacturerId || !reason) {
            return res.status(400).json({
                status: 'error',
                message: 'batchId, manufacturerId, and reason are required',
            });
        }

        const recallPayload = {
            systemBatchId: batchId,         // RecallRequest.java field name
            actorId:       manufacturerId,   // RecallRequest.java field name (was: fromId)
            reason,
            // recallDate/recallTime are auto-set inside submitRecall() from current timestamp
        };

        // ── Submit recall to pharma-backend with RS256 Bearer JWT ─────────────
        let backendResult = null;
        try {
            backendResult = await submitRecall(recallPayload);
            console.log(`[pharma-core Chain] 🚨 Recall payload committed to Fabric for batch: ${batchId}`);
        } catch (backendErr) {
            console.error(`[pharma-core Chain] ❌ Fabric Recall submission failed for ${batchId}: ${backendErr.message}`);
            return res.status(backendErr.status || 502).json({
                status: 'error',
                code: backendErr.code || 'BLOCKCHAIN_RECALL_ERROR',
                message: backendErr.message,
                diagnosis: backendErr.diagnosis || 'Check Fabric Gateway connectivity and batch recall state',
                recallPayload,
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Recall transition processed and committed on blockchain',
            recallPayload,
            backendSubmitted: true,
            backendResult,
        });
    } catch (error) {
        console.error('[pharma-core Chain] ❌ chainRecallController error:', error.message);
        return res.status(error.status || 500).json({ status: 'error', code: error.code || 'INTERNAL_ERROR', message: error.message, diagnosis: error.diagnosis });
    }
};
