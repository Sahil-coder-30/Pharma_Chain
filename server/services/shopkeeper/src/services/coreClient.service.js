import axios from 'axios';

// ── Constants ─────────────────────────────────────────────────────────────────
const PHARMA_CORE_URL = process.env.PHARMA_CORE_URL || 'http://pharma-core-service:80';
const SERVICE_TOKEN   = process.env.SERVICE_TOKEN   || '1d230ff87628d00c450d7bb7f5f5245ad30ad7d1b57be42253e66de27738d11a7351a2a4a7dbc451fb1445e658f382c9';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates an axios instance with X-Service-Token header for pharma-core.
 * @param {string} [authToken] - Optional bearer token for additional auth.
 */
const getCoreClient = (authToken) =>
    axios.create({
        baseURL: PHARMA_CORE_URL,
        headers: {
            Authorization:    authToken ? `Bearer ${authToken}` : `Bearer ${SERVICE_TOKEN}`,
            'X-Service-Token': SERVICE_TOKEN,
            'Content-Type':    'application/json',
        },
        timeout: 10000,
    });

// ── Exports ───────────────────────────────────────────────────────────────────

/**
 * Verifies an ES256 signed JWT pack token via pharma-core.
 * @param {string} signedToken - Raw QR token string.
 * @param {string} [authToken]
 * @returns {Promise<{ valid: boolean, payload?: Object, packHash?: string, error?: string }>}
 */
export const verifyToken = async (signedToken, authToken) => {
    const client = getCoreClient(authToken);
    const response = await client.post('/core/hash/verify', { signedToken });
    return response.data;
};

/**
 * Reads the current chain-of-custody state for a pack from the Fabric ledger.
 * @param {string} packHash
 * @param {string} [batchId]
 * @param {string} [authToken]
 * @returns {Promise<Object>} { status: 'Sold'|'Recalled'|'AtShop'|'Packaged'|'NOT_FOUND' }
 */
export const getPackStatus = async (packHash, batchId, authToken) => {
    const client = getCoreClient(authToken);
    try {
        const response = await client.get(`/core/hash/status/${packHash}`, { params: { batchId } });
        return response.data;
    } catch (err) {
        console.warn(`[shopkeeper-service CoreClient] getPackStatus error (non-fatal): ${err.message}`);
        return { status: 'NOT_FOUND' };
    }
};

/**
 * Records an INTAKE transition on Fabric via pharma-core.
 * @param {Object} params - { packHash, shopId, operatorId, manufacturerId, shopName, licenseNumber, location, latitude, longitude, timestamp, authToken }
 * @returns {Promise<Object>}
 */
export const recordIntake = async ({ packHash, shopId, operatorId, manufacturerId, shopName, licenseNumber, location, latitude, longitude, timestamp, authToken }) => {
    try {
        const response = await getCoreClient(authToken).post('/core/chain/intake', {
            packHash,
            shopId,
            operatorId,
            manufacturerId,
            shopName,
            licenseNumber,
            location,
            latitude,
            longitude,
            timestamp,
        });
        console.log(`[shopkeeper-service CoreClient] Intake recorded on chain for packHash: ${packHash}`);
        return response.data;
    } catch (err) {
        console.warn(`[shopkeeper-service CoreClient] Fabric intake call deferred: ${err.message}`);
        return { recorded: false, error: err.message };
    }
};

/**
 * Records a SALE transition on Fabric via pharma-core.
 * @param {Object} params - { packHash, shopId, operatorId, shopName, licenseNumber, location, latitude, longitude, timestamp, authToken }
 * @returns {Promise<Object>}
 */
export const recordSale = async ({ packHash, shopId, operatorId, shopName, licenseNumber, location, latitude, longitude, timestamp, authToken }) => {
    try {
        const response = await getCoreClient(authToken).post('/core/chain/sale', {
            packHash,
            shopId,
            operatorId,
            shopName,
            licenseNumber,
            location,
            latitude,
            longitude,
            timestamp,
        });
        console.log(`[shopkeeper-service CoreClient] Sale recorded on chain for packHash: ${packHash} (Shop: ${shopName || shopId})`);
        return response.data;
    } catch (err) {
        console.warn(`[shopkeeper-service CoreClient] Fabric sale call deferred: ${err.message}`);
        return { recorded: false, error: err.message };
    }
};

/**
 * Records a RETURN transition on Fabric via pharma-core.
 * @param {Object} params - { packHash, shopId, operatorId, reason, authToken }
 * @returns {Promise<Object>}
 */
export const recordReturn = async ({ packHash, shopId, operatorId, reason, authToken }) => {
    try {
        const response = await getCoreClient(authToken).post('/core/chain/return', {
            packHash,
            shopId,
            operatorId,
            reason,
        });
        console.log(`[shopkeeper-service CoreClient] Return recorded for packHash: ${packHash}`);
        return response.data;
    } catch (err) {
        console.warn(`[shopkeeper-service CoreClient] Return call deferred: ${err.message}`);
        return { recorded: false, error: err.message };
    }
};

/**
 * Fetches medicine info for a packId (used in transaction controllers).
 */
export const verifyPackId = async (packId, authToken) => {
    try {
        const client = getCoreClient(authToken);
        const response = await client.post('/core/hash/verify', { signedToken: packId });
        return response.data;
    } catch (err) {
        return { valid: false, error: err.message };
    }
};

/**
 * Fetches pack info from pharma-core.
 */
export const getPackInfo = async (packId, authToken) => {
    try {
        const client = getCoreClient(authToken);
        const response = await client.get(`/core/hash/status/${packId}`);
        return response.data;
    } catch (err) {
        return { status: 'NOT_FOUND' };
    }
};

/**
 * V2.1 Nibble: Atomically advances a pack's supply-chain nibble state.
 * Valid: MINTED → AT_SHOP → SOLD; ANY → REVOKED
 * @param {Object} params - { batchId, packIndex, newState: 'AT_SHOP'|'SOLD'|'REVOKED', authToken }
 * @returns {Promise<{ status: string, newState?: string, packIndex: number, alert?: string }>}
 */
export const setPackStateV2 = async ({ batchId, packIndex, newState, shopId, sellerId, operatorId, location, timestamp, authToken }) => {
    try {
        const client = getCoreClient(authToken);
        const response = await client.post('/core/chain/set-pack-state', {
            batchId,
            packIndex,
            newState,
            shopId,
            sellerId,
            operatorId,
            location,
            timestamp,
        });
        return response.data;
    } catch (err) {
        console.error(`[shopkeeper-service CoreClient] setPackStateV2 error: ${err.message}`);
        throw err;
    }
};

/**
 * V2.1 Nibble: Read-only nibble state query (does NOT mutate ledger).
 * @param {Object} params - { batchId, packIndex, authToken }
 * @returns {Promise<{ status: 'MINTED'|'AT_SHOP'|'SOLD'|'REVOKED', state: number }>}
 */
export const getPackStateV2 = async ({ batchId, packIndex, authToken }) => {
    try {
        const client = getCoreClient(authToken);
        const response = await client.get('/core/chain/pack-state', {
            params: { batchId, packIndex },
        });
        return response.data;
    } catch (err) {
        console.warn(`[shopkeeper-service CoreClient] getPackStateV2 error: ${err.message}`);
        return { status: 'UNKNOWN', error: err.message };
    }
};

/** Alias for getPackStateV2 — used by scan.controller.js */
export const checkPackBit = getPackStateV2;

