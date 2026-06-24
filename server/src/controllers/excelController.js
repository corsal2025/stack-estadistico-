import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../');

const EXCEL_PATH = process.env.EXCEL_PATH || path.resolve(PROJECT_ROOT, 'OTROS/DETALLE CARPETAS DEPTO. LICENCIAS DE CONDUCIR 2026.xlsx');
const DB_DIR = path.resolve(PROJECT_ROOT, 'data');
const DB_PATH = path.resolve(PROJECT_ROOT, 'data/db.json');
const UPLOADS_DIR = path.resolve(PROJECT_ROOT, 'data/uploads');

// Caché en memoria de los registros procesados
let dbCache = [];

/**
 * Normaliza un RUT chileno a formato estándar cuerpo-DV (ej. 12345678-K).
 */
export function normalizeRut(rutStr) {
    if (!rutStr) return '';
    const clean = String(rutStr).replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) return clean;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    return `${body}-${dv}`;
}

/**
 * Convierte un número serial de fecha de Excel, un objeto Date o un string de fecha a una cadena ISO AAAA-MM-DD.
 */
export function excelDateToISO(serial) {
    if (!serial) return null;

    // Si ya es un objeto Date
    if (serial instanceof Date) {
        if (isNaN(serial.getTime())) return null;
        return serial.toISOString().split('T')[0];
    }

    // Si es un número serial de Excel (o string numérico que representa el serial)
    if (!isNaN(serial) && typeof serial !== 'object') {
        try {
            const num = Number(serial);
            if (num <= 0) return null;
            // Corrección de época de Excel (1 de enero de 1900 es el día 1)
            const date = new Date(Math.round((num - 25569) * 86400 * 1000));
            if (isNaN(date.getTime())) return null;
            return date.toISOString().split('T')[0];
        } catch {
            return null;
        }
    }

    // Si es un string de fecha (ej. "2026-03-15", "15/03/2026", "15-03-2026")
    if (typeof serial === 'string') {
        const cleaned = serial.trim();
        if (!cleaned) return null;

        // Intentar parsear formato DD/MM/AAAA o DD-MM-AAAA
        const dmyPattern = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
        const match = cleaned.match(dmyPattern);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // 0-indexed
            const year = parseInt(match[3], 10);
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        }

        // Parseo directo estándar de JS Date
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
    }

    return null;
}

/**
 * Calcula la diferencia de días entre dos fechas (AAAA-MM-DD).
 */
export function calculateLeadTime(startDateStr, endDateStr) {
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
            logger.info('Existing JSON database found', { path: DB_PATH });
            const raw = fs.readFileSync(DB_PATH, 'utf8');
            dbCache = JSON.parse(raw);
            logger.info(`Database loaded: ${dbCache.length} records in memory.`);
            return;
        }

        logger.info('Initializing Excel parsing...');
        if (!fs.existsSync(EXCEL_PATH)) {
            logger.error(`Critical error: Excel file not found at ${EXCEL_PATH}`);
            return;
        }

        const workbook = xlsx.readFile(EXCEL_PATH);
        const allRecords = parseWorkbook(workbook);

        // Guardar físicamente
        fs.writeFileSync(DB_PATH, JSON.stringify(allRecords, null, 2), 'utf8');
        dbCache = allRecords;
        logger.info(`Processing complete. Saved ${dbCache.length} records to database.`);
    } catch (e) {
        logger.error('Error initializing local database', { message: e.message, stack: e.stack });
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
            let folderStatus = canonicalFolderStatus(row['__EMPTY_8']);

            let decision = String(row['__EMPTY_9'] || '').trim().toUpperCase();
            if (!decision) decision = 'PENDIENTE';
            else if (decision.includes('OTORGADO')) decision = 'OTORGADO';
            else if (decision.includes('DENEGADO') || decision.includes('RECHAZADO')) decision = 'DENEGADO';
            else decision = canonicalDecision(decision);

            const leadTime = calculateLeadTime(citationDate, uploadDate);

            // En los cambios de domicilio con correo, __EMPTY_2 trae la comuna
            // de destino (texto) en lugar de una fecha. La capturamos cuando no
            // es una fecha válida ni un número.
            const rawE2 = String(row['__EMPTY_2'] || '').trim();
            const comuna = (!lastFolderDate && rawE2 && Number.isNaN(Number(rawE2)))
                ? rawE2.toUpperCase()
                : null;

            if (rut || fullName || citationDate) {
                allRecords.push({
                    id: `${sheetName.replace(/\s+/g, '-')}-${rowIndex}`,
                    month: recordMonth,
                    office,
                    rut,
                    fullName,
                    citationDate,
                    uploadDate,
                    lastFolderDate,
                    comuna,
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

        logger.info('Processing uploaded Excel file', {
            filename: req.file.originalname,
            size: req.file.size
        });

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

        logger.info('Excel reprocessing successful', {
            filename: req.file.originalname,
            records: records.length
        });

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
        const traceId = randomUUID();
        logger.error('Error processing uploaded Excel file', {
            traceId,
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({
            error: 'Error interno al procesar el archivo. Revisá los logs del servidor.',
            traceId
        });
    }
};

/**
 * Retorna todos los datos filtrados por mes y oficina.
 */
// Normaliza estados de carpeta: colapsa espacios y unifica variantes/typos
// conocidos de la planilla, para que los conteos sean concordantes en todo
// el dashboard (ej. "CAMBIO DE DOM SUBIDO CON CORREO" == "CAMBIO DOM. SUBIDO CON CORREO").
const FOLDER_STATUS_ALIASES = {
    'CAMBIO DE DOM SUBIDO CON CORREO': 'CAMBIO DOM. SUBIDO CON CORREO'
};

export function canonicalFolderStatus(s) {
    const v = String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (!v) return 'SIN ESPECIFICAR';
    return FOLDER_STATUS_ALIASES[v] || v;
}

// Normaliza decisiones: unifica typos como "ESPERA EXÁMEN" == "ESPERA EXAMEN".
const DECISION_ALIASES = {
    'ESPERA EXÁMEN': 'ESPERA EXAMEN'
};

export function canonicalDecision(s) {
    const v = String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (!v) return 'PENDIENTE';
    return DECISION_ALIASES[v] || v;
}

// Decisiones que cuentan como resolución final; el resto son estados intermedios.
const FINAL_DECISIONS = new Set(['OTORGADO', 'DENEGADO', 'PENDIENTE']);

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
export const getSummaryStats = (req, res, next) => {
    try {
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
    } catch (err) { next(err); }
};

/**
 * API: Agrupaciones mensuales (Tendencias)
 */
export const getMonthlyTrends = (req, res, next) => {
    try {
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
    } catch (err) { next(err); }
};

/**
 * API: Distribución por Sede/Oficina
 */
export const getOfficeDistribution = (req, res, next) => {
    try {
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
    } catch (err) { next(err); }
};

/**
 * API: Distribución del Estado de la Carpeta (Histograma)
 */
export const getFolderStatusDistribution = (req, res, next) => {
    try {
    const { month, office } = req.query;
    const records = getFilteredRecords(month, office);

    const statusMap = {};
    records.forEach(r => {
        const status = canonicalFolderStatus(r.folderStatus);
        if (!statusMap[status]) statusMap[status] = 0;
        statusMap[status]++;
    });

    // Convertir a array y ordenar de mayor a menor frecuencia sin truncamiento
    const data = Object.keys(statusMap).map(key => ({
        status: key,
        value: statusMap[key]
    })).sort((a, b) => b.value - a.value);

    res.json(data);
    } catch (err) { next(err); }
};

/**
 * API: Cambios de domicilio subidos con correo, contados por comuna de destino.
 * Filtrable por mes y sede como el resto del dashboard.
 */
export const getDomicilioCorreoByComuna = (req, res, next) => {
    try {
        const { month, office } = req.query;
        const records = getFilteredRecords(month, office);

        const correoDom = records.filter(r => {
            const s = (r.folderStatus || '').toUpperCase();
            return s.includes('CORREO') && s.includes('DOM');
        });

        // Agrupamos por nombre normalizado (sin acentos / espacios colapsados)
        // para que "QUILPUÉ" y "QUILPUE" cuenten como una sola comuna, pero
        // mostramos la grafía original más frecuente.
        const groups = {};
        correoDom.forEach(r => {
            const orig = r.comuna || 'SIN COMUNA';
            const key = orig.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
            if (!groups[key]) groups[key] = { value: 0, displays: {} };
            groups[key].value += 1;
            groups[key].displays[orig] = (groups[key].displays[orig] || 0) + 1;
        });

        const byComuna = Object.values(groups)
            .map(g => {
                const comuna = Object.keys(g.displays).sort((a, b) => g.displays[b] - g.displays[a])[0];
                return { comuna, value: g.value };
            })
            .sort((a, b) => b.value - a.value);

        res.json({ total: correoDom.length, comunas: byComuna.length, byComuna });
    } catch (err) { next(err); }
};

/**
 * API: Catastro de registros filtrados por estado de carpeta (ej. SIN ESPECIFICAR).
 * Devuelve el detalle de cada carpeta para auditar qué son esos procesos.
 */
export const getRecordsByStatus = (req, res, next) => {
    try {
        const { month, office, status } = req.query;
        let records = getFilteredRecords(month, office);

        if (status && status.toLowerCase() !== 'all') {
            const target = canonicalFolderStatus(status);
            records = records.filter(r => canonicalFolderStatus(r.folderStatus) === target);
        }

        const data = records.map(r => ({
            rut: r.rut || '',
            nombre: r.fullName || '',
            sede: r.office,
            mes: r.month,
            fechaCitacion: r.citationDate || '',
            comuna: r.comuna || '',
            decision: r.decision,
            estado: canonicalFolderStatus(r.folderStatus)
        }));

        res.json({ total: data.length, records: data });
    } catch (err) { next(err); }
};

/**
 * API: Distribución de decisiones (resolución), normalizada. Marca como
 * "intermediate" los estados que no son Otorgado/Denegado/Pendiente, para
 * mostrarlos como un item aparte sin perder ningún registro.
 */
export const getDecisionDistribution = (req, res, next) => {
    try {
        const { month, office } = req.query;
        const records = getFilteredRecords(month, office);

        const counts = {};
        records.forEach(r => {
            const d = canonicalDecision(r.decision);
            counts[d] = (counts[d] || 0) + 1;
        });

        const decisions = Object.keys(counts)
            .map(decision => ({ decision, value: counts[decision], intermediate: !FINAL_DECISIONS.has(decision) }))
            .sort((a, b) => b.value - a.value);

        const intermediateTotal = decisions.filter(d => d.intermediate).reduce((a, b) => a + b.value, 0);

        res.json({ total: records.length, intermediateTotal, decisions });
    } catch (err) { next(err); }
};

/**
 * API: Datos del Histograma de Dispersión (Scatter Plot)
 */
export const getScatterData = (req, res, next) => {
    try {
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
    } catch (err) { next(err); }
};

/**
 * API: Heatmap de actividad diaria (día de la semana × mes)
 */
export const getHeatmapData = (req, res, next) => {
    try {
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
    } catch (err) { next(err); }
};

/**
 * API: Radar Chart — 5 KPIs normalizados por sede
 * Axes: volumen, aprobacion, velocidad, puntualidad, integridad
 */
export const getRadarData = (req, res, next) => {
    try {
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
    } catch (err) { next(err); }
};

/**
 * Test escape hatch: injects data directly into the in-memory cache.
 * Only usable when VITEST env var is present (vitest sets it automatically).
 */
export function _setDbCacheForTesting(data) {
    dbCache = data;
}

/**
 * API: Elimina TODOS los datos del sistema, dejándolo vacío (0 registros).
 * A diferencia de resetDatabase (que restaura la planilla madre), esto deja
 * la base en blanco para que el usuario pueda cargar datos nuevos desde cero.
 * El estado vacío persiste entre reinicios (db.json queda como []).
 */
export const clearDatabase = (req, res) => {
    try {
        dbCache = [];
        if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), 'utf8');

        logger.info('Database cleared by user request — system is now empty');

        res.json({
            success: true,
            records: 0,
            summary: { total: 0, otorgados: 0, denegados: 0, pendientes: 0, moralAlerts: 0, avgLeadTime: 0 },
            offices: [],
            months: [],
            message: 'Se eliminaron todos los datos. El sistema está vacío y listo para cargar datos nuevos.'
        });
    } catch (err) {
        const traceId = randomUUID();
        logger.error('Error clearing database', {
            traceId,
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({
            error: 'Error interno al eliminar los datos. Revisá los logs.',
            traceId
        });
    }
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

        logger.info('Database reset successful', { records: dbCache.length });

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
        const traceId = randomUUID();
        logger.error('Error resetting database', {
            traceId,
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({
            error: 'Error interno al restablecer los datos. Revisá los logs.',
            traceId
        });
    }
};
