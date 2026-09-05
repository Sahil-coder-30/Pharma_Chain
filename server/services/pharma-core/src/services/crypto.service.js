import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { readKeystore, writeKeystore } from '../config/keystore.js';
import { getCorePrivateKey, getCorePublicKey, CORE_KID } from '../config/keys.js';
import {
    isS3Configured,
    uploadCsvToS3,
    generatePresignedUrl,
} from './s3.service.js';
import { getISTISOString, getISTDateCompact, getISTTimeString } from '../utils/time.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const ES256_ALGORITHM = 'ES256';  // For manufacturer pack JWTs (ECDSA P-256)
const RS256_ALGORITHM = 'RS256';  // For pharma-core identity JWTs (RSA-4096)
const CURVE           = 'prime256v1';
const SCRYPT_KEYLEN   = 32;       // 256-bit AES key
const SCRYPT_N        = 16384;
const GCM_IV_LENGTH   = 16;

// Core identity JWT lifetime — short-lived machine-to-machine token
const CORE_JWT_TTL_SECONDS = 300; // 5 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derives a 256-bit AES key from the master secret and a manufacturer-specific salt.
 * Uses scrypt for memory-hard key derivation.
 * @param {string} masterSecret - The KEY_ENCRYPTION_SECRET env var value.
 * @param {string} manufacturerId - Used as the scrypt salt for key isolation.
 * @returns {Promise<Buffer>} 32-byte derived key.
 */
const deriveKey = (masterSecret, manufacturerId) =>
    new Promise((resolve, reject) => {
        crypto.scrypt(
            masterSecret,
            manufacturerId,
            SCRYPT_KEYLEN,
            { N: SCRYPT_N },
            (err, key) => (err ? reject(err) : resolve(key)),
        );
    });

// secp256r1 parameters for deterministic key derivation
const SECP256R1_N = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551');
const PKCS8_P256_PREFIX = Buffer.from('3041020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420', 'hex');

/**
 * Deterministically derives an ECDSA P-256 (secp256r1) keypair for a manufacturer
 * from the cluster master secret and manufacturerId.
 * Guarantees that across container recreations, machine reboots, and storage wipes,
 * a manufacturer's cryptographic identity is 100% stable, persistent, and reproducible.
 * @param {string} masterSecret - Cluster master encryption key.
 * @param {string} manufacturerId - Manufacturer identifier.
 * @returns {{ privateKey: string, publicKey: string }}
 */
export const deriveDeterministicKeyPair = (masterSecret, manufacturerId) => {
    const prk = crypto.createHmac('sha256', masterSecret).update('pharmachain-ec-v1').digest();
    const dBytes = crypto.createHmac('sha256', prk).update(manufacturerId).digest();
    const d = (BigInt('0x' + dBytes.toString('hex')) % (SECP256R1_N - 1n)) + 1n;
    const dHex = d.toString(16).padStart(64, '0');
    const dBuf = Buffer.from(dHex, 'hex');

    const pkcs8Der = Buffer.concat([PKCS8_P256_PREFIX, dBuf]);
    const privKeyObj = crypto.createPrivateKey({ key: pkcs8Der, format: 'der', type: 'pkcs8' });
    const pubKeyObj = crypto.createPublicKey(privKeyObj);

    return {
        privateKey: privKeyObj.export({ type: 'pkcs8', format: 'pem' }),
        publicKey: pubKeyObj.export({ type: 'spki', format: 'pem' }),
    };
};

// ── MANUFACTURER KEY OPERATIONS (ES256 / ECDSA P-256) ────────────────────────

/**
 * Generates an ECDSA P-256 keypair for a manufacturer deterministically, encrypts the private key
 * with AES-256-GCM, and persists it to the keystore file.
 * @param {string} manufacturerId - Unique manufacturer identifier.
 * @returns {Promise<{ publicKeyPem: string, keyId: string }>}
 */
export const generateManufacturerKey = async (manufacturerId) => {
    const masterSecret = process.env.KEY_ENCRYPTION_SECRET;
    if (!masterSecret) throw new Error('KEY_ENCRYPTION_SECRET is not configured');

    // ── Derive deterministic EC P-256 keypair ─────────────────────────────────
    const { privateKey, publicKey } = deriveDeterministicKeyPair(masterSecret, manufacturerId);

    // ── Derive encryption key and encrypt private key ─────────────────────────
    const derivedKey = await deriveKey(masterSecret, manufacturerId);
    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

    const encrypted = Buffer.concat([cipher.update(privateKey, 'utf-8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // ── Encode as ivHex:authTagHex:cipherHex ─────────────────────────────────
    const encryptedPrivKey = [
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted.toString('hex'),
    ].join(':');

    const keyId = `mfr-key-${manufacturerId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    // ── Persist to keystore (retain previous public keys for signature continuity) ──
    const keystore = await readKeystore();
    const existing = keystore[manufacturerId];
    const publicKeysList = existing
        ? [existing.publicKeyPem, ...(existing.publicKeys || [])].filter(Boolean)
        : [];
    if (!publicKeysList.includes(publicKey)) {
        publicKeysList.unshift(publicKey);
    }

    keystore[manufacturerId] = {
        encryptedPrivKey,
        publicKeyPem: publicKey,
        publicKeys: publicKeysList,
        algorithm: ES256_ALGORITHM,
        keyId,
        createdAt: existing?.createdAt || getISTISOString(),
    };
    await writeKeystore(keystore);

    console.log(`[pharma-core Crypto] Derived and stored deterministic EC key for ${manufacturerId} (kid: ${keyId})`);
    return { publicKeyPem: publicKey, keyId };
};

/**
 * Decrypts and returns the raw private key PEM for a manufacturer.
 * If the key is missing from the local keystore (e.g., after a container restart or storage wipe),
 * it automatically reconstructs the deterministic keypair.
 * The key exists only transiently in memory during this call.
 * @param {string} manufacturerId
 * @returns {Promise<string>} Raw private key PEM string.
 */
export const decryptPrivateKey = async (manufacturerId) => {
    const masterSecret = process.env.KEY_ENCRYPTION_SECRET;
    if (!masterSecret) throw new Error('KEY_ENCRYPTION_SECRET is not configured');

    const keystore = await readKeystore();
    let entry = keystore[manufacturerId];

    // If key not in keystore (e.g. after container restart / storage wipe), auto-derive deterministically
    if (!entry || !entry.encryptedPrivKey) {
        console.log(`[pharma-core Crypto] Keystore miss for ${manufacturerId} — auto-deriving deterministic key...`);
        await generateManufacturerKey(manufacturerId);
        const refreshedKeystore = await readKeystore();
        entry = refreshedKeystore[manufacturerId];
    }

    if (!entry || !entry.encryptedPrivKey) {
        throw new Error(`No key found for manufacturer: ${manufacturerId}`);
    }

    const [ivHex, authTagHex, cipherHex] = entry.encryptedPrivKey.split(':');
    const derivedKey = await deriveKey(masterSecret, manufacturerId);

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        derivedKey,
        Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(cipherHex, 'hex')),
        decipher.final(),
    ]);

    return decrypted.toString('utf-8');
};

/**
 * Signs a compact JWT payload with the manufacturer's ES256 private key.
 * Used to embed pack identity in QR codes.
 * @param {Object} payload - JWT claims: { batchId, serial, expiryDate, manufacturerId }
 * @param {string} manufacturerId
 * @returns {Promise<string>} Signed JWT string.
 */
export const signPackJwt = async (payload, manufacturerId) => {
    let keystore = await readKeystore();
    let entry = keystore[manufacturerId];
    if (!entry || !entry.encryptedPrivKey) {
        await generateManufacturerKey(manufacturerId);
        keystore = await readKeystore();
        entry = keystore[manufacturerId];
    }
    if (!entry) throw new Error(`No key found for manufacturer: ${manufacturerId}`);

    const privateKey = await decryptPrivateKey(manufacturerId);

    return jwt.sign(payload, privateKey, {
        algorithm: ES256_ALGORITHM,
        keyid: entry.keyId,
    });
};

/**
 * Verifies an ES256-signed JWT using the appropriate manufacturer's public key.
 * Resolves the public key from the keystore by the 'kid' header claim.
 * @param {string} signedToken - Raw JWT string from QR code.
 * @returns {Promise<{ valid: boolean, payload?: Object, packHash?: string, error?: string }>}
 */
export const verifyPackJwt = async (signedToken) => {
    try {
        // ── Decode header and payload ─────────────────────────────────────────
        const decoded = jwt.decode(signedToken, { complete: true });
        if (!decoded || !decoded.header || !decoded.payload) {
            return { valid: false, error: 'INVALID_TOKEN_FORMAT' };
        }

        const kid = decoded.header.kid;
        const manufacturerId = decoded.payload.manufacturerId;
        const keystore = await readKeystore();

        // ── Gather candidate public keys from local keystore ──────────────────
        const candidateKeys = [];

        // 1. By kid
        const entryByKid = Object.values(keystore).find((e) => e.keyId === kid);
        if (entryByKid?.publicKeyPem && !candidateKeys.includes(entryByKid.publicKeyPem)) {
            candidateKeys.push(entryByKid.publicKeyPem);
        }
        if (Array.isArray(entryByKid?.publicKeys)) {
            for (const pk of entryByKid.publicKeys) {
                if (pk && !candidateKeys.includes(pk)) candidateKeys.push(pk);
            }
        }

        // 2. By manufacturerId in local keystore
        if (manufacturerId && keystore[manufacturerId]) {
            const entryByMfr = keystore[manufacturerId];
            if (entryByMfr.publicKeyPem && !candidateKeys.includes(entryByMfr.publicKeyPem)) {
                candidateKeys.push(entryByMfr.publicKeyPem);
            }
            if (Array.isArray(entryByMfr.publicKeys)) {
                for (const pk of entryByMfr.publicKeys) {
                    if (pk && !candidateKeys.includes(pk)) candidateKeys.push(pk);
                }
            }
        }

        // 3. By deterministic derivation for manufacturerId
        if (manufacturerId && process.env.KEY_ENCRYPTION_SECRET) {
            try {
                const det = deriveDeterministicKeyPair(process.env.KEY_ENCRYPTION_SECRET, manufacturerId);
                if (det?.publicKey && !candidateKeys.includes(det.publicKey)) {
                    candidateKeys.push(det.publicKey);
                }
            } catch {
                // Non-fatal
            }
        }

        // ── Attempt verification with local candidate keys ─────────────────────
        let verifiedPayload = null;
        for (const pubKey of candidateKeys) {
            try {
                verifiedPayload = jwt.verify(signedToken, pubKey, {
                    algorithms: [ES256_ALGORITHM],
                });
                if (verifiedPayload) break;
            } catch {
                // Try next candidate key
            }
        }

        // ── Fallback: Query manufacturer-service for certified public keys ─────
        if (!verifiedPayload && (manufacturerId || kid || decoded.payload.batchId)) {
            try {
                const mfrServiceUrl = process.env.MANUFACTURER_SERVICE_URL || 'http://manufacturer-service:80';
                const searchIds = [
                    manufacturerId,
                    decoded.payload.batchId,
                    kid,
                ].filter(Boolean);

                for (const targetId of searchIds) {
                    if (verifiedPayload) break;
                    try {
                        const mfrRes = await axios.get(`${mfrServiceUrl}/api/manufacturer/public/key/${encodeURIComponent(targetId)}`, {
                            timeout: 4000,
                        });

                        const remoteKeys = Array.from(new Set([
                            mfrRes.data?.publicKeyPem,
                            ...(Array.isArray(mfrRes.data?.publicKeys) ? mfrRes.data.publicKeys : []),
                        ].filter(Boolean)));

                        for (const fetchedKey of remoteKeys) {
                            try {
                                verifiedPayload = jwt.verify(signedToken, fetchedKey, {
                                    algorithms: [ES256_ALGORITHM],
                                });

                                if (verifiedPayload) {
                                    console.log(`[pharma-core Crypto] Successfully verified token with certified public key from manufacturer-service for ${targetId}`);
                                    // Cache all verified public keys into keystore for instant future hits
                                    try {
                                        const mfrKey = manufacturerId || targetId;
                                        if (keystore[mfrKey]) {
                                            if (!Array.isArray(keystore[mfrKey].publicKeys)) {
                                                keystore[mfrKey].publicKeys = [keystore[mfrKey].publicKeyPem].filter(Boolean);
                                            }
                                            for (const rk of remoteKeys) {
                                                if (!keystore[mfrKey].publicKeys.includes(rk)) {
                                                    keystore[mfrKey].publicKeys.push(rk);
                                                }
                                            }
                                            keystore[mfrKey].publicKeyPem = fetchedKey;
                                        } else {
                                            keystore[mfrKey] = {
                                                publicKeyPem: fetchedKey,
                                                publicKeys: remoteKeys,
                                                algorithm: ES256_ALGORITHM,
                                                keyId: kid || `mfr-key-${mfrKey.toLowerCase()}`,
                                                createdAt: getISTISOString(),
                                            };
                                        }
                                        await writeKeystore(keystore);
                                    } catch (cacheErr) {
                                        console.warn('[pharma-core Crypto] Non-fatal keystore cache write notice:', cacheErr.message);
                                    }
                                    break;
                                }
                            } catch {
                                // Try next key in remoteKeys
                            }
                        }
                    } catch {
                        // Try next searchId
                    }
                }
            } catch (fetchErr) {
                console.warn('[pharma-core Crypto] Manufacturer key lookup failed:', fetchErr.message);
            }
        }

        if (!verifiedPayload) {
            return { valid: false, error: 'INVALID_SIGNATURE' };
        }

        // ── Derive packHash = SHA256(rawSignedJWT) ────────────────────────────
        const packHash = crypto.createHash('sha256').update(signedToken).digest('hex');

        return { valid: true, payload: verifiedPayload, packHash };
    } catch (err) {
        console.error('[pharma-core Crypto] JWT verification failed:', err.message);
        return { valid: false, error: 'INVALID_SIGNATURE' };
    }
};

// ── PHARMA-CORE IDENTITY OPERATIONS (RS256 / RSA-4096) ───────────────────────

/**
 * Signs a short-lived RS256 machine-to-machine JWT using pharma-core's RSA-4096 private key.
 * This token is used as the Bearer credential when calling pharma-backend-service's
 * Spring Security OAuth2 resource server endpoints.
 *
 * JWT claims follow the OAuth2 Client Credentials pattern:
 *   iss: "pharma-core"          — issuer (pharma-core service)
 *   sub: "pharma-core"          — subject (same — service account)
 *   aud: "pharma-backend"       — intended audience
 *   iat: <now>                  — issued at
 *   exp: <now + 5min>           — short-lived (300s)
 *   kid: "pharma-core-rs256"    — key ID for JWKS resolution
 *
 * @returns {string} Signed RS256 JWT string.
 */
export const signCoreJwt = () => {
    const privateKeyPem = getCorePrivateKey();

    const payload = {
        iss: 'pharma-core',
        sub: 'pharma-core',
        aud: 'pharma-backend',
    };

    return jwt.sign(payload, privateKeyPem, {
        algorithm: RS256_ALGORITHM,
        keyid: CORE_KID,
        expiresIn: CORE_JWT_TTL_SECONDS,
    });
};

/**
 * Verifies an RS256 JWT signed by pharma-core's RSA private key.
 * Used for inbound verification if pharma-backend ever needs to confirm a callback.
 * @param {string} token - RS256 JWT string.
 * @returns {{ valid: boolean, payload?: Object, error?: string }}
 */
export const verifyCoreJwt = (token) => {
    try {
        const publicKeyPem = getCorePublicKey();
        const payload = jwt.verify(token, publicKeyPem, {
            algorithms: [RS256_ALGORITHM],
            audience: 'pharma-backend',
            issuer: 'pharma-core',
        });
        return { valid: true, payload };
    } catch (err) {
        console.error('[pharma-core Crypto] Core JWT verification failed:', err.message);
        return { valid: false, error: err.message };
    }
};

// ── JWKS BUILDER (serves BOTH EC and RSA public keys) ────────────────────────

/**
 * Builds the complete JWKS (JSON Web Key Set) response.
 * Includes:
 *   1. All manufacturer EC P-256 public keys (ES256) — for pack JWT verification
 *   2. pharma-core's RSA-4096 public key (RS256)      — for pharma-core identity verification
 *
 * pharma-backend-service (Spring Security) fetches this on startup and caches it for 24h.
 * Domain services (manufacturer, shopkeeper, consumer) can also use this to independently
 * verify pack JWTs without calling pharma-core.
 *
 * @returns {Promise<{ keys: Array<Object> }>}
 */
export const buildJwks = async () => {
    const keystore = await readKeystore();

    // ── EC P-256 keys (all active and historical manufacturer keys) ─────────
    const ecKeys = Object.values(keystore).flatMap((entry) => {
        const pems = [entry.publicKeyPem, ...(Array.isArray(entry.publicKeys) ? entry.publicKeys : [])]
            .filter((v, i, a) => v && a.indexOf(v) === i);
        return pems.map((pem) => {
            const keyObj = crypto.createPublicKey(pem);
            const { x, y } = keyObj.export({ format: 'jwk' });
            return {
                kty: 'EC',
                crv: 'P-256',
                kid: entry.keyId,
                use: 'sig',
                alg: 'ES256',
                x,
                y,
            };
        });
    });

    // ── RSA-4096 key (pharma-core identity) ──────────────────────────────────
    const rsaPublicKeyPem = getCorePublicKey();
    const rsaKeyObj = crypto.createPublicKey(rsaPublicKeyPem);
    const { n, e } = rsaKeyObj.export({ format: 'jwk' });

    const rsaJwk = {
        kty: 'RSA',
        kid: CORE_KID,
        use: 'sig',
        alg: 'RS256',
        n,   // RSA modulus (base64url)
        e,   // RSA public exponent (base64url)
    };

    return { keys: [...ecKeys, rsaJwk] };
};

// ── UTILITY ───────────────────────────────────────────────────────────────────

/**
 * Derives a SHA-256 pack hash from a signed JWT string.
 * packHash = SHA256(rawSignedJWTString)
 * @param {string} signedToken
 * @returns {string} Hex-encoded SHA-256 hash.
 */
export const derivePackHash = (signedToken) =>
    crypto.createHash('sha256').update(signedToken).digest('hex');

// ── LOCAL DATE / TIME HELPERS (used by mintPacksBatch) ────────────────────────

const _formatDate = (d = new Date()) => getISTDateCompact(d); // DDMMYYYY in IST

const _formatTime = (d = new Date()) => getISTTimeString(d); // HH:MM:SS in IST

// ── OPTIMIZED BULK BATCH MINTING ──────────────────────────────────────────────

/**
 * Mints an entire batch of pharmaceutical pack JWTs in one optimized pass.
 *
 * Key performance guarantee:
 *   - Private key is decrypted ONCE (one scrypt call, ~100-150ms).
 *   - All N packs are signed in memory using the cached PEM (~0.1ms/pack).
 *   - Total time: ~150ms + N×0.1ms  (vs. N×150ms with the naive approach).
 *
 * Hash uniqueness guarantee:
 *   - Each JWT payload contains a unique `serial` ("00001"…"10000") scoped
 *     by `batchId`. SHA-256 of a unique input is always unique.
 *   - Collision probability is bounded by SHA-256 pre-image resistance (2^-128).
 *
 * @param {string} batchId         - Unique batch identifier (e.g. "BATCH-CIPLA-001")
 * @param {string} manufacturerId  - Manufacturer identifier (must have a stored key)
 * @param {string} expiryDate      - ISO date string (e.g. "2028-01-14")
 * @param {number} quantity        - Number of packs to mint (1 – 10,000)
 * @returns {Promise<{ packs: Array, transitions: Array }>}
 *   packs:       [{ serial, packHash, signedToken }, ...]
 *   transitions: [{ hash, fromId, toId, sellingDate, sellingTime, sellerId }, ...]
 */
export const mintPacksBatch = async (batchId, manufacturerId, expiryDate, quantity, medicineName = 'MEDICINE') => {
    // ── 1. Load keystore entry (one disk read, cached after first load) ────────
    const keystore = await readKeystore();
    const entry = keystore[manufacturerId];
    if (!entry) throw new Error(`No key found for manufacturer: ${manufacturerId}`);

    // ── 2. Decrypt private key ONCE (single scrypt call) ──────────────────────
    const privateKeyPem = await decryptPrivateKey(manufacturerId);

    // ── 3. Capture timestamp once for all transitions in this batch ───────────
    const now = new Date();
    const sellingDate = _formatDate(now);
    const sellingTime = _formatTime(now);

    const packs       = [];
    const transitions = [];

    // ── 4. Sign all packs in memory (pure EC crypto — ~0.1ms per pack) ────────
    for (let i = 1; i <= quantity; i++) {
        const serial  = String(i).padStart(5, '0'); // "00001" … "10000"

        // ── Extra entropy fields (guarantee hash uniqueness beyond serial+batchId) ──
        const nonce   = crypto.randomBytes(4).toString('hex');   // "a3f7b2c1"
        const ts      = process.hrtime.bigint().toString();       // "1787406879519847293"

        const payload = { batchId, serial, expiryDate, manufacturerId, medicineName, nonce, ts };

        // jwt.sign with a PEM string is synchronous ECDSA — no I/O, no scrypt
        const signedToken = jwt.sign(payload, privateKeyPem, {
            algorithm: ES256_ALGORITHM,
            keyid:     entry.keyId,
        });

        // packHash = SHA256(rawSignedJWT)  — the architecture's primary key
        const packHash = derivePackHash(signedToken);

        packs.push({ serial, packHash, signedToken });

        transitions.push({
            packId:      packHash,
            eventType:   'MINTED',
            hash:        `${packHash}~MINTED`,
            fromId:      'GENESIS',
            toId:        manufacturerId,
            sellingDate,
            sellingTime,
            sellerId:    manufacturerId,
        });
    }

    console.log(
        `[pharma-core Crypto] mintPacksBatch: signed ${packs.length} packs for ${batchId}` +
        ` (1 scrypt + ${packs.length} EC signs)`,
    );

    return { packs, transitions, publicKeyPem: entry.publicKeyPem, keyId: entry.keyId };
};

// ── MINT + S3 UPLOAD ORCHESTRATOR ─────────────────────────────────────────────

/**
 * Top-level minting orchestrator for the S3 pipeline.
 *
 * Sequence:
 *   1. Call mintPacksBatch()  — decrypt key once, sign N JWTs in memory (~10s for 100k)
 *   2. Build CSV in one pass  — stream rows from the in-memory packs array (O(N) memory, no temp disk)
 *   3. Upload CSV to S3 OR save locally (automatic fallback when AWS creds are absent)
 *   4. Generate pre-signed download URL (or local URL for dev mode)
 *   5. Submit MINTED transitions to pharma-backend in chunks (blockchain)
 *
 * What this function intentionally does NOT return:
 *   - The raw packs[] array  → avoids 50MB HTTP payload to manufacturer-service
 *   - Individual pack hashes → manufacturer-service no longer needs them; the CSV is the source of truth
 *
 * @param {string} batchId         - PharmaChain System Batch ID
 * @param {string} manufacturerId  - Must have a stored EC key in keystore
 * @param {string} expiryDate      - ISO date string (e.g. "2028-01-14")
 * @param {number} quantity        - Number of packs (1 – 100,000)
 * @param {string} medicineName    - Used in CSV filename and S3 object metadata
 * @param {Function} submitFn      - Injected chunked blockchain submit function
 *                                   (allows unit testing without live Fabric)
 * @returns {Promise<{
 *   status:                   'success',
 *   batchId:                  string,
 *   totalPacks:               number,
 *   s3FileKey:                string,
 *   s3DownloadUrl:            string,
 *   s3UrlExpiresAt:           string|null,
 *   s3Mode:                   'aws',
 *   backendSubmitted:         boolean,
 *   partialBlockchainSubmit:  boolean,
 *   blockchainRecorded:       number,
 *   mintedAt:                 string,
 *   timingMs:                 { signing: number, upload: number, total: number }
 * }>}
 */
export const mintAndUploadBatch = async (
    batchId,
    manufacturerId,
    expiryDate,
    quantity,
    medicineName,
    submitFn,
) => {
    const totalStart = Date.now();

    // ── Step 1: Sign all packs in memory (1 scrypt + N EC signs) ─────────────
    const { packs, transitions, publicKeyPem, keyId } = await mintPacksBatch(
        batchId,
        manufacturerId,
        expiryDate,
        quantity,
        medicineName,
    );

    const signMs = Date.now() - totalStart;
    console.log(`[pharma-core Crypto] mintAndUploadBatch: signed ${packs.length} packs in ${signMs}ms`);

    // ── Step 2: Build CSV in one linear pass ─────────────────────────────────
    // Columns: serialNumber,packHash,signedToken,verifyUrl,batchId,medicineName,expiryDate
    const medNameClean = (medicineName || 'MEDICINE').replace(/[^a-zA-Z0-9_\- ]/g, '_');
    const expStr       = expiryDate || '';
    const VERIFY_BASE  = 'https://pharmachain.gov.in/verify';

    const csvRows = ['serialNumber,packHash,signedToken,verifyUrl,batchId,medicineName,expiryDate'];

    for (const p of packs) {
        // verifyUrl encodes both the hash (path) and the full JWT (query param)
        // - Scanned by phone camera  → opens web verification at pharmachain.gov.in
        // - Scanned by pharma app   → app extracts packHash from URL path directly
        const verifyUrl = `${VERIFY_BASE}/${p.packHash}?token=${p.signedToken}`;
        csvRows.push(
            `"${p.serial}","${p.packHash}","${p.signedToken}","${verifyUrl}","${batchId}","${medNameClean}","${expStr}"`,
        );
    }

    const csvContent = csvRows.join('\n');
    const uploadStart = Date.now();

    // ── Step 3: Upload exclusively to AWS S3 ─────────────────────────────────
    if (!isS3Configured()) {
        throw new Error(
            `[pharma-core S3] AWS S3 is not configured. ` +
            `Batch ${batchId} cannot be minted because artifacts must be stored exclusively in AWS S3.`
        );
    }

    let s3FileKey, s3DownloadUrl, s3UrlExpiresAt;
    const s3Mode = 'aws';

    try {
        const uploadResult    = await uploadCsvToS3(batchId, csvContent, medicineName);
        const presignedResult = await generatePresignedUrl(uploadResult.s3FileKey);

        s3FileKey      = uploadResult.s3FileKey;
        s3DownloadUrl  = presignedResult.s3DownloadUrl;
        s3UrlExpiresAt = presignedResult.s3UrlExpiresAt;
    } catch (s3Err) {
        console.error(`[pharma-core Crypto] ❌ AWS S3 upload failed for ${batchId}:`, s3Err.message);
        throw new Error(`[pharma-core S3] S3 upload failed for batch ${batchId}: ${s3Err.message}`);
    }

    const uploadMs = Date.now() - uploadStart;
    console.log(`[pharma-core Crypto] CSV uploaded to S3 in ${uploadMs}ms`);

    // ── Step 4: Submit MINTED transitions to Hyperledger Fabric ─────────────
    // Non-fatal: packs are signed and CSV is uploaded even if Fabric is temporarily down.
    const chunkSize       = parseInt(process.env.BATCH_CHUNK_SIZE || '250', 10);
    let backendSubmitted  = false;
    let partialSubmit     = false;
    let recordedHashes    = [];
    let blockchainError   = null;

    if (typeof submitFn === 'function') {
        try {
            recordedHashes   = await submitFn(batchId, transitions, chunkSize);
            backendSubmitted = true;
            console.log(
                `[pharma-core Crypto] Blockchain: ${recordedHashes.length}/${transitions.length} transitions recorded ✅`,
            );
        } catch (backendErr) {
            partialSubmit   = true;
            blockchainError = backendErr.data?.message || backendErr.message;
            console.error(
                `[pharma-core Crypto] ⚠️  Blockchain submission failed for ${batchId}: ${blockchainError}. ` +
                `CSV is safely stored on ${s3Mode === 'aws' ? 'S3' : 'disk'} — operator can retry blockchain sync.`,
            );
        }
    }

    const totalMs = Date.now() - totalStart;
    console.log(
        `[pharma-core Crypto] mintAndUploadBatch complete for ${batchId}` +
        ` in ${totalMs}ms | mode: ${s3Mode} | blockchain: ${backendSubmitted ? 'COMMITTED' : 'FAILED'}`,
    );

    return {
        status:                  backendSubmitted ? 'success' : (partialSubmit ? 'partial_success' : 'success'),
        batchId,
        totalPacks:              packs.length,
        s3FileKey,
        s3DownloadUrl,
        s3UrlExpiresAt,
        s3Mode,
        backendSubmitted,
        blockchainStatus:        backendSubmitted ? 'COMMITTED' : (partialSubmit ? 'FAILED' : 'PENDING'),
        blockchainError:         blockchainError,
        partialBlockchainSubmit: partialSubmit,
        blockchainRecorded:      recordedHashes.length,
        publicKeyPem:            publicKeyPem || null,
        keyId:                   keyId || null,
        mintedAt:                getISTISOString(),
        timingMs: {
            signing: signMs,
            upload:  uploadMs,
            total:   totalMs,
        },
    };
};
