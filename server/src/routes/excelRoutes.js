import express from 'express';
import multer from 'multer';
import {
    getSummaryStats,
    getMonthlyTrends,
    getOfficeDistribution,
    getFolderStatusDistribution,
    getScatterData,
    getHeatmapData,
    getRadarData,
    uploadAndReprocessExcel,
    resetDatabase,
    clearDatabase,
    getDomicilioCorreoByComuna,
    getRecordsByStatus,
    getDecisionDistribution
} from '../controllers/excelController.js';
import { validateStatsQuery } from '../middleware/validateRequest.js';

const router = express.Router();

// Multer: almacenamiento en memoria (no escribe temp en disco)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB máximo
    fileFilter: (_req, file, cb) => {
        const ok = /\.(xlsx|xls)$/i.test(file.originalname);
        cb(ok ? null : new Error('Solo se aceptan archivos .xlsx o .xls'), ok);
    }
});

// Rutas estadísticas principales (validated)
router.get('/summary', validateStatsQuery, getSummaryStats);
router.get('/trends', validateStatsQuery, getMonthlyTrends);
router.get('/distribution', validateStatsQuery, getOfficeDistribution);
router.get('/status', validateStatsQuery, getFolderStatusDistribution);
router.get('/scatter', validateStatsQuery, getScatterData);
router.get('/domicilio-correo', validateStatsQuery, getDomicilioCorreoByComuna);
router.get('/records', getRecordsByStatus);
router.get('/decisions', validateStatsQuery, getDecisionDistribution);
router.get('/heatmap', validateStatsQuery, getHeatmapData);
router.get('/radar', validateStatsQuery, getRadarData);

// Ruta de carga y reprocesamiento de Excel
router.post('/upload', upload.single('excel'), uploadAndReprocessExcel);

// Ruta para restablecer base de datos a planilla madre original
router.post('/reset', resetDatabase);

// Ruta para eliminar TODOS los datos y dejar el sistema vacío
router.post('/clear', clearDatabase);

export default router;
