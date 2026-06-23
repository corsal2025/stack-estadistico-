import logger from '../utils/logger.js';

/**
 * Express middleware that logs every incoming HTTP request.
 * Logs method, path, status code, and duration (ms) on response finish.
 * Does NOT log the request body to avoid leaking PII.
 */
export const logRequests = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const statusCode = res.statusCode;

        let level = 'info';
        if (statusCode >= 500) level = 'error';
        else if (statusCode >= 400) level = 'warn';

        logger[level]('HTTP request', {
            method: req.method,
            path: req.path,
            statusCode,
            durationMs
        });
    });

    next();
};
