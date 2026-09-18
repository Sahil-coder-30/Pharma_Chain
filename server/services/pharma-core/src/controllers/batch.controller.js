import { mintAndUploadBatch, mintV2BatchAndUpload } from '../services/crypto.service.js';
import { submitTransitionBatchChunked, initBatchScanMap } from '../services/backendClient.service.js';
import { getISTDateString, getISTTimeString, getISTISOString } from '../utils/time.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_QUANTITY = 100_000;
const MIN_QUANTITY = 1;

/**
 * POST /core/batch/mint
 *
 * Supports both V1 (legacy) and V2 Zero-Storage Ephemeral Key Minting.
 */
export const mintBatchController = async (req, res) => {
    try {
        const { batchId, manufacturerId, expiryDate, quantity, medicineName, version } = req.body;

        // ── Input validation ─────────────────────────────────────────────────
        if (!batchId || !manufacturerId || !expiryDate || quantity == null) {
            return res.status(400).json({
                code:    'MISSING_FIELDS',
                message: 'batchId, manufacturerId, expiryDate, and quantity are required',
            });
        }

        const qty = parseInt(quantity, 10);

        if (isNaN(qty) || qty < MIN_QUANTITY) {
            return res.status(400).json({
                code:    'INVALID_QUANTITY',
                message: `quantity must be a positive integer (minimum ${MIN_QUANTITY})`,
            });
        }

        if (qty > MAX_QUANTITY) {
            return res.status(400).json({
                code:    'QUANTITY_EXCEEDED',
                message: `quantity must be ≤ ${MAX_QUANTITY.toLocaleString()}`,
            });
        }

        const isV2 = version === 'v2' || version === 'V2' || req.body.useV2 === true || req.body.isV2 === true;

        console.log(
            `[pharma-core Batch] mintBatch ${isV2 ? '(V2 Ephemeral)' : '(V1 Standard)'} start — batchId: ${batchId}, ` +
            `manufacturerId: ${manufacturerId}, quantity: ${qty}, ` +
            `medicineName: "${medicineName || 'N/A'}"`,
        );

        if (isV2) {
            // ── V2 Ephemeral Keypair Minting Pipeline ─────────────────────────
            const result = await mintV2BatchAndUpload({
                batchId,
                manufacturerId,
                totalPacks: qty,
                medicineName: medicineName || '',
                expiryDate: expiryDate || '',
                initScanMapFn: initBatchScanMap,
            });
            return res.status(200).json(result);
        }

        // ── V1 Standard S3 Minting Pipeline ───────────────────────────────────
        const result = await mintAndUploadBatch(
            batchId,
            manufacturerId,
            expiryDate,
            qty,
            medicineName || '',
            submitTransitionBatchChunked,
        );

        return res.status(200).json(result);

    } catch (error) {
        console.error('[pharma-core Batch] mintBatchController error:', error.message);

        if (error.message.includes('No key found for manufacturer')) {
            return res.status(404).json({
                code:    'KEY_NOT_FOUND',
                message: `No EC signing key found for manufacturer: ${req.body?.manufacturerId}. ` +
                         `Ensure key generation was completed via POST /core/keys/generate.`,
            });
        }

        return res.status(500).json({ code: 'MINT_ERROR', message: error.message });
    }
};

/**
 * POST /core/batch/:batchId/retry-blockchain
 *
 * Reads an existing batch CSV (from S3 or local disk), extracts pack hashes,
 * and submits the MINTED genesis transitions to Hyperledger Fabric in chunks.
 *
 * Used when the initial blockchain submission failed (e.g. gateway down or auth error)
 * so operators can sync without re-signing or invalidating existing QR codes.
 */
export const retryBlockchainSyncController = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { manufacturerId, s3FileKey } = req.body;

        if (!batchId || !manufacturerId) {
            return res.status(400).json({
                code: 'MISSING_FIELDS',
                message: 'batchId and manufacturerId are required',
            });
        }

        console.log(`[pharma-core Batch] Retrying blockchain sync for batch ${batchId}...`);

        const { readCsvContent, parseCsv } = await import('./export.controller.js');
        const csvText = await readCsvContent(batchId, s3FileKey);
        const rows = parseCsv(csvText);

        if (!rows.length) {
            return res.status(404).json({
                code: 'NO_PACKS_FOUND',
                message: `No pack rows found in CSV for batch ${batchId}`,
            });
        }

        const now = new Date();
        const sellingDate = getISTDateString(now);
        const sellingTime = getISTTimeString(now);

        const transitions = rows.map((r) => ({
            packId:      r.packHash,
            eventType:   'MINTED',
            hash:        `${r.packHash}~MINTED`,
            fromId:      'GENESIS',
            toId:        manufacturerId,
            sellingDate,
            sellingTime,
            sellerId:    manufacturerId,
        }));

        const chunkSize = parseInt(process.env.BATCH_CHUNK_SIZE || '250', 10);
        const recordedHashes = await submitTransitionBatchChunked(batchId, transitions, chunkSize);

        console.log(`[pharma-core Batch] ✅ Blockchain retry sync complete for ${batchId}: ${recordedHashes.length}/${transitions.length} recorded`);

        return res.status(200).json({
            status: 'success',
            batchId,
            blockchainStatus: 'COMMITTED',
            blockchainRecorded: recordedHashes.length,
            totalPacks: transitions.length,
            syncedAt: getISTISOString(),
        });
    } catch (error) {
        console.error(`[pharma-core Batch] ❌ retryBlockchainSyncController error:`, error.message);
        return res.status(500).json({
            status: 'error',
            code: 'BLOCKCHAIN_SYNC_ERROR',
            message: error.message,
        });
    }
};
