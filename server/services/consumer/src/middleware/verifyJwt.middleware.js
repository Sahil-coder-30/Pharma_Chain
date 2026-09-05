import jwt from 'jsonwebtoken';

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Validates a PharmaChain JWT from the Authorization: Bearer <token> header.
 * On success, attaches the decoded payload to req.consumer and calls next().
 * On failure, responds with 401.
 */
export const verifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'error',
            message: 'Missing or malformed Authorization header',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        // JWT_SECRET is read at call time, not module-init time, so dotenv is guaranteed to have run
        const jwtSecret =
            process.env.JWT_SECRET ||
            'fbf90411fe9cebf9079d22ef36fc1321f0ce244ed073152e86dc962715389b703463f6f163953269c641c9cd69ba3fd7c4b3f3a97a5305811c3d3c38608554cd';
        const decoded = jwt.verify(token, jwtSecret);
        req.consumer = decoded;
        next();
    } catch (err) {
        const message =
            err.name === 'TokenExpiredError'
                ? 'Session expired. Please sign in again.'
                : 'Invalid session token';
        return res.status(401).json({ status: 'error', message });
    }
};
