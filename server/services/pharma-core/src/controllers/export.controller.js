import { isS3Configured, getS3Client } from '../services/s3.service.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parses a CSV string (with header row) into an array of plain objects.
 * Handles quoted fields containing commas correctly.
 * @param {string} csvText - Full CSV file content.
 * @returns {Array<Object>}
 */
export const parseCsv = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // First line is the header
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

    return lines.slice(1).map((line) => {
        // Regex-based split to handle quoted CSV fields properly
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        values.push(current); // push last field

        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
        return obj;
    });
};

/**
 * Reads raw CSV text for a batch exclusively from AWS S3.
 * Throws an explicit error if S3 is not configured or if object is not found.
 *
 * @param {string} batchId
 * @param {string|null} s3FileKey  - S3 object key (defaults to batches/{batchId}.csv)
 * @returns {Promise<string>}       Raw CSV text
 */
export const readCsvContent = async (batchId, s3FileKey) => {
    if (!isS3Configured()) {
        throw new Error('[pharma-core S3] AWS S3 is not configured. Batches are stored exclusively in AWS S3.');
    }

    const rawKey = s3FileKey;
    const key = (rawKey && !rawKey.startsWith('local:') && rawKey.startsWith('batches/'))
        ? rawKey
        : `batches/${batchId}.csv`;

    const s3 = getS3Client();
    if (!s3) {
        throw new Error('[pharma-core S3] AWS S3 client is unavailable');
    }

    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key:    key,
    });

    try {
        const response = await s3.send(command);
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString('utf-8');
    } catch (s3Err) {
        if (s3Err.name === 'NoSuchKey' || s3Err.$metadata?.httpStatusCode === 404) {
            throw new Error(`CSV artifact not found in AWS S3 for batch: ${batchId}`);
        }
        throw new Error(`AWS S3 fetch failed for key [${key}]: ${s3Err.message}`);
    }
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /core/export/:batchId
 *
 * Streams batch CSV manifest directly from AWS S3.
 * Exclusively reads from AWS S3. Throws explicit error when S3 is unavailable or artifact is missing.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export const exportBatchCsvController = async (req, res) => {
    const { batchId } = req.params;

    if (!batchId || !/^[\w\-]+$/.test(batchId)) {
        return res.status(400).json({ code: 'INVALID_BATCH_ID', message: 'batchId is invalid or malformed' });
    }

    if (!isS3Configured()) {
        return res.status(503).json({
            code: 'S3_NOT_CONFIGURED',
            message: 'AWS S3 storage is not configured. Batches are stored exclusively in AWS S3.',
        });
    }

    const rawKey = req.query.s3FileKey;
    const s3Key = (rawKey && !rawKey.startsWith('local:') && rawKey.startsWith('batches/'))
        ? rawKey
        : `batches/${batchId}.csv`;

    try {
        const s3Client = getS3Client();
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key:    s3Key,
        });

        const s3Response = await s3Client.send(command);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${batchId}.csv"`);
        res.setHeader('X-Export-Mode', 's3');

        return s3Response.Body.pipe(res);
    } catch (s3Err) {
        console.warn(`[pharma-core Export] S3 stream attempt failed for ${batchId} (key: ${s3Key}):`, s3Err.message);
        if (s3Err.name === 'NoSuchKey' || s3Err.$metadata?.httpStatusCode === 404) {
            return res.status(404).json({
                code: 'S3_ARTIFACT_NOT_FOUND',
                message: `CSV artifact for batch ${batchId} was not found in AWS S3 bucket (${process.env.S3_BUCKET_NAME}).`,
            });
        }
        return res.status(502).json({
            code: 'S3_STREAM_FAILED',
            message: `Failed to stream batch CSV from AWS S3: ${s3Err.message}`,
        });
    }
};

// Backward-compatible alias
export const localExportDownloadController = exportBatchCsvController;

/**
 * GET /core/export/:batchId/preview
 *
 * Internal API that reads the batch CSV from AWS S3 and returns
 * paginated, searchable JSON data for the manufacturer dashboard UI preview page.
 *
 * Query Parameters:
 *   - page:   number  (default: 1)
 *   - limit:  number  (default: 50, max: 200)
 *   - search: string  (optional — filters by serialNumber or packHash prefix)
 *
 * Query body (POST body):
 *   - s3FileKey: string (optional — S3 object key)
 */
export const exportPreviewController = async (req, res) => {
    try {
        const { batchId }  = req.params;
        const s3FileKey    = req.query.s3FileKey || req.body?.s3FileKey || null;
        const search       = (req.query.search || '').trim().toLowerCase();
        const page         = Math.max(1, parseInt(req.query.page  || '1',  10));
        const limit        = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));

        if (!batchId || !/^[\w\-]+$/.test(batchId)) {
            return res.status(400).json({
                code:    'INVALID_BATCH_ID',
                message: 'batchId is invalid or contains disallowed characters',
            });
        }

        if (!isS3Configured()) {
            return res.status(503).json({
                code: 'S3_NOT_CONFIGURED',
                message: 'AWS S3 storage is not configured. Batches are stored exclusively in AWS S3.',
            });
        }

        // ── Read & parse CSV strictly from S3 ────────────────────────────────
        let csvText;
        try {
            csvText = await readCsvContent(batchId, s3FileKey);
        } catch (readErr) {
            console.warn(`[pharma-core Export] CSV artifact not found in S3 for ${batchId}: ${readErr.message}`);
            return res.status(404).json({
                code:    'S3_ARTIFACT_NOT_FOUND',
                message: `CSV artifact for batch ${batchId} was not found in AWS S3.`,
                details: readErr.message,
            });
        }

        const allRows      = parseCsv(csvText);
        const csvSizeBytes = Buffer.byteLength(csvText, 'utf-8');

        // ── Apply search filter ───────────────────────────────────────────────
        const filtered = search
            ? allRows.filter(
                (r) =>
                    (r.serialNumber || '').toLowerCase().includes(search) ||
                    (r.packHash     || '').toLowerCase().startsWith(search) ||
                    (r.medicineName || '').toLowerCase().includes(search),
              )
            : allRows;

        // ── Paginate ──────────────────────────────────────────────────────────
        const total    = filtered.length;
        const pages    = Math.ceil(total / limit);
        const offset   = (page - 1) * limit;
        const pageRows = filtered.slice(offset, offset + limit);

        // ── Format rows for UI ────────────────────────────────────────────────
        const packs = pageRows.map((r) => ({
            serialNumber: r.serialNumber || '',
            packHash:     r.packHash     || '',
            signedToken:  r.signedToken  || '',
            verifyUrl:    r.verifyUrl    || '',
            medicineName: r.medicineName || '',
            expiryDate:   r.expiryDate   || '',
            qrPreviewUrl: r.verifyUrl    || '',
        }));

        console.log(
            `[pharma-core Export] Preview: ${batchId} | ` +
            `${allRows.length} total packs | page ${page}/${pages} | search: "${search || 'none'}"`,
        );

        return res.status(200).json({
            status:  'success',
            batchId,
            s3Mode:  'aws',
            stats: {
                totalPacks:    allRows.length,
                filteredPacks: filtered.length,
                csvSizeBytes,
            },
            meta: {
                page,
                limit,
                pages,
                total,
            },
            packs,
        });
    } catch (err) {
        console.error('[pharma-core Export] exportPreviewController error:', err.message);
        return res.status(500).json({ code: 'PREVIEW_ERROR', message: err.message });
    }
};
