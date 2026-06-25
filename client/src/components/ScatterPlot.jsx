import React, { useRef, useState, useMemo } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

// Canonical colors for the known sedes; any other office falls back to the palette.
const KNOWN_COLORS = {
  'AV. ARGENTINA': 'var(--primary)',
  'PLACILLA': 'var(--secondary)',
  'MERCADO PUERTO': 'var(--accent-purple)'
};
const FALLBACK_PALETTE = ['var(--primary)', 'var(--secondary)', 'var(--accent-purple)', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function ScatterPlot({ data }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [officeFilter, setOfficeFilter] = useState('all');

  // Real office list comes from the data itself, so new Excels with different
  // sedes populate the dropdown automatically.
  const offices = useMemo(
    () => [...new Set((data || []).map((d) => d.office))].filter(Boolean).sort(),
    [data]
  );

  // Assign a stable color per office (known sedes keep their canonical color).
  const colorFor = useMemo(() => {
    const map = {};
    offices.forEach((off, i) => {
      map[off] = KNOWN_COLORS[off] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];
    });
    return map;
  }, [offices]);

  // Apply the histogram's own office filter (independent of the global filter).
  const filtered = useMemo(
    () => (officeFilter === 'all' ? data || [] : (data || []).filter((d) => d.office === officeFilter)),
    [data, officeFilter]
  );

  // Dimensiones del gráfico (Ajustadas para una vista ancha de pantalla completa)
  const width = 850;
  const height = 360;
  const paddingLeft = 55;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 50; // Más espacio inferior para evitar cortes en fechas

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // 1. Calcular límites adaptativos para el eje Y
  const leadTimes = filtered.map((d) => d.avgLeadTime);
  const maxLeadTime = leadTimes.length > 0 ? Math.max(...leadTimes) : 10;
  const yMaxLimit = Math.max(maxLeadTime + 1, 6);

  const dates = filtered.map((d) => new Date(d.date).getTime());
  const minDate = dates.length > 0 ? Math.min(...dates) : Date.now() - 30 * 24 * 60 * 60 * 1000;
  const maxDate = dates.length > 0 ? Math.max(...dates) : Date.now();
  const dateRange = maxDate - minDate || 1;

  // 2. Funciones de mapeo de coordenadas
  const getX = (dateStr) => {
    const time = new Date(dateStr).getTime();
    return paddingLeft + ((time - minDate) / dateRange) * chartWidth;
  };

  const getY = (leadTimeVal) => {
    return height - paddingBottom - (leadTimeVal / yMaxLimit) * chartHeight;
  };

  // Escala no lineal (raíz cuadrada) para que los círculos no se solapen en una mancha masiva
  const getRadius = (volume) => {
    return Math.min(Math.max(3.5 + Math.sqrt(volume) * 0.75, 4.5), 15);
  };

  // 3. Animaciones GSAP de dispersión
  useGSAP(() => {
    if (filtered.length === 0) return;

    const dots = containerRef.current.querySelectorAll('.scatter-dot');
    gsap.fromTo(dots,
      { attr: { r: 0 }, opacity: 0 },
      {
        attr: { r: (i, target) => target.getAttribute('data-target-r') },
        opacity: 0.8,
        duration: 1.2,
        stagger: 0.003,
        ease: 'elastic.out(1.1, 0.7)'
      }
    );
  }, { dependencies: [filtered], scope: containerRef });

  const formatDateLabel = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const handleMouseEnter = (e, item) => {
    const x = getX(item.date);
    const y = getY(item.avgLeadTime);
    const tooltipWidth = 200;
    const tooltipHeight = 90;
    const padding = 10;

    let tooltipX = x + 16;
    let tooltipY = y - 40;
    let position = 'bottom-right';

    // Detect if tooltip would go off-screen and reposition
    if (tooltipX + tooltipWidth + padding > width) {
      tooltipX = x - tooltipWidth - 16;
      position = 'bottom-left';
    }
    if (tooltipY - tooltipHeight < 0) {
      tooltipY = y + 40;
      position = position === 'bottom-left' ? 'top-left' : 'top-right';
    }

    setTooltip({
      item,
      x: Math.max(padding, Math.min(tooltipX, width - tooltipWidth - padding)),
      y: Math.max(padding, tooltipY),
      position
    });
  };

  // Dropdown de sede del histograma (reutilizable en los estados con/sin datos)
  const officeSelect = (
    <select
      className="custom-select"
      value={officeFilter}
      onChange={(e) => setOfficeFilter(e.target.value)}
      style={{ minWidth: '190px', fontSize: '0.78rem' }}
      aria-label="Filtrar histograma por sede"
    >
      <option value="all">Todas las sedes</option>
      {offices.map((off) => (
        <option key={off} value={off}>{titleCase(off)}</option>
      ))}
    </select>
  );

  // Solo placeholder si los datos AÚN no cargaron (null). Si están vacíos
  // (base limpiada), se renderiza el marco del gráfico con el aviso de sin datos.
  if (!data) {
    return (
      <div className="chart-card obsidian-glass">
        <div className="chart-header">
          <h3 style={{ fontFamily: 'Geist' }}>Eficiencia del Trámite (Histograma de Dispersión)</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Cargando datos del Scatter Plot...</p>
        </div>
      </div>
    );
  }

  // Generar etiquetas del eje X (5 fechas distribuidas uniformemente)
  const xTicks = 5;
  const xTickValues = [];
  for (let i = 0; i < xTicks; i++) {
    xTickValues.push(minDate + (i / (xTicks - 1)) * dateRange);
  }

  // Generar etiquetas del eje Y (5 niveles optimizados para valores bajos)
  const yTicks = 5;
  const yTickValues = [];
  for (let i = 0; i < yTicks; i++) {
    yTickValues.push(Math.round((i / (yTicks - 1)) * yMaxLimit));
  }

  return (
    <div className="chart-card obsidian-glass" ref={containerRef}>
      <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3>Histograma de Dispersión: Tiempo de Resolución (Eficiencia Operativa)</h3>
          <p>Cada punto es un día de una sede: la altura indica los días promedio de resolución y el tamaño, el volumen de carpetas de ese día</p>
        </div>
        {officeSelect}
      </div>

      <div className="chart-body">
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '40px 0', textAlign: 'center' }}>
            {offices.length === 0 ? 'Sin datos cargados.' : 'No hay datos para la sede seleccionada.'}
          </p>
        ) : (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
          {/* Líneas de rejilla horizontales (Eje Y) */}
          {yTickValues.map((val, idx) => {
            const yPos = getY(val);
            return (
              <g key={`y-grid-${idx}`}>
                <line
                  className="chart-grid-line"
                  x1={paddingLeft}
                  y1={yPos}
                  x2={width - paddingRight}
                  y2={yPos}
                />
                <text
                  className="chart-text"
                  x={paddingLeft - 12}
                  y={yPos + 4}
                  textAnchor="end"
                >
                  {val} {val === 1 ? 'día' : 'días'}
                </text>
              </g>
            );
          })}

          {/* Etiquetas Eje X (Fechas) */}
          {xTickValues.map((val, idx) => {
            const xPos = paddingLeft + (idx / (xTicks - 1)) * chartWidth;
            return (
              <g key={`x-grid-${idx}`}>
                <line
                  className="chart-grid-line"
                  x1={xPos}
                  y1={paddingTop}
                  x2={xPos}
                  y2={height - paddingBottom}
                />
                <text
                  className="chart-text"
                  x={xPos}
                  y={height - paddingBottom + 18}
                  textAnchor="middle"
                >
                  {formatDateLabel(val)}
                </text>
              </g>
            );
          })}

          {/* Líneas base de ejes */}
          <line className="chart-axis-line" x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} />
          <line className="chart-axis-line" x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} />

          {/* Puntos de Dispersión (Nodos) */}
          {filtered.map((item, idx) => {
            const cx = getX(item.date);
            const cy = getY(item.avgLeadTime);
            const r = getRadius(item.volume);
            return (
              <circle
                key={`dot-${idx}`}
                className="scatter-dot"
                cx={cx}
                cy={cy}
                r={r}
                data-target-r={r}
                fill={colorFor[item.office] || '#8B5CF6'}
                onMouseEnter={(e) => handleMouseEnter(e, item)}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </svg>
        )}

        {/* Leyenda de colores del Scatter (sedes reales presentes) */}
        <div className="scatter-legends-container">
          {offices
            .filter((off) => officeFilter === 'all' || off === officeFilter)
            .map((office) => (
              <div key={office} className="scatter-legend-item">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colorFor[office] }}></span>
                {titleCase(office)}
              </div>
            ))}
        </div>

        {/* Tooltip Dinámico */}
        {tooltip && (
          <div
            className="custom-tooltip obsidian-glass"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`
            }}
          >
            <span className="tooltip-date">
              {new Date(tooltip.item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span>Sede: <strong>{titleCase(tooltip.item.office)}</strong></span>
            <span>Trámites: <strong>{tooltip.item.volume} carpetas</strong></span>
            <span>Tiempo de resolución: <strong style={{ color: 'var(--primary)' }}>{tooltip.item.avgLeadTime} {tooltip.item.avgLeadTime === 1 ? 'día' : 'días'}</strong></span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              (Otorgados: {tooltip.item.otorgados} | Denegados: {tooltip.item.denegados})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
