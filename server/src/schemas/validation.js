import { z } from 'zod';

/**
 * Valid month values accepted by the stats API.
 * Spanish month names, all 12 months supported (data currently covers Jan-Jul).
 */
export const VALID_MONTHS = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

/**
 * Valid office values accepted by the stats API.
 */
export const VALID_OFFICES = ['AV. ARGENTINA', 'PLACILLA', 'MERCADO PUERTO'];

/**
 * Validates the `month` query parameter.
 * Accepts: any valid Spanish month name or 'all' (case-insensitive).
 * Rejects: empty strings, unknown values.
 */
const monthParam = z.string()
    .min(1, 'month cannot be empty')
    .refine(
        (val) => {
            const upper = val.toUpperCase();
            return upper === 'ALL' || VALID_MONTHS.includes(upper);
        },
        {
            message: `Invalid month. Must be one of: ${VALID_MONTHS.join(', ')}, all (case-insensitive)`
        }
    )
    .optional();

/**
 * Validates the `office` query parameter.
 * Accepts: 'AV. ARGENTINA', 'PLACILLA', 'MERCADO PUERTO', or 'all' (case-insensitive).
 * Rejects: empty strings, unknown values.
 */
const officeParam = z.string()
    .min(1, 'office cannot be empty')
    .refine(
        (val) => {
            const upper = val.toUpperCase();
            return upper === 'ALL' || VALID_OFFICES.includes(upper);
        },
        {
            message: `Invalid office. Must be one of: ${VALID_OFFICES.join(', ')}, all (case-insensitive)`
        }
    )
    .optional();

/**
 * Schema for all 5 stats endpoints:
 *   GET /api/stats/summary
 *   GET /api/stats/trends
 *   GET /api/stats/distribution
 *   GET /api/stats/status
 *   GET /api/stats/scatter
 *
 * Both params are optional (absence means "all").
 */
export const statsQuerySchema = z.object({
    month: monthParam,
    office: officeParam
});
