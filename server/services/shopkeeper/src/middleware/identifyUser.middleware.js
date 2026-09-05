// ── identifyUser middleware — shopkeeper-service ──────────────────────────────
// Validates shopkeeper JWT and verifies account status via Redis cache (<1ms).
// Refreshes a 20-minute sliding window on every active request.
// Falls back to MongoDB on cache miss. Rejects suspended/unverified pharmacies with 403.

import jwt from 'jsonwebtoken';
import Shopkeeper from '../models/shopkeeper.model.js';
import {
    getCachedShopkeeperStatus,
    setCachedShopkeeperStatus,
    refreshShopkeeperStatusTTL,
} from '../services/redis.service.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
const STATUS_TTL_SECONDS = 20 * 60; // 20 minutes sliding window

export const identifyUser = async (req, res, next) => {
    // ── Extract token ─────────────────────────────────────────────────────────
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies?.shop_token) {
        token = req.cookies.shop_token;
    }

    // ── Validate presence ─────────────────────────────────────────────────────
    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: No authentication token provided',
        });
    }

    // ── Verify JWT signature and expiry ───────────────────────────────────────
    try {
        if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');

        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

        // ── Attach identity to request ────────────────────────────────────────
        req.user = decoded;
        req.user.id = decoded.id || decoded.sub;
        req.authToken = token;

        const shopId = req.user.id;

        // ── 1. Check Redis Cache (< 1ms) ──────────────────────────────────────
        const cachedStatus = await getCachedShopkeeperStatus(shopId);

        if (cachedStatus) {
            refreshShopkeeperStatusTTL(shopId, STATUS_TTL_SECONDS);

            const vStatus = (cachedStatus.verificationStatus || '').toLowerCase();
            if (vStatus === 'suspended') {
                console.warn(`[shopkeeper-service identifyUser] Redis: Access SUSPENDED for ${shopId}`);
                return res.status(403).json({
                    status: 'error',
                    code: 'ACCOUNT_SUSPENDED',
                    message: 'Your pharmacy drug license has been suspended by the CDSCO regulatory authority.',
                    reason: cachedStatus.rejectionReason || 'Regulatory compliance freeze.',
                });
            }

            if (vStatus === 'rejected') {
                return res.status(403).json({
                    status: 'error',
                    code: 'ACCOUNT_REJECTED',
                    message: 'Your pharmacy account application has been rejected.',
                    reason: cachedStatus.rejectionReason || null,
                });
            }

            if (vStatus === 'pending') {
                return res.status(403).json({
                    status: 'error',
                    code: 'ACCOUNT_PENDING',
                    message: 'Your pharmacy account is pending CDSCO license verification.',
                });
            }

            req.shopkeeper = cachedStatus;
            return next();
        }

        // ── 2. Cache Miss: Query MongoDB ──────────────────────────────────────
        const shopkeeper = await Shopkeeper.findOne({ shopId }).lean();

        if (!shopkeeper) {
            console.warn(`[shopkeeper-service identifyUser] Account not found for token shopId: ${shopId}`);
            return res.status(401).json({ status: 'error', code: 'SHOPKEEPER_NOT_FOUND', message: 'Shopkeeper account not found' });
        }

        // Cache in Redis with 20 min sliding TTL
        const statusPayload = {
            shopId:             shopkeeper.shopId,
            shopName:           shopkeeper.shop?.name,
            drugLicenseNumber:  shopkeeper.license?.drugLicenseNumber,
            verificationStatus: shopkeeper.verificationStatus,
            rejectionReason:    shopkeeper.rejectionReason,
            verifiedAt:         shopkeeper.verifiedAt,
            ownerEmail:         shopkeeper.owner?.email,
        };
        await setCachedShopkeeperStatus(shopId, statusPayload, STATUS_TTL_SECONDS);

        const vStatus = (shopkeeper.verificationStatus || '').toLowerCase();
        if (vStatus === 'suspended') {
            return res.status(403).json({
                status: 'error',
                code: 'ACCOUNT_SUSPENDED',
                message: 'Your pharmacy drug license has been suspended by the CDSCO regulatory authority.',
                reason: shopkeeper.rejectionReason || 'Regulatory compliance freeze.',
            });
        }

        if (vStatus === 'rejected') {
            return res.status(403).json({
                status: 'error',
                code: 'ACCOUNT_REJECTED',
                message: 'Your pharmacy account application has been rejected.',
                reason: shopkeeper.rejectionReason || null,
            });
        }

        if (vStatus === 'pending') {
            return res.status(403).json({
                status: 'error',
                code: 'ACCOUNT_PENDING',
                message: 'Your pharmacy account is pending CDSCO license verification.',
            });
        }

        req.shopkeeper = shopkeeper;
        next();
    } catch (err) {
        console.error('[shopkeeper-service Auth] JWT verification failed:', err.message);

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ status: 'error', message: 'Unauthorized: Token has expired' });
        }

        return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid token' });
    }
};
