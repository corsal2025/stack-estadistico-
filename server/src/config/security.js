/**
 * Security configuration loaded from environment variables.
 * Set these in server/.env for local dev, and in production secrets for deployment.
 */

/** Secret used to sign and verify JWT tokens. MUST be changed in production. */
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Allowed origins for CORS.
 * Set CORS_WHITELIST as comma-separated origins in your .env:
 *   CORS_WHITELIST=http://localhost:3005,https://licentia.example.com
 */
const rawWhitelist = process.env.CORS_WHITELIST || 'http://localhost:3005';
export const CORS_WHITELIST = Array.isArray(rawWhitelist)
    ? rawWhitelist
    : rawWhitelist.split(',').map((s) => s.trim()).filter(Boolean);

/** Rate limit window in milliseconds (default: 15 minutes). */
export const RATE_LIMIT_WINDOW_MS =
    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;

/** Max requests allowed per IP within the window (default: 100). */
export const RATE_LIMIT_MAX_REQUESTS =
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;
