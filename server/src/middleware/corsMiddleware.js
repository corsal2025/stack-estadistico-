import { CORS_WHITELIST } from '../config/security.js';
import logger from '../utils/logger.js';

/**
 * Dynamic CORS middleware that validates the Origin header against a whitelist.
 *
 * Behavior:
 * - No Origin header (same-origin, server-to-server, curl) → continues
 * - Origin in CORS_WHITELIST → sets Access-Control-Allow-* headers; handles OPTIONS preflight
 * - Origin NOT in CORS_WHITELIST → logs warning, does NOT set CORS headers (browser will block)
 *
 * Configure the whitelist via CORS_WHITELIST env var (comma-separated):
 *   CORS_WHITELIST=http://localhost:3005,https://licentia.example.com
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;

    // No Origin header — not a cross-origin request, pass through
    if (!origin) {
        return next();
    }

    if (CORS_WHITELIST.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }

        return next();
    }

    // Origin not whitelisted — log and continue without CORS headers
    logger.warn('CORS: origin not in whitelist', { origin });

    if (req.method === 'OPTIONS') {
        return res.status(403).json({ error: 'CORS policy: origin not allowed' });
    }

    return next();
};
