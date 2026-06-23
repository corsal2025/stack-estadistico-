/**
 * Tests for errorHandler middleware
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../utils/logger.js', () => ({
    default: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn()
    }
}))

import logger from '../utils/logger.js'
import { errorHandler } from '../middleware/errorHandler.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeReq = (overrides = {}) => ({
    method: 'GET',
    path: '/api/stats/summary',
    ...overrides
})

const makeRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
})

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// ---------------------------------------------------------------------------
// errorHandler tests
// ---------------------------------------------------------------------------

describe('errorHandler middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns HTTP 500 for a generic Error', () => {
        const err = new Error('Something exploded')
        const req = makeReq()
        const res = makeRes()
        errorHandler(err, req, res, vi.fn())
        expect(res.status).toHaveBeenCalledWith(500)
    })

    it('returns a traceId in the 500 response body', () => {
        const err = new Error('crash')
        const req = makeReq()
        const res = makeRes()
        errorHandler(err, req, res, vi.fn())
        const body = res.json.mock.calls[0][0]
        expect(body).toHaveProperty('traceId')
        expect(body.traceId).toMatch(UUID_REGEX)
    })

    it('traceId is unique per call', () => {
        const req = makeReq()
        const res1 = makeRes()
        const res2 = makeRes()
        errorHandler(new Error('a'), req, res1, vi.fn())
        errorHandler(new Error('b'), req, res2, vi.fn())
        const id1 = res1.json.mock.calls[0][0].traceId
        const id2 = res2.json.mock.calls[0][0].traceId
        expect(id1).not.toBe(id2)
    })

    it('returns a user-safe message (not the raw error) for 500', () => {
        const err = new Error('Database connection string leaked')
        const req = makeReq()
        const res = makeRes()
        errorHandler(err, req, res, vi.fn())
        const body = res.json.mock.calls[0][0]
        expect(body.error).not.toContain('Database connection string leaked')
    })

    it('calls logger.error with traceId, method, path, statusCode, message', () => {
        const err = new Error('internal failure')
        const req = makeReq({ method: 'POST', path: '/api/stats/upload' })
        const res = makeRes()
        errorHandler(err, req, res, vi.fn())
        expect(logger.error).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                traceId: expect.stringMatching(UUID_REGEX),
                method: 'POST',
                path: '/api/stats/upload',
                statusCode: 500,
                message: 'internal failure'
            })
        )
    })

    it('returns HTTP 400 for a client error (err.status = 400)', () => {
        const err = Object.assign(new Error('Bad input'), { status: 400 })
        const req = makeReq()
        const res = makeRes()
        errorHandler(err, req, res, vi.fn())
        expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns the original error message for client errors', () => {
        const err = Object.assign(new Error('Field X is required'), { status: 422 })
        const req = makeReq()
        const res = makeRes()
        errorHandler(err, req, res, vi.fn())
        const body = res.json.mock.calls[0][0]
        expect(body.error).toBe('Field X is required')
        expect(body.traceId).toMatch(UUID_REGEX)
    })

    it('includes err.details in client error response when present', () => {
        const err = Object.assign(new Error('Validation failed'), {
            status: 400,
            details: [{ field: 'month', message: 'Invalid value' }]
        })
        const req = makeReq()
        const res = makeRes()
        errorHandler(err, req, res, vi.fn())
        const body = res.json.mock.calls[0][0]
        expect(body.details).toEqual([{ field: 'month', message: 'Invalid value' }])
    })

    it('still logs when err has no stack (plain object thrown)', () => {
        const err = Object.assign(new Error('no stack'), { stack: undefined })
        const req = makeReq()
        const res = makeRes()
        errorHandler(err, req, res, vi.fn())
        expect(logger.error).toHaveBeenCalled()
    })
})
