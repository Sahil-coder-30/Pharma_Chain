import express from 'express';
import { identifyUser } from '../middleware/identifyUser.middleware.js';
import {
    createBatchController,
    listBatchesController,
    getFormulationsController,
    getBatchController,
    getPublicBatchDetailsController,
    getAllRecalledBatchesController,
    mintBatchController,
    recallBatchController,
    exportBatchCsvController,
    listBatchPacksController,
    lookupPackGlobalController,
    previewBatchPacksController,
    retryBlockchainBatchController,
    updateBatchController,
    deleteBatchController,
    verifyBatchPackController,
} from '../controllers/batch.controller.js';

const router = express.Router();

// ── Public Routes (No authentication required) ────────────────────────────────
// Public recall feed across all manufacturers and batches
router.get('/public/recalls/all', getAllRecalledBatchesController);

// Called by consumer-service and shopkeeper-service to fetch medicine details by batchId
// after verifying a pack's QR JWT.
router.get('/public/:batchId', getPublicBatchDetailsController);

// ── Protected Routes (Manufacturer JWT required) ──────────────────────────────
router.use(identifyUser);

// GET /api/manufacturer/batch/pack/lookup/:identifier — Universal Global Search across all batches
router.get('/pack/lookup/:identifier', lookupPackGlobalController);

// POST /api/manufacturer/batch & POST /api/manufacturer/batch/create — create a new batch
router.post('/', createBatchController);
router.post('/create', createBatchController);

// GET /api/manufacturer/batch/formulations — list aggregated medicine formulations for catalog
router.get('/formulations', getFormulationsController);

// GET /api/manufacturer/batch — list all batches for this manufacturer (with pagination & filters)
router.get('/', listBatchesController);

// GET /api/manufacturer/batch/:batchId — get a specific batch and active mint progress
router.get('/:batchId', getBatchController);

// PUT /api/manufacturer/batch/:batchId — update batch metadata / QA specs / storage conditions
router.put('/:batchId', updateBatchController);

// DELETE /api/manufacturer/batch/:batchId — delete draft/pending/failed batch
router.delete('/:batchId', deleteBatchController);

// POST /api/manufacturer/batch/:batchId/pack/verify — cryptographically verify pack & check on-chain status
router.post('/:batchId/pack/verify', verifyBatchPackController);

// GET /api/manufacturer/batch/:batchId/preview — paginated pack preview table for dashboard UI
// Reads the batch CSV (from S3 or local disk), parses it, and returns searchable/paginated JSON.
// Powers the "Batch Preview" page shown after minting completes. Supports ?page, ?limit, ?search.
router.get('/:batchId/preview', previewBatchPacksController);

// GET /api/manufacturer/batch/:batchId/packs — returns S3 download URL info (no Pack docs in MongoDB)
router.get('/:batchId/packs', listBatchPacksController);

// GET /api/manufacturer/batch/:batchId/export/csv — download CSV (302 redirect to S3 pre-signed URL)
router.get('/:batchId/export/csv', exportBatchCsvController);

// POST /api/manufacturer/batch/:batchId/mint — trigger asynchronous minting (HTTP 202)
router.post('/:batchId/mint', mintBatchController);

// POST /api/manufacturer/batch/:batchId/retry-blockchain — retry blockchain commit for already minted batch
router.post('/:batchId/retry-blockchain', retryBlockchainBatchController);

// POST /api/manufacturer/batch/:batchId/recall — initiate batch recall across supply chain
router.post('/:batchId/recall', recallBatchController);

export default router;
