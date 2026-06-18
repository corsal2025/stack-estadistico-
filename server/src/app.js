import express from 'express';
import cors from 'cors';
import { initDatabase } from './controllers/excelController.js';
import excelRoutes from './routes/excelRoutes.js';

const app = express();
const PORT = process.env.PORT || 3002;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3005';
const isDevelopment = process.env.NODE_ENV !== 'production';

// CORS configuration: whitelist specific origin or allow all in development
app.use(cors({
    origin: isDevelopment ? '*' : CORS_ORIGIN,
    credentials: true
}));

app.use(express.json());

// Inicializar y parsear el Excel en el arranque de la app si no existe db.json
initDatabase();

// Rutas de la API
app.use('/api/stats', excelRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Arrancar servidor
app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`Servidor Estadístico Node.js escuchando en el puerto ${PORT}`);
    console.log(`Endpoint Base: http://localhost:${PORT}/api/stats`);
    console.log(`========================================================`);
});
