import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { getISTISOString } from '../utils/time.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_EXPIRY_SECS  = 604_800; // 7 days
const S3_CSV_PREFIX        = 'batches';  // s3://{bucket}/batches/{batchId}.csv

// ── S3 Client (singleton) ─────────────────────────────────────────────────────

let _s3Client = null;

/**
 * Returns a singleton S3Client if AWS credentials & bucket are properly configured.
 * Throws or returns null if credentials are missing.
 * @returns {S3Client|null}
 */
export const getS3Client = () => {
    if (_s3Client) return _s3Client;

    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME } = process.env;

    if (!AWS_ACCESS_KEY_ID || AWS_ACCESS_KEY_ID === 'YOUR_AWS_ACCESS_KEY_ID_HERE' || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET_NAME) {
        return null;
    }

    _s3Client = new S3Client({
        region:      AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId:     AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
    });

    console.log('[pharma-core S3] S3Client initialized — region:', AWS_REGION || 'us-east-1', 'bucket:', S3_BUCKET_NAME);
    return _s3Client;
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns whether pharma-core has AWS S3 storage fully configured.
 * @returns {boolean}
 */
export const isS3Configured = () => getS3Client() !== null;

/**
 * Uploads a CSV string (or Buffer) to AWS S3 using multipart upload.
 * The file is stored at: s3://{S3_BUCKET_NAME}/batches/{batchId}.csv
 *
 * Exclusively uses AWS S3. Throws if S3 is not configured or if upload fails.
 *
 * @param {string} batchId     - PharmaChain system batch ID (used as S3 key)
 * @param {string} csvContent  - Full CSV file content as a string
 * @param {string} medicineName - Used in S3 metadata for human readability
 * @returns {Promise<{ s3FileKey: string, s3Bucket: string }>}
 */
export const uploadCsvToS3 = async (batchId, csvContent, medicineName = '') => {
    const s3Client = getS3Client();
    const bucket   = process.env.S3_BUCKET_NAME;

    if (!s3Client || !bucket) {
        throw new Error('[pharma-core S3] AWS S3 is not configured. Batch artifacts must be stored in AWS S3.');
    }

    const s3FileKey = `${S3_CSV_PREFIX}/${batchId}.csv`;
    const csvStream = Readable.from([csvContent]);

    console.log(`[pharma-core S3] Uploading CSV to s3://${bucket}/${s3FileKey}`);

    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket:      bucket,
            Key:         s3FileKey,
            Body:        csvStream,
            ContentType: 'text/csv',
            Metadata: {
                batchId,
                medicineName,
                uploadedBy:  'pharma-core',
                uploadedAt:  getISTISOString(),
            },
        },
        queueSize:         4,
        partSize:          5 * 1024 * 1024, // 5MB per part
        leavePartsOnError: false,
    });

    await upload.done();

    console.log(`[pharma-core S3] ✅ Upload complete: s3://${bucket}/${s3FileKey}`);
    return { s3FileKey, s3Bucket: bucket };
};

/**
 * Generates a pre-signed GET URL for an existing S3 object.
 * The URL is valid for S3_URL_EXPIRY_SECONDS (default: 7 days / 604800s).
 *
 * @param {string} s3FileKey - e.g. "batches/PC-BATCH-CIPLA0-20260822-7D3A1F.csv"
 * @returns {Promise<{ s3DownloadUrl: string, s3UrlExpiresAt: string }>}
 */
export const generatePresignedUrl = async (s3FileKey) => {
    const s3Client   = getS3Client();
    const bucket     = process.env.S3_BUCKET_NAME;
    const expirySecs = parseInt(process.env.S3_URL_EXPIRY_SECONDS || String(DEFAULT_EXPIRY_SECS), 10);

    if (!s3Client || !bucket) {
        throw new Error('[pharma-core S3] AWS S3 is not configured. Cannot generate pre-signed URL.');
    }

    const command = new GetObjectCommand({
        Bucket: bucket,
        Key:    s3FileKey,
    });

    const s3DownloadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: expirySecs,
    });

    const s3UrlExpiresAt = getISTISOString(new Date(Date.now() + expirySecs * 1000));

    console.log(
        `[pharma-core S3] Pre-signed URL generated for ${s3FileKey}` +
        ` (expires: ${s3UrlExpiresAt})`,
    );

    return { s3DownloadUrl, s3UrlExpiresAt };
};
