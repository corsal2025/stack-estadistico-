import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/security.js';

/**
 * Optional JWT authentication middleware.
 *
 * Behavior:
 * - No Authorization header → continues as anonymous (req.user not set)
 * - Bearer token present and valid → attaches decoded payload to req.user, continues
 * - Bearer token present but invalid/expired → returns HTTP 401
 *
 * To make authentication required on a route, add a second middleware after this one
 * that checks: if (!req.user) return res.status(401).json({ error: 'Authentication required' })
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // No token provided — optional auth: continue as anonymous
    if (!authHeader) {
        return next();
    }

    const parts = authHeader.split(' ');
    const scheme = parts[0];
    const token = parts[1];

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            error: 'Invalid Authorization header. Use: Bearer <token>'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Token invalid or expired' });
    }
};
