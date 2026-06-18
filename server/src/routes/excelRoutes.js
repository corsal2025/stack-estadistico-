import express from 'express';
import {
    getSummaryStats,
    getMonthlyTrends,
    getOfficeDistribution,
    getFolderStatusDistribution,
    getScatterData
} from '../controllers/excelController.js';

const router = express.Router();

// Rutas estadísticas principales
router.get('/summary', getSummaryStats);
router.get('/trends', getMonthlyTrends);
router.get('/distribution', getOfficeDistribution);
router.get('/status', getFolderStatusDistribution);
router.get('/scatter', getScatterData);

export default router;
