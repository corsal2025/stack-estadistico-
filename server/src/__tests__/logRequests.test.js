/**
 * Tests for logRequests middleware
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
import { logRequests } from '../middleware/logRequests.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeReq = (overrides = {}) => ({
    method: 'GET',
    path: '/api/stats/summary',
    ...overrides
})

/**
 * Build a mock response that captures the 'finish' listener
 * and exposes a helper to fire it.
 */
const makeRes = (statusCode = 200) => {
    let finishCb = null
    const res = {
        statusCode,
        on: vi.fn((event, cb) => {
            if (event === 'finish') finishCb = cb
        }),
        emit: () => { if (finishCb) finishCb() }
    }
    return res
}

// ---------------------------------------------------------------------------
// logRequests tests
// ---------------------------------------------------------------------------

describe('logRequests middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls next() immediately', () => {
        const req = makeReq()
        const res = makeRes()
        const next = vi.fn()
        logRequests(req, res, next)
        expect(next).toHaveBeenCalled()
    })

    it('registers a "finish" listener on the response', () => {
        const req = makeReq()
        const res = makeRes()
        logRequests(req, res, vi.fn())
        expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function))
    })

    it('logs with "info" level for 2xx responses', () => {
        const req = makeReq()
        const res = makeRes(200)
        logRequests(req, res, vi.fn())
        res.emit('finish')
        expect(logger.info).toHaveBeenCalledWith('HTTP request', expect.objectContaining({
            method: 'GET',
            path: '/api/stats/summary',
            statusCode: 200,
            durationMs: expect.any(Number)
        }))
    })

    it('logs with "warn" level for 4xx responses', () => {
        const req = makeReq({ method: 'GET', path: '/api/stats/summary' })
        const res = makeRes(400)
        logRequests(req, res, vi.fn())
        res.emit('finish')
        expect(logger.warn).toHaveBeenCalledWith('HTTP request', expect.objectContaining({
            statusCode: 400
        }))
    })

    it('logs with "error" level for 5xx responses', () => {
        const req = makeReq({ method: 'POST', path: '/api/stats/upload' })
        const res = makeRes(500)
        logRequests(req, res, vi.fn())
        res.emit('finish')
        expect(logger.error).toHaveBeenCalledWith('HTTP request', expect.objectContaining({
            statusCode: 500
        }))
    })

    it('includes method and path in the log entry', () => {
        const req = makeReq({ method: 'POST', path: '/api/stats/reset' })
        const res = makeRes(200)
        logRequests(req, res, vi.fn())
        res.emit('finish')
        expect(logger.info).toHaveBeenCalledWith('HTTP request', expect.objectContaining({
            method: 'POST',
            path: '/api/stats/reset'
        }))
    })

    it('includes a numeric durationMs in the log entry', () => {
        const req = makeReq()
        const res = makeRes(200)
        logRequests(req, res, vi.fn())
        res.emit('finish')
        const logArgs = logger.info.mock.calls[0][1]
        expect(typeof logArgs.durationMs).toBe('number')
        expect(logArgs.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('does not log before "finish" fires', () => {
        const req = makeReq()
        const res = makeRes(200)
        logRequests(req, res, vi.fn())
        // finish NOT emitted yet
        expect(logger.info).not.toHaveBeenCalled()
        expect(logger.warn).not.toHaveBeenCalled()
        expect(logger.error).not.toHaveBeenCalled()
    })
})
