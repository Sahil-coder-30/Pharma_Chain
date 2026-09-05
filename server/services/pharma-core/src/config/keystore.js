import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import { getISTISOString } from '../utils/time.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const KEYSTORE_PATH = process.env.KEYSTORE_PATH || './data/keystore.json';

// ── In-memory read cache ──────────────────────────────────────────────────────
// Eliminates repeated disk reads during batch minting (1000 reads → 1 read).
// Invalidated automatically on every successful write.
let _keystoreCache = null;

// ── Write mutex ───────────────────────────────────────────────────────────────
// Promise chain that serialises concurrent writeKeystore() calls.
// Prevents race conditions from corrupting keystore.json when multiple
// mint/generate requests arrive simultaneously (e.g., parallel KYC approvals).
// Note: this is an in-process lock — valid for single-replica K8s deployments (V1).
// Multi-replica deployments would need a distributed lock (PostgreSQL advisory / Redis).
let _writeLock = Promise.resolve();

const withWriteLock = (fn) => {
    _writeLock = _writeLock.then(fn).catch((err) => {
        // Re-throw so callers see the error; don't let the chain stay broken
        throw err;
    });
    return _writeLock;
};

/**
 * Bootstraps and syncs the local keystore cache with certified public keys from manufacturer-service.
 * Runs non-blockingly during startup and can be retried on demand.
 */
export const syncKeystoreFromDatabase = async () => {
    try {
        const mfrServiceUrl = process.env.MANUFACTURER_SERVICE_URL || 'http://manufacturer-service:80';
        const res = await axios.get(`${mfrServiceUrl}/api/manufacturer/public/keys/all`, { timeout: 3500 });
        if (res.data?.status === 'success' && res.data?.data) {
            const keystore = await readKeystore();
            let changed = false;
            for (const [mfrId, info] of Object.entries(res.data.data)) {
                if (!keystore[mfrId]) {
                    keystore[mfrId] = {
                        publicKeyPem: info.publicKeyPem,
                        publicKeys: info.publicKeys || [info.publicKeyPem].filter(Boolean),
                        keyId: info.keyId || `mfr-key-${mfrId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                        algorithm: 'ES256',
                        createdAt: info.createdAt || getISTISOString(),
                    };
                    changed = true;
                } else {
                    const existingPks = keystore[mfrId].publicKeys || [keystore[mfrId].publicKeyPem].filter(Boolean);
                    const remotePks = info.publicKeys || [info.publicKeyPem].filter(Boolean);
                    for (const rk of remotePks) {
                        if (rk && !existingPks.includes(rk)) {
                            existingPks.push(rk);
                            changed = true;
                        }
                    }
                    keystore[mfrId].publicKeys = existingPks;
                    if (!keystore[mfrId].publicKeyPem && info.publicKeyPem) {
                        keystore[mfrId].publicKeyPem = info.publicKeyPem;
                        changed = true;
                    }
                }
            }
            if (changed) {
                await writeKeystore(keystore);
                console.log(`[pharma-core Keystore] Bootstrapped certified public keys from database for ${Object.keys(res.data.data).length} manufacturers`);
            }
        }
    } catch (err) {
        // Non-blocking notice during initial startup (e.g. manufacturer-service starting up concurrently)
        console.log(`[pharma-core Keystore] Background keystore sync notice: ${err.message}`);
    }
};

/**
 * Ensures the keystore file and its parent directory exist on startup.
 * Creates an empty keystore if the file does not yet exist.
 * Exits the process if the directory cannot be created.
 * @returns {Promise<void>}
 */
export const initKeystore = async () => {
    try {
        const dir = path.dirname(KEYSTORE_PATH);
        await fs.mkdir(dir, { recursive: true });

        try {
            await fs.access(KEYSTORE_PATH);
            // Pre-warm the in-memory cache on startup to avoid the first read hitting disk
            const raw = await fs.readFile(KEYSTORE_PATH, 'utf-8');
            _keystoreCache = JSON.parse(raw);
            console.log(`[pharma-core Keystore] Loaded existing keystore at ${KEYSTORE_PATH} (${Object.keys(_keystoreCache).length} entries)`);
        } catch {
            // File does not exist — create an empty keystore
            _keystoreCache = {};
            await fs.writeFile(KEYSTORE_PATH, JSON.stringify(_keystoreCache, null, 2), 'utf-8');
            console.log(`[pharma-core Keystore] Created new empty keystore at ${KEYSTORE_PATH}`);
        }

        // Trigger non-blocking database bootstrap sync shortly after startup
        setTimeout(() => {
            syncKeystoreFromDatabase().catch(() => {});
        }, 2000);
    } catch (error) {
        console.error('[pharma-core Keystore] FATAL: Could not initialize keystore:', error.message);
        process.exit(1);
    }
};

/**
 * Reads the keystore. Returns the in-memory cache if available (warm path),
 * otherwise reads from disk and populates the cache (cold path).
 *
 * During a batch mint of N packs, this function is called N times but only
 * performs one actual disk read (on the first call after cache invalidation).
 *
 * @returns {Promise<Object>} The full keystore object.
 */
let _lastReadMtime = 0;

export const readKeystore = async () => {
    try {
        const stat = await fs.stat(KEYSTORE_PATH).catch(() => null);
        if (stat && _keystoreCache !== null && stat.mtimeMs <= _lastReadMtime) {
            return _keystoreCache;
        }

        const raw = await fs.readFile(KEYSTORE_PATH, 'utf-8');
        _keystoreCache = JSON.parse(raw);
        if (stat) _lastReadMtime = stat.mtimeMs;
        console.log('[pharma-core Keystore] Loaded keystore from disk (mtime updated)');
        return _keystoreCache;
    } catch (error) {
        console.error('[pharma-core Keystore] Read error:', error.message);
        throw new Error('Keystore read failed');
    }
};

/**
 * Writes a complete keystore object to disk atomically (serialised via write mutex).
 * Invalidates and refreshes the in-memory cache on success.
 *
 * The write mutex ensures that concurrent calls (e.g., two manufacturers registered
 * simultaneously) cannot interleave and produce a partial/corrupt JSON file.
 *
 * @param {Object} keystoreData - The full keystore object to persist.
 * @returns {Promise<void>}
 */
export const writeKeystore = (keystoreData) =>
    withWriteLock(async () => {
        await fs.writeFile(KEYSTORE_PATH, JSON.stringify(keystoreData, null, 2), 'utf-8');
        _keystoreCache = keystoreData; // Update cache atomically with the write
        console.log(`[pharma-core Keystore] Keystore written (${Object.keys(keystoreData).length} entries)`);
    });

/**
 * Explicitly invalidates the in-memory cache.
 * Rarely needed — writeKeystore() auto-invalidates — but available for testing.
 */
export const invalidateCache = () => {
    _keystoreCache = null;
};
