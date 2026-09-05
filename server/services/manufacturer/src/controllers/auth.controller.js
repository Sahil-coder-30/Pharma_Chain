import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import mongoose from 'mongoose';
import Manufacturer from '../models/manufacturer.model.js';
import {
    setCachedManufacturerStatus,
    invalidateManufacturerStatus,
} from '../services/redis.service.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS   = 12;
const JWT_SECRET      = process.env.JWT_SECRET;
const JWT_EXPIRES_IN  = process.env.JWT_EXPIRES_IN || '7d';
const PHARMA_CORE_URL = process.env.PHARMA_CORE_URL || 'http://pharma-core-service:80';
const SERVICE_TOKEN   = process.env.SERVICE_TOKEN   || 'pharma-cluster-internal-secret-token-change-in-prod';

// ── Helpers ───────────────────────────────────────────────────────────────────
const generateManufacturerId = (licenseNumber) =>
    `MFR_${licenseNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

// ── Controllers ───────────────────────────────────────────────────────────────

// POST /api/manufacturer/auth/register
export const registerController = async (req, res) => {
    try {
        const {
            companyName,
            licenseNumber,
            email,
            password,
            companyCode,
            cinNumber,
            gstin,
            companyType,
            headquarters,
            website,
            cdscoRegistration,
            issuingAuthority,
            licenseIssueDate,
            licenseExpiryDate,
            gmpStandard,
            primaryPlantName,
            primaryPlantFacilityId,
            primaryPlantAddress,
            plantAddress,
            city,
            state,
            pincode,
            authorizedPersonName,
            authorizedPersonRole,
            phone,
            idProofType,
            idProofNumber,
            kycDocs,
            keyAlgorithm,
        } = req.body;

        console.log(`[manufacturer-service Auth] registerController received registration for company: "${companyName}", license: "${licenseNumber}", email: "${email}"`);

        if (!companyName || !licenseNumber || !email || !password) {
            return res.status(400).json({
                status:  'error',
                message: 'companyName, licenseNumber, email, and password are required',
            });
        }
        if (password.length < 8) {
            return res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters' });
        }

        const existing = await Manufacturer.findOne({ email: email.toLowerCase() });
        if (existing) {
            console.warn(`[manufacturer-service Auth] Registration rejected: Email ${email} already exists`);
            return res.status(409).json({ status: 'error', message: 'Email already registered' });
        }

        const existingLicense = await Manufacturer.findOne({ licenseNumber });
        if (existingLicense) {
            console.warn(`[manufacturer-service Auth] Registration rejected: License number ${licenseNumber} already exists`);
            return res.status(409).json({ status: 'error', message: 'License number already registered' });
        }

        const passwordHash   = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const manufacturerId = req.body.manufacturerId || generateManufacturerId(licenseNumber);

        const manufacturer = await Manufacturer.create({
            manufacturerId,
            companyName,
            companyCode: companyCode || null,
            cinNumber: cinNumber || null,
            gstin: gstin || null,
            companyType: companyType || 'Formulation',
            headquarters: headquarters || null,
            website: website || null,

            licenseNumber,
            cdscoRegistration: cdscoRegistration || null,
            issuingAuthority: issuingAuthority || 'Central Drugs Standard Control Organisation (CDSCO)',
            licenseIssueDate: licenseIssueDate || null,
            licenseExpiryDate: licenseExpiryDate || null,
            gmpStandard: gmpStandard || 'WHO-GMP',

            primaryPlantName: primaryPlantName || null,
            primaryPlantFacilityId: primaryPlantFacilityId || null,
            primaryPlantAddress: primaryPlantAddress || plantAddress || null,
            plantAddress: plantAddress || primaryPlantAddress || null,
            city: city || null,
            state: state || null,
            pincode: pincode || null,

            authorizedPersonName: authorizedPersonName || null,
            authorizedPersonRole: authorizedPersonRole || null,
            phone: phone || null,
            idProofType: idProofType || null,
            idProofNumber: idProofNumber || null,

            kycDocs: Array.isArray(kycDocs) ? kycDocs : [],
            keyAlgorithm: keyAlgorithm || 'ES256 (ECDSA P-256)',

            email: email.toLowerCase(),
            passwordHash,
        });

        console.log(`[manufacturer-service Auth] Registered successfully: ${manufacturerId} (${companyName}) at ${manufacturer.createdAt}`);

        return res.status(201).json({
            status:  'success',
            message: 'Registration successful. KYC review is pending.',
            data: {
                id:          manufacturer.manufacturerId,
                manufacturerId: manufacturer.manufacturerId,
                companyName: manufacturer.companyName,
                email:       manufacturer.email,
                kycStatus:   manufacturer.kycStatus,
                createdAt:   manufacturer.createdAt,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] registerController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// POST /api/manufacturer/auth/login
export const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[manufacturer-service Auth] loginController attempt for email: ${email}`);

        if (!email || !password) {
            return res.status(400).json({ status: 'error', message: 'email and password are required' });
        }

        const manufacturer = await Manufacturer.findOne({ email: email.toLowerCase() });
        if (!manufacturer) {
            console.warn(`[manufacturer-service Auth] Login failed: User not found for ${email}`);
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, manufacturer.passwordHash);
        if (!isValid) {
            console.warn(`[manufacturer-service Auth] Login failed: Password mismatch for ${email}`);
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        // Check if blocked/suspended
        if (manufacturer.kycStatus === 'BLOCKED' || manufacturer.kycStatus === 'SUSPENDED') {
            console.warn(`[manufacturer-service Auth] Login blocked: Manufacturer ${manufacturer.manufacturerId} is BLOCKED. Reason: "${manufacturer.blockedReason}"`);
            return res.status(403).json({
                status:    'error',
                code:      'ACCOUNT_BLOCKED',
                message:   'Your manufacturer account has been blocked by the CDSCO regulatory authority.',
                reason:    manufacturer.blockedReason || 'Regulatory compliance freeze.',
                blockedAt: manufacturer.blockedAt,
            });
        }

        if (manufacturer.kycStatus !== 'APPROVED') {
            console.warn(`[manufacturer-service Auth] Login restricted: KYC status is ${manufacturer.kycStatus} for ${manufacturer.manufacturerId}`);
            return res.status(403).json({
                status:    'error',
                code:      'KYC_PENDING',
                message:   'Account pending KYC approval. Contact administrator.',
                kycStatus: manufacturer.kycStatus,
                data: {
                    id:             manufacturer.manufacturerId,
                    manufacturerId: manufacturer.manufacturerId,
                    companyName:    manufacturer.companyName,
                    email:          manufacturer.email,
                    kycStatus:      manufacturer.kycStatus,
                    createdAt:      manufacturer.createdAt,
                },
            });
        }

        if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');

        const token = jwt.sign(
            { id: manufacturer.manufacturerId, email: manufacturer.email, companyName: manufacturer.companyName },
            JWT_SECRET,
            { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN },
        );

        console.log(`[manufacturer-service Auth] Login successful: ${manufacturer.manufacturerId} (${manufacturer.companyName})`);

        // Cache status in Redis with 20-minute sliding TTL
        await setCachedManufacturerStatus(manufacturer.manufacturerId, {
            manufacturerId: manufacturer.manufacturerId,
            companyName:    manufacturer.companyName,
            licenseNumber:  manufacturer.licenseNumber,
            email:          manufacturer.email,
            kycStatus:      manufacturer.kycStatus,
            blockedReason:  manufacturer.blockedReason,
            blockedAt:      manufacturer.blockedAt,
            publicKeyPem:   manufacturer.publicKeyPem,
            keyId:          manufacturer.keyId,
        }, 20 * 60);

        res.cookie('mfr_token', token, {
            httpOnly: true,
            secure:   process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge:   7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            status: 'success',
            token,
            data: {
                id:             manufacturer.manufacturerId,
                manufacturerId: manufacturer.manufacturerId,
                email:          manufacturer.email,
                companyName:    manufacturer.companyName,
                kycStatus:      manufacturer.kycStatus,
                createdAt:      manufacturer.createdAt,
                verifiedAt:     manufacturer.verifiedAt,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] loginController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// ── KYC Approve — POST /api/manufacturer/auth/kyc/approve ─────────────────────
export const kycApproveController = async (req, res) => {
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    if (!ADMIN_TOKEN) {
        console.error('[manufacturer-service Auth] ADMIN_TOKEN env var not set — KYC endpoint disabled');
        return res.status(500).json({ status: 'error', message: 'Admin token not configured on server' });
    }

    const presented = req.headers['x-admin-token'];
    if (!presented || presented !== ADMIN_TOKEN) {
        console.warn('[manufacturer-service Auth] Unauthorized KYC approve request: Invalid or missing X-Admin-Token');
        return res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Invalid or missing X-Admin-Token' });
    }

    try {
        const { manufacturerId, email } = req.body;
        console.log(`[manufacturer-service Auth] kycApproveController processing approval for identifier: ${manufacturerId || email}`);

        if (!manufacturerId && !email) {
            return res.status(400).json({ status: 'error', message: 'manufacturerId or email is required' });
        }

        const query = {
            $or: [
                ...(manufacturerId ? [{ manufacturerId }] : []),
                ...(email ? [{ email: email.toLowerCase() }] : []),
                ...(manufacturerId && mongoose.isValidObjectId(manufacturerId) ? [{ _id: manufacturerId }] : []),
            ],
        };
        const manufacturer = await Manufacturer.findOne(query);

        if (!manufacturer) {
            console.warn(`[manufacturer-service Auth] Approval target not found for query:`, query);
            return res.status(404).json({ status: 'error', message: 'Manufacturer not found' });
        }

        // ── Provision EC P-256 signing key via pharma-core ────────────────────
        let keyGenerated = false;
        try {
            console.log(`[manufacturer-service Auth] Requesting EC P-256 key generation from pharma-core for ${manufacturer.manufacturerId}...`);
            const keyRes = await axios.post(
                `${PHARMA_CORE_URL}/core/keys/generate`,
                { manufacturerId: manufacturer.manufacturerId },
                {
                    headers: {
                        'Authorization':  `Bearer ${SERVICE_TOKEN}`,
                        'X-Service-Token': SERVICE_TOKEN,
                        'Content-Type':   'application/json',
                    },
                    timeout: 15_000,
                },
            );
            keyGenerated = true;
            if (keyRes.data?.publicKeyPem) {
                manufacturer.publicKeyPem = keyRes.data.publicKeyPem;
                manufacturer.keyId = keyRes.data.keyId;
            }
            console.log(`[manufacturer-service Auth] EC P-256 key generated successfully for ${manufacturer.manufacturerId}`);
        } catch (keyErr) {
            if (keyErr.response?.status === 409) {
                console.log(`[manufacturer-service Auth] EC key already exists in pharma-core for ${manufacturer.manufacturerId}`);
                try {
                    const existingRes = await axios.get(`${PHARMA_CORE_URL}/core/keys/${encodeURIComponent(manufacturer.manufacturerId)}`, {
                        headers: { 'X-Service-Token': SERVICE_TOKEN },
                        timeout: 5000,
                    });
                    if (existingRes.data?.publicKeyPem) {
                        manufacturer.publicKeyPem = existingRes.data.publicKeyPem;
                        manufacturer.keyId = existingRes.data.keyId;
                    }
                } catch {
                    // non-fatal
                }
            } else {
                console.error(`[manufacturer-service Auth] Key generation failed in pharma-core (non-fatal): ${keyErr.message}`);
            }
        }

        // ── Set KYC status ────────────────────────────────────────────────────
        manufacturer.kycStatus = 'APPROVED';
        manufacturer.rejectionReason = null;
        manufacturer.blockedReason = null;
        manufacturer.blockedAt = null;
        manufacturer.verifiedAt = new Date();
        await manufacturer.save();

        // Update Redis status to APPROVED
        await setCachedManufacturerStatus(manufacturer.manufacturerId, {
            manufacturerId: manufacturer.manufacturerId,
            companyName:    manufacturer.companyName,
            licenseNumber:  manufacturer.licenseNumber,
            email:          manufacturer.email,
            kycStatus:      'APPROVED',
            publicKeyPem:   manufacturer.publicKeyPem,
            keyId:          manufacturer.keyId,
        }, 20 * 60);

        console.log(`[manufacturer-service Auth] KYC status successfully updated to APPROVED for ${manufacturer.manufacturerId} (${manufacturer.companyName}) at ${manufacturer.verifiedAt}`);

        return res.status(200).json({
            status:         'success',
            message:        `${manufacturer.companyName} approved. They can now log in and mint batches.`,
            manufacturerId: manufacturer.manufacturerId,
            companyName:    manufacturer.companyName,
            licenseNumber:  manufacturer.licenseNumber,
            email:          manufacturer.email,
            kycStatus:      'APPROVED',
            keyGenerated,
            verifiedAt:     manufacturer.verifiedAt,
            createdAt:      manufacturer.createdAt,
            data: {
                ...manufacturer.toObject(),
                hasSigningKey: true,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] kycApproveController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// ── KYC Reject — POST /api/manufacturer/auth/kyc/reject ───────────────────────
export const kycRejectController = async (req, res) => {
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    if (!ADMIN_TOKEN) {
        return res.status(500).json({ status: 'error', message: 'Admin token not configured on server' });
    }

    const presented = req.headers['x-admin-token'];
    if (!presented || presented !== ADMIN_TOKEN) {
        return res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Invalid or missing X-Admin-Token' });
    }

    try {
        const { manufacturerId, email, reason } = req.body;
        console.log(`[manufacturer-service Auth] kycRejectController processing rejection for identifier: ${manufacturerId || email}, reason: "${reason}"`);

        if (!manufacturerId && !email) {
            return res.status(400).json({ status: 'error', message: 'manufacturerId or email is required' });
        }

        const query = {
            $or: [
                ...(manufacturerId ? [{ manufacturerId }] : []),
                ...(email ? [{ email: email.toLowerCase() }] : []),
                ...(manufacturerId && mongoose.isValidObjectId(manufacturerId) ? [{ _id: manufacturerId }] : []),
            ],
        };
        const manufacturer = await Manufacturer.findOne(query);

        if (!manufacturer) {
            console.warn(`[manufacturer-service Auth] Rejection target not found for query:`, query);
            return res.status(404).json({ status: 'error', message: 'Manufacturer not found' });
        }

        manufacturer.kycStatus = 'REJECTED';
        manufacturer.rejectionReason = reason || 'KYC application rejected by regulatory authority.';
        await manufacturer.save();

        // Update Redis cache immediately
        await setCachedManufacturerStatus(manufacturer.manufacturerId, {
            manufacturerId: manufacturer.manufacturerId,
            companyName:    manufacturer.companyName,
            licenseNumber:  manufacturer.licenseNumber,
            email:          manufacturer.email,
            kycStatus:      'REJECTED',
            rejectionReason: manufacturer.rejectionReason,
        }, 20 * 60);

        console.log(`[manufacturer-service Auth] KYC status updated to REJECTED for ${manufacturer.manufacturerId} (${manufacturer.companyName})`);

        return res.status(200).json({
            status:          'success',
            message:         `${manufacturer.companyName} registration rejected.`,
            manufacturerId:  manufacturer.manufacturerId,
            companyName:     manufacturer.companyName,
            licenseNumber:   manufacturer.licenseNumber,
            email:           manufacturer.email,
            kycStatus:       'REJECTED',
            rejectionReason: manufacturer.rejectionReason,
            createdAt:       manufacturer.createdAt,
            updatedAt:       manufacturer.updatedAt,
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] kycRejectController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// ── KYC Block — POST /api/manufacturer/auth/kyc/block ─────────────────────────
export const kycBlockController = async (req, res) => {
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    if (!ADMIN_TOKEN) {
        return res.status(500).json({ status: 'error', message: 'Admin token not configured on server' });
    }

    const presented = req.headers['x-admin-token'];
    if (!presented || presented !== ADMIN_TOKEN) {
        return res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Invalid or missing X-Admin-Token' });
    }

    try {
        const { manufacturerId, email, reason, adminId } = req.body;
        console.log(`[manufacturer-service Auth] kycBlockController invoked for identifier: ${manufacturerId || email}, reason: "${reason}"`);

        if (!manufacturerId && !email) {
            return res.status(400).json({ status: 'error', message: 'manufacturerId or email is required' });
        }

        const query = {
            $or: [
                ...(manufacturerId ? [{ manufacturerId }] : []),
                ...(email ? [{ email: email.toLowerCase() }] : []),
                ...(manufacturerId && mongoose.isValidObjectId(manufacturerId) ? [{ _id: manufacturerId }] : []),
            ],
        };
        const manufacturer = await Manufacturer.findOne(query);

        if (!manufacturer) {
            console.warn(`[manufacturer-service Auth] Block target not found for query:`, query);
            return res.status(404).json({ status: 'error', message: 'Manufacturer not found' });
        }

        manufacturer.kycStatus = 'BLOCKED';
        manufacturer.blockedReason = reason || 'Emergency account freeze due to regulatory non-compliance.';
        manufacturer.blockedAt = new Date();
        manufacturer.blockedBy = adminId || 'CDSCO Regulatory Admin';
        await manufacturer.save();

        // Update Redis status immediately so active requests fail with 403 in < 1ms
        await setCachedManufacturerStatus(manufacturer.manufacturerId, {
            manufacturerId: manufacturer.manufacturerId,
            companyName:    manufacturer.companyName,
            licenseNumber:  manufacturer.licenseNumber,
            email:          manufacturer.email,
            kycStatus:      'BLOCKED',
            blockedReason:  manufacturer.blockedReason,
            blockedAt:      manufacturer.blockedAt,
        }, 20 * 60);

        console.log(`[manufacturer-service Auth] Manufacturer BLOCKED successfully: ${manufacturer.manufacturerId} (${manufacturer.companyName}) at ${manufacturer.blockedAt}`);

        return res.status(200).json({
            status:         'success',
            message:        `${manufacturer.companyName} account has been BLOCKED.`,
            manufacturerId: manufacturer.manufacturerId,
            companyName:    manufacturer.companyName,
            licenseNumber:  manufacturer.licenseNumber,
            email:          manufacturer.email,
            kycStatus:      'BLOCKED',
            blockedReason:  manufacturer.blockedReason,
            blockedAt:      manufacturer.blockedAt,
            data: {
                ...manufacturer.toObject(),
                hasSigningKey: !!manufacturer.publicKeyPem,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] kycBlockController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// ── KYC Unblock — POST /api/manufacturer/auth/kyc/unblock ─────────────────────
export const kycUnblockController = async (req, res) => {
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    if (!ADMIN_TOKEN) {
        return res.status(500).json({ status: 'error', message: 'Admin token not configured on server' });
    }

    const presented = req.headers['x-admin-token'];
    if (!presented || presented !== ADMIN_TOKEN) {
        return res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Invalid or missing X-Admin-Token' });
    }

    try {
        const { manufacturerId, email } = req.body;
        console.log(`[manufacturer-service Auth] kycUnblockController invoked for identifier: ${manufacturerId || email}`);

        if (!manufacturerId && !email) {
            return res.status(400).json({ status: 'error', message: 'manufacturerId or email is required' });
        }

        const query = {
            $or: [
                ...(manufacturerId ? [{ manufacturerId }] : []),
                ...(email ? [{ email: email.toLowerCase() }] : []),
                ...(manufacturerId && mongoose.isValidObjectId(manufacturerId) ? [{ _id: manufacturerId }] : []),
            ],
        };
        const manufacturer = await Manufacturer.findOne(query);

        if (!manufacturer) {
            console.warn(`[manufacturer-service Auth] Unblock target not found for query:`, query);
            return res.status(404).json({ status: 'error', message: 'Manufacturer not found' });
        }

        manufacturer.kycStatus = 'APPROVED';
        manufacturer.blockedReason = null;
        manufacturer.blockedAt = null;
        manufacturer.blockedBy = null;
        await manufacturer.save();

        // Restore Redis status immediately to APPROVED
        await setCachedManufacturerStatus(manufacturer.manufacturerId, {
            manufacturerId: manufacturer.manufacturerId,
            companyName:    manufacturer.companyName,
            licenseNumber:  manufacturer.licenseNumber,
            email:          manufacturer.email,
            kycStatus:      'APPROVED',
            blockedReason:  null,
            blockedAt:      null,
            publicKeyPem:   manufacturer.publicKeyPem,
            keyId:          manufacturer.keyId,
        }, 20 * 60);

        console.log(`[manufacturer-service Auth] Manufacturer UNBLOCKED successfully: ${manufacturer.manufacturerId} (${manufacturer.companyName})`);

        return res.status(200).json({
            status:         'success',
            message:        `${manufacturer.companyName} account access has been restored to APPROVED.`,
            manufacturerId: manufacturer.manufacturerId,
            companyName:    manufacturer.companyName,
            licenseNumber:  manufacturer.licenseNumber,
            email:          manufacturer.email,
            kycStatus:      'APPROVED',
            data: {
                ...manufacturer.toObject(),
                hasSigningKey: !!manufacturer.publicKeyPem,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] kycUnblockController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// ── Internal List — GET /api/manufacturer/internal/list ───────────────────────
export const internalListController = async (req, res) => {
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    if (!ADMIN_TOKEN) {
        return res.status(500).json({ status: 'error', message: 'Admin token not configured on server' });
    }

    const presented = req.headers['x-admin-token'];
    if (!presented || presented !== ADMIN_TOKEN) {
        return res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Invalid or missing X-Admin-Token' });
    }

    try {
        const { status, search, page = 1, limit = 10 } = req.query;
        console.log(`[manufacturer-service Auth] internalListController requested with params:`, req.query);

        const query = {};

        if (status && status.toUpperCase() !== 'ALL') {
            query.kycStatus = status.toUpperCase();
        }

        if (search) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { companyName: regex },
                { licenseNumber: regex },
                { email: regex },
                { manufacturerId: regex },
                { state: regex },
                { city: regex },
                { cinNumber: regex },
                { gstin: regex },
            ];
        }

        const pageNum  = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
        const skip     = (pageNum - 1) * limitNum;

        const [records, total] = await Promise.all([
            Manufacturer.find(query)
                .select('-passwordHash')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Manufacturer.countDocuments(query),
        ]);

        console.log(`[manufacturer-service Auth] internalListController returning ${records.length} of ${total} records`);

        const data = records.map(r => ({
            ...r,
            hasSigningKey: !!r.publicKeyPem,
        }));

        return res.status(200).json({
            status: 'success',
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
            data,
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] internalListController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// ── Internal Detail — GET /api/manufacturer/internal/:id ──────────────────────
export const internalDetailController = async (req, res) => {
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    if (!ADMIN_TOKEN) {
        return res.status(500).json({ status: 'error', message: 'Admin token not configured on server' });
    }

    const presented = req.headers['x-admin-token'];
    if (!presented || presented !== ADMIN_TOKEN) {
        return res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Invalid or missing X-Admin-Token' });
    }

    try {
        const { id } = req.params;
        console.log(`[manufacturer-service Auth] internalDetailController fetching record for identifier: ${id}`);

        const query = {
            $or: [
                { manufacturerId: id },
                { email: id.toLowerCase() },
                ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : []),
            ],
        };

        const manufacturer = await Manufacturer.findOne(query).select('-passwordHash').lean();

        if (!manufacturer) {
            console.warn(`[manufacturer-service Auth] Manufacturer record not found for: ${id}`);
            return res.status(404).json({ status: 'error', message: 'Manufacturer not found' });
        }

        console.log(`[manufacturer-service Auth] internalDetailController successfully found record for ${manufacturer.manufacturerId} (${manufacturer.companyName})`);

        return res.status(200).json({
            status: 'success',
            data: {
                ...manufacturer,
                hasSigningKey: !!manufacturer.publicKeyPem,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] internalDetailController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// ── Internal Stats — GET /api/manufacturer/internal/stats ─────────────────────
export const internalStatsController = async (req, res) => {
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    if (!ADMIN_TOKEN) {
        return res.status(500).json({ status: 'error', message: 'Admin token not configured on server' });
    }

    const presented = req.headers['x-admin-token'];
    if (!presented || presented !== ADMIN_TOKEN) {
        return res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Invalid or missing X-Admin-Token' });
    }

    try {
        console.log('[manufacturer-service Auth] internalStatsController calculating metrics...');
        const [total, pending, approved, rejected, blocked] = await Promise.all([
            Manufacturer.countDocuments({}),
            Manufacturer.countDocuments({ kycStatus: 'PENDING' }),
            Manufacturer.countDocuments({ kycStatus: 'APPROVED' }),
            Manufacturer.countDocuments({ kycStatus: 'REJECTED' }),
            Manufacturer.countDocuments({ kycStatus: { $in: ['BLOCKED', 'SUSPENDED'] } }),
        ]);

        console.log(`[manufacturer-service Auth] Stats calculated: total=${total}, pending=${pending}, approved=${approved}, rejected=${rejected}, blocked=${blocked}`);

        return res.status(200).json({
            status: 'success',
            data: {
                total,
                pending,
                approved,
                rejected,
                blocked,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] internalStatsController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// ── Get Current Account Status — GET /api/manufacturer/auth/me ───────────────
// Protected by identifyUser middleware (already enforces BLOCKED → 403).
// If the request reaches this controller the token is valid and status is APPROVED.
// This endpoint exists primarily so the frontend polling hook can confirm status.
export const getMeController = async (req, res) => {
    try {
        const manufacturer = req.manufacturer;
        console.log(`[manufacturer-service Auth] getMeController invoked for: ${manufacturer.manufacturerId}`);

        return res.status(200).json({
            status: 'success',
            data: {
                id:             manufacturer.manufacturerId,
                manufacturerId: manufacturer.manufacturerId,
                companyName:    manufacturer.companyName,
                email:          manufacturer.email,
                kycStatus:      manufacturer.kycStatus,
                blockedReason:  manufacturer.blockedReason || null,
                blockedAt:      manufacturer.blockedAt || null,
                verifiedAt:     manufacturer.verifiedAt || null,
                createdAt:      manufacturer.createdAt,
            },
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] getMeController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

// ── Logout — POST /api/manufacturer/auth/logout ───────────────────────────────
export const logoutController = (_req, res) => {
    console.log('[manufacturer-service Auth] logoutController invoked');
    res.clearCookie('mfr_token', {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    return res.status(204).send();
};

// ── Public Key Lookup — GET /api/manufacturer/auth/public/key/:id or /public/key/:id ──
// Resolves certified CDSCO public keys by manufacturerId, keyId, batchId, or MongoDB _id.
export const getManufacturerPublicKeyController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Manufacturer identifier, keyId, or batchId is required' });
        }

        const query = {
            $or: [
                { manufacturerId: id },
                { keyId: id },
                { email: id.toLowerCase() },
                ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : []),
            ],
        };

        let manufacturer = await Manufacturer.findOne(query)
            .select('manufacturerId keyId publicKeyPem publicKeys companyName kycStatus')
            .lean();

        // If not found by manufacturer ID, check if id is a batchId
        let batchKey = null;
        try {
            const Batch = mongoose.model('Batch');
            const batch = await Batch.findOne({
                $or: [{ batchId: id }, { systemBatchId: id }, { manufacturerBatchNumber: id }],
            }).select('manufacturerId publicKeyPem keyId').lean();

            if (batch) {
                if (batch.publicKeyPem) batchKey = batch.publicKeyPem;
                if (!manufacturer && batch.manufacturerId) {
                    manufacturer = await Manufacturer.findOne({ manufacturerId: batch.manufacturerId })
                        .select('manufacturerId keyId publicKeyPem publicKeys companyName kycStatus')
                        .lean();
                }
            }
        } catch {
            // non-fatal batch lookup
        }

        const allKeys = [];
        if (batchKey) allKeys.push(batchKey);
        if (manufacturer?.publicKeyPem && !allKeys.includes(manufacturer.publicKeyPem)) {
            allKeys.push(manufacturer.publicKeyPem);
        }
        if (Array.isArray(manufacturer?.publicKeys)) {
            for (const pk of manufacturer.publicKeys) {
                if (pk && !allKeys.includes(pk)) allKeys.push(pk);
            }
        }

        if (allKeys.length === 0) {
            return res.status(404).json({
                status: 'error',
                code: 'KEY_NOT_FOUND',
                message: `No active or historical public keys found for identifier: ${id}`,
            });
        }

        return res.status(200).json({
            status: 'success',
            manufacturerId: manufacturer?.manufacturerId || id,
            keyId:          manufacturer?.keyId || null,
            publicKeyPem:   allKeys[0],
            publicKeys:     allKeys,
            companyName:    manufacturer?.companyName || null,
            kycStatus:      manufacturer?.kycStatus || 'APPROVED',
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] getManufacturerPublicKeyController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

/**
 * Returns all active and historical certified public keys for all approved manufacturers.
 * Used by pharma-core to bootstrap and synchronize its keystore on startup.
 */
export const getAllPublicKeysController = async (_req, res) => {
    try {
        const manufacturers = await Manufacturer.find({
            kycStatus: 'APPROVED',
            $or: [
                { publicKeyPem: { $ne: null } },
                { 'publicKeys.0': { $exists: true } },
            ],
        }).select('manufacturerId keyId publicKeyPem publicKeys companyName createdAt').lean();

        const data = {};
        for (const mfr of manufacturers) {
            const keys = [mfr.publicKeyPem, ...(Array.isArray(mfr.publicKeys) ? mfr.publicKeys : [])].filter(Boolean);
            data[mfr.manufacturerId] = {
                publicKeyPem: mfr.publicKeyPem || keys[0] || null,
                publicKeys: Array.from(new Set(keys)),
                keyId: mfr.keyId || `mfr-key-${mfr.manufacturerId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                companyName: mfr.companyName,
                createdAt: mfr.createdAt,
            };
        }

        return res.status(200).json({
            status: 'success',
            count: Object.keys(data).length,
            data,
        });
    } catch (error) {
        console.error('[manufacturer-service Auth] getAllPublicKeysController error:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
