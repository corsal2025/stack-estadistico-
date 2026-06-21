import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

const MONTHS_SHORT = {
  ENERO: 'ENE', FEBRERO: 'FEB', MARZO: 'MAR', ABRIL: 'ABR',
  MAYO: 'MAY', JUNIO: 'JUN', JULIO: 'JUL'
};

export default function StackedBarChart({ data }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const width = 600;
  const height = 280;
  const padL = 48, padR = 20, padT = 24, padB = 40;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const filtered = (data || []).filter(d => d.total > 0);
  const barCount = filtered.length;
  const barGap = 10;
  const barW = barCount > 0 ? (chartW - barGap * (barCount - 1)) / barCount : 40;

  const maxVal = filtered.length > 0
    ? Math.max(...filtered.map(d => d.otorgados + d.denegados + Math.max(0, d.total - d.otorgados - d.denegados))) * 1.1
    : 100;

  const getBarY = (val) => padT + chartH - (val / maxVal) * chartH;
  const getBarH = (val) => (val / maxVal) * chartH;

  useGSAP(() => {
    if (!filtered.length) return;
    const rects = containerRef.current.querySelectorAll('.stacked-rect');
    gsap.fromTo(rects,
      { attr: { height: 0, y: padT + chartH } },
      {
        attr: { height: (i, el) => el.getAttribute('data-h'), y: (i, el) => el.getAttribute('data-y') },
        duration: 1.0,
        stagger: 0.05,
        ease: 'power3.out',
        delay: 0.1
      }
    );
  }, { dependencies: [data], scope: containerRef });

  if (!filtered.length) {
    return (
      <div className="chart-card obsidian-glass">
        <div className="chart-header">
          <span className="chart-card-title">DESGLOSE MENSUAL</span>
          <h3>Resoluciones por Mes</h3>
          <p>Sin datos disponibles</p>
        </div>
      </div>
    );
  }

  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((i / yTicks) * maxVal)
  );

  return (
    <div className="chart-card obsidian-glass stacked-bar-card" ref={containerRef}>
      <div className="chart-header">
        <span className="chart-card-title">DESGLOSE MENSUAL</span>
        <h3>Resoluciones por Mes</h3>
        <p>Comparativa mensual de otorgamientos, denegaciones y expedientes pendientes</p>
      </div>

      <div className="trends-legend">
        <span className="trends-legend-item otorgados"><span className="trends-legend-dot dot-otorgados" />Otorgados</span>
        <span className="trends-legend-item denegados"><span className="trends-legend-dot dot-denegados" />Denegados</span>
        <span className="trends-legend-item pendientes"><span className="trends-legend-dot dot-pendientes" />Pendientes</span>
      </div>

      <div className="chart-body" style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
          <defs>
            <linearGradient id="bar-otorgados-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--secondary)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="bar-denegados-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="bar-pend-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Y Ticks */}
          {yTickVals.map((val, i) => {
            const yPos = getBarY(val);
            return (
              <g key={`ytick-${i}`}>
                <line className="chart-grid-line" x1={padL} y1={yPos} x2={width - padR} y2={yPos} />
                <text className="chart-text" x={padL - 8} y={yPos + 4} textAnchor="end" fontSize="9">
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                </text>
              </g>
            );
          })}

          {filtered.map((d, i) => {
            const xPos = padL + i * (barW + barGap);
            const pendientes = Math.max(0, d.total - d.otorgados - d.denegados);

            // Stack order: pendientes (bottom) → denegados → otorgados (top)
            const hPend = getBarH(pendientes);
            const hDen = getBarH(d.denegados);
            const hOto = getBarH(d.otorgados);
            const yPend = padT + chartH - hPend;
            const yDen = yPend - hDen;
            const yOto = yDen - hOto;

            return (
              <g key={`bar-${i}`}
                onMouseEnter={() => setTooltip({ d, x: xPos + barW / 2, y: yOto })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'pointer' }}>
                {/* Pendientes */}
                {pendientes > 0 && (
                  <rect className="stacked-rect"
                    x={xPos} y={padT + chartH} rx={2}
                    width={barW} height={0}
                    fill="url(#bar-pend-g)"
                    data-h={hPend} data-y={yPend} />
                )}
                {/* Denegados */}
                {d.denegados > 0 && (
                  <rect className="stacked-rect"
                    x={xPos} y={padT + chartH} rx={2}
                    width={barW} height={0}
                    fill="url(#bar-denegados-g)"
                    data-h={hDen} data-y={yDen} />
                )}
                {/* Otorgados */}
                {d.otorgados > 0 && (
                  <rect className="stacked-rect"
                    x={xPos} y={padT + chartH} rx={2}
                    width={barW} height={0}
                    fill="url(#bar-otorgados-g)"
                    data-h={hOto} data-y={yOto} />
                )}
                {/* Label X */}
                <text className="chart-text" x={xPos + barW / 2} y={padT + chartH + 18}
                  textAnchor="middle" fontSize="9">
                  {MONTHS_SHORT[d.month] || d.month.slice(0, 3)}
                </text>
                {/* Label total */}
                <text className="chart-text stacked-total-label"
                  x={xPos + barW / 2} y={yOto - 6}
                  textAnchor="middle" fontSize="9" fill="var(--text-muted)">
                  {d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : d.total}
                </text>
              </g>
            );
          })}

          {/* Ejes */}
          <line className="chart-axis-line" x1={padL} y1={padT} x2={padL} y2={padT + chartH} />
          <line className="chart-axis-line" x1={padL} y1={padT + chartH} x2={width - padR} y2={padT + chartH} />
        </svg>

        {tooltip && (
          <div className="custom-tooltip obsidian-glass"
            style={{ left: `${tooltip.x}px`, top: `${Math.max(0, tooltip.y - 80)}px`, transform: 'translateX(-50%)' }}>
            <span className="tooltip-date">{tooltip.d.month}</span>
            <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{tooltip.d.total.toLocaleString('es-ES')}</strong></span>
            <span>Otorgados: <strong style={{ color: 'var(--secondary)' }}>{tooltip.d.otorgados.toLocaleString('es-ES')}</strong></span>
            <span>Denegados: <strong style={{ color: 'var(--accent-purple)' }}>{tooltip.d.denegados.toLocaleString('es-ES')}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
