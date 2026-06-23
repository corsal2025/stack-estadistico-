import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from '../config/security.js';

/**
 * Returns true for localhost IPs (skips rate limiting in dev).
 *
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export const isLocalhost = (req) => {
    const ip = req.ip || req.socket?.remoteAddress;
    return (
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip === '::ffff:127.0.0.1'
    );
};

/**
 * Handler called when the rate limit is exceeded.
 * Returns HTTP 429 with { error, retryAfter } (seconds until window resets).
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export const rateLimitHandler = (_req, res) => {
    const retryAfter = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
    res.status(429).json({
        error: 'Too many requests',
        retryAfter
    });
};

/**
 * Rate limiting middleware.
 * Allows up to RATE_LIMIT_MAX_REQUESTS per IP within RATE_LIMIT_WINDOW_MS.
 * Localhost requests are exempt (dev convenience).
 *
 * When the limit is exceeded the client receives:
 *   HTTP 429 { error: "Too many requests", retryAfter: <seconds> }
 */
export const rateLimitMiddleware = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    skip: isLocalhost,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false
});
