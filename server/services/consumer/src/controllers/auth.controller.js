import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import ConsumerUser from '../models/user.model.js';

const JWT_SECRET =
    process.env.JWT_SECRET ||
    'fbf90411fe9cebf9079d22ef36fc1321f0ce244ed073152e86dc962715389b703463f6f163953269c641c9cd69ba3fd7c4b3f3a97a5305811c3d3c38608554cd';

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/consumer/auth/google
 *
 * Verifies a Google ID token (or exchanges an authorization code),
 * upserts the user in the MongoDB Atlas database, and returns a signed
 * PharmaChain JWT along with the persistent user profile.
 */
export const googleSignInController = async (req, res) => {
    const { idToken, code, redirectUri } = req.body;

    if (!idToken && (!code || !redirectUri)) {
        return res.status(400).json({
            status: 'error',
            message: 'Either idToken, or code and redirectUri, are required',
        });
    }

    try {
        const googleClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID_WEB,
            process.env.GOOGLE_CLIENT_SECRET_WEB,
            redirectUri
        );

        let verifiedIdToken = idToken;

        // If authorization code was provided instead of direct idToken, exchange it first
        if (!verifiedIdToken && code) {
            const { tokens } = await googleClient.getToken(code);
            if (!tokens.id_token) {
                throw new Error('Google did not return an ID token in the token exchange response');
            }
            verifiedIdToken = tokens.id_token;
        }

        // Cryptographically verify the ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: verifiedIdToken,
            audience: process.env.GOOGLE_CLIENT_ID_WEB,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: 'Google profile did not contain a valid email address',
            });
        }

        // Upsert ConsumerUser in MongoDB Atlas
        let user;
        try {
            user = await ConsumerUser.findOne({
                $or: [{ googleId }, { email: email.toLowerCase() }],
            });

            if (!user) {
                user = await ConsumerUser.create({
                    googleId,
                    email: email.toLowerCase(),
                    name: name || 'Verified Patient',
                    picture: picture || '',
                    lastLoginAt: new Date(),
                });
                console.log(`[consumer-service DB] Created new ConsumerUser: ${email} (ID: ${user._id})`);
            } else {
                user.googleId = googleId;
                user.lastLoginAt = new Date();
                if (name && (!user.name || user.name === 'Verified Patient')) {
                    user.name = name;
                }
                if (picture) {
                    user.picture = picture;
                }
                await user.save();
                console.log(`[consumer-service DB] Updated ConsumerUser login: ${email} (ID: ${user._id})`);
            }
        } catch (dbError) {
            console.error('[consumer-service DB] Failed to persist user to MongoDB:', dbError.message);
            // Fallback object if DB write encountered an issue
            user = {
                _id: googleId,
                googleId,
                email,
                name: name || 'Verified Patient',
                picture: picture || '',
                phone: '',
                address: '',
                kycStatus: 'VERIFIED',
                fabricNodeId: `PC-${Math.floor(100000 + Math.random() * 900000)}`,
                role: 'CONSUMER',
                toSafeObject() {
                    return this;
                },
            };
        }

        const safeUser = typeof user.toSafeObject === 'function' ? user.toSafeObject() : user;

        // Mint a stateless PharmaChain session JWT
        const pharmaToken = jwt.sign(
            {
                id: user._id,
                googleId,
                email,
                name: user.name,
                role: user.role || 'CONSUMER',
            },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        console.log(`[consumer-service Auth] Google sign-in successful — email: ${email}`);

        return res.status(200).json({
            status: 'success',
            token: pharmaToken,
            user: safeUser,
        });
    } catch (error) {
        console.error('[consumer-service Auth] googleSignInController error:', error.message);
        return res.status(401).json({
            status: 'error',
            message: error.message || 'Google authentication failed. The token or code may be invalid or expired.',
        });
    }
};

/**
 * GET /api/consumer/auth/me
 *
 * Validates session and returns the fresh user record from MongoDB.
 */
export const getMeController = async (req, res) => {
    try {
        const query = req.consumer.id
            ? { _id: req.consumer.id }
            : { $or: [{ googleId: req.consumer.googleId }, { email: req.consumer.email }] };

        const user = await ConsumerUser.findOne(query);

        if (!user) {
            return res.status(200).json({
                status: 'success',
                user: req.consumer,
            });
        }

        return res.status(200).json({
            status: 'success',
            user: user.toSafeObject(),
        });
    } catch (error) {
        console.error('[consumer-service Auth] getMeController error:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user profile',
        });
    }
};

/**
 * PUT /api/consumer/auth/profile
 *
 * Updates editable profile fields (name, phone, address) in MongoDB.
 * Protected by verifyJwt.
 */
export const updateProfileController = async (req, res) => {
    try {
        const { name, phone, address } = req.body;

        const query = req.consumer.id
            ? { _id: req.consumer.id }
            : { $or: [{ googleId: req.consumer.googleId }, { email: req.consumer.email }] };

        const user = await ConsumerUser.findOne(query);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found in database',
            });
        }

        if (name !== undefined) user.name = String(name).trim();
        if (phone !== undefined) user.phone = String(phone).trim();
        if (address !== undefined) user.address = String(address).trim();

        await user.save();
        console.log(`[consumer-service DB] Profile updated for user: ${user.email}`);

        return res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            user: user.toSafeObject(),
        });
    } catch (error) {
        console.error('[consumer-service Auth] updateProfileController error:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to update profile',
        });
    }
};
