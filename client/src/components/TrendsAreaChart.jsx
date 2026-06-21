import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

const MONTHS_SHORT = {
  ENERO: 'ENE', FEBRERO: 'FEB', MARZO: 'MAR', ABRIL: 'ABR',
  MAYO: 'MAY', JUNIO: 'JUN', JULIO: 'JUL'
};

export default function TrendsAreaChart({ data }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const width = 720;
  const height = 280;
  const padL = 48, padR = 24, padT = 24, padB = 40;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const filtered = (data || []).filter(d => d.total > 0);

  const maxVal = filtered.length > 0 ? Math.max(...filtered.map(d => d.total)) * 1.1 : 100;

  const getX = (i) => padL + (i / Math.max(filtered.length - 1, 1)) * chartW;
  const getY = (val) => padT + chartH - (val / maxVal) * chartH;

  const buildPath = (key) =>
    filtered.map((d, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(d[key]).toFixed(1)}`).join(' ');

  const buildArea = (key) => {
    if (filtered.length === 0) return '';
    const line = buildPath(key);
    const lastX = getX(filtered.length - 1);
    const firstX = getX(0);
    const baseY = padT + chartH;
    return `${line} L${lastX.toFixed(1)},${baseY} L${firstX.toFixed(1)},${baseY} Z`;
  };

  useGSAP(() => {
    if (!filtered.length) return;

    const paths = containerRef.current.querySelectorAll('.trend-line');
    paths.forEach(path => {
      const len = path.getTotalLength();
      gsap.fromTo(path,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 1.6, ease: 'power3.out' }
      );
    });

    gsap.fromTo(containerRef.current.querySelectorAll('.trend-area'),
      { opacity: 0 },
      { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.6 }
    );

    gsap.fromTo(containerRef.current.querySelectorAll('.trend-dot'),
      { attr: { r: 0 }, opacity: 0 },
      { attr: { r: 4 }, opacity: 1, duration: 0.4, stagger: 0.04, delay: 1.2, ease: 'back.out(2)' }
    );
  }, { dependencies: [data], scope: containerRef });

  if (!filtered.length) {
    return (
      <div className="chart-card obsidian-glass">
        <div className="chart-header">
          <span className="chart-card-title">TENDENCIAS HISTÓRICAS</span>
          <h3>Evolución Mensual de Trámites</h3>
          <p>Sin datos de tendencias disponibles</p>
        </div>
      </div>
    );
  }

  const yTicks = 5;
  const yTickVals = Array.from({ length: yTicks }, (_, i) =>
    Math.round((i / (yTicks - 1)) * maxVal)
  );

  return (
    <div className="chart-card obsidian-glass trends-area-card" ref={containerRef}>
      <div className="chart-header">
        <span className="chart-card-title">TENDENCIAS HISTÓRICAS</span>
        <h3>Evolución Mensual de Trámites</h3>
        <p>Distribución temporal de expedientes procesados, otorgados y denegados</p>
      </div>

      {/* Leyenda */}
      <div className="trends-legend">
        <span className="trends-legend-item total"><span className="trends-legend-dot dot-total" />Total</span>
        <span className="trends-legend-item otorgados"><span className="trends-legend-dot dot-otorgados" />Otorgados</span>
        <span className="trends-legend-item denegados"><span className="trends-legend-dot dot-denegados" />Denegados</span>
      </div>

      <div className="chart-body">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="area-total-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="area-otorgados-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0" />
            </linearGradient>
            <filter id="line-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Grid horizontal */}
          {yTickVals.map((val, i) => {
            const yPos = getY(val);
            return (
              <g key={`ygrid-${i}`}>
                <line className="chart-grid-line" x1={padL} y1={yPos} x2={width - padR} y2={yPos} />
                <text className="chart-text" x={padL - 8} y={yPos + 4} textAnchor="end" fontSize="9">
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Grid vertical + etiquetas X */}
          {filtered.map((d, i) => {
            const xPos = getX(i);
            return (
              <g key={`xgrid-${i}`}>
                <line className="chart-grid-line" x1={xPos} y1={padT} x2={xPos} y2={padT + chartH} />
                <text className="chart-text" x={xPos} y={padT + chartH + 18} textAnchor="middle" fontSize="9">
                  {MONTHS_SHORT[d.month] || d.month.slice(0, 3)}
                </text>
              </g>
            );
          })}

          {/* Áreas rellenas */}
          <path className="trend-area" d={buildArea('total')} fill="url(#area-total-grad)" />
          <path className="trend-area" d={buildArea('otorgados')} fill="url(#area-otorgados-grad)" />

          {/* Líneas */}
          <path className="trend-line trend-total" d={buildPath('total')}
            fill="none" stroke="var(--primary)" strokeWidth="2" filter="url(#line-glow)" />
          <path className="trend-line trend-otorgados" d={buildPath('otorgados')}
            fill="none" stroke="var(--secondary)" strokeWidth="2" strokeDasharray="6 3" />
          <path className="trend-line trend-denegados" d={buildPath('denegados')}
            fill="none" stroke="var(--accent-purple)" strokeWidth="1.5" strokeDasharray="3 4" />

          {/* Puntos interactivos */}
          {filtered.map((d, i) => (
            <g key={`dot-${i}`}>
              <circle className="trend-dot" cx={getX(i)} cy={getY(d.total)} r={4}
                fill="var(--primary)" stroke="var(--bg-dark)" strokeWidth="1.5"
                onMouseEnter={() => setTooltip({ d, x: getX(i), y: getY(d.total) })}
                onMouseLeave={() => setTooltip(null)} style={{ cursor: 'pointer' }} />
              <circle className="trend-dot" cx={getX(i)} cy={getY(d.otorgados)} r={3}
                fill="var(--secondary)" stroke="var(--bg-dark)" strokeWidth="1.5"
                onMouseEnter={() => setTooltip({ d, x: getX(i), y: getY(d.otorgados) })}
                onMouseLeave={() => setTooltip(null)} style={{ cursor: 'pointer' }} />
            </g>
          ))}

          {/* Ejes */}
          <line className="chart-axis-line" x1={padL} y1={padT} x2={padL} y2={padT + chartH} />
          <line className="chart-axis-line" x1={padL} y1={padT + chartH} x2={width - padR} y2={padT + chartH} />
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div className="custom-tooltip obsidian-glass trends-tooltip"
            style={{ left: `${tooltip.x + 12}px`, top: `${tooltip.y - 60}px` }}>
            <span className="tooltip-date">{MONTHS_SHORT[tooltip.d.month] || tooltip.d.month}</span>
            <span>Total: <strong style={{ color: 'var(--primary)' }}>{tooltip.d.total.toLocaleString('es-ES')}</strong></span>
            <span>Otorgados: <strong style={{ color: 'var(--secondary)' }}>{tooltip.d.otorgados.toLocaleString('es-ES')}</strong></span>
            <span>Denegados: <strong style={{ color: 'var(--accent-purple)' }}>{tooltip.d.denegados.toLocaleString('es-ES')}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
