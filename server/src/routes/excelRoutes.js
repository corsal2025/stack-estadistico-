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
    resetDatabase
} from '../controllers/excelController.js';

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

// Rutas estadísticas principales
router.get('/summary', getSummaryStats);
router.get('/trends', getMonthlyTrends);
router.get('/distribution', getOfficeDistribution);
router.get('/status', getFolderStatusDistribution);
router.get('/scatter', getScatterData);
router.get('/heatmap', getHeatmapData);
router.get('/radar', getRadarData);

// Ruta de carga y reprocesamiento de Excel
router.post('/upload', upload.single('excel'), uploadAndReprocessExcel);

// Ruta para restablecer base de datos a planilla madre original
router.post('/reset', resetDatabase);

export default router;
