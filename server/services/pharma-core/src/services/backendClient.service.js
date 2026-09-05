import axios from 'axios';
import { signCoreJwt } from './crypto.service.js';
import { getISTDateString, getISTTimeString } from '../utils/time.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

export const getBackendUrl = () => process.env.PHARMA_BACKEND_URL || 'http://host.docker.internal:8080';

/**
 * Creates an axios instance pre-configured for pharma-backend-service.
 * A fresh RS256 JWT is signed on every call (tokens are short-lived, 5 min TTL).
 * pharma-backend validates the JWT using pharma-core's RSA public key from JWKS.
 *
 * Token flow:
 *   pharma-core (RS256 private key) → signs JWT
 *   pharma-backend (fetches JWKS from /.well-known/jwks.json) → verifies JWT
 *
 * @returns {import('axios').AxiosInstance}
 */
const createBackendClient = () => {
    const bearerJwt = signCoreJwt(); // Fresh RS256 signed token per request
    const baseURL = getBackendUrl();
    return axios.create({
        baseURL,
        headers: {
            Authorization: `Bearer ${bearerJwt}`,
            'Content-Type': 'application/json',
        },
        timeout:          60_000,      // 60s — large Fabric batch commits can take time
        maxBodyLength:    Infinity,    // Avoid axios body size cap on chunk payloads
        maxContentLength: Infinity,
    });
};

// ── Error Diagnostic Helper ───────────────────────────────────────────────────

/**
 * Formats a blockchain error with actionable diagnostics for fast debugging.
 * @param {Error} err
 * @param {string} operation
 * @param {string} [identifier]
 * @returns {Error}
 */
const formatBlockchainError = (err, operation, identifier = '') => {
    const backendUrl = getBackendUrl();
    const status  = err.response?.status;
    const data    = err.response?.data;
    const rawMsg  = data?.message || data?.error || err.message || 'Unknown blockchain error';
    const errCode = err.code;

    let errorCategory = 'BLOCKCHAIN_UNKNOWN_ERROR';
    let diagnosis = 'Inspect pharma-backend logs for detailed stack trace.';

    if (errCode === 'ECONNREFUSED' || errCode === 'ENOTFOUND' || errCode === 'EHOSTUNREACH' || errCode === 'ECONNRESET') {
        errorCategory = 'BLOCKCHAIN_GATEWAY_OFFLINE';
        diagnosis = `Cannot connect to Hyperledger Fabric Gateway at ${backendUrl}. Verify that the 'pharma-backend' Docker container and Fabric network (peer0, orderer, couchdb) are running. Command: docker ps`;
    } else if (errCode === 'ETIMEDOUT' || errCode === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorCategory = 'BLOCKCHAIN_CONSENSUS_TIMEOUT';
        diagnosis = `Hyperledger Fabric transaction timed out (>60s). Check peer node resource usage and Raft orderer consensus status.`;
    } else if (status === 401 || status === 403) {
        errorCategory = 'BLOCKCHAIN_AUTH_REJECTED';
        diagnosis = `Spring Boot rejected the RS256 Bearer JWT. Ensure pharma-core JWKS discovery (/.well-known/jwks.json) is reachable and matches public key.`;
    } else if (status === 404) {
        errorCategory = 'RECORD_NOT_FOUND_ON_LEDGER';
        diagnosis = `The requested pack or batch does not exist in Fabric world state.`;
    } else if (status >= 500) {
        errorCategory = 'CHAINCODE_EXECUTION_ERROR';
        diagnosis = `Hyperledger Fabric smart contract ('pharmacc') threw an exception: "${rawMsg}". Check state transitions and custody chain rules.`;
    }

    console.error(`
══════════════════════════════════════════════════════════════════════════════
🚨 [BLOCKCHAIN ERROR] ${errorCategory} during ${operation}${identifier ? ` [${identifier}]` : ''}
──────────────────────────────────────────────────────────────────────────────
  • Target Gateway URL: ${backendUrl}
  • HTTP Status Code:   ${status || 'N/A (Network/Socket Failure)'}
  • Socket Error Code:  ${errCode || 'N/A'}
  • Error Message:      ${rawMsg}
  • Diagnostic Hint:    ${diagnosis}
══════════════════════════════════════════════════════════════════════════════
`);

    const enriched = new Error(`[${errorCategory}] ${rawMsg}`);
    enriched.code = errorCategory;
    enriched.status = status;
    enriched.diagnosis = diagnosis;
    enriched.targetUrl = backendUrl;
    enriched.data = data;
    return enriched;
};

// ── Real-Time Hyperledger Fabric Gateway Client ─────────────────────────────────
// No local caching — every transaction and status query is executed live against
// the Hyperledger Fabric distributed ledger through the Java Spring Boot gateway.

/**
 * Submits a single blockchain transition to pharma-backend-service.
 * @param {Object} transition - { hash, fromId, toId, sellingDate, sellingTime, sellerId, packId, eventType }
 * @returns {Promise<Object>} Response data from pharma-backend.
 */
export const submitTransition = async (transition) => {
    try {
        const response = await createBackendClient().post('/api/transition', transition);
        console.log(`[pharma-core BackendClient] ⛓️ Live Fabric transition committed for hash: ${transition.hash}`);
        return response.data;
    } catch (err) {
        throw formatBlockchainError(err, 'submitTransition', transition.hash || transition.packId);
    }
};

/**
 * Submits a batch of transitions in one Fabric transaction.
 *
 * @param {string}        batchId     - System batch ID (PC-BATCH-…)
 * @param {Array<Object>} transitions - Array of transition objects.
 * @returns {Promise<Object>}
 */
export const submitTransitionBatch = async (batchId, transitions) => {
    try {
        const payload = { batchId, transitions };
        const response = await createBackendClient().post('/api/transition/batch', payload);
        console.log(`[pharma-core BackendClient] ⛓️ Live Fabric batch of ${transitions.length} transitions committed for ${batchId}`);
        return response.data;
    } catch (err) {
        throw formatBlockchainError(err, 'submitTransitionBatch', `Batch: ${batchId}, Qty: ${transitions.length}`);
    }
};

/**
 * Submits a batch recall to pharma-backend-service.
 *
 * @param {Object} params - { systemBatchId, actorId, reason }
 * @returns {Promise<Object>}
 */
export const submitRecall = async ({ systemBatchId, actorId, reason }) => {
    const now         = new Date();
    const recallDate  = getISTDateString(now);            // YYYY-MM-DD in IST
    const recallTime  = getISTTimeString(now);            // HH:MM:SS in IST

    try {
        const payload = { systemBatchId, actorId, reason, recallDate, recallTime };
        const response = await createBackendClient().post('/api/transition/recall', payload);
        console.log(`[pharma-core BackendClient] 🚨 Live Fabric batch recall committed for ${systemBatchId}`);
        return response.data;
    } catch (err) {
        throw formatBlockchainError(err, 'submitRecall', `Batch: ${systemBatchId}`);
    }
};

/**
 * Fetches the live pack status directly from Hyperledger Fabric world state in real-time.
 * @param {string} packHash
 * @param {string} [batchId]
 * @returns {Promise<Object>} { status: 'Sold'|'Recalled'|'AtShop'|'MINTED'|'NOT_FOUND', detail: {} }
 */
export const getPackStatus = async (packHash, batchId) => {
    try {
        const response = await createBackendClient().get('/api/transition/status', {
            params: { packHash, batchId: batchId || '' },
        });

        const data = response.data;
        let liveStatus = data.status || 'UNKNOWN';

        // Normalize live chaincode eventType to standard status
        if (data.detail && data.detail.eventType) {
            const ev = data.detail.eventType.toUpperCase();
            if (ev === 'MINTED' || ev === 'MFG' || ev === 'PACKAGED') {
                liveStatus = 'MINTED';
            } else if (ev === 'INTAKE' || ev === 'AT_SHOP') {
                liveStatus = 'AtShop';
            } else if (ev === 'SOLD' || ev === 'SALE') {
                liveStatus = 'Sold';
            } else if (ev === 'RECALLED' || ev === 'RECALL') {
                liveStatus = 'Recalled';
            }
        }

        if (liveStatus === 'UNKNOWN' && data.detail) {
            liveStatus = 'MINTED';
        }

        console.log(`[pharma-core BackendClient] 🔍 Real-time Fabric query: packHash='${packHash.substring(0, 12)}...', status='${liveStatus}', onChain=true`);

        return {
            status: liveStatus,
            custodyState: liveStatus,
            detail: data.detail || null,
            liveOnChain: true,
        };
    } catch (err) {
        const parsed = formatBlockchainError(err, 'getPackStatus', `Pack: ${packHash.substring(0, 12)}...`);
        return {
            status: 'NOT_FOUND',
            fabricAvailable: false,
            error: parsed.message,
            errorCode: parsed.code,
            diagnosis: parsed.diagnosis,
            liveOnChain: false,
        };
    }
};

/**
 * Submits a large batch of transitions to pharma-backend-service in fixed-size chunks.
 *
 * Why chunking?
 *   - Each chunk maps to one Fabric block commit (clean boundary).
 *   - Smaller payloads reduce HTTP timeout risk (~50KB vs ~200KB for 1000 packs).
 *   - The chaincode `recordTransitionBatch` is idempotent — safe to retry any chunk.
 *
 * @param {string}        batchId     - System batch ID passed to backend wrapper.
 * @param {Array<Object>} transitions - Full array of transition objects.
 * @param {number}        chunkSize   - Max transitions per HTTP request (default 250).
 * @returns {Promise<string[]>}         Flat array of all recorded hashes across chunks.
 */
export const submitTransitionBatchChunked = async (batchId, transitions, chunkSize = 250) => {
    const totalChunks = Math.ceil(transitions.length / chunkSize);
    const allRecorded = [];

    for (let i = 0; i < transitions.length; i += chunkSize) {
        const chunk    = transitions.slice(i, i + chunkSize);
        const chunkNum = Math.floor(i / chunkSize) + 1;

        console.log(
            `[pharma-core BackendClient] Submitting chunk ${chunkNum}/${totalChunks}` +
            ` (${chunk.length} transitions, offset ${i})`,
        );

        // Pass batchId through to the wrapped payload
        const result = await submitTransitionBatch(batchId, chunk);

        // pharma-backend returns: { totalProcessed, committedCount, failedCount, recordedHashes }
        // Handle both array response and object response gracefully.
        if (Array.isArray(result)) {
            allRecorded.push(...result);
        } else if (Array.isArray(result?.recordedHashes)) {
            allRecorded.push(...result.recordedHashes);
        }

        console.log(
            `[pharma-core BackendClient] Chunk ${chunkNum}/${totalChunks} committed ✅` +
            ` (${result?.committedCount ?? chunk.length} committed, ${result?.failedCount ?? 0} failed)`,
        );
    }

    console.log(
        `[pharma-core BackendClient] All ${totalChunks} chunk(s) submitted — ` +
        `${allRecorded.length}/${transitions.length} transitions recorded on Fabric`,
    );

    return allRecorded;
};
