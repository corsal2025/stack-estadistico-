/**
 * Backend unit + integration tests for excelController.js
 * Tests: utility functions, stats API handlers, upload handler, error scenarios
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// --- Module mocks (hoisted by vitest before any imports) ---

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => '[]'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn()
  }
}))

vi.mock('xlsx', () => ({
  default: {
    readFile: vi.fn(),
    read: vi.fn(),
    utils: {
      sheet_to_json: vi.fn(() => [])
    }
  }
}))

vi.mock('../utils/logger.js', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}))

// Import after mocks are set up
import fs from 'fs'
import xlsx from 'xlsx'
import logger from '../utils/logger.js'
import {
  excelDateToISO,
  calculateLeadTime,
  getSummaryStats,
  getMonthlyTrends,
  getOfficeDistribution,
  getFolderStatusDistribution,
  getScatterData,
  getHeatmapData,
  uploadAndReprocessExcel,
  resetDatabase,
  _setDbCacheForTesting
} from '../controllers/excelController.js'
import { validateStatsQuery } from '../middleware/validateRequest.js'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const createRecord = (overrides = {}) => ({
  id: 'test-1',
  month: 'ENERO',
  office: 'AV. ARGENTINA',
  citationDate: '2023-01-05',
  uploadDate: '2023-01-10',
  lastFolderDate: '2023-01-10',
  moral: 'NORMAL',
  folderStatus: 'COMPLETA',
  decision: 'OTORGADO',
  leadTime: 5,
  ...overrides
})

const makeMockRes = () => ({
  json: vi.fn(),
  status: vi.fn().mockReturnThis()
})

// ---------------------------------------------------------------------------
// 1. excelDateToISO — pure utility
// ---------------------------------------------------------------------------

describe('excelDateToISO', () => {
  it('returns null for null input', () => {
    expect(excelDateToISO(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(excelDateToISO(undefined)).toBeNull()
  })

  it('returns null for 0 (falsy serial)', () => {
    expect(excelDateToISO(0)).toBeNull()
  })

  it('returns null for NaN', () => {
    expect(excelDateToISO(NaN)).toBeNull()
  })

  it('returns null for non-numeric string', () => {
    expect(excelDateToISO('abc')).toBeNull()
  })

  it('converts Excel serial 25569 to 1970-01-01 (Unix epoch)', () => {
    expect(excelDateToISO(25569)).toBe('1970-01-01')
  })

  it('converts Excel serial 44927 to 2023-01-01', () => {
    expect(excelDateToISO(44927)).toBe('2023-01-01')
  })

  it('converts numeric string that represents a valid serial', () => {
    const result = excelDateToISO('44927')
    // String coercion happens, should return a valid date string
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ---------------------------------------------------------------------------
// 2. calculateLeadTime — pure utility
// ---------------------------------------------------------------------------

describe('calculateLeadTime', () => {
  it('returns null when startDate is null', () => {
    expect(calculateLeadTime(null, '2023-01-10')).toBeNull()
  })

  it('returns null when endDate is null', () => {
    expect(calculateLeadTime('2023-01-01', null)).toBeNull()
  })

  it('returns null for both null inputs', () => {
    expect(calculateLeadTime(null, null)).toBeNull()
  })

  it('returns null for empty string dates', () => {
    expect(calculateLeadTime('', '')).toBeNull()
  })

  it('returns null for invalid date strings', () => {
    expect(calculateLeadTime('not-a-date', '2023-01-10')).toBeNull()
  })

  it('returns 0 when start and end are the same day', () => {
    expect(calculateLeadTime('2023-01-01', '2023-01-01')).toBe(0)
  })

  it('returns correct positive day count', () => {
    expect(calculateLeadTime('2023-01-01', '2023-01-06')).toBe(5)
  })

  it('returns null when end is before start (negative range)', () => {
    expect(calculateLeadTime('2023-01-10', '2023-01-01')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 3. getSummaryStats
// ---------------------------------------------------------------------------

describe('getSummaryStats', () => {
  beforeEach(() => _setDbCacheForTesting([]))

  it('returns all-zero stats for empty database', () => {
    const req = { query: {} }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      total: 0,
      otorgados: 0,
      denegados: 0,
      pendientes: 0,
      moralAlerts: 0,
      avgLeadTime: 0
    }))
  })

  it('returns correct total record count', () => {
    _setDbCacheForTesting([
      createRecord({ decision: 'OTORGADO' }),
      createRecord({ id: 'r2', decision: 'DENEGADO' }),
      createRecord({ id: 'r3', decision: 'PENDIENTE' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 3 }))
  })

  it('counts OTORGADO decisions correctly', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', decision: 'OTORGADO' }),
      createRecord({ id: 'r2', decision: 'OTORGADO' }),
      createRecord({ id: 'r3', decision: 'DENEGADO' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ otorgados: 2 }))
  })

  it('counts DENEGADO decisions correctly', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', decision: 'DENEGADO' }),
      createRecord({ id: 'r2', decision: 'OTORGADO' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ denegados: 1 }))
  })

  it('counts PENDIENTE decisions correctly', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', decision: 'PENDIENTE' }),
      createRecord({ id: 'r2', decision: 'PENDIENTE' }),
      createRecord({ id: 'r3', decision: 'OTORGADO' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ pendientes: 2 }))
  })

  it('counts ALERTADA moral records as moralAlerts', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', moral: 'ALERTADA' }),
      createRecord({ id: 'r2', moral: 'NORMAL' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ moralAlerts: 1 }))
  })

  it('counts REVISAR moral records as moralAlerts', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', moral: 'REVISAR' }),
      createRecord({ id: 'r2', moral: 'REVISAR' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ moralAlerts: 2 }))
  })

  it('calculates average lead time across valid records', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', leadTime: 4 }),
      createRecord({ id: 'r2', leadTime: 6 }),
      createRecord({ id: 'r3', leadTime: null })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ avgLeadTime: 5 }))
  })

  it('calculates moralEffectiveness as % of moral alerts that were DENEGADO', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', moral: 'ALERTADA', decision: 'DENEGADO' }),
      createRecord({ id: 'r2', moral: 'ALERTADA', decision: 'OTORGADO' }),
      createRecord({ id: 'r3', moral: 'NORMAL',   decision: 'OTORGADO' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ moralEffectiveness: 50 }))
  })

  it('filters records by month query param', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', month: 'ENERO' }),
      createRecord({ id: 'r2', month: 'FEBRERO' }),
      createRecord({ id: 'r3', month: 'FEBRERO' })
    ])
    const req = { query: { month: 'FEBRERO' } }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 2 }))
  })

  it('filters records by office query param', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', office: 'AV. ARGENTINA' }),
      createRecord({ id: 'r2', office: 'PLACILLA' }),
      createRecord({ id: 'r3', office: 'PLACILLA' })
    ])
    const req = { query: { office: 'PLACILLA' } }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 2 }))
  })

  it('treats month="all" as no month filter', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', month: 'ENERO' }),
      createRecord({ id: 'r2', month: 'FEBRERO' })
    ])
    const req = { query: { month: 'all' } }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 2 }))
  })

  it('treats office="all" as no office filter', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', office: 'AV. ARGENTINA' }),
      createRecord({ id: 'r2', office: 'PLACILLA' })
    ])
    const req = { query: { office: 'all' } }
    const res = makeMockRes()
    getSummaryStats(req, res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 2 }))
  })
})

// ---------------------------------------------------------------------------
// 4. getMonthlyTrends
// ---------------------------------------------------------------------------

describe('getMonthlyTrends', () => {
  beforeEach(() => _setDbCacheForTesting([]))

  it('always returns data for all 7 months', () => {
    const req = { query: {} }
    const res = makeMockRes()
    getMonthlyTrends(req, res)
    const result = res.json.mock.calls[0][0]
    expect(result).toHaveLength(7)
    const monthNames = result.map(r => r.month)
    expect(monthNames).toContain('ENERO')
    expect(monthNames).toContain('JULIO')
  })

  it('counts total, otorgados, denegados per month', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', month: 'MARZO', decision: 'OTORGADO' }),
      createRecord({ id: 'r2', month: 'MARZO', decision: 'DENEGADO' }),
      createRecord({ id: 'r3', month: 'ENERO', decision: 'OTORGADO' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getMonthlyTrends(req, res)
    const result = res.json.mock.calls[0][0]
    const marzo = result.find(r => r.month === 'MARZO')
    expect(marzo.total).toBe(2)
    expect(marzo.otorgados).toBe(1)
    expect(marzo.denegados).toBe(1)
  })

  it('filters by office when provided', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', month: 'ENERO', office: 'PLACILLA' }),
      createRecord({ id: 'r2', month: 'ENERO', office: 'AV. ARGENTINA' })
    ])
    const req = { query: { office: 'PLACILLA' } }
    const res = makeMockRes()
    getMonthlyTrends(req, res)
    const result = res.json.mock.calls[0][0]
    const enero = result.find(r => r.month === 'ENERO')
    expect(enero.total).toBe(1)
  })

  it('returns zero totals for months with no data', () => {
    _setDbCacheForTesting([createRecord({ month: 'ENERO' })])
    const req = { query: {} }
    const res = makeMockRes()
    getMonthlyTrends(req, res)
    const result = res.json.mock.calls[0][0]
    const julio = result.find(r => r.month === 'JULIO')
    expect(julio.total).toBe(0)
    expect(julio.otorgados).toBe(0)
    expect(julio.denegados).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. getOfficeDistribution
// ---------------------------------------------------------------------------

describe('getOfficeDistribution', () => {
  beforeEach(() => _setDbCacheForTesting([]))

  it('always returns data for all 3 offices', () => {
    const req = { query: {} }
    const res = makeMockRes()
    getOfficeDistribution(req, res)
    const result = res.json.mock.calls[0][0]
    expect(result).toHaveLength(3)
    const officeNames = result.map(r => r.office)
    expect(officeNames).toContain('AV. ARGENTINA')
    expect(officeNames).toContain('PLACILLA')
    expect(officeNames).toContain('MERCADO PUERTO')
  })

  it('counts records per office', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', office: 'PLACILLA' }),
      createRecord({ id: 'r2', office: 'PLACILLA' }),
      createRecord({ id: 'r3', office: 'AV. ARGENTINA' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getOfficeDistribution(req, res)
    const result = res.json.mock.calls[0][0]
    const placilla = result.find(r => r.office === 'PLACILLA')
    expect(placilla.value).toBe(2)
  })

  it('calculates average lead time per office', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', office: 'AV. ARGENTINA', leadTime: 4 }),
      createRecord({ id: 'r2', office: 'AV. ARGENTINA', leadTime: 6 })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getOfficeDistribution(req, res)
    const result = res.json.mock.calls[0][0]
    const argentina = result.find(r => r.office === 'AV. ARGENTINA')
    expect(argentina.avgLeadTime).toBe(5)
  })

  it('filters by month when provided', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', office: 'AV. ARGENTINA', month: 'ENERO' }),
      createRecord({ id: 'r2', office: 'AV. ARGENTINA', month: 'FEBRERO' })
    ])
    const req = { query: { month: 'ENERO' } }
    const res = makeMockRes()
    getOfficeDistribution(req, res)
    const result = res.json.mock.calls[0][0]
    const argentina = result.find(r => r.office === 'AV. ARGENTINA')
    expect(argentina.value).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 6. getFolderStatusDistribution
// ---------------------------------------------------------------------------

describe('getFolderStatusDistribution', () => {
  beforeEach(() => _setDbCacheForTesting([]))

  it('returns empty array when database is empty', () => {
    const req = { query: {} }
    const res = makeMockRes()
    getFolderStatusDistribution(req, res)
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('groups records by folderStatus', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', folderStatus: 'COMPLETA' }),
      createRecord({ id: 'r2', folderStatus: 'COMPLETA' }),
      createRecord({ id: 'r3', folderStatus: 'INCOMPLETA' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getFolderStatusDistribution(req, res)
    const result = res.json.mock.calls[0][0]
    const completa = result.find(r => r.status === 'COMPLETA')
    expect(completa.value).toBe(2)
  })

  it('sorts results by frequency descending', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', folderStatus: 'INCOMPLETA' }),
      createRecord({ id: 'r2', folderStatus: 'COMPLETA' }),
      createRecord({ id: 'r3', folderStatus: 'COMPLETA' }),
      createRecord({ id: 'r4', folderStatus: 'COMPLETA' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getFolderStatusDistribution(req, res)
    const result = res.json.mock.calls[0][0]
    expect(result[0].status).toBe('COMPLETA')
    expect(result[0].value).toBe(3)
  })

  it('uses "SIN ESPECIFICAR" for records with empty folderStatus', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', folderStatus: '' })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getFolderStatusDistribution(req, res)
    const result = res.json.mock.calls[0][0]
    expect(result[0].status).toBe('SIN ESPECIFICAR')
  })
})

// ---------------------------------------------------------------------------
// 7. getScatterData
// ---------------------------------------------------------------------------

describe('getScatterData', () => {
  beforeEach(() => _setDbCacheForTesting([]))

  it('returns empty array when no records have leadTime', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', leadTime: null })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getScatterData(req, res)
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('groups records by date and office combination', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', citationDate: '2023-01-05', office: 'PLACILLA', leadTime: 4 }),
      createRecord({ id: 'r2', citationDate: '2023-01-05', office: 'PLACILLA', leadTime: 6 }),
      createRecord({ id: 'r3', citationDate: '2023-01-05', office: 'AV. ARGENTINA', leadTime: 3 })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getScatterData(req, res)
    const result = res.json.mock.calls[0][0]
    expect(result).toHaveLength(2)
  })

  it('calculates average leadTime per group', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', citationDate: '2023-01-05', office: 'AV. ARGENTINA', leadTime: 4 }),
      createRecord({ id: 'r2', citationDate: '2023-01-05', office: 'AV. ARGENTINA', leadTime: 6 })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getScatterData(req, res)
    const result = res.json.mock.calls[0][0]
    expect(result[0].avgLeadTime).toBe(5)
  })

  it('returns data sorted by date ascending', () => {
    _setDbCacheForTesting([
      createRecord({ id: 'r1', citationDate: '2023-03-10', office: 'PLACILLA', leadTime: 2 }),
      createRecord({ id: 'r2', citationDate: '2023-01-05', office: 'PLACILLA', leadTime: 3 })
    ])
    const req = { query: {} }
    const res = makeMockRes()
    getScatterData(req, res)
    const result = res.json.mock.calls[0][0]
    expect(result[0].date).toBe('2023-01-05')
    expect(result[1].date).toBe('2023-03-10')
  })
})

// ---------------------------------------------------------------------------
// 8. getHeatmapData
// ---------------------------------------------------------------------------

describe('getHeatmapData', () => {
  beforeEach(() => _setDbCacheForTesting([]))

  it('returns 49 matrix entries (7 months × 7 days)', () => {
    const req = { query: {} }
    const res = makeMockRes()
    getHeatmapData(req, res)
    const result = res.json.mock.calls[0][0]
    expect(result).toHaveLength(49)
  })

  it('each matrix entry has month, day, dayIndex, count properties', () => {
    const req = { query: {} }
    const res = makeMockRes()
    getHeatmapData(req, res)
    const result = res.json.mock.calls[0][0]
    const entry = result[0]
    expect(entry).toHaveProperty('month')
    expect(entry).toHaveProperty('day')
    expect(entry).toHaveProperty('dayIndex')
    expect(entry).toHaveProperty('count')
  })

  it('filters by office when provided', () => {
    // The heatmap groups by month + day-of-week.
    // We just verify that filtering by office reduces the total count
    // compared to no filter, rather than asserting a specific dayIndex
    // (which would be timezone-dependent in the test runner).
    _setDbCacheForTesting([
      createRecord({ id: 'r1', month: 'ENERO', office: 'PLACILLA',      citationDate: '2023-01-05' }),
      createRecord({ id: 'r2', month: 'ENERO', office: 'AV. ARGENTINA', citationDate: '2023-01-05' })
    ])

    // With office filter: only 1 record (PLACILLA)
    const reqFiltered = { query: { office: 'PLACILLA' } }
    const resFiltered = makeMockRes()
    getHeatmapData(reqFiltered, resFiltered)
    const filteredResult = resFiltered.json.mock.calls[0][0]
    const filteredTotal = filteredResult.reduce((sum, entry) => sum + entry.count, 0)

    // Without filter: 2 records
    const reqAll = { query: {} }
    const resAll = makeMockRes()
    getHeatmapData(reqAll, resAll)
    const allResult = resAll.json.mock.calls[0][0]
    const allTotal = allResult.reduce((sum, entry) => sum + entry.count, 0)

    expect(filteredTotal).toBe(1)
    expect(allTotal).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 9. uploadAndReprocessExcel
// ---------------------------------------------------------------------------

describe('uploadAndReprocessExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _setDbCacheForTesting([])
    // Default fs stubs
    fs.existsSync.mockReturnValue(true)
    fs.writeFileSync.mockImplementation(() => {})
    fs.mkdirSync.mockImplementation(() => {})
  })

  it('returns 400 when no file is attached to the request', () => {
    const req = { file: undefined }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    )
  })

  it('returns 400 for an invalid file extension (.pdf)', () => {
    const req = { file: { buffer: Buffer.from(''), originalname: 'data.pdf', size: 100 } }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('xlsx') })
    )
  })

  it('returns 400 for an invalid file extension (.txt)', () => {
    const req = { file: { buffer: Buffer.from(''), originalname: 'data.txt', size: 100 } }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('accepts .xls extension (legacy Excel)', () => {
    // Mock xlsx.read to return an empty workbook
    xlsx.read.mockReturnValue({ SheetNames: [], Sheets: {} })
    const req = { file: { buffer: Buffer.from(''), originalname: 'data.xls', size: 100 } }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    // Should not return 400 for extension (may return 422 for empty data)
    expect(res.status).not.toHaveBeenCalledWith(400)
  })

  it('returns 422 when workbook has no valid records', () => {
    xlsx.read.mockReturnValue({
      SheetNames: ['ENERO'],
      Sheets: { 'ENERO': {} }
    })
    xlsx.utils.sheet_to_json.mockReturnValue([]) // 0 rows → < 2 → skipped

    const req = { file: { buffer: Buffer.from(''), originalname: 'data.xlsx', size: 100 } }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    expect(res.status).toHaveBeenCalledWith(422)
  })

  it('returns 200 with summary on a valid .xlsx upload', () => {
    xlsx.read.mockReturnValue({
      SheetNames: ['ENERO'],
      Sheets: { 'ENERO': {} }
    })
    // Two rows: first is "header" row (skipped), second is data row
    xlsx.utils.sheet_to_json.mockReturnValue([
      { 'AGENDA MENSUAL  AV. ARGENTINA': 'ENCABEZADO' },
      {
        'AGENDA MENSUAL  AV. ARGENTINA': 'JUAN PEREZ',
        '__EMPTY':   44927,  // 2023-01-01 (citation)
        '__EMPTY_1': 44931,  // 2023-01-05 (upload)
        '__EMPTY_2': 44931,
        '__EMPTY_5': '12345678-9',
        '__EMPTY_6': '',
        '__EMPTY_7': 'NORMAL',
        '__EMPTY_8': 'COMPLETA',
        '__EMPTY_9': 'OTORGADO'
      }
    ])

    const req = { file: { buffer: Buffer.from(''), originalname: 'data.xlsx', size: 100 } }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        records: 1,
        summary: expect.objectContaining({ total: 1 })
      })
    )
  })

  it('writes db.json to disk on successful upload', () => {
    xlsx.read.mockReturnValue({
      SheetNames: ['ENERO'],
      Sheets: { 'ENERO': {} }
    })
    xlsx.utils.sheet_to_json.mockReturnValue([
      { 'AGENDA MENSUAL  AV. ARGENTINA': 'ENCABEZADO' },
      { 'AGENDA MENSUAL  AV. ARGENTINA': 'MARIA GONZALEZ', '__EMPTY': 44927, '__EMPTY_5': '98765432-1' }
    ])

    const req = { file: { buffer: Buffer.from(''), originalname: 'data.xlsx', size: 100 } }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    expect(fs.writeFileSync).toHaveBeenCalled()
  })

  it('returns 500 on unexpected internal error', () => {
    xlsx.read.mockImplementation(() => { throw new Error('Corrupt file') })

    const req = { file: { buffer: Buffer.from(''), originalname: 'data.xlsx', size: 100 } }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ---------------------------------------------------------------------------
// 10. validateStatsQuery middleware
// ---------------------------------------------------------------------------

describe('validateStatsQuery middleware', () => {
  const makeReq = (query = {}) => ({ query })
  const makeRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  })
  const makeNext = () => vi.fn()

  // --- Invalid month ---

  it('returns 400 for an unknown month value', () => {
    const req = makeReq({ month: 'TRECEAVO' })
    const res = makeRes()
    validateStatsQuery(req, res, makeNext())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid query parameters' }))
  })

  it('returns 400 for a numeric month value', () => {
    const req = makeReq({ month: '13' })
    const res = makeRes()
    validateStatsQuery(req, res, makeNext())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for an empty string month', () => {
    const req = makeReq({ month: '' })
    const res = makeRes()
    validateStatsQuery(req, res, makeNext())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for special-char month value', () => {
    const req = makeReq({ month: '<script>' })
    const res = makeRes()
    validateStatsQuery(req, res, makeNext())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  // --- Invalid office ---

  it('returns 400 for an unknown office value', () => {
    const req = makeReq({ office: 'OFICINA CENTRAL' })
    const res = makeRes()
    validateStatsQuery(req, res, makeNext())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for an empty string office', () => {
    const req = makeReq({ office: '' })
    const res = makeRes()
    validateStatsQuery(req, res, makeNext())
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for both month and office invalid — details includes both fields', () => {
    const req = makeReq({ month: 'BAD_MONTH', office: 'BAD_OFFICE' })
    const res = makeRes()
    validateStatsQuery(req, res, makeNext())
    expect(res.status).toHaveBeenCalledWith(400)
    const body = res.json.mock.calls[0][0]
    expect(body.details).toHaveLength(2)
  })

  it('error details contain a field name and message', () => {
    const req = makeReq({ month: 'UNKNOWN' })
    const res = makeRes()
    validateStatsQuery(req, res, makeNext())
    const body = res.json.mock.calls[0][0]
    expect(body.details[0]).toHaveProperty('field')
    expect(body.details[0]).toHaveProperty('message')
  })

  // --- Valid inputs — must call next() and not respond ---

  it('calls next() for a valid uppercase month', () => {
    const req = makeReq({ month: 'ENERO' })
    const res = makeRes()
    const next = makeNext()
    validateStatsQuery(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('calls next() for a valid lowercase month (case-insensitive)', () => {
    const req = makeReq({ month: 'enero' })
    const res = makeRes()
    const next = makeNext()
    validateStatsQuery(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('calls next() for month="all"', () => {
    const req = makeReq({ month: 'all' })
    const res = makeRes()
    const next = makeNext()
    validateStatsQuery(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('calls next() for a valid office value', () => {
    const req = makeReq({ office: 'PLACILLA' })
    const res = makeRes()
    const next = makeNext()
    validateStatsQuery(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('calls next() for office="all" (case-insensitive)', () => {
    const req = makeReq({ office: 'ALL' })
    const res = makeRes()
    const next = makeNext()
    validateStatsQuery(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('calls next() when query params are absent (both optional)', () => {
    const req = makeReq({})
    const res = makeRes()
    const next = makeNext()
    validateStatsQuery(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('calls next() for valid month + valid office combination', () => {
    const req = makeReq({ month: 'JULIO', office: 'MERCADO PUERTO' })
    const res = makeRes()
    const next = makeNext()
    validateStatsQuery(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 11. Error handling — traceId + logger (Phase 3)
// ---------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('uploadAndReprocessExcel — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _setDbCacheForTesting([])
    fs.existsSync.mockReturnValue(true)
    fs.writeFileSync.mockImplementation(() => {})
    fs.mkdirSync.mockImplementation(() => {})
  })

  it('returns traceId in body when xlsx.read throws', () => {
    xlsx.read.mockImplementation(() => { throw new Error('Corrupt XLSX') })
    const req = { file: { buffer: Buffer.from(''), originalname: 'data.xlsx', size: 100 } }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
    const body = res.json.mock.calls[0][0]
    expect(body).toHaveProperty('traceId')
    expect(body.traceId).toMatch(UUID_REGEX)
  })

  it('calls logger.error when xlsx.read throws', () => {
    xlsx.read.mockImplementation(() => { throw new Error('Corrupt XLSX') })
    const req = { file: { buffer: Buffer.from(''), originalname: 'data.xlsx', size: 100 } }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        traceId: expect.stringMatching(UUID_REGEX),
        message: 'Corrupt XLSX'
      })
    )
  })

  it('traceId in logger.error matches traceId in response', () => {
    xlsx.read.mockImplementation(() => { throw new Error('parse failure') })
    const req = { file: { buffer: Buffer.from(''), originalname: 'data.xlsx', size: 100 } }
    const res = makeMockRes()
    uploadAndReprocessExcel(req, res)
    const responseTraceId = res.json.mock.calls[0][0].traceId
    const loggedTraceId = logger.error.mock.calls[0][1].traceId
    expect(responseTraceId).toBe(loggedTraceId)
  })
})

describe('resetDatabase — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _setDbCacheForTesting([])
    fs.existsSync.mockReturnValue(true)
  })

  it('returns traceId in body when fs.unlinkSync throws', () => {
    fs.unlinkSync.mockImplementation(() => { throw new Error('Permission denied') })
    const req = {}
    const res = makeMockRes()
    resetDatabase(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
    const body = res.json.mock.calls[0][0]
    expect(body).toHaveProperty('traceId')
    expect(body.traceId).toMatch(UUID_REGEX)
  })

  it('calls logger.error when reset throws', () => {
    fs.unlinkSync.mockImplementation(() => { throw new Error('Permission denied') })
    const req = {}
    const res = makeMockRes()
    resetDatabase(req, res)
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        traceId: expect.stringMatching(UUID_REGEX),
        message: 'Permission denied'
      })
    )
  })

  it('traceId in logger.error matches traceId in response for resetDatabase', () => {
    fs.unlinkSync.mockImplementation(() => { throw new Error('fs error') })
    const req = {}
    const res = makeMockRes()
    resetDatabase(req, res)
    const responseTraceId = res.json.mock.calls[0][0].traceId
    const loggedTraceId = logger.error.mock.calls[0][1].traceId
    expect(responseTraceId).toBe(loggedTraceId)
  })
})
