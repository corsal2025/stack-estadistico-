import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './controllers/excelController.js';
import excelRoutes from './routes/excelRoutes.js';
import swaggerRoutes from './routes/swaggerRoutes.js';
import swaggerSpec from './swagger/swaggerDef.js';
import { logRequests } from './middleware/logRequests.js';
import { errorHandler } from './middleware/errorHandler.js';
import { corsMiddleware } from './middleware/corsMiddleware.js';
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware.js';
import logger from './utils/logger.js';

// Validar setup antes de iniciar
if (!process.env.PORT && !process.env.NODE_ENV) {
    logger.warn('Environment variables not configured. Using defaults. Create server/.env with PORT, NODE_ENV, CORS_WHITELIST, JWT_SECRET for production.');
}

const app = express();
const PORT = process.env.PORT || 3002;

// Path to the compiled frontend (client/dist)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

// CORS — must be first (handles preflight OPTIONS before any other middleware)
app.use(corsMiddleware);

app.use(express.json());

// Request logging — early, before routes
app.use(logRequests);

// Serve the compiled frontend (single-server deployment)
app.use(express.static(clientDist));

// Inicializar y parsear el Excel en el arranque de la app si no existe db.json
initDatabase();

// Rate limiting — applied to all API routes
app.use('/api', rateLimitMiddleware);

// Rutas de la API
app.use('/api/stats', excelRoutes);

// Raw OpenAPI spec — must be registered BEFORE the swagger UI middleware
// (swagger-ui-express's serve middleware catches all /api-docs/* paths)
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
});

// API Documentation (Swagger UI)
app.use('/api-docs', swaggerRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// SPA fallback — any non-API route returns the frontend's index.html
// so client-side routing and direct links work. Must come after all API routes.
app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
});

// Global error handler — must be last
app.use(errorHandler);

// Arrancar servidor
app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`, {
        port: PORT,
        baseUrl: `http://localhost:${PORT}/api/stats`
    });
});
