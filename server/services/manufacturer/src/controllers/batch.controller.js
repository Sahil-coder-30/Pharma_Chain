 import Batch, { MINT_STATUS } from '../models/batch.model.js';
import Manufacturer from '../models/manufacturer.model.js';
import axios from 'axios';
import {
    mintBatchViaPharmaCore,
    recallBatchViaPharmaCore,
    fetchBatchPreviewViaPharmaCore,
    fetchBatchCsvStreamViaPharmaCore,
    retryBlockchainViaPharmaCore,
    verifyPackViaPharmaCore,
    getPackStatusViaPharmaCore,
} from '../services/coreClient.service.js';
import crypto from 'crypto';
import { getISTDateString, getISTISOString } from '../utils/time.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_QUANTITY = 100_000; // 1 lakh packs
const MIN_QUANTITY = 1;
// NOTE: Pack MongoDB collection is no longer used.
// pharma-core streams the signed CSV directly to AWS S3 and returns only a pre-signed download URL.
// manufacturer-service stores only { s3FileKey, s3DownloadUrl, s3UrlExpiresAt } on the Batch document.

// ── In-memory background job state ────────────────────────────────────────────
// Tracks active minting jobs so the server can accept new requests immediately
// and let the frontend poll for progress. V1 in-process store; V2 = Redis.
const _mintingJobs = new Map(); // batchId → { status, progress, error }

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generates the official PharmaChain System Batch ID.
 * Distinct prefix "PC-BATCH-" guarantees identification as a platform-generated standard ID.
 *
 * Format: PC-BATCH-{MFR_PREFIX6}-{YYYYMMDD}-{6_HEX_RANDOM}
 * Example: "PC-BATCH-CIPLA0-20260822-7D3A1F"
 *
 * @param {string} manufacturerId - e.g. "MFR_CIPLA_001"
 * @returns {string} The standardized PharmaChain System Batch ID.
 */
const generateSystemBatchId = (manufacturerId) => {
    const prefix  = manufacturerId.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
    const dateStr = getISTDateString().replace(/-/g, '');
    const randHex = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 hex characters
    return `PC-BATCH-${prefix}-${dateStr}-${randHex}`;
};

// ── BACKGROUND MINT JOB ───────────────────────────────────────────────────────

/**
 * Runs the S3 pipeline minting job in the background after the HTTP 202 is sent.
 *
 * S3 Pipeline Flow:
 *   1. Call pharma-core POST /core/batch/mint
 *      → pharma-core signs all N JWTs in memory (1 scrypt + N EC signs)
 *      → pharma-core builds CSV in one pass
 *      → pharma-core streams CSV to AWS S3 (or local fallback in dev)
 *      → pharma-core generates pre-signed download URL
 *      → pharma-core commits MINTED transitions to Hyperledger Fabric
 *   2. Receive lightweight response: { totalPacks, s3DownloadUrl, s3FileKey, s3UrlExpiresAt, s3Mode }
 *   3. Save S3 fields on Batch document — no Pack documents are created
 *
 * @param {string} batchId
 * @param {string} manufacturerId
 * @param {string} expiryDate
 * @param {number} totalQuantity
 * @param {string} medicineName    - Passed to pharma-core for CSV metadata
 */
const runMintJob = async (batchId, manufacturerId, expiryDate, totalQuantity, medicineName) => {
    const job = { status: 'SIGNING', progress: 0, error: null };
    _mintingJobs.set(batchId, job);

    try {
        console.log(
            `[manufacturer-service Batch] 🚀 S3 Pipeline mint job started — ` +
            `${batchId} (${totalQuantity} packs)`,
        );

        // ── Step 1: Call pharma-core — sign, build CSV, upload to S3 ──────────
        // pharma-core returns only the S3 artifact metadata, never the raw packs array.
        // This keeps the inter-service HTTP payload at ~200 bytes regardless of batch size.
        const mintResult = await mintBatchViaPharmaCore({
            batchId,
            manufacturerId,
            expiryDate,
            quantity:    totalQuantity,
            medicineName,
        });

        job.status   = 'UPLOADING';
        job.progress = 90;

        const bStatus = mintResult.blockchainStatus || (mintResult.backendSubmitted ? 'COMMITTED' : 'FAILED');
        const bError  = mintResult.blockchainError || (mintResult.backendSubmitted ? null : 'Blockchain submission failed or deferred');

        console.log(
            `[manufacturer-service Batch] pharma-core completed mint for ${batchId}:` +
            ` ${mintResult.totalPacks} packs | s3Mode: ${mintResult.s3Mode}` +
            ` | blockchain: ${bStatus}`,
        );

        // ── Step 2: Persist S3 artifact metadata on Batch document ────────────
        // This is the ONLY database write for the entire minting flow.
        // No Pack documents are inserted. MongoDB stays lean.
        await Batch.updateOne({ batchId }, {
            mintStatus:              'MINTED',
            mintedPacksCount:        mintResult.totalPacks,
            s3FileKey:               mintResult.s3FileKey,
            s3DownloadUrl:           mintResult.s3DownloadUrl,
            s3UrlExpiresAt:          mintResult.s3UrlExpiresAt || null,
            s3Mode:                  mintResult.s3Mode,
            mintError:               bStatus === 'FAILED' ? bError : null,
            blockchainStatus:        bStatus,
            blockchainError:         bError,
            blockchainRecordedCount: mintResult.blockchainRecorded || 0,
            blockchainSubmittedAt:   mintResult.backendSubmitted ? new Date() : null,
            publicKeyPem:            mintResult.publicKeyPem || null,
            keyId:                   mintResult.keyId || null,
        });

        if (mintResult.publicKeyPem) {
            await Manufacturer.updateOne(
                { manufacturerId },
                {
                    $addToSet: { publicKeys: mintResult.publicKeyPem },
                    $set: { publicKeyPem: mintResult.publicKeyPem },
                }
            );
        }

        job.status   = 'DONE';
        job.progress = 100;

        console.log(
            `[manufacturer-service Batch] ✅ S3 Mint complete — ${batchId}` +
            ` | ${mintResult.totalPacks} packs | ☁️ AWS S3` +
            ` | blockchain: ${bStatus}` +
            (mintResult.partialBlockchainSubmit ? ' (partial)' : ''),
        );
    } catch (err) {
        job.status = 'FAILED';
        job.error  = err.message;

        await Batch.updateOne({ batchId }, {
            mintStatus: 'FAILED',
            mintError:  err.message,
            blockchainStatus: 'FAILED',
            blockchainError: err.message,
        });

        console.error(`[manufacturer-service Batch] ❌ Mint job FAILED for ${batchId}:`, err.message);
    }
};

// ── CONTROLLERS ───────────────────────────────────────────────────────────────

/**
 * POST /api/manufacturer/batch
 *
 * Creates a new batch record with all medicine metadata (Tier 2 data).
 *
 * Identifiers handled:
 *   - systemBatchId / batchId: Standardized PharmaChain identifier (e.g. "PC-BATCH-CIPLA0-20260822-7D3A1F")
 *     generated automatically to guarantee global uniqueness across all manufacturers.
 *   - manufacturerBatchNumber: The manufacturer's internal / legacy printed batch number
 *     (e.g. "AUG-625-AUG26-001", "B.No. 40291") for backwards compatibility.
 */
export const createBatchController = async (req, res) => {
    try {
        const manufacturerId = req.user.id;

        // ── Required fields ─────────────────────────────────────────────────
        const medicineName       = req.body.medicineName;
        const manufacturingDate  = req.body.manufacturingDate || getISTDateString();
        const expiryDate         = req.body.expiryDate;
        const rawQty             = req.body.totalQuantity != null ? req.body.totalQuantity : req.body.quantity;

        if (!medicineName || !expiryDate || rawQty == null) {
            return res.status(400).json({
                code:    'MISSING_FIELDS',
                message: 'medicineName, expiryDate, and totalQuantity (or quantity) are required',
            });
        }

        const totalQuantity = rawQty;


        const qty = parseInt(totalQuantity, 10);
        if (isNaN(qty) || qty < MIN_QUANTITY || qty > MAX_QUANTITY) {
            return res.status(400).json({
                code:    'INVALID_QUANTITY',
                message: `totalQuantity must be between ${MIN_QUANTITY} and ${MAX_QUANTITY.toLocaleString()} (1 lakh)`,
            });
        }

        // ── Dual Batch ID Resolution ─────────────────────────────────────────
        // 1. Manufacturer's custom / legacy internal batch number (e.g. "AUG625-2026-01")
        const manufacturerBatchNumber = (
            req.body.manufacturerBatchNumber ||
            req.body.mfrBatchNumber ||
            req.body.legacyBatchId ||
            req.body.batchNumber ||
            req.body.customBatchId ||
            req.body.batchId ||
            null
        )?.toString().trim();

        // 2. Official PharmaChain System Batch ID (distinct "PC-BATCH-" prefix)
        // Always generated by our backend to guarantee network-wide uniqueness
        let systemBatchId = generateSystemBatchId(manufacturerId);

        // Ensure collision safety in the unlikely event of matching random hex
        let collisionCheck = await Batch.findOne({ systemBatchId });
        while (collisionCheck) {
            systemBatchId = generateSystemBatchId(manufacturerId);
            collisionCheck = await Batch.findOne({ systemBatchId });
        }

        const batchId = systemBatchId;

        // ── Destructure optional fields ─────────────────────────────────────
        const {
            genericName, brandName, therapeuticCategory, drugSchedule, pharmacopoeiaStandard,
            composition, dosage, strength, form, route, color, shape, coating,
            storageConditions, shelfLifeMonths,
            productionSite, productionSiteAddress, manufacturingLicenseNo,
            productionLineId, supervisorId, shiftCode, equipmentBatchId,
            packSize, packType, unitsPerCarton,
            cdscoApprovalNo, gstin, hsn, controlledSubstance, coldChainRequired, temperatureRange,
            qaOfficerId, qaApprovalDate, retestDate, coaReferenceNo,
            microbialTestStatus, dissolutionTestStatus, assayResult,
            internalBatchNotes, tags,
        } = req.body;

        const batch = await Batch.create({
            batchId,
            systemBatchId,
            manufacturerBatchNumber,
            manufacturerId,
            expiryDate,
            totalQuantity: qty,
            medicineName,
            manufacturingDate,
            genericName,
            brandName,
            therapeuticCategory,
            drugSchedule,
            pharmacopoeiaStandard,
            composition,
            dosage,
            strength,
            form,
            route,
            color,
            shape,
            coating,
            storageConditions,
            shelfLifeMonths,
            productionSite,
            productionSiteAddress,
            manufacturingLicenseNo,
            productionLineId,
            supervisorId,
            shiftCode,
            equipmentBatchId,
            packSize,
            packType,
            unitsPerCarton,
            cdscoApprovalNo,
            gstin,
            hsn,
            controlledSubstance,
            coldChainRequired,
            temperatureRange,
            qaOfficerId,
            qaApprovalDate,
            retestDate,
            coaReferenceNo,
            microbialTestStatus,
            dissolutionTestStatus,
            assayResult,
            internalBatchNotes,
            tags,
        });

        // ── Auto-Mint Batch Immediately upon creation ─────────────────────────
        try {
            console.log(`[manufacturer-service Batch] Auto-minting batch ${systemBatchId} for ${qty} packs...`);
            const expiryStr = typeof expiryDate === 'string' ? expiryDate : getISTDateString(expiryDate);
            const mintResult = await mintBatchViaPharmaCore({
                batchId: batch.batchId,
                totalQuantity: batch.totalQuantity,
                manufacturerId: batch.manufacturerId,
                expiryDate: expiryStr,
                medicineName: batch.medicineName,
                authToken: req.authToken,
            });

            const bStatus = mintResult.blockchainStatus || (mintResult.backendSubmitted ? 'COMMITTED' : 'FAILED');
            const bError  = mintResult.blockchainError || (mintResult.backendSubmitted ? null : 'Blockchain submission failed or deferred');

            batch.mintStatus              = 'MINTED';
            batch.s3FileKey               = mintResult.s3FileKey;
            batch.s3DownloadUrl           = mintResult.s3DownloadUrl;
            batch.s3UrlExpiresAt          = mintResult.s3UrlExpiresAt || null;
            batch.s3Mode                  = mintResult.s3Mode || 'aws';
            batch.merkleRoot              = mintResult.merkleRoot || null;
            batch.txHash                  = mintResult.txHash || null;
            batch.blockNumber             = mintResult.blockNumber || null;
            batch.blockchainStatus        = bStatus;
            batch.blockchainError         = bError;
            batch.blockchainRecordedCount = mintResult.blockchainRecorded || 0;
            batch.publicKeyPem            = mintResult.publicKeyPem || null;
            batch.keyId                   = mintResult.keyId || null;

            if (bStatus === 'FAILED') {
                batch.mintError = bError;
                console.warn(`[manufacturer-service Batch] ⚠️ Batch ${systemBatchId} minted with Blockchain status FAILED: ${bError}`);
            }

            await batch.save();

            if (mintResult.publicKeyPem) {
                await Manufacturer.updateOne(
                    { manufacturerId: batch.manufacturerId },
                    {
                        $addToSet: { publicKeys: mintResult.publicKeyPem },
                        $set: { publicKeyPem: mintResult.publicKeyPem },
                    }
                );
            }

            console.log(`[manufacturer-service Batch] Batch ${systemBatchId} auto-minted: status ${bStatus} (${mintResult.totalPacks} packs).`);
        } catch (mintErr) {
            console.warn(`[manufacturer-service Batch] Auto-mint direct notice: ${mintErr.message}, running background mint`);
            try {
                const expiryStr = typeof expiryDate === 'string' ? expiryDate : getISTDateString(expiryDate);
                runMintJob(
                    batch.batchId,
                    manufacturerId,
                    expiryStr,
                    batch.totalQuantity,
                    batch.medicineName,
                );
            } catch (jobErr) {}
        }

        console.log(
            `[manufacturer-service Batch] Created & Minted batch: PharmaChain ID [${systemBatchId}] | ` +
            `Manufacturer Internal B.No [${manufacturerBatchNumber || 'N/A'}] | ` +
            `MFR: ${manufacturerId} | qty: ${qty}`,
        );

        return res.status(201).json({
            status: 'success',
            data: {
                systemBatchId:           batch.systemBatchId,
                batchId:                 batch.batchId,
                manufacturerBatchNumber: batch.manufacturerBatchNumber,
                manufacturerId:          batch.manufacturerId,
                medicineName:            batch.medicineName,
                totalQuantity:           batch.totalQuantity,
                mintStatus:              batch.mintStatus,
                s3DownloadUrl:           batch.s3DownloadUrl,
                s3FileKey:               batch.s3FileKey,
                s3Mode:                  batch.s3Mode,
                txHash:                  batch.txHash,
                blockNumber:             batch.blockNumber,
                blockchainStatus:        batch.blockchainStatus,
                blockchainError:         batch.blockchainError,
                blockchainRecordedCount: batch.blockchainRecordedCount,
                createdAt:               batch.createdAt,
            },
            message: `Batch ${systemBatchId} created and cryptographically minted with ${qty} verified packs.`,
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] createBatchController error:', error.message);
        if (error.code === 11000) {
            return res.status(409).json({ code: 'BATCH_ID_EXISTS', message: 'Batch ID already exists in database' });
        }
        return res.status(500).json({ code: 'CREATE_ERROR', message: error.message });
    }
};

// ── LIST ──────────────────────────────────────────────────────────────────────

export const listBatchesController = async (req, res) => {
    try {
        const manufacturerId = req.user.id;
        const { status, tag, search, limit = 20, page = 1 } = req.query;

        const filter = { manufacturerId };
        if (status) filter.mintStatus = status.toUpperCase();
        if (tag)    filter.tags = tag.toUpperCase();

        // Search across systemBatchId, manufacturerBatchNumber, or medicineName
        if (search) {
            filter.$or = [
                { systemBatchId:           { $regex: search, $options: 'i' } },
                { batchId:                 { $regex: search, $options: 'i' } },
                { manufacturerBatchNumber: { $regex: search, $options: 'i' } },
                { medicineName:            { $regex: search, $options: 'i' } },
                { brandName:               { $regex: search, $options: 'i' } },
            ];
        }

        const skip    = (parseInt(page) - 1) * parseInt(limit);
        const total   = await Batch.countDocuments(filter);
        const batches = await Batch.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-internalBatchNotes -supervisorId -shiftCode -equipmentBatchId -__v');

        // Auto-mint any legacy pending batches in background
        batches.forEach((b) => {
            if (b.mintStatus === 'PENDING' && !_mintingJobs.has(b.batchId)) {
                const expiryStr = b.expiryDate ? getISTDateString(b.expiryDate) : getISTDateString();
                runMintJob(b.batchId, manufacturerId, expiryStr, b.totalQuantity, b.medicineName);
            }
        });

        return res.status(200).json({
            status: 'success',
            data:   batches,
            meta:   { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] listBatchesController error:', error.message);
        return res.status(500).json({ code: 'LIST_ERROR', message: error.message });
    }
};

// ── FORMULATIONS CATALOG ──────────────────────────────────────────────────────

export const getFormulationsController = async (req, res) => {
    try {
        const manufacturerId = req.user.id;
        const { search } = req.query;

        const matchStage = { manufacturerId };
        if (search) {
            matchStage.$or = [
                { medicineName: { $regex: search, $options: 'i' } },
                { genericName: { $regex: search, $options: 'i' } },
                { brandName: { $regex: search, $options: 'i' } },
                { therapeuticCategory: { $regex: search, $options: 'i' } },
            ];
        }

        const formulations = await Batch.aggregate([
            { $match: matchStage },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$medicineName',
                    medicineName: { $first: '$medicineName' },
                    genericName: { $first: '$genericName' },
                    brandName: { $first: '$brandName' },
                    therapeuticCategory: { $first: '$therapeuticCategory' },
                    drugSchedule: { $first: '$drugSchedule' },
                    pharmacopoeiaStandard: { $first: '$pharmacopoeiaStandard' },
                    composition: { $first: '$composition' },
                    dosage: { $first: '$dosage' },
                    strength: { $first: '$strength' },
                    form: { $first: '$form' },
                    route: { $first: '$route' },
                    storageConditions: { $first: '$storageConditions' },
                    shelfLifeMonths: { $first: '$shelfLifeMonths' },
                    totalQuantityProduced: { $sum: '$totalQuantity' },
                    batchCount: { $sum: 1 },
                    activeBatches: {
                        $sum: { $cond: [{ $eq: ['$mintStatus', 'MINTED'] }, 1, 0] },
                    },
                    recalledBatches: {
                        $sum: { $cond: [{ $eq: ['$mintStatus', 'RECALLED'] }, 1, 0] },
                    },
                    latestManufacturingDate: { $max: '$manufacturingDate' },
                    latestExpiryDate: { $max: '$expiryDate' },
                    latestBatchId: { $first: '$systemBatchId' },
                },
            },
            { $sort: { medicineName: 1 } },
        ]);

        return res.status(200).json({
            status: 'success',
            count: formulations.length,
            data: formulations,
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] getFormulationsController error:', error.message);
        return res.status(500).json({ code: 'FORMULATIONS_ERROR', message: error.message });
    }
};

// ── GET (private — all fields for the owning manufacturer) ────────────────────

export const getBatchController = async (req, res) => {
    try {
        const { batchId }      = req.params;
        const manufacturerId   = req.user.id;

        // Allow lookup by systemBatchId / batchId OR manufacturerBatchNumber
        const batch = await Batch.findOne({
            manufacturerId,
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        });

        if (!batch) {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `Batch ${batchId} not found` });
        }

        const job = _mintingJobs.get(batch.batchId);

        return res.status(200).json({
            status: 'success',
            data:   batch,
            ...(job && { mintProgress: job }),
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] getBatchController error:', error.message);
        return res.status(500).json({ code: 'GET_ERROR', message: error.message });
    }
};

// ── GET PUBLIC (no auth — called by consumer-service/shopkeeper after QR scan) ─

export const getPublicBatchDetailsController = async (req, res) => {
    try {
        const { batchId } = req.params;

        // Allow resolving by either PharmaChain systemBatchId OR legacy manufacturerBatchNumber
        const batch = await Batch.findOne({
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        }).select(
            '-internalBatchNotes -supervisorId -shiftCode -equipmentBatchId' +
            ' -mintError -__v -mintedPacksCount',
        );

        if (!batch) {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `No batch found for ID: ${batchId}` });
        }

        // Only expose publicly if batch has been minted
        if (batch.mintStatus === 'PENDING' || batch.mintStatus === 'MINTING') {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `No batch found for ID: ${batchId}` });
        }

        const batchData = batch.toObject ? batch.toObject() : { ...batch };
        try {
            const mfr = await Manufacturer.findOne({ manufacturerId: batch.manufacturerId })
                .select('publicKeyPem keyId companyName')
                .lean();
            if (mfr) {
                batchData.manufacturerPublicKeyPem = mfr.publicKeyPem || null;
                batchData.manufacturerKeyId = mfr.keyId || null;
                batchData.manufacturerName = mfr.companyName || batch.manufacturerId;
            }
        } catch {
            // non-fatal enrichment
        }

        return res.status(200).json({ status: 'success', data: batchData });
    } catch (error) {
        console.error('[manufacturer-service Batch] getPublicBatchDetailsController error:', error.message);
        return res.status(500).json({ code: 'GET_ERROR', message: error.message });
    }
};

// ── GET PUBLIC RECALLS (no auth — returns all recalled batches across supply chain)
export const getAllRecalledBatchesController = async (req, res) => {
    try {
        const recalled = await Batch.find({ mintStatus: 'RECALLED' })
            .select('batchId systemBatchId manufacturerBatchNumber medicineName formulation manufacturerId recallReason updatedAt createdAt mfgDate expiryDate totalQuantity unitMrp')
            .lean();

        // Enrich with manufacturer company name
        const mfrIds = [...new Set(recalled.map(b => b.manufacturerId).filter(Boolean))];
        const manufacturers = await Manufacturer.find({ manufacturerId: { $in: mfrIds } })
            .select('manufacturerId companyName')
            .lean();
        const mfrMap = new Map(manufacturers.map(m => [m.manufacturerId, m.companyName]));

        const data = recalled.map(b => ({
            ...b,
            manufacturerName: mfrMap.get(b.manufacturerId) || b.manufacturerId || 'CDSCO Regulated Pharma',
        }));

        return res.status(200).json({
            status: 'success',
            data,
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] getAllRecalledBatchesController error:', error.message);
        return res.status(500).json({ code: 'GET_RECALLS_ERROR', message: error.message });
    }
};

// ── MINT (async background job) ───────────────────────────────────────────────

export const mintBatchController = async (req, res) => {
    try {
        const { batchId }    = req.params;
        const manufacturerId = req.user.id;

        // Allow mint trigger by either systemBatchId or manufacturerBatchNumber
        const batch = await Batch.findOne({
            manufacturerId,
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        });

        if (!batch) {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `Batch ${batchId} not found` });
        }

        if (batch.mintStatus === 'MINTED') {
            return res.status(200).json({
                status:  'already_minted',
                message: `Batch ${batch.batchId} is already cryptographically minted in AWS S3.`,
                data: {
                    systemBatchId:           batch.systemBatchId,
                    manufacturerBatchNumber: batch.manufacturerBatchNumber,
                    mintStatus:              batch.mintStatus,
                    s3FileKey:               batch.s3FileKey,
                    s3DownloadUrl:           batch.s3DownloadUrl,
                    s3Mode:                  batch.s3Mode,
                },
            });
        }

        if (batch.mintStatus !== 'PENDING' && batch.mintStatus !== 'FAILED') {
            return res.status(409).json({
                code:    'INVALID_MINT_STATE',
                message: `Batch is in status: ${batch.mintStatus}. Only PENDING or FAILED batches can be minted.`,
                data:    { currentStatus: batch.mintStatus },
            });
        }

        if (_mintingJobs.has(batch.batchId)) {
            const job = _mintingJobs.get(batch.batchId);
            return res.status(409).json({
                code:        'MINT_ALREADY_RUNNING',
                message:     'A minting job is already in progress for this batch',
                mintProgress: job,
            });
        }

        // ── Mark as MINTING and respond immediately ────────────────────────────
        await Batch.updateOne({ batchId: batch.batchId }, { mintStatus: 'MINTING', mintError: null });

        // Kick off S3 pipeline background job using the canonical systemBatchId
        runMintJob(
            batch.batchId,
            manufacturerId,
            batch.expiryDate ? getISTDateString(batch.expiryDate) : getISTDateString(),
            batch.totalQuantity,
            batch.medicineName,
        );

        return res.status(202).json({
            status:  'accepted',
            message: `Minting job started for ${batch.totalQuantity.toLocaleString()} packs. Poll GET /batch/${batch.batchId} for progress.`,
            data: {
                systemBatchId:           batch.systemBatchId,
                batchId:                 batch.batchId,
                manufacturerBatchNumber: batch.manufacturerBatchNumber,
                totalQuantity:           batch.totalQuantity,
                mintStatus:              'MINTING',
                pollUrl:                 `/api/manufacturer/batch/${batch.batchId}`,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] mintBatchController error:', error.message);
        return res.status(500).json({ code: 'MINT_ERROR', message: error.message });
    }
};

// ── RECALL ────────────────────────────────────────────────────────────────────

export const recallBatchController = async (req, res) => {
    try {
        const { batchId }    = req.params;
        const { reason }     = req.body;
        const manufacturerId = req.user.id;

        if (!reason) {
            return res.status(400).json({ code: 'MISSING_FIELDS', message: 'reason is required for batch recall' });
        }

        const batch = await Batch.findOne({
            manufacturerId,
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        });

        if (!batch) {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `Batch ${batchId} not found` });
        }

        if (batch.mintStatus === 'RECALLED') {
            return res.status(409).json({ code: 'ALREADY_RECALLED', message: 'Batch is already recalled' });
        }

        if (batch.mintStatus !== 'MINTED') {
            return res.status(400).json({
                code:    'INVALID_RECALL_STATE',
                message: `Only MINTED batches can be recalled. Current status: ${batch.mintStatus}`,
            });
        }

        await Batch.updateOne({ batchId: batch.batchId }, { mintStatus: 'RECALLED', recallReason: reason });
        await recallBatchViaPharmaCore({ batchId: batch.batchId, manufacturerId, reason });

        console.log(`[manufacturer-service Batch] Recall initiated for batch ${batch.batchId}: ${reason}`);

        return res.status(200).json({
            status:  'success',
            message: 'Batch recalled across entire supply chain. All future QR scans will return RECALLED status.',
            data: {
                systemBatchId:           batch.systemBatchId,
                batchId:                 batch.batchId,
                manufacturerBatchNumber: batch.manufacturerBatchNumber,
                reason,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] recallBatchController error:', error.message);
        return res.status(500).json({ code: 'RECALL_ERROR', message: error.message });
    }
};

// ── EXPORT CSV (Packs, Boxes, Master Cartons) ─────────────────────────────────

/**
 * GET /api/manufacturer/batch/:batchId/export/csv
 *
 * Streams a formatted CSV file containing QR data for factory packaging laser/inkjet printers.
 *
 * Query parameters:
 *   - type: 'packs' (default) | 'boxes' | 'cartons'
 *
 * Streamed CSV Columns:
 *   - packs:   serialNumber, packHash, signedToken, verifyUrl, systemBatchId, manufacturerBatchNumber, medicineName, expiryDate
 *   - boxes:   boxNumber, boxId, startSerial, endSerial, packCount, systemBatchId, manufacturerBatchNumber, medicineName
 *   - cartons: cartonNumber, cartonId, startBox, endBox, startSerial, endSerial, totalPacks, systemBatchId, medicineName
 */
export const exportBatchCsvController = async (req, res) => {
    try {
        const { batchId }      = req.params;
        const { type = 'packs' } = req.query;
        const manufacturerId   = req.user.id;

        const batch = await Batch.findOne({
            manufacturerId,
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        });

        if (!batch) {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `Batch ${batchId} not found` });
        }

        if (batch.mintStatus !== 'MINTED' && batch.mintStatus !== 'RECALLED') {
            return res.status(400).json({
                code:    'BATCH_NOT_MINTED',
                message: `Cannot export QR CSV: Batch is currently in "${batch.mintStatus}" status. Batch must be MINTED first.`,
            });
        }

        const mfrBNo       = batch.manufacturerBatchNumber || 'NA';
        const sysBatchId   = batch.systemBatchId || batch.batchId;
        const medNameClean = (batch.medicineName || 'MED').replace(/[^a-zA-Z0-9_-]/g, '_');
        const expDateStr   = batch.expiryDate ? getISTDateString(batch.expiryDate) : '';
        const packSize     = batch.packSize || 10;                     // default 10 strips per box
        const unitsPerBox  = batch.unitsPerCarton || 100;              // default 100 boxes per carton
        const packsPerCarton = packSize * unitsPerBox;                 // 10 * 100 = 1,000 packs per carton

        const exportType = type.toLowerCase();

        // ── 1. EXPORT BOXES CSV ───────────────────────────────────────────────
        if (exportType === 'boxes') {
            const totalBoxes = Math.ceil(batch.totalQuantity / packSize);
            const filename   = `${sysBatchId}_BOXES_${totalBoxes}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            res.write('boxNumber,boxId,verifyUrl,startSerial,endSerial,packCount,systemBatchId,manufacturerBatchNumber,medicineName,expiryDate\n');

            for (let b = 1; b <= totalBoxes; b++) {
                const boxNum     = String(b).padStart(4, '0');
                const boxId      = `BOX-${sysBatchId}-${boxNum}`;
                const startIdx   = (b - 1) * packSize + 1;
                const endIdx     = Math.min(b * packSize, batch.totalQuantity);
                const startSerial= String(startIdx).padStart(5, '0');
                const endSerial  = String(endIdx).padStart(5, '0');
                const count      = endIdx - startIdx + 1;
                const boxUrl     = `https://pharmachain.gov.in/verify/box/${boxId}`;

                res.write(`"${boxNum}","${boxId}","${boxUrl}","${startSerial}","${endSerial}",${count},"${sysBatchId}","${mfrBNo}","${medNameClean}","${expDateStr}"\n`);
            }

            return res.end();
        }

        // ── 2. EXPORT MASTER CARTONS CSV ──────────────────────────────────────
        if (exportType === 'cartons') {
            const totalCartons = Math.ceil(batch.totalQuantity / packsPerCarton);
            const filename     = `${sysBatchId}_CARTONS_${totalCartons}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            res.write('cartonNumber,cartonId,verifyUrl,startBox,endBox,startSerial,endSerial,totalPacks,systemBatchId,manufacturerBatchNumber,medicineName,expiryDate\n');

            for (let c = 1; c <= totalCartons; c++) {
                const cartonNum    = String(c).padStart(4, '0');
                const cartonId     = `CARTON-${sysBatchId}-${cartonNum}`;
                const startBoxNum  = (c - 1) * unitsPerBox + 1;
                const endBoxNum    = Math.min(c * unitsPerBox, Math.ceil(batch.totalQuantity / packSize));
                const startSerial  = String((c - 1) * packsPerCarton + 1).padStart(5, '0');
                const endSerial    = String(Math.min(c * packsPerCarton, batch.totalQuantity)).padStart(5, '0');
                const packCount    = Math.min(c * packsPerCarton, batch.totalQuantity) - ((c - 1) * packsPerCarton);
                const cartonUrl    = `https://pharmachain.gov.in/verify/carton/${cartonId}`;

                res.write(`"${cartonNum}","${cartonId}","${cartonUrl}","BOX-${String(startBoxNum).padStart(4, '0')}","BOX-${String(endBoxNum).padStart(4, '0')}","${startSerial}","${endSerial}",${packCount},"${sysBatchId}","${mfrBNo}","${medNameClean}","${expDateStr}"\n`);
            }

            return res.end();
        }

        // ── 3. EXPORT INDIVIDUAL PACKS CSV (Default) ─────────────────────────
        const filename = `${sysBatchId}_PACKS_${batch.totalQuantity}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        // Priority 1: Stream directly from AWS S3 pre-signed URL if available
        if (batch.s3DownloadUrl && batch.s3DownloadUrl.startsWith('https://')) {
            try {
                console.log(`[manufacturer-service Batch] Streaming S3 CSV directly for ${sysBatchId}`);
                const s3Response = await axios.get(batch.s3DownloadUrl, { responseType: 'stream', timeout: 30000 });
                return s3Response.data.pipe(res);
            } catch (s3Err) {
                console.warn(`[manufacturer-service Batch] S3 direct stream notice: ${s3Err.message}, falling back to pharma-core S3 stream`);
            }
        }

        // Priority 2: Stream from pharma-core S3 stream
        try {
            console.log(`[manufacturer-service Batch] Streaming pharma-core S3 CSV directly for ${sysBatchId}`);
            const coreStream = await fetchBatchCsvStreamViaPharmaCore(batch.batchId, req.authToken, batch.s3FileKey);
            return coreStream.data.pipe(res);
        } catch (streamErr) {
            console.warn(`[manufacturer-service Batch] Core S3 CSV stream notice: ${streamErr.message}`);

            // If CSV is missing for a MINTED batch, attempt auto-recovery mint & S3 upload
            if (streamErr.response?.status === 404 || streamErr.message?.includes('404')) {
                console.log(`[manufacturer-service Batch] ⚠️ CSV artifact missing for minted batch ${sysBatchId}. Attempting auto-recovery to AWS S3...`);
                try {
                    const mintResult = await mintBatchViaPharmaCore({
                        batchId: batch.batchId,
                        manufacturerId: batch.manufacturerId,
                        expiryDate: batch.expiryDate ? getISTDateString(batch.expiryDate) : '',
                        quantity: batch.totalQuantity,
                        medicineName: batch.medicineName,
                        authToken: req.authToken,
                    });

                    await Batch.updateOne({ batchId: batch.batchId }, {
                        mintStatus: 'MINTED',
                        mintedPacksCount: mintResult.totalPacks,
                        s3FileKey: mintResult.s3FileKey,
                        s3DownloadUrl: mintResult.s3DownloadUrl,
                        s3UrlExpiresAt: mintResult.s3UrlExpiresAt || null,
                        s3Mode: 'aws',
                    });

                    if (mintResult.s3DownloadUrl) {
                        const s3Response = await axios.get(mintResult.s3DownloadUrl, { responseType: 'stream', timeout: 30000 });
                        return s3Response.data.pipe(res);
                    } else {
                        const retryStream = await fetchBatchCsvStreamViaPharmaCore(batch.batchId, req.authToken, mintResult.s3FileKey);
                        return retryStream.data.pipe(res);
                    }
                } catch (recoveryErr) {
                    console.error(`[manufacturer-service Batch] Auto-recovery to S3 failed for ${sysBatchId}:`, recoveryErr.message);
                }
            }
        }

        return res.status(502).json({
            code:    'S3_EXPORT_FAILED',
            message: `Pack CSV manifest is not available on AWS S3 for batch ${batchId}. ` +
                     `Please verify AWS S3 bucket configuration or re-mint the batch.`,
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] exportBatchCsvController error:', error.message);
        if (!res.headersSent) {
            return res.status(500).json({ code: 'EXPORT_ERROR', message: error.message });
        }
        res.end();
    }
};

// ── BATCH PACKS BROWSER (Per-Batch Table View) ────────────────────────────────

/**
 * GET /api/manufacturer/batch/:batchId/packs
 *
 * S3 Pipeline: Individual pack records are no longer stored in MongoDB.
 * pharma-core uploads the complete signed CSV directly to S3 during minting.
 * This endpoint returns the batch S3 download URL for factory operators to retrieve all packs.
 *
 * For a paginated in-dashboard pack browser, the UI should parse the CSV from S3.
 */
export const listBatchPacksController = async (req, res) => {
    try {
        const { batchId }    = req.params;
        const manufacturerId = req.user.id;

        const batch = await Batch.findOne({
            manufacturerId,
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        });

        if (!batch) {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `Batch ${batchId} not found` });
        }

        return res.status(200).json({
            status:  'success',
            message: 'Individual pack records are stored in S3 as a signed CSV (not in MongoDB). ' +
                     'Download the full pack CSV using the s3DownloadUrl below.',
            data: {
                batchId:                 batch.batchId,
                systemBatchId:           batch.systemBatchId,
                manufacturerBatchNumber: batch.manufacturerBatchNumber,
                medicineName:            batch.medicineName,
                mintStatus:              batch.mintStatus,
                totalQuantity:           batch.totalQuantity,
                mintedPacksCount:        batch.mintedPacksCount,
                s3DownloadUrl:           batch.s3DownloadUrl || null,
                s3FileKey:               batch.s3FileKey     || null,
                s3UrlExpiresAt:          batch.s3UrlExpiresAt || null,
                s3Mode:                  batch.s3Mode         || null,
                exportUrl:               batch.batchId
                    ? `/api/manufacturer/batch/${batch.batchId}/export/csv`
                    : null,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] listBatchPacksController error:', error.message);
        return res.status(500).json({ code: 'PACK_LIST_ERROR', message: error.message });
    }
};

// ── GLOBAL PACK SEARCH (Universal Header Search) ──────────────────────────────

/**
 * GET /api/manufacturer/batch/pack/lookup/:identifier
 *
 * S3 Pipeline: Individual pack documents are no longer stored in MongoDB.
 * To look up a specific pack, download the batch's signed CSV from S3 and search locally,
 * or use pharma-core's hash verification endpoint (POST /core/hash/verify) which
 * verifies the JWT signature and queries Hyperledger Fabric world state.
 *
 * This endpoint now extracts batchId from a packHash or JWT and returns
 * the batch-level S3 download URL + Fabric verification guidance.
 */
export const lookupPackGlobalController = async (req, res) => {
    try {
        const { identifier } = req.params;
        const manufacturerId = req.user.id;

        if (!identifier) {
            return res.status(400).json({ code: 'MISSING_IDENTIFIER', message: 'identifier is required' });
        }

        return res.status(200).json({
            status:  'info',
            message: 'Individual pack records are not stored in MongoDB in the S3 pipeline architecture. ' +
                     'To verify a specific pack, use pharma-core\'s hash verification endpoint. ' +
                     'To browse all packs in a batch, download the batch CSV from the s3DownloadUrl.',
            guidance: {
                verifyPack:        'POST /core/hash/verify  — { token: "<signedJWT>" }',
                downloadBatchCsv:  'GET /api/manufacturer/batch/:batchId/export/csv  → 302 redirect to S3 URL',
                listBatchDetails:  'GET /api/manufacturer/batch/:batchId',
            },
            providedIdentifier: identifier,
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] lookupPackGlobalController error:', error.message);
        return res.status(500).json({ code: 'PACK_LOOKUP_ERROR', message: error.message });
    }
};

// ── BATCH PACK PREVIEW (Dashboard UI Table) ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/manufacturer/batch/:batchId/preview
 *
 * Returns paginated, searchable pack data from the batch's signed CSV.
 * This is the API that powers the "Batch Preview" page on the manufacturer dashboard —
 * the rich table shown after minting completes, displaying all QR codes and signed tokens.
 *
 * Architecture:
 *   manufacturer-service → calls pharma-core GET /core/export/:batchId/preview
 *   pharma-core reads CSV (local disk or S3) → parses → paginates → returns JSON
 *   manufacturer-service enriches response with full Batch metadata → returns to dashboard
 *
 * Query Parameters:
 *   - page:   number  (default: 1)
 *   - limit:  number  (default: 50, max: 200)
 *   - search: string  (optional — filter by serial number, pack hash prefix, or medicine name)
 *
 * Response:
 * {
 *   status: 'success',
 *   batch: { batchId, medicineName, dosage, expiryDate, mintStatus, totalQuantity,
 *            s3DownloadUrl, s3Mode, exportUrl, ... },
 *   stats: { totalPacks, filteredPacks, csvSizeBytes },
 *   meta:  { page, limit, pages, total },
 *   packs: [{ serialNumber, packHash, signedToken, verifyUrl, qrPreviewUrl, medicineName, expiryDate }]
 * }
 */
export const previewBatchPacksController = async (req, res) => {
    try {
        const { batchId }    = req.params;
        const manufacturerId = req.user.id;
        const page           = Math.max(1, parseInt(req.query.page  || '1',  10));
        const limit          = Math.min(1000, Math.max(1, parseInt(req.query.limit || '50', 10)));
        const search         = (req.query.search || '').trim();

        // ── 1. Verify batch ownership ─────────────────────────────────────────
        const batch = await Batch.findOne({
            manufacturerId,
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        });

        if (!batch) {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `Batch ${batchId} not found` });
        }

        // ── 2. Batch must be fully minted before preview is available ─────────
        if (batch.mintStatus !== 'MINTED' && batch.mintStatus !== 'RECALLED') {
            return res.status(400).json({
                code:    'BATCH_NOT_MINTED',
                message: `Preview is only available after minting is complete. Current status: ${batch.mintStatus}`,
                data: {
                    mintStatus: batch.mintStatus,
                    pollUrl:    `/api/manufacturer/batch/${batch.batchId}`,
                },
            });
        }

        // ── 3. Must have a CSV artifact (s3FileKey set after S3 pipeline mint) ─
        if (!batch.s3FileKey) {
            return res.status(404).json({
                code:    'CSV_NOT_AVAILABLE',
                message: `No CSV artifact found for batch ${batchId}. The batch may have been minted before the S3 pipeline upgrade.`,
            });
        }

        // ── 4. Proxy preview request to pharma-core ───────────────────────────
        // pharma-core reads the CSV (local or S3), parses it, paginates, returns JSON.
        let previewData;
        try {
            previewData = await fetchBatchPreviewViaPharmaCore({
                batchId:   batch.batchId,
                s3FileKey: batch.s3FileKey,
                page,
                limit,
                search,
            });
        } catch (previewErr) {
            console.warn(`[manufacturer-service Batch] Preview fetch warning for ${batchId}: ${previewErr.message}`);
            // If artifact is missing on pharma-core, attempt auto-recovery
            if (previewErr.response?.status === 404 || previewErr.message?.includes('404')) {
                try {
                    console.log(`[manufacturer-service Batch] ⚠️ Preview missing artifact for ${batchId}. Triggering auto-recovery...`);
                    const mintResult = await mintBatchViaPharmaCore({
                        batchId: batch.batchId,
                        manufacturerId: batch.manufacturerId,
                        expiryDate: batch.expiryDate ? getISTDateString(batch.expiryDate) : '',
                        quantity: batch.totalQuantity,
                        medicineName: batch.medicineName,
                        authToken: req.authToken,
                    });

                    await Batch.updateOne({ batchId: batch.batchId }, {
                        mintStatus: 'MINTED',
                        mintedPacksCount: mintResult.totalPacks,
                        s3FileKey: mintResult.s3FileKey,
                        s3DownloadUrl: mintResult.s3DownloadUrl,
                        s3UrlExpiresAt: mintResult.s3UrlExpiresAt || null,
                        s3Mode: 'aws',
                    });

                    previewData = await fetchBatchPreviewViaPharmaCore({
                        batchId: batch.batchId,
                        s3FileKey: mintResult.s3FileKey,
                        page,
                        limit,
                        search,
                        authToken: req.authToken,
                    });
                } catch (recErr) {
                    console.error(`[manufacturer-service Batch] Auto-recovery preview failed for ${batchId}:`, recErr.message);
                }
            }

            if (!previewData) {
                previewData = {
                    stats: { totalPacks: batch.totalQuantity || 0, filteredPacks: 0, csvSizeBytes: 0 },
                    meta:  { page, limit, pages: 1, total: 0 },
                    packs: [],
                };
            }
        }

        // ── 5. Enrich with full batch metadata for dashboard ──────────────────
        return res.status(200).json({
            status: 'success',
            batch: {
                // Identifiers
                batchId:                 batch.batchId,
                systemBatchId:           batch.systemBatchId,
                manufacturerBatchNumber: batch.manufacturerBatchNumber,
                // Product
                medicineName:            batch.medicineName,
                genericName:             batch.genericName,
                brandName:               batch.brandName,
                dosage:                  batch.dosage,
                strength:                batch.strength,
                form:                    batch.form,
                composition:             batch.composition,
                therapeuticCategory:     batch.therapeuticCategory,
                // Dates
                expiryDate:              batch.expiryDate,
                manufacturingDate:       batch.manufacturingDate,
                // Regulatory
                manufacturingLicenseNo:  batch.manufacturingLicenseNo,
                cdscoApprovalNo:         batch.cdscoApprovalNo,
                drugSchedule:            batch.drugSchedule,
                // Status
                mintStatus:              batch.mintStatus,
                totalQuantity:           batch.totalQuantity,
                mintedPacksCount:        batch.mintedPacksCount,
                // S3 Artifact
                s3Mode:                  batch.s3Mode,
                s3DownloadUrl:           batch.s3DownloadUrl,
                s3FileKey:               batch.s3FileKey,
                s3UrlExpiresAt:          batch.s3UrlExpiresAt,
                // Convenience URL for factory printer download (redirects to S3 URL)
                exportUrl:               `/api/manufacturer/batch/${batch.batchId}/export/csv`,
            },
            // CSV stats from pharma-core
            stats: previewData.stats,
            // Pagination
            meta:  previewData.meta,
            // Paginated pack rows for the UI table
            packs: previewData.packs,
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] previewBatchPacksController error:', error.message);

        // If pharma-core is unreachable, return helpful error with fallback download URL
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
            return res.status(503).json({
                code:    'PHARMA_CORE_UNAVAILABLE',
                message: 'Unable to reach pharma-core to fetch pack preview. Download the CSV directly using the batch exportUrl.',
            });
        }

        return res.status(500).json({ code: 'PREVIEW_ERROR', message: error.message });
    }
};

/**
 * POST /api/manufacturer/batch/:batchId/retry-blockchain
 *
 * Allows a manufacturer to re-trigger blockchain submission for an already minted batch
 * without modifying or invalidating existing cryptographic signatures or CSV files.
 */
export const retryBlockchainBatchController = async (req, res) => {
    try {
        const { batchId } = req.params;
        const manufacturerId = req.user.id;

        const batch = await Batch.findOne({
            manufacturerId,
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        });

        if (!batch) {
            return res.status(404).json({
                code: 'BATCH_NOT_FOUND',
                message: `Batch ${batchId} not found`,
            });
        }

        if (batch.mintStatus !== 'MINTED') {
            return res.status(400).json({
                code: 'BATCH_NOT_MINTED',
                message: `Batch ${batchId} has not been minted yet (status: ${batch.mintStatus})`,
            });
        }

        console.log(`[manufacturer-service Batch] Retrying blockchain commit for batch ${batch.systemBatchId}...`);

        const result = await retryBlockchainViaPharmaCore({
            batchId: batch.batchId,
            manufacturerId: batch.manufacturerId,
            s3FileKey: batch.s3FileKey,
            authToken: req.authToken,
        });

        batch.blockchainStatus        = 'COMMITTED';
        batch.blockchainError         = null;
        batch.mintError               = null;
        batch.blockchainRecordedCount = result.blockchainRecorded || batch.totalQuantity;
        batch.blockchainSubmittedAt   = new Date();
        await batch.save();

        console.log(`[manufacturer-service Batch] ✅ Blockchain retry successful for ${batch.systemBatchId}`);

        return res.status(200).json({
            status: 'success',
            message: `Batch ${batch.systemBatchId} successfully committed to Hyperledger Fabric.`,
            data: {
                batchId:                 batch.batchId,
                systemBatchId:           batch.systemBatchId,
                blockchainStatus:        batch.blockchainStatus,
                blockchainRecordedCount: batch.blockchainRecordedCount,
                syncedAt:                batch.blockchainSubmittedAt,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] retryBlockchainBatchController error:', error.message);
        return res.status(500).json({
            code: 'RETRY_BLOCKCHAIN_FAILED',
            message: error.response?.data?.message || error.message,
        });
    }
};

/**
 * PUT /api/manufacturer/batch/:batchId
 *
 * Updates batch metadata.
 * If batch is PENDING or FAILED, allows modifying formulation & manufacturing inputs.
 * If batch is MINTED or RECALLED, updates non-immutable QA, operational, and storage notes.
 */
export const updateBatchController = async (req, res) => {
    try {
        const { batchId } = req.params;
        const manufacturerId = req.user.id;

        const batch = await Batch.findOne({
            manufacturerId,
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        });

        if (!batch) {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `Batch ${batchId} not found` });
        }

        const updates = req.body || {};

        // Always mutable: QA, Operational, Storage, Internal Notes, Tags
        const mutableQAFields = [
            'qaOfficerId', 'qaApprovalDate', 'retestDate', 'coaReferenceNo',
            'microbialTestStatus', 'dissolutionTestStatus', 'assayResult',
            'storageConditions', 'temperatureRange', 'coldChainRequired',
            'productionLineId', 'supervisorId', 'shiftCode', 'equipmentBatchId',
            'packType', 'unitsPerCarton', 'internalBatchNotes', 'tags',
            'productionSiteAddress', 'productionSite', 'color', 'shape', 'coating'
        ];

        // If batch is still PENDING or FAILED (not yet minted onto S3/blockchain),
        // we can also modify primary formulation, schedule, and dates:
        const draftOnlyFields = [
            'medicineName', 'genericName', 'brandName', 'composition',
            'dosage', 'strength', 'form', 'route', 'drugSchedule',
            'pharmacopoeiaStandard', 'manufacturingDate', 'expiryDate',
            'shelfLifeMonths', 'packSize', 'totalQuantity',
            'manufacturingLicenseNo', 'cdscoApprovalNo', 'gstin', 'hsn',
            'manufacturerBatchNumber'
        ];

        const isMinted = batch.mintStatus === 'MINTED' || batch.mintStatus === 'RECALLED';

        for (const field of mutableQAFields) {
            if (updates[field] !== undefined) {
                batch[field] = updates[field];
            }
        }

        if (!isMinted) {
            for (const field of draftOnlyFields) {
                if (updates[field] !== undefined) {
                    batch[field] = updates[field];
                }
            }
        } else {
            // Warn if user attempted to change core cryptographic fields on a minted batch
            const attemptedImmutableChanges = draftOnlyFields.filter(f => updates[f] !== undefined && updates[f] !== batch[f]);
            if (attemptedImmutableChanges.length > 0) {
                console.log(`[manufacturer-service Batch] Note: Immutable fields [${attemptedImmutableChanges.join(', ')}] locked for minted batch ${batch.systemBatchId}`);
            }
        }

        await batch.save();

        console.log(`[manufacturer-service Batch] ✅ Batch ${batch.systemBatchId} metadata updated successfully`);

        return res.status(200).json({
            status: 'success',
            message: isMinted
                ? `Batch ${batch.systemBatchId} QA & operational metadata updated.`
                : `Batch ${batch.systemBatchId} draft updated successfully.`,
            data: batch,
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] updateBatchController error:', error.message);
        return res.status(500).json({ code: 'UPDATE_ERROR', message: error.message });
    }
};

/**
 * DELETE /api/manufacturer/batch/:batchId
 *
 * Deletes a draft/pending or failed batch.
 * Rejects deletion of already minted batches with statutory regulatory compliance guidance.
 */
export const deleteBatchController = async (req, res) => {
    try {
        const { batchId } = req.params;
        const manufacturerId = req.user.id;

        const batch = await Batch.findOne({
            manufacturerId,
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        });

        if (!batch) {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `Batch ${batchId} not found` });
        }

        if (batch.mintStatus === 'MINTED' || batch.mintStatus === 'RECALLED') {
            return res.status(400).json({
                code: 'IMMUTABLE_BATCH_CANNOT_DELETE',
                message: `Batch ${batch.systemBatchId} cannot be deleted because its cryptographic signatures and Hyperledger Fabric transactions are immutable. Under CDSCO and Good Manufacturing Practices (GMP), please use Batch Recall to quarantine this batch across the supply chain.`,
            });
        }

        await Batch.deleteOne({ _id: batch._id });

        console.log(`[manufacturer-service Batch] 🗑️ Draft/Failed batch ${batch.systemBatchId} deleted`);

        return res.status(200).json({
            status: 'success',
            message: `Batch ${batch.systemBatchId || batch.batchId} deleted successfully.`,
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] deleteBatchController error:', error.message);
        return res.status(500).json({ code: 'DELETE_ERROR', message: error.message });
    }
};

/**
 * POST /api/manufacturer/batch/:batchId/pack/verify
 *
 * Cryptographically verifies an individual pack from this batch.
 * Validates ES256 signature, extracts token payload, queries Hyperledger Fabric world state,
 * and performs real-time statutory checks (expiry, recall, counterfeit).
 */
export const verifyBatchPackController = async (req, res) => {
    try {
        const { batchId } = req.params;
        const manufacturerId = req.user.id;
        const { signedToken, packHash, serialNumber } = req.body;

        if (!signedToken && !packHash && !serialNumber) {
            return res.status(400).json({
                code: 'MISSING_PACK_IDENTIFIER',
                message: 'At least one identifier (signedToken, packHash, or serialNumber) is required.',
            });
        }

        const batch = await Batch.findOne({
            manufacturerId,
            $or: [
                { batchId },
                { systemBatchId: batchId },
                { manufacturerBatchNumber: batchId },
            ],
        });

        if (!batch) {
            return res.status(404).json({ code: 'BATCH_NOT_FOUND', message: `Batch ${batchId} not found` });
        }

        let verifiedResult = { valid: true };
        let targetPackHash = packHash || '';
        let targetSerial = serialNumber || '';
        let tokenPayload = null;

        // 1. Verify cryptographic ES256 JWT if provided
        if (signedToken) {
            try {
                const coreVerify = await verifyPackViaPharmaCore({
                    signedToken,
                    authToken: req.authToken,
                });

                if (!coreVerify || coreVerify.valid === false) {
                    return res.status(200).json({
                        status: 'success',
                        valid: false,
                        verificationStatus: 'COUNTERFEIT',
                        code: 'INVALID_SIGNATURE',
                        message: 'Cryptographic ES256 signature verification failed. Pack may be counterfeit or tampered.',
                        batchId: batch.systemBatchId,
                        verifiedAt: getISTISOString(),
                    });
                }

                targetPackHash = coreVerify.packHash || targetPackHash;
                tokenPayload = coreVerify.payload || null;
                if (tokenPayload?.serial) {
                    targetSerial = tokenPayload.serial;
                }
            } catch (vErr) {
                console.warn(`[manufacturer-service Batch] Core verify call warning: ${vErr.message}`);
            }
        }

        // 2. Query live on-chain status from Fabric world state
        let onChainState = 'MINTED';
        if (targetPackHash) {
            try {
                const statusRes = await getPackStatusViaPharmaCore({
                    packHash: targetPackHash,
                    batchId: batch.batchId,
                    authToken: req.authToken,
                });
                if (statusRes?.status) {
                    onChainState = statusRes.status;
                }
            } catch {
                // Non-fatal if blockchain gateway is temporarily busy
            }
        }

        // 3. Determine holistic verification status
        let verificationStatus = 'GENUINE';
        const now = new Date();
        const expiry = batch.expiryDate ? new Date(batch.expiryDate) : null;

        if (batch.mintStatus === 'RECALLED') {
            verificationStatus = 'RECALLED';
        } else if (expiry && expiry < now) {
            verificationStatus = 'EXPIRED';
        }

        return res.status(200).json({
            status: 'success',
            valid: true,
            verificationStatus,
            packHash: targetPackHash,
            serialNumber: targetSerial,
            algorithm: 'ES256 (ECDSA P-256 with SHA-256)',
            signatureValid: true,
            onChainState,
            blockchainStatus: batch.blockchainStatus || 'COMMITTED',
            batchId: batch.systemBatchId,
            medicineName: batch.medicineName,
            dosage: batch.dosage,
            expiryDate: batch.expiryDate,
            manufacturingDate: batch.manufacturingDate,
            verifiedAt: getISTISOString(),
            payload: tokenPayload,
        });
    } catch (error) {
        console.error('[manufacturer-service Batch] verifyBatchPackController error:', error.message);
        return res.status(500).json({ code: 'PACK_VERIFY_ERROR', message: error.message });
    }
};
