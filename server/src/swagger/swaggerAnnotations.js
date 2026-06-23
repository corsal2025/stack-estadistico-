/**
 * @openapi
 * /api/stats/summary:
 *   get:
 *     summary: KPI summary
 *     description: >
 *       Returns aggregate KPI counters for all driving-license folders.
 *       Includes totals, decision breakdown, moral-alert stats, and average
 *       lead time in days. Both filter parameters are optional.
 *     tags:
 *       - Statistics
 *     parameters:
 *       - $ref: '#/components/parameters/month'
 *       - $ref: '#/components/parameters/office'
 *     responses:
 *       200:
 *         description: Summary KPIs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of folders matching the filter
 *                   example: 342
 *                 otorgados:
 *                   type: integer
 *                   description: Folders with decision OTORGADO (issued)
 *                   example: 287
 *                 denegados:
 *                   type: integer
 *                   description: Folders with decision DENEGADO (rejected)
 *                   example: 35
 *                 pendientes:
 *                   type: integer
 *                   description: Folders with decision PENDIENTE (pending)
 *                   example: 20
 *                 moralAlerts:
 *                   type: integer
 *                   description: Folders flagged with a moral alert (ALERTADA or REVISAR)
 *                   example: 12
 *                 moralEffectiveness:
 *                   type: integer
 *                   description: >
 *                     Percentage of morally-alerted folders that ended in DENEGADO.
 *                     Indicates filter effectiveness (0–100).
 *                   example: 75
 *                 avgLeadTime:
 *                   type: integer
 *                   description: Average resolution time in days across matching folders
 *                   example: 4
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /api/stats/trends:
 *   get:
 *     summary: Monthly trends
 *     description: >
 *       Returns monthly totals (total, otorgados, denegados) for each of the
 *       seven months currently in the dataset (ENERO–JULIO). The `month`
 *       parameter is ignored here — trends always show the full time series
 *       for the selected office. Use `office` to restrict to a single office.
 *     tags:
 *       - Statistics
 *     parameters:
 *       - $ref: '#/components/parameters/office'
 *     responses:
 *       200:
 *         description: Array of monthly trend objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:
 *                     type: string
 *                     description: Month name in Spanish (uppercase)
 *                     example: ENERO
 *                   total:
 *                     type: integer
 *                     description: Total folders for the month
 *                     example: 58
 *                   otorgados:
 *                     type: integer
 *                     description: Issued licenses for the month
 *                     example: 50
 *                   denegados:
 *                     type: integer
 *                     description: Rejected applications for the month
 *                     example: 5
 *             example:
 *               - { month: "ENERO", total: 58, otorgados: 50, denegados: 5 }
 *               - { month: "FEBRERO", total: 45, otorgados: 40, denegados: 3 }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /api/stats/distribution:
 *   get:
 *     summary: Office distribution
 *     description: >
 *       Returns a breakdown of folder counts per office, including decision
 *       sub-totals and average lead time for each office. The `office`
 *       parameter is ignored here — distribution always covers all three
 *       offices for the selected month.
 *     tags:
 *       - Statistics
 *     parameters:
 *       - $ref: '#/components/parameters/month'
 *     responses:
 *       200:
 *         description: Array of office distribution objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   office:
 *                     type: string
 *                     description: Office name
 *                     example: AV. ARGENTINA
 *                   value:
 *                     type: integer
 *                     description: Total folders for this office
 *                     example: 180
 *                   otorgados:
 *                     type: integer
 *                     description: Issued licenses for this office
 *                     example: 152
 *                   denegados:
 *                     type: integer
 *                     description: Rejected applications for this office
 *                     example: 20
 *                   avgLeadTime:
 *                     type: integer
 *                     description: Average resolution time in days for this office
 *                     example: 3
 *             example:
 *               - { office: "AV. ARGENTINA", value: 180, otorgados: 152, denegados: 20, avgLeadTime: 3 }
 *               - { office: "PLACILLA", value: 90, otorgados: 78, denegados: 8, avgLeadTime: 5 }
 *               - { office: "MERCADO PUERTO", value: 72, otorgados: 57, denegados: 7, avgLeadTime: 4 }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /api/stats/status:
 *   get:
 *     summary: Folder status breakdown
 *     description: >
 *       Returns a frequency table of folder statuses (e.g. EN TRAMITE,
 *       PENDIENTE DOCUMENTOS, etc.), sorted descending by count. Useful for
 *       histogram charts showing which administrative states are most common.
 *     tags:
 *       - Statistics
 *     parameters:
 *       - $ref: '#/components/parameters/month'
 *       - $ref: '#/components/parameters/office'
 *     responses:
 *       200:
 *         description: Array of status frequency objects, sorted by count descending
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     description: Folder status label
 *                     example: EN TRAMITE
 *                   value:
 *                     type: integer
 *                     description: Number of folders with this status
 *                     example: 120
 *             example:
 *               - { status: "EN TRAMITE", value: 120 }
 *               - { status: "PENDIENTE DOCUMENTOS", value: 45 }
 *               - { status: "SIN ESPECIFICAR", value: 10 }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

/**
 * @openapi
 * /api/stats/scatter:
 *   get:
 *     summary: Scatter plot data
 *     description: >
 *       Returns daily aggregated data points suitable for a lead-time scatter
 *       plot. Each point represents one (citation date × office) combination
 *       and contains the average lead time, volume, and decision breakdown for
 *       that group. Records without a valid lead time are excluded. Results
 *       are sorted chronologically by citation date.
 *     tags:
 *       - Statistics
 *     parameters:
 *       - $ref: '#/components/parameters/month'
 *       - $ref: '#/components/parameters/office'
 *     responses:
 *       200:
 *         description: Array of scatter plot data points, sorted by date ascending
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                     description: Citation date (YYYY-MM-DD)
 *                     example: "2026-01-15"
 *                   office:
 *                     type: string
 *                     description: Office name
 *                     example: PLACILLA
 *                   avgLeadTime:
 *                     type: integer
 *                     description: Average lead time in days for this date-office group
 *                     example: 3
 *                   volume:
 *                     type: integer
 *                     description: Number of folders in this date-office group
 *                     example: 8
 *                   otorgados:
 *                     type: integer
 *                     description: Issued licenses in this group
 *                     example: 6
 *                   denegados:
 *                     type: integer
 *                     description: Rejected applications in this group
 *                     example: 2
 *             example:
 *               - { date: "2026-01-15", office: "AV. ARGENTINA", avgLeadTime: 3, volume: 8, otorgados: 6, denegados: 2 }
 *               - { date: "2026-01-16", office: "PLACILLA", avgLeadTime: 5, volume: 4, otorgados: 3, denegados: 1 }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
