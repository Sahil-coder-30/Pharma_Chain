import crypto from 'crypto';

// ── Master Feistel Secret ──────────────────────────────────────────────────────
const FEISTEL_KEY = process.env.PHARMACHAIN_FEISTEL_KEY || 'PHARMACHAIN_NATIONAL_DRUG_LEDGER_FEISTEL_KEY_2026';
const ROUNDS = 4;
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // Base-36
const HALF_BITS = 15;
const HALF_MASK = 0x7fff; // 15-bit mask (0..32767)
export const MAX_BATCH_CAPACITY = (1 << (HALF_BITS * 2)) - 1; // 2^30 - 1 = 1,073,741,823 batches

/**
 * Pseudo-random round function for Feistel network.
 * @param {number} right - 15-bit unsigned integer.
 * @param {number} round - Round index (0 to 3).
 * @param {string} key - Master key.
 * @returns {number} 15-bit unsigned integer.
 */
function roundFunction(right, round, key) {
    const buf = Buffer.alloc(6);
    buf.writeUInt16BE(right, 0);
    buf.writeUInt32BE(round, 2);
    const hmac = crypto.createHmac('sha256', key).update(buf).digest();
    return hmac.readUInt16BE(0) & HALF_MASK;
}

/**
 * Encrypts a 30-bit counter using a 4-round balanced Feistel cipher.
 * Guaranteed 1-to-1 bijection (zero collisions).
 * @param {number} counter - 30-bit unsigned integer (0 to 1,073,741,823).
 * @returns {number} 30-bit scrambled integer.
 */
export function feistelEncrypt(counter) {
    let left = (counter >>> HALF_BITS) & HALF_MASK;
    let right = counter & HALF_MASK;

    for (let i = 0; i < ROUNDS; i++) {
        const temp = right;
        right = (left ^ roundFunction(right, i, FEISTEL_KEY)) & HALF_MASK;
        left = temp;
    }

    return ((left << HALF_BITS) | right) >>> 0;
}

/**
 * Decrypts a scrambled 30-bit integer back to its original counter.
 * @param {number} val - 30-bit scrambled integer.
 * @returns {number} Original sequential counter.
 */
export function feistelDecrypt(val) {
    let left = (val >>> HALF_BITS) & HALF_MASK;
    let right = val & HALF_MASK;

    for (let i = ROUNDS - 1; i >= 0; i--) {
        const temp = left;
        left = (right ^ roundFunction(left, i, FEISTEL_KEY)) & HALF_MASK;
        right = temp;
    }

    return ((left << HALF_BITS) | right) >>> 0;
}

/**
 * Encodes a 30-bit integer into exactly 6 Base-36 characters.
 * @param {number} num
 * @returns {string} 6 uppercase characters.
 */
function toBase36(num) {
    let res = '';
    let n = num >>> 0;
    for (let i = 0; i < 6; i++) {
        res = ALPHABET[n % 36] + res;
        n = Math.floor(n / 36);
    }
    return res;
}

/**
 * Decodes a 6-character Base-36 string back to a 30-bit integer.
 * @param {string} str
 * @returns {number}
 */
function fromBase36(str) {
    let n = 0;
    const clean = str.toUpperCase();
    for (let i = 0; i < clean.length; i++) {
        const idx = ALPHABET.indexOf(clean[i]);
        if (idx === -1) throw new Error(`Invalid Base-36 character: ${clean[i]}`);
        n = n * 36 + idx;
    }
    return n >>> 0;
}

/**
 * Generates an 8-character unguessable, deterministic, collision-free Batch ID (e.g. "B1-F8X2").
 * @param {number} counter - Sequential batch index (1, 2, 3...)
 * @returns {string} Batch ID in format "XX-XXXX"
 */
export function generateFeistelBatchId(counter) {
    const validCounter = (counter >>> 0) % (MAX_BATCH_CAPACITY + 1);
    const scrambled = feistelEncrypt(validCounter);
    const b36 = toBase36(scrambled);
    return `${b36.slice(0, 2)}-${b36.slice(2, 6)}`;
}

/**
 * Inverts an 8-character Batch ID back to the exact sequential counter.
 * @param {string} batchId - e.g. "B1-F8X2"
 * @returns {number}
 */
export function decodeFeistelBatchId(batchId) {
    const clean = batchId.replace(/-/g, '').toUpperCase();
    if (clean.length !== 6) {
        throw new Error(`Invalid Feistel Batch ID format: ${batchId}`);
    }
    const scrambled = fromBase36(clean);
    return feistelDecrypt(scrambled);
}
