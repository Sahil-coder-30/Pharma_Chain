import axios from 'axios';

// ── Constants ─────────────────────────────────────────────────────────────────
const PHARMA_CORE_URL = process.env.PHARMA_CORE_URL || 'http://pharma-core-service:80';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Pre-configured axios instance with X-Service-Token for pharma-core.
 */
const coreClient = axios.create({
    baseURL: PHARMA_CORE_URL,
    headers: {
        'X-Service-Token': SERVICE_TOKEN,
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// ── Exports ───────────────────────────────────────────────────────────────────

/**
 * Tier-1: Verifies ES256 JWT signature and derives packHash.
 * @param {string} signedToken
 * @returns {Promise<Object>}
 */
export const verifyToken = async (signedToken) => {
    const response = await coreClient.post('/core/hash/verify', { signedToken });
    return response.data;
};

/**
 * Tier-2: Fetches live blockchain status for a pack.
 * @param {string} packHash
 * @param {string} batchId
 * @returns {Promise<Object>} { status: 'Sold'|'Recalled'|'AtShop'|'Packaged'|'NOT_FOUND' }
 */
export const getPackStatus = async (packHash, batchId) => {
    const response = await coreClient.get(`/core/hash/status/${packHash}`, {
        params: { batchId },
    });
    return response.data;
};

/**
 * V2.1 Nibble: Read-only supply-chain state query (evaluateTransaction only).
 * Returns { status: 'MINTED'|'AT_SHOP'|'SOLD'|'REVOKED', state: 0–4, packIndex, batchId }
 * @param {string} batchId
 * @param {number} packIndex
 */
export const getPackState = async (batchId, packIndex) => {
    try {
        const response = await coreClient.get('/core/chain/pack-state', {
            params: { batchId, packIndex },
        });
        return response.data;
    } catch (err) {
        console.warn(`[consumer-service CoreClient] getPackState error: ${err.message}`);
        return { status: 'UNKNOWN', error: err.message };
    }
};

/** @deprecated Use getPackState — maps old binary OK/DUPLICATE/RECALLED to V2.1 nibble endpoint */
export const checkPackBit = async (batchId, packIndex) => {
    const response = await coreClient.get('/core/hash/bit', {
        params: { batchId, packIndex },
    });
    return response.data;
};
