import express from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.middleware.js';
import {
    chainIntakeController,
    chainSaleController,
    chainRecallController,
    chainScanPackV2Controller,
    chainSetPackStateController,
    chainGetPackStateController,
    chainMintBatchController,
} from '../controllers/chain.controller.js';

const router = express.Router();

// ── All chain routes require X-Service-Token ──────────────────────────────────
router.use(requireServiceToken);

// POST /core/chain/intake — record pack INTAKE transition on Fabric (V1 legacy)
router.post('/intake', chainIntakeController);

// POST /core/chain/sale — record pack SALE transition on Fabric (V1 legacy)
router.post('/sale', chainSaleController);

// POST /core/chain/recall — record batch RECALL transition on Fabric
router.post('/recall', chainRecallController);

// POST /core/chain/set-pack-state — V2.1 nibble state machine advance
// Body: { batchId, packIndex, newState: 'AT_SHOP' | 'SOLD' | 'REVOKED' }
router.post('/set-pack-state', chainSetPackStateController);

// POST /core/chain/mint-batch — V2.1 bulk transition CREATED → MINTED
// Body: { batchId }
router.post('/mint-batch', chainMintBatchController);

// GET /core/chain/pack-state — V2.1 read-only nibble state query
// Query: ?batchId=&packIndex=
router.get('/pack-state', chainGetPackStateController);

// POST /core/chain/scan-pack — V2 compat alias → set-pack-state with SOLD
router.post('/scan-pack', chainScanPackV2Controller);

export default router;
