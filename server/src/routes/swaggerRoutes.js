import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../swagger/swaggerDef.js';

const router = express.Router();

/**
 * GET /api-docs
 * Renders interactive Swagger UI for exploring the Licentia.io API.
 */
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Licentia.io API Docs',
    swaggerOptions: {
        docExpansion: 'list',
        filter: true,
    },
}));

export default router;
