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

    // Same-origin: the request comes from the very page this server serves.
    // We compare host (hostname:port) and ignore protocol so it keeps working
    // behind tunnels/proxies (ngrok), via the LAN IP, or via localhost — i.e.
    // anywhere this single server is reached. Single-server deploys are always
    // same-origin, so this is what makes uploads work from any access point.
    let sameOrigin = false;
    try {
        sameOrigin = new URL(origin).host === req.headers.host;
    } catch {
        sameOrigin = false;
    }

    if (sameOrigin || CORS_WHITELIST.includes(origin)) {
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
