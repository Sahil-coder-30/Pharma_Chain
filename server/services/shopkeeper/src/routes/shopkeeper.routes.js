import express from 'express';
import { identifyUser } from '../middleware/identifyUser.middleware.js';
import { requireVerified } from '../middleware/requireVerified.middleware.js';
import {
    statsController,
    historyController,
    inventoryController,
    inboundsController,
    recallsController,
    reportIncidentController,
    getIncidentsController,
    getProfileController,
    updateProfileController,
    getPublicShopProfileController,
} from '../controllers/shopkeeper.controller.js';

const router = express.Router();

// ── Public Pharmacy Profile Lookup (no auth required) ────────────────────────
router.get('/public/profile/:id', getPublicShopProfileController);

// All shopkeeper dashboard/profile routes require auth
router.use(identifyUser);

// ── Dashboard & History ───────────────────────────────────────────────────────

// GET /api/shopkeeper/stats
router.get('/stats', requireVerified, statsController);

// GET /api/shopkeeper/medicine/history
router.get('/medicine/history', requireVerified, historyController);

// GET /api/shopkeeper/inventory
router.get('/inventory', requireVerified, inventoryController);

// GET /api/shopkeeper/inbounds
router.get('/inbounds', requireVerified, inboundsController);

// GET /api/shopkeeper/recalls
router.get('/recalls', requireVerified, recallsController);

// POST /api/shopkeeper/incidents & GET /api/shopkeeper/incidents
router.route('/incidents')
    .post(requireVerified, reportIncidentController)
    .get(requireVerified, getIncidentsController);

// ── Profile ───────────────────────────────────────────────────────────────────

// GET  /api/shopkeeper/profile
// PATCH /api/shopkeeper/profile
router.route('/profile')
    .get(getProfileController)
    .patch(updateProfileController);

export default router;
