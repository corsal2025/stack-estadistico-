import express from 'express';
import cors from 'cors';
import { initDatabase } from './controllers/excelController.js';
import excelRoutes from './routes/excelRoutes.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Habilitar CORS para permitir llamadas desde el frontend de React (puerto 5173 o puerto del cliente)
app.use(cors({
    origin: '*' // Permite conexiones locales de cualquier cliente durante desarrollo
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
