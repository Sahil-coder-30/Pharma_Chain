import express from 'express';
import {
    registerController,
    loginController,
    kycApproveController,
    kycRejectController,
    kycBlockController,
    kycUnblockController,
    getMeController,
    logoutController,
    getManufacturerPublicKeyController,
    getAllPublicKeysController,
} from '../controllers/auth.controller.js';
import { identifyUser } from '../middleware/identifyUser.middleware.js';

const router = express.Router();

// ── Public Auth Routes (no JWT required) ──────────────────────────────────────

// POST /api/manufacturer/auth/register
router.post('/register', registerController);

// POST /api/manufacturer/auth/login → sets mfr_token cookie
router.post('/login', loginController);

// GET /api/manufacturer/auth/keys/all and /api/manufacturer/auth/public/keys/all
router.get('/keys/all', getAllPublicKeysController);
router.get('/public/keys/all', getAllPublicKeysController);

// GET /api/manufacturer/auth/key/:id and /api/manufacturer/auth/public/key/:id
router.get('/key/:id', getManufacturerPublicKeyController);
router.get('/public/key/:id', getManufacturerPublicKeyController);

// POST /api/manufacturer/auth/kyc/approve → admin-only, X-Admin-Token header required
// Sets kycStatus=APPROVED and provisions EC P-256 signing key via pharma-core.
// Fail-closed: returns 500 if ADMIN_TOKEN env var is not set.
router.post('/kyc/approve', kycApproveController);

// POST /api/manufacturer/auth/kyc/reject → admin-only, X-Admin-Token header required
router.post('/kyc/reject', kycRejectController);

// POST /api/manufacturer/auth/kyc/block → admin-only, X-Admin-Token header required
router.post('/kyc/block', kycBlockController);

// POST /api/manufacturer/auth/kyc/unblock → admin-only, X-Admin-Token header required
router.post('/kyc/unblock', kycUnblockController);

// POST /api/manufacturer/auth/logout → clears mfr_token cookie, returns 204
// Safe to call unauthenticated.
router.post('/logout', logoutController);

// ── Protected Auth Routes (JWT required) ─────────────────────────────────────

// GET /api/manufacturer/auth/me → returns current account status
// Used by frontend polling hook to detect real-time block status changes.
// identifyUser middleware already returns 403 ACCOUNT_BLOCKED if blocked,
// so the polling hook's response interceptor catches it even here.
router.get('/me', identifyUser, getMeController);

export default router;
