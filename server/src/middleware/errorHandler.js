import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

/**
 * Global Express error-handling middleware.
 * Must be registered LAST in app.js (after all routes).
 *
 * For 5xx errors: returns { error: <user-safe message>, traceId }
 * For 4xx errors: returns { error: <original message>, details?, traceId }
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export const errorHandler = (err, req, res, _next) => {
    const traceId = randomUUID();
    const status = err.status || err.statusCode || 500;
    const isClientError = status >= 400 && status < 500;

    logger.error('Unhandled request error', {
        traceId,
        method: req.method,
        path: req.path,
        statusCode: status,
        message: err.message,
        stack: err.stack
    });

    if (isClientError) {
        const body = {
            error: err.message || 'Bad Request',
            traceId
        };
        if (err.details) body.details = err.details;
        return res.status(status).json(body);
    }

    res.status(500).json({
        error: 'An unexpected error occurred. Please try again later.',
        traceId
    });
};
