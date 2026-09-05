// ── Redis Cache Service — manufacturer-service ──────────────────────────────
// Manages high-performance status caching for manufacturer accounts.
// Implements a 20-minute sliding window cache (refreshed on active requests),
// allowing identifyUser middleware to verify account standing in < 1ms
// without querying MongoDB on every request.

import Redis from 'ioredis';

const REDIS_URI = process.env.REDIS_URI || process.env.REDIS_URL;
const DEFAULT_TTL_SECONDS = 20 * 60; // 20 minutes sliding window

let redisClient = null;
let isRedisAvailable = false;

if (REDIS_URI) {
    try {
        redisClient = new Redis(REDIS_URI, {
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            connectTimeout: 5000,
            retryStrategy(times) {
                // Exponential backoff capped at 5 seconds
                const delay = Math.min(times * 200, 5000);
                return delay;
            },
        });

        redisClient.on('connect', () => {
            console.log('[manufacturer-service Redis] Connected to Redis cluster successfully.');
            isRedisAvailable = true;
        });

        redisClient.on('ready', () => {
            isRedisAvailable = true;
        });

        redisClient.on('error', (err) => {
            console.warn('[manufacturer-service Redis] Connection warning:', err.message);
            isRedisAvailable = false;
        });

        redisClient.on('close', () => {
            isRedisAvailable = false;
        });
    } catch (err) {
        console.error('[manufacturer-service Redis] Initialization error:', err.message);
        redisClient = null;
        isRedisAvailable = false;
    }
} else {
    console.warn('[manufacturer-service Redis] REDIS_URI not configured. Operating in direct MongoDB mode.');
}

const getStatusKey = (id) => `mfr:status:${id}`;

/**
 * Retrieves cached manufacturer account standing.
 * Returns null if not cached or Redis is unavailable.
 */
export const getCachedManufacturerStatus = async (id) => {
    if (!redisClient || !isRedisAvailable || !id) return null;
    try {
        const raw = await redisClient.get(getStatusKey(id));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        console.warn(`[Redis] getCachedManufacturerStatus error for ${id}:`, err.message);
        return null;
    }
};

/**
 * Caches manufacturer account status in Redis with a 20-minute TTL.
 */
export const setCachedManufacturerStatus = async (id, statusData, ttl = DEFAULT_TTL_SECONDS) => {
    if (!redisClient || !isRedisAvailable || !id || !statusData) return;
    try {
        const key = getStatusKey(id);
        const payload = JSON.stringify(statusData);
        await redisClient.set(key, payload, 'EX', ttl);
    } catch (err) {
        console.warn(`[Redis] setCachedManufacturerStatus error for ${id}:`, err.message);
    }
};

/**
 * Refreshes the sliding window TTL to 20 minutes on active authenticated requests.
 */
export const refreshManufacturerStatusTTL = async (id, ttl = DEFAULT_TTL_SECONDS) => {
    if (!redisClient || !isRedisAvailable || !id) return;
    try {
        await redisClient.expire(getStatusKey(id), ttl);
    } catch (err) {
        console.warn(`[Redis] refreshManufacturerStatusTTL error for ${id}:`, err.message);
    }
};

/**
 * Invalidates or updates cached status when administrative actions (block/unblock/approve) occur.
 */
export const invalidateManufacturerStatus = async (id) => {
    if (!redisClient || !isRedisAvailable || !id) return;
    try {
        await redisClient.del(getStatusKey(id));
        console.log(`[Redis] Cache invalidated for manufacturer: ${id}`);
    } catch (err) {
        console.warn(`[Redis] invalidateManufacturerStatus error for ${id}:`, err.message);
    }
};

export default {
    getCachedManufacturerStatus,
    setCachedManufacturerStatus,
    refreshManufacturerStatusTTL,
    invalidateManufacturerStatus,
};
