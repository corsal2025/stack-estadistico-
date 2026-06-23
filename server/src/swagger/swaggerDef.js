import swaggerJSDoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * OpenAPI 3.0 base definition for Licentia.io API.
 *
 * swagger-jsdoc scans swaggerRoutes.js (in this same folder) for @openapi
 * JSDoc annotations and merges them with this definition to produce the
 * final spec object exported below.
 */
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Licentia.io API',
            version: '1.0.0',
            description:
                'Real-time statistical system for driving license control. ' +
                'All endpoints accept optional `month` and `office` query parameters ' +
                'to filter results. Both default to "all" when omitted.',
            contact: {
                name: 'Licentia.io Support',
            },
        },
        servers: [
            {
                url: 'http://localhost:3002',
                description: 'Development server',
            },
            {
                url: 'https://api.licentia.tu-dominio.com',
                description: 'Production server (placeholder)',
            },
        ],
        components: {
            parameters: {
                month: {
                    in: 'query',
                    name: 'month',
                    required: false,
                    schema: {
                        type: 'string',
                        enum: [
                            'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                            'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE',
                            'DICIEMBRE', 'all',
                        ],
                        default: 'all',
                    },
                    description:
                        'Filter by month. Case-insensitive. Omit or pass "all" for all months.',
                },
                office: {
                    in: 'query',
                    name: 'office',
                    required: false,
                    schema: {
                        type: 'string',
                        enum: ['AV. ARGENTINA', 'PLACILLA', 'MERCADO PUERTO', 'all'],
                        default: 'all',
                    },
                    description:
                        'Filter by office. Case-insensitive. Omit or pass "all" for all offices.',
                },
            },
            responses: {
                BadRequest: {
                    description: 'Invalid query parameters',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: { type: 'string', example: 'Invalid query parameters' },
                                    details: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                field: { type: 'string', example: 'month' },
                                                message: { type: 'string', example: 'Invalid month.' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                InternalError: {
                    description: 'Unexpected server error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'string',
                                        example: 'An unexpected error occurred. Please try again later.',
                                    },
                                    traceId: {
                                        type: 'string',
                                        format: 'uuid',
                                        example: '550e8400-e29b-41d4-a716-446655440000',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    apis: [path.join(__dirname, 'swaggerAnnotations.js')],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
