// ── requireVerified middleware — shopkeeper-service ───────────────────────────
// Guards sensitive operations so only fully-verified shopkeepers can proceed.
// Must be used AFTER identifyUser (which attaches req.user and req.shopkeeper).
//
// NOTE: identifyUser already fetches the shopkeeper from DB (or Redis cache) and
// attaches it as req.shopkeeper. This middleware reads that — no extra DB call.

import Shopkeeper from '../models/shopkeeper.model.js';

/**
 * Blocks access to sensitive routes if the shopkeeper's verificationStatus
 * is not 'verified' or 'approved'. Returns 403 Forbidden with a descriptive code.
 */
export const requireVerified = async (req, res, next) => {
    try {
        // Use the shopkeeper already loaded by identifyUser to avoid a second DB query.
        // Fall back to a fresh DB lookup only if somehow not attached.
        const shopkeeper = req.shopkeeper
            ?? await Shopkeeper.findOne({ shopId: req.user.id }).lean();

        if (!shopkeeper) {
            return res.status(401).json({
                status: 'error',
                code: 'SHOPKEEPER_NOT_FOUND',
                message: 'Shopkeeper account not found.',
            });
        }

        const status = (shopkeeper.verificationStatus || '').toLowerCase();

        if (status === 'verified' || status === 'approved') {
            req.shopkeeper = shopkeeper;
            return next();
        }

        if (status === 'pending') {
            return res.status(403).json({
                status: 'error',
                code: 'ACCOUNT_PENDING',
                message: 'Your pharmacy account is under review. You will be notified once verified.',
            });
        }

        if (status === 'rejected') {
            return res.status(403).json({
                status: 'error',
                code: 'ACCOUNT_REJECTED',
                message: 'Your pharmacy account has been rejected.',
                rejectionReason: shopkeeper.rejectionReason || null,
            });
        }

        if (status === 'suspended') {
            return res.status(403).json({
                status: 'error',
                code: 'ACCOUNT_SUSPENDED',
                message: 'Your pharmacy account has been suspended. Contact support.',
            });
        }

        return res.status(403).json({
            status: 'error',
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to perform this action.',
        });
    } catch (err) {
        console.error('[shopkeeper-service requireVerified] Error:', err.message);
        return res.status(500).json({
            status: 'error',
            code: 'INTERNAL_ERROR',
            message: 'Internal server error.',
        });
    }
};

