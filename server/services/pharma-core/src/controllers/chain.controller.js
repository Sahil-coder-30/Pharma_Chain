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

/**
 * POST /core/chain/set-pack-state
 * V2.1 Nibble: Advances a pack's supply-chain nibble state atomically.
 * Body: { batchId, packIndex, newState: 'AT_SHOP' | 'SOLD' | 'REVOKED' }
 * Returns state-machine result: OK, ALREADY_SOLD, REVOKED, INVALID_STATE_TRANSITION
 */
export const chainSetPackStateController = async (req, res) => {
    try {
        const { batchId, packIndex, newState, shopId, sellerId, operatorId, location, timestamp } = req.body;

        if (!batchId || packIndex == null || !newState) {
            return res.status(400).json({
                status: 'error',
                message: 'batchId, packIndex, and newState are required. newState ∈ { "AT_SHOP", "SOLD", "REVOKED" }',
            });
        }

        const validStates = ['AT_SHOP', 'SOLD', 'REVOKED'];
        if (!validStates.includes(newState.toUpperCase())) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid newState: "${newState}". Must be one of: AT_SHOP, SOLD, REVOKED`,
            });
        }

        const { setPackStateOnChain } = await import('../services/backendClient.service.js');
        const result = await setPackStateOnChain(
            batchId,
            parseInt(packIndex, 10),
            newState.toUpperCase(),
            { shopId, sellerId, operatorId, location, timestamp }
        );

        // Detect diversion: sale attempted on a MINTED pack (never reached a shop)
        if (result?.alert === 'SUPPLY_CHAIN_DIVERSION') {
            return res.status(409).json({
                status: 'error',
                code: 'SUPPLY_CHAIN_DIVERSION',
                message: 'ALERT: This pack was never registered at any pharmacy. Possible warehouse/transit theft. Sale blocked.',
                fabricResult: result,
            });
        }

        const httpStatus = result?.status === 'ALREADY_SOLD' ? 409 : 200;
        return res.status(httpStatus).json({
            status: result?.status === 'OK' ? 'success' : 'error',
            ...result,
        });
    } catch (error) {
        console.error('[pharma-core Chain] ❌ chainSetPackStateController error:', error.message);
        return res.status(error.status || 500).json({
            status: 'error',
            code: error.code || 'BLOCKCHAIN_STATE_ERROR',
            message: error.message,
            diagnosis: error.diagnosis,
        });
    }
};

/**
 * POST /core/chain/mint-batch
 * Body: { batchId }
 * Bulk transitions all packs in a batch from CREATED (0x0) to MINTED (0x1) on Fabric.
 */
export const chainMintBatchController = async (req, res) => {
    try {
        const { batchId } = req.body;
        if (!batchId) {
            return res.status(400).json({ status: 'error', message: 'batchId is required.' });
        }
        const { mintBatchOnChain } = await import('../services/backendClient.service.js');
        const result = await mintBatchOnChain(batchId);
        return res.status(200).json({
            status: 'success',
            message: `Batch ${batchId} marked MINTED on blockchain.`,
            data: result,
        });
    } catch (error) {
        console.error('[pharma-core Chain] ❌ chainMintBatchController error:', error.message);
        return res.status(error.status || 500).json({
            status: 'error',
            code: error.code || 'BLOCKCHAIN_MINT_ERROR',
            message: error.message,
        });
    }
};

/**
 * GET /core/chain/pack-state?batchId=&packIndex=
 * V2.1 Nibble: Read-only nibble state query (does NOT mutate ledger).
 * Used by consumer verification apps.
 * Returns: { status: 'MINTED'|'AT_SHOP'|'SOLD'|'REVOKED', state: 0–4, packIndex, batchId }
 */
export const chainGetPackStateController = async (req, res) => {
    try {
        const { batchId, packIndex } = req.query;

        if (!batchId || packIndex == null) {
            return res.status(400).json({
                status: 'error',
                message: 'batchId and packIndex query parameters are required',
            });
        }

        const { getPackStateOnChain } = await import('../services/backendClient.service.js');
        const result = await getPackStateOnChain(batchId, parseInt(packIndex, 10));

        return res.status(200).json(result);
    } catch (error) {
        console.error('[pharma-core Chain] ❌ chainGetPackStateController error:', error.message);
        return res.status(error.status || 500).json({
            status: 'error',
            code: error.code || 'BLOCKCHAIN_STATE_QUERY_ERROR',
            message: error.message,
        });
    }
};

/** @deprecated Use chainSetPackStateController with newState='SOLD' */
export const chainScanPackV2Controller = async (req, res) => {
    req.body.newState = 'SOLD';
    return chainSetPackStateController(req, res);
};
