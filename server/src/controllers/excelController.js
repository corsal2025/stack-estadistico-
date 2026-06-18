import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const EXCEL_PATH = path.resolve('../OTROS/DETALLE CARPETAS DEPTO. LICENCIAS DE CONDUCIR 2026.xlsx');
const DB_DIR = path.resolve('../data');
const DB_PATH = path.resolve('../data/db.json');

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
        const sheetNames = workbook.SheetNames;
        
        let allRecords = [];

        // Hojas que queremos omitir (ej. plantillas, correos, etc.)
        const skipSheets = [
            'PLANTILLA MODELO AV. ARGENTINA',
            'PLANTILLA MODELO PLACILLA',
            'PLANTILLA MODELO MERC. PUERTO',
            'ESCANEADAS Y SUBIDAS',
            'CORREOS CAMBIO DE DOMICLIO'
        ];

        sheetNames.forEach(sheetName => {
            if (skipSheets.includes(sheetName)) return;

            const worksheet = workbook.Sheets[sheetName];
            // Obtener datos crudos
            const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

            if (rawRows.length < 2) return; // Omitir si no hay datos

            // Detectar el mapeo de columnas basándose en la primera fila de cabeceras en las hojas
            // O mapear directamente según la estructura física de celdas
            const headers = rawRows[0];
            
            // La fila 0 es la cabecera real en español. Procesamos a partir de la fila 1
            const dataRows = rawRows.slice(1);

            // Determinar la oficina basándose en el nombre de la hoja
            let defaultOffice = 'AV. ARGENTINA';
            if (sheetName.toUpperCase().includes('PLACILLA')) {
                defaultOffice = 'PLACILLA';
            } else if (sheetName.toUpperCase().includes('PUERTO') || sheetName.toUpperCase().includes('MERC.')) {
                defaultOffice = 'MERCADO PUERTO';
            }

            // Determinar el mes
            const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO'];
            let recordMonth = 'ENERO';
            for (let m of months) {
                if (sheetName.toUpperCase().includes(m)) {
                    recordMonth = m;
                    break;
                }
            }

            dataRows.forEach((row, rowIndex) => {
                // Leer valores de columnas basadas en llaves por defecto (__EMPTY_X)
                const citationDateRaw = row['__EMPTY'];
                const uploadDateRaw = row['__EMPTY_1'];
                const lastFolderDateRaw = row['__EMPTY_2'];
                
                // Mapear Fechas
                const citationDate = excelDateToISO(citationDateRaw);
                const uploadDate = excelDateToISO(uploadDateRaw);
                const lastFolderDate = excelDateToISO(lastFolderDateRaw);
                
                // Mapear Textos
                const name = String(row['__EMPTY_3'] || '').trim();
                const lastName = String(row['__EMPTY_4'] || '').trim();
                const fullName = String(row['AGENDA MENSUAL  AV. ARGENTINA'] || row['AGENDA MENSUAL  PLACILLA'] || row['AGENDA MENSUAL  MERC. PUERTO'] || '').trim();
                const rut = String(row['__EMPTY_5'] || '').trim();
                
                // Limpieza de Oficina
                let officeRaw = String(row['__EMPTY_6'] || '').trim().toUpperCase();
                let office = defaultOffice;
                if (officeRaw.includes('PLACILLA')) office = 'PLACILLA';
                else if (officeRaw.includes('PUERTO') || officeRaw.includes('MERC.')) office = 'MERCADO PUERTO';
                else if (officeRaw.includes('ARGENTINA')) office = 'AV. ARGENTINA';

                // Variables estadísticas
                let moral = String(row['__EMPTY_7'] || '').trim().toUpperCase();
                if (!moral) moral = 'NORMAL';
                
                let folderStatus = String(row['__EMPTY_8'] || '').trim().toUpperCase();
                if (!folderStatus) folderStatus = 'SIN ESPECIFICAR';

                let decision = String(row['__EMPTY_9'] || '').trim().toUpperCase();
                if (!decision) {
                    decision = 'PENDIENTE';
                } else if (decision.includes('OTORGADO')) {
                    decision = 'OTORGADO';
                } else if (decision.includes('DENEGADO') || decision.includes('RECHAZADO')) {
                    decision = 'DENEGADO';
                }

                // Lead time
                const leadTime = calculateLeadTime(citationDate, uploadDate);

                // Solo agregar si hay datos mínimos válidos
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

        // Guardar físicamente
        fs.writeFileSync(DB_PATH, JSON.stringify(allRecords, null, 2), 'utf8');
        dbCache = allRecords;
        console.log(`Procesamiento finalizado. Guardados ${dbCache.length} registros en la base de datos.`);
    } catch (e) {
        console.error('Error al inicializar la base de datos local:', e);
    }
}

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
