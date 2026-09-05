// ── Redis Cache Service — shopkeeper-service ───────────────────────────────
// Manages high-performance status caching for retail pharmacy / chemist accounts.
// Implements a 20-minute sliding window cache (refreshed on active requests),
// allowing identifyUser and requireVerified to verify pharmacy standing in < 1ms
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
                const delay = Math.min(times * 200, 5000);
                return delay;
            },
        });

        redisClient.on('connect', () => {
            console.log('[shopkeeper-service Redis] Connected to Redis cluster successfully.');
            isRedisAvailable = true;
        });

        redisClient.on('ready', () => {
            isRedisAvailable = true;
        });

        redisClient.on('error', (err) => {
            console.warn('[shopkeeper-service Redis] Connection warning:', err.message);
            isRedisAvailable = false;
        });

        redisClient.on('close', () => {
            isRedisAvailable = false;
        });
    } catch (err) {
        console.error('[shopkeeper-service Redis] Initialization error:', err.message);
        redisClient = null;
        isRedisAvailable = false;
    }
} else {
    console.warn('[shopkeeper-service Redis] REDIS_URI not configured. Operating in direct MongoDB mode.');
}

const getStatusKey = (id) => `shopkeeper:status:${id}`;

/**
 * Retrieves cached shopkeeper account standing.
 * Returns null if not cached or Redis is unavailable.
 */
export const getCachedShopkeeperStatus = async (id) => {
    if (!redisClient || !isRedisAvailable || !id) return null;
    try {
        const raw = await redisClient.get(getStatusKey(id));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        console.warn(`[Redis] getCachedShopkeeperStatus error for ${id}:`, err.message);
        return null;
    }
};

/**
 * Caches shopkeeper account status in Redis with a 20-minute TTL.
 */
export const setCachedShopkeeperStatus = async (id, statusData, ttl = DEFAULT_TTL_SECONDS) => {
    if (!redisClient || !isRedisAvailable || !id || !statusData) return;
    try {
        const key = getStatusKey(id);
        const payload = JSON.stringify(statusData);
        await redisClient.set(key, payload, 'EX', ttl);
    } catch (err) {
        console.warn(`[Redis] setCachedShopkeeperStatus error for ${id}:`, err.message);
    }
};

/**
 * Refreshes the sliding window TTL to 20 minutes on active authenticated requests.
 */
export const refreshShopkeeperStatusTTL = async (id, ttl = DEFAULT_TTL_SECONDS) => {
    if (!redisClient || !isRedisAvailable || !id) return;
    try {
        await redisClient.expire(getStatusKey(id), ttl);
    } catch (err) {
        console.warn(`[Redis] refreshShopkeeperStatusTTL error for ${id}:`, err.message);
    }
};

/**
 * Invalidates cached status when administrative actions (approve/reject/suspend) occur.
 */
export const invalidateShopkeeperStatus = async (id) => {
    if (!redisClient || !isRedisAvailable || !id) return;
    try {
        await redisClient.del(getStatusKey(id));
        console.log(`[Redis] Cache invalidated for shopkeeper: ${id}`);
    } catch (err) {
        console.warn(`[Redis] invalidateShopkeeperStatus error for ${id}:`, err.message);
    }
};

export default {
    getCachedShopkeeperStatus,
    setCachedShopkeeperStatus,
    refreshShopkeeperStatusTTL,
    invalidateShopkeeperStatus,
};
