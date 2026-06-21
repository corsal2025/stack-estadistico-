import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../');

const EXCEL_PATH = path.resolve(PROJECT_ROOT, 'OTROS/DETALLE CARPETAS DEPTO. LICENCIAS DE CONDUCIR 2026.xlsx');
const DB_DIR = path.resolve(PROJECT_ROOT, 'data');
const DB_PATH = path.resolve(PROJECT_ROOT, 'data/db.json');
const UPLOADS_DIR = path.resolve(PROJECT_ROOT, 'data/uploads');

// Caché en memoria de los registros procesados
let dbCache = [];

/**
 * Convierte un número serial de fecha de Excel a una cadena ISO AAAA-MM-DD.
 */
function excelDateToISO(serial) {
    if (!serial || isNaN(serial)) return null;
    try {
        // Corrección de época de Excel (1 de enero de 1900 es el día 1)
        const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0];
    } catch {
        return null;
    }
}

/**
 * Calcula la diferencia de días entre dos fechas (AAAA-MM-DD).
 */
function calculateLeadTime(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return null;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
}

/**
 * Inicializa y procesa el Excel si no existe la base de datos local db.json.
 */
export function initDatabase() {
    try {
        if (!fs.existsSync(DB_DIR)) {
            fs.mkdirSync(DB_DIR, { recursive: true });
        }

        if (fs.existsSync(DB_PATH)) {
            console.log('Base de datos JSON existente encontrada en:', DB_PATH);
            const raw = fs.readFileSync(DB_PATH, 'utf8');
            dbCache = JSON.parse(raw);
            console.log(`Base de datos cargada: ${dbCache.length} registros en memoria.`);
            return;
        }

        console.log('Inicializando procesamiento del Excel madre...');
        if (!fs.existsSync(EXCEL_PATH)) {
            console.error(`Error crítico: El archivo Excel no existe en ${EXCEL_PATH}`);
            return;
        }

        const workbook = xlsx.readFile(EXCEL_PATH);
        const allRecords = parseWorkbook(workbook);

        // Guardar físicamente
        fs.writeFileSync(DB_PATH, JSON.stringify(allRecords, null, 2), 'utf8');
        dbCache = allRecords;
        console.log(`Procesamiento finalizado. Guardados ${dbCache.length} registros en la base de datos.`);
    } catch (e) {
        console.error('Error al inicializar la base de datos local:', e);
    }
}

/**
 * Parsea un workbook xlsx en memoria y retorna el array de registros normalizados.
 * Función reutilizada tanto por initDatabase() como por uploadAndReprocessExcel().
 */
function parseWorkbook(workbook) {
    const skipSheets = [
        'PLANTILLA MODELO AV. ARGENTINA',
        'PLANTILLA MODELO PLACILLA',
        'PLANTILLA MODELO MERC. PUERTO',
        'ESCANEADAS Y SUBIDAS',
        'CORREOS CAMBIO DE DOMICLIO'
    ];

    const allRecords = [];

    workbook.SheetNames.forEach(sheetName => {
        if (skipSheets.includes(sheetName)) return;

        const worksheet = workbook.Sheets[sheetName];
        const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
        if (rawRows.length < 2) return;

        const dataRows = rawRows.slice(1);

        let defaultOffice = 'AV. ARGENTINA';
        if (sheetName.toUpperCase().includes('PLACILLA')) defaultOffice = 'PLACILLA';
        else if (sheetName.toUpperCase().includes('PUERTO') || sheetName.toUpperCase().includes('MERC.')) defaultOffice = 'MERCADO PUERTO';

        const monthNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO'];
        let recordMonth = 'ENERO';
        for (const m of monthNames) {
            if (sheetName.toUpperCase().includes(m)) { recordMonth = m; break; }
        }

        dataRows.forEach((row, rowIndex) => {
            const citationDate   = excelDateToISO(row['__EMPTY']);
            const uploadDate     = excelDateToISO(row['__EMPTY_1']);
            const lastFolderDate = excelDateToISO(row['__EMPTY_2']);
            const fullName = String(row['AGENDA MENSUAL  AV. ARGENTINA'] || row['AGENDA MENSUAL  PLACILLA'] || row['AGENDA MENSUAL  MERC. PUERTO'] || '').trim();
            const rut = String(row['__EMPTY_5'] || '').trim();

            let officeRaw = String(row['__EMPTY_6'] || '').trim().toUpperCase();
            let office = defaultOffice;
            if (officeRaw.includes('PLACILLA')) office = 'PLACILLA';
            else if (officeRaw.includes('PUERTO') || officeRaw.includes('MERC.')) office = 'MERCADO PUERTO';
            else if (officeRaw.includes('ARGENTINA')) office = 'AV. ARGENTINA';

            let moral = String(row['__EMPTY_7'] || '').trim().toUpperCase() || 'NORMAL';
            let folderStatus = String(row['__EMPTY_8'] || '').trim().toUpperCase() || 'SIN ESPECIFICAR';

            let decision = String(row['__EMPTY_9'] || '').trim().toUpperCase();
            if (!decision) decision = 'PENDIENTE';
            else if (decision.includes('OTORGADO')) decision = 'OTORGADO';
            else if (decision.includes('DENEGADO') || decision.includes('RECHAZADO')) decision = 'DENEGADO';

            const leadTime = calculateLeadTime(citationDate, uploadDate);

            if (rut || fullName || citationDate) {
                allRecords.push({
                    id: `${sheetName.replace(/\s+/g, '-')}-${rowIndex}`,
                    month: recordMonth,
                    office,
                    citationDate,
                    uploadDate,
                    lastFolderDate,
                    moral,
                    folderStatus,
                    decision,
                    leadTime
                });
            }
        });
    });

    return allRecords;
}

/**
 * API: Upload y reprocesamiento de un nuevo archivo Excel
 * Recibe el buffer del archivo vía multer (req.file.buffer)
 */
export const uploadAndReprocessExcel = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo Excel.' });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        if (!['.xlsx', '.xls'].includes(ext)) {
            return res.status(400).json({ error: 'Formato no válido. Solo se aceptan archivos .xlsx o .xls.' });
        }

        console.log(`📁 Procesando Excel subido: ${req.file.originalname} (${req.file.size} bytes)`);

        // Guardar copia del archivo subido
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const uploadedPath = path.join(UPLOADS_DIR, `upload_${Date.now()}_${req.file.originalname}`);
        fs.writeFileSync(uploadedPath, req.file.buffer);

        // Parsear desde el buffer en memoria (más rápido que leer del disco)
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const records = parseWorkbook(workbook);

        if (records.length === 0) {
            return res.status(422).json({
                error: 'El archivo no contiene registros válidos. Verificá que la estructura de hojas y columnas sea la correcta.'
            });
        }

        // Actualizar caché y db.json
        dbCache = records;
        fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2), 'utf8');

        console.log(`✅ Reprocesamiento exitoso: ${records.length} registros cargados desde "${req.file.originalname}"`);

        // Retornar resumen inmediato para que el frontend pueda refrescar
        const total = records.length;
        const otorgados = records.filter(r => r.decision === 'OTORGADO').length;
        const denegados = records.filter(r => r.decision === 'DENEGADO').length;
        const pendientes = records.filter(r => r.decision === 'PENDIENTE').length;
        const moralAlerts = records.filter(r => r.moral === 'ALERTADA' || r.moral === 'REVISAR').length;
        const validLT = records.filter(r => r.leadTime !== null).map(r => r.leadTime);
        const avgLeadTime = validLT.length > 0
            ? Math.round(validLT.reduce((a, b) => a + b, 0) / validLT.length) : 0;
        const offices = [...new Set(records.map(r => r.office))];
        const months = [...new Set(records.map(r => r.month))];

        res.json({
            success: true,
            filename: req.file.originalname,
            records: total,
            summary: { total, otorgados, denegados, pendientes, moralAlerts, avgLeadTime },
            offices,
            months,
            message: `Se procesaron ${total.toLocaleString('es-ES')} registros exitosamente.`
        });
    } catch (err) {
        console.error('❌ Error al procesar el Excel subido:', err);
        res.status(500).json({ error: 'Error interno al procesar el archivo. Revisá los logs del servidor.' });
    }
};

/**
 * Retorna todos los datos filtrados por mes y oficina.
 */
function getFilteredRecords(month, office) {
    let result = dbCache;
    if (month && month !== 'all') {
        result = result.filter(r => r.month === month.toUpperCase());
    }
    if (office && office !== 'all') {
        result = result.filter(r => r.office === office.toUpperCase());
    }
    return result;
}

/**
 * API: Summary stats (Cards KPIs)
 */
export const getSummaryStats = (req, res) => {
    const { month, office } = req.query;
    const records = getFilteredRecords(month, office);

    const total = records.length;
    const otorgados = records.filter(r => r.decision === 'OTORGADO').length;
    const denegados = records.filter(r => r.decision === 'DENEGADO').length;
    const pendientes = records.filter(r => r.decision === 'PENDIENTE').length;
    
    // Alertas morales totales
    const moralAlertsRecs = records.filter(r => r.moral === 'ALERTADA' || r.moral === 'REVISAR');
    const moralAlerts = moralAlertsRecs.length;

    // Calcular efectividad del filtro moral: de las alertas morales, cuántas terminaron en DENEGADO
    const moralDenegadas = moralAlertsRecs.filter(r => r.decision === 'DENEGADO').length;
    const moralEffectiveness = moralAlerts > 0 ? Math.round((moralDenegadas / moralAlerts) * 100) : 0;

    // Calcular promedio de tiempo de resolución (lead time)
    const validLeadTimes = records.filter(r => r.leadTime !== null).map(r => r.leadTime);
    const avgLeadTime = validLeadTimes.length > 0 
        ? Math.round(validLeadTimes.reduce((acc, curr) => acc + curr, 0) / validLeadTimes.length) 
        : 0;

    res.json({
        total,
        otorgados,
        denegados,
        pendientes,
        moralAlerts,
        moralEffectiveness,
        avgLeadTime
    });
};

/**
 * API: Agrupaciones mensuales (Tendencias)
 */
export const getMonthlyTrends = (req, res) => {
    const { office } = req.query;
    const records = getFilteredRecords('all', office);

    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO'];
    const data = months.map(m => {
        const monthRecs = records.filter(r => r.month === m);
        return {
            month: m,
            total: monthRecs.length,
            otorgados: monthRecs.filter(r => r.decision === 'OTORGADO').length,
            denegados: monthRecs.filter(r => r.decision === 'DENEGADO').length
        };
    });

    res.json(data);
};

/**
 * API: Distribución por Sede/Oficina
 */
export const getOfficeDistribution = (req, res) => {
    const { month } = req.query;
    const records = getFilteredRecords(month, 'all');

    const offices = ['AV. ARGENTINA', 'PLACILLA', 'MERCADO PUERTO'];
    const data = offices.map(off => {
        const offRecs = records.filter(r => r.office === off);
        
        // Calcular lead time promedio específico de esta sede
        const validLeadTimes = offRecs.filter(r => r.leadTime !== null).map(r => r.leadTime);
        const avgLeadTime = validLeadTimes.length > 0 
            ? Math.round(validLeadTimes.reduce((acc, curr) => acc + curr, 0) / validLeadTimes.length) 
            : 0;

        return {
            office: off,
            value: offRecs.length,
            otorgados: offRecs.filter(r => r.decision === 'OTORGADO').length,
            denegados: offRecs.filter(r => r.decision === 'DENEGADO').length,
            avgLeadTime
        };
    });

    res.json(data);
};

/**
 * API: Distribución del Estado de la Carpeta (Histograma)
 */
export const getFolderStatusDistribution = (req, res) => {
    const { month, office } = req.query;
    const records = getFilteredRecords(month, office);

    const statusMap = {};
    records.forEach(r => {
        const status = r.folderStatus || 'SIN ESPECIFICAR';
        if (!statusMap[status]) statusMap[status] = 0;
        statusMap[status]++;
    });

    // Convertir a array y ordenar de mayor a menor frecuencia sin truncamiento
    const data = Object.keys(statusMap).map(key => ({
        status: key,
        value: statusMap[key]
    })).sort((a, b) => b.value - a.value);

    res.json(data);
};

/**
 * API: Datos del Histograma de Dispersión (Scatter Plot)
 */
export const getScatterData = (req, res) => {
    const { month, office } = req.query;
    const records = getFilteredRecords(month, office);

    // Filtrar únicamente los registros que tengan leadTime válido para dispersión
    const validRecords = records.filter(r => r.leadTime !== null && r.citationDate);

    // Agrupar los registros por fecha de citación y por sede para no sobrecargar el gráfico
    // Enviamos el tiempo promedio de resolución y el volumen diario por sede
    const grouped = {};
    validRecords.forEach(r => {
        const key = `${r.citationDate}-${r.office}`;
        if (!grouped[key]) {
            grouped[key] = {
                date: r.citationDate,
                office: r.office,
                leadTimes: [],
                otorgados: 0,
                denegados: 0
            };
        }
        grouped[key].leadTimes.push(r.leadTime);
        if (r.decision === 'OTORGADO') grouped[key].otorgados++;
        else if (r.decision === 'DENEGADO') grouped[key].denegados++;
    });

    const data = Object.keys(grouped).map(key => {
        const g = grouped[key];
        const avgLeadTime = Math.round(g.leadTimes.reduce((acc, curr) => acc + curr, 0) / g.leadTimes.length);
        return {
            date: g.date,
            office: g.office,
            avgLeadTime,
            volume: g.leadTimes.length,
            otorgados: g.otorgados,
            denegados: g.denegados
        };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(data);
};

/**
 * API: Heatmap de actividad diaria (día de la semana × mes)
 */
export const getHeatmapData = (req, res) => {
    const { office } = req.query;
    const records = getFilteredRecords('all', office);

    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO'];
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    // Build a month × dayOfWeek matrix
    const matrix = [];
    months.forEach(month => {
        days.forEach((day, dayIndex) => {
            const count = records.filter(r => {
                if (r.month !== month) return false;
                if (!r.citationDate) return false;
                const d = new Date(r.citationDate);
                return d.getDay() === dayIndex;
            }).length;
            matrix.push({ month, day, dayIndex, count });
        });
    });

    res.json(matrix);
};

/**
 * API: Radar Chart — 5 KPIs normalizados por sede
 * Axes: volumen, aprobacion, velocidad, puntualidad, integridad
 */
export const getRadarData = (req, res) => {
    const { month } = req.query;
    const records = getFilteredRecords(month, 'all');

    const offices = ['AV. ARGENTINA', 'PLACILLA', 'MERCADO PUERTO'];
    const FAST_THRESHOLD = 5; // días considerados "puntual"

    const raw = offices.map(off => {
        const offRecs = records.filter(r => r.office === off);
        const total = offRecs.length || 1;
        const otorgados = offRecs.filter(r => r.decision === 'OTORGADO').length;
        const moralAlerts = offRecs.filter(r => r.moral === 'ALERTADA' || r.moral === 'REVISAR').length;
        const validLT = offRecs.filter(r => r.leadTime !== null).map(r => r.leadTime);
        const avgLT = validLT.length > 0
            ? validLT.reduce((a, b) => a + b, 0) / validLT.length
            : 15;
        const fastCount = validLT.filter(lt => lt <= FAST_THRESHOLD).length;

        return {
            office: off,
            totalRaw: total,
            aprobacion: otorgados / total,
            velocidad: Math.max(0, 1 - (avgLT / 20)),   // 20 días = límite máximo
            puntualidad: fastCount / (validLT.length || 1),
            integridad: 1 - (moralAlerts / total)
        };
    });

    // Normalize volumen relative to max
    const maxVol = Math.max(...raw.map(r => r.totalRaw));
    const data = raw.map(r => ({
        office: r.office,
        volumen: maxVol > 0 ? r.totalRaw / maxVol : 0,
        aprobacion: r.aprobacion,
        velocidad: r.velocidad,
        puntualidad: r.puntualidad,
        integridad: r.integridad
    }));

    res.json(data);
};

/**
 * API: Restablece los datos originales eliminando db.json y volviendo a procesar la planilla madre.
 */
export const resetDatabase = (req, res) => {
    try {
        console.log('🔄 Restableciendo base de datos al Excel original...');
        
        // 1. Eliminar db.json si existe
        if (fs.existsSync(DB_PATH)) {
            fs.unlinkSync(DB_PATH);
        }

        // 2. Volver a inicializar
        initDatabase();

        console.log(`✅ Base de datos restablecida. Registros en caché: ${dbCache.length}`);

        // 3. Devolver respuesta de éxito con los datos originales
        const total = dbCache.length;
        const otorgados = dbCache.filter(r => r.decision === 'OTORGADO').length;
        const denegados = dbCache.filter(r => r.decision === 'DENEGADO').length;
        const pendientes = dbCache.filter(r => r.decision === 'PENDIENTE').length;
        const moralAlerts = dbCache.filter(r => r.moral === 'ALERTADA' || r.moral === 'REVISAR').length;
        const validLT = dbCache.filter(r => r.leadTime !== null).map(r => r.leadTime);
        const avgLeadTime = validLT.length > 0
            ? Math.round(validLT.reduce((a, b) => a + b, 0) / validLT.length) : 0;
        const offices = [...new Set(dbCache.map(r => r.office))];
        const months = [...new Set(dbCache.map(r => r.month))];

        res.json({
            success: true,
            records: total,
            summary: { total, otorgados, denegados, pendientes, moralAlerts, avgLeadTime },
            offices,
            months,
            message: 'Se han restablecido los datos originales de la planilla madre exitosamente.'
        });
    } catch (err) {
        console.error('❌ Error al restablecer la base de datos:', err);
        res.status(500).json({ error: 'Error interno al restablecer los datos. Revisá los logs.' });
    }
};
