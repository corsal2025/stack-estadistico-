import { statsQuerySchema } from '../schemas/validation.js';

/**
 * Express middleware that validates query parameters against the statsQuerySchema.
 *
 * Usage:
 *   router.get('/summary', validateStatsQuery, getSummaryStats);
 *
 * On invalid input returns:
 *   HTTP 400 { error: 'Invalid query parameters', details: [...] }
 *
 * On valid input calls next() and leaves req.query untouched.
 */
export const validateStatsQuery = (req, res, next) => {
    const result = statsQuerySchema.safeParse(req.query);

    if (!result.success) {
        const details = result.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'query',
            message: issue.message
        }));

        return res.status(400).json({
            error: 'Invalid query parameters',
            details
        });
    }

    next();
};
