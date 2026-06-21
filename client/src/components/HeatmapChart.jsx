import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

const MONTHS_SHORT = {
  ENERO: 'ENE', FEBRERO: 'FEB', MARZO: 'MAR', ABRIL: 'ABR',
  MAYO: 'MAY', JUNIO: 'JUN', JULIO: 'JUL'
};
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function HeatmapChart({ data }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO'];
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun (dayIndex in JS: 0=Dom)

  const cellW = 54, cellH = 30, padL = 44, padT = 40, gap = 3;
  const svgW = padL + months.length * (cellW + gap);
  const svgH = padT + days.length * (cellH + gap) + 12;

  const maxCount = data && data.length > 0 ? Math.max(...data.map(d => d.count)) : 1;

  const getColor = (count) => {
    if (count === 0) return 'rgba(255,255,255,0.03)';
    const intensity = count / maxCount;
    const alpha = 0.1 + intensity * 0.85;
    if (intensity > 0.7) return `rgba(0, 219, 231, ${alpha})`;
    if (intensity > 0.35) return `rgba(255, 171, 243, ${alpha * 0.9})`;
    return `rgba(254, 0, 254, ${alpha * 0.7})`;
  };

  const getCell = (month, dayIndex) => {
    if (!data) return null;
    return data.find(d => d.month === month && d.dayIndex === dayIndex);
  };

  useGSAP(() => {
    if (!data || data.length === 0) return;
    const cells = containerRef.current.querySelectorAll('.heatmap-cell');
    gsap.fromTo(cells,
      { opacity: 0, scale: 0.7 },
      { opacity: 1, scale: 1, duration: 0.4, stagger: { each: 0.008, from: 'start' }, ease: 'power2.out' }
    );
  }, { dependencies: [data], scope: containerRef });

  if (!data || data.length === 0) {
    return (
      <div className="chart-card obsidian-glass">
        <div className="chart-header">
          <span className="chart-card-title">ACTIVIDAD DIARIA</span>
          <h3>Heatmap de Carga de Trabajo</h3>
          <p>Cargando datos del heatmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card obsidian-glass heatmap-card" ref={containerRef}>
      <div className="chart-header heatmap-header-row">
        <div>
          <span className="chart-card-title">ACTIVIDAD DIARIA</span>
          <h3>Heatmap de Carga de Trabajo</h3>
          <p>Concentración de citaciones por día de semana y mes — identifica picos operativos</p>
        </div>
        <div className="heatmap-legend-scale">
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>BAJA</span>
          {[0.1, 0.3, 0.5, 0.7, 1.0].map(v => (
            <span key={v} className="heatmap-scale-cell"
              style={{ background: getColor(Math.round(v * maxCount)) }} />
          ))}
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ALTA</span>
        </div>
      </div>
      <div className="chart-body" style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height={svgH} style={{ minWidth: '400px' }}>

          {/* Month labels (X axis) */}
          {months.map((m, mi) => (
            <text key={m}
              x={padL + mi * (cellW + gap) + cellW / 2}
              y={padT - 10}
              textAnchor="middle" fill="var(--text-muted)"
              fontSize="9" fontFamily="var(--font-mono)" fontWeight="700">
              {MONTHS_SHORT[m] || m.slice(0, 3)}
            </text>
          ))}

          {/* Day labels (Y axis) */}
          {days.map((day, di) => (
            <text key={day}
              x={padL - 8}
              y={padT + di * (cellH + gap) + cellH / 2 + 4}
              textAnchor="end" fill="var(--text-muted)"
              fontSize="9" fontFamily="var(--font-mono)">
              {day}
            </text>
          ))}

          {/* Cells */}
          {months.map((month, mi) =>
            dayOrder.map((jsDay, di) => {
              const cell = getCell(month, jsDay);
              const count = cell?.count || 0;
              const x = padL + mi * (cellW + gap);
              const y = padT + di * (cellH + gap);
              return (
                <rect
                  key={`${month}-${jsDay}`}
                  className="heatmap-cell"
                  x={x} y={y}
                  width={cellW} height={cellH}
                  rx={4}
                  fill={getColor(count)}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="0.5"
                  style={{ cursor: count > 0 ? 'pointer' : 'default' }}
                  onMouseEnter={(e) => {
                    if (count > 0) setTooltip({ count, month, day: days[di], x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}

          {/* Count labels inside cells */}
          {months.map((month, mi) =>
            dayOrder.map((jsDay, di) => {
              const cell = getCell(month, jsDay);
              const count = cell?.count || 0;
              if (count === 0) return null;
              return (
                <text key={`label-${month}-${jsDay}`}
                  x={padL + mi * (cellW + gap) + cellW / 2}
                  y={padT + di * (cellH + gap) + cellH / 2 + 4}
                  textAnchor="middle"
                  fill={count / maxCount > 0.5 ? 'rgba(5,5,5,0.85)' : 'var(--text-muted)'}
                  fontSize="8" fontFamily="var(--font-mono)" fontWeight="700">
                  {count}
                </text>
              );
            })
          )}
        </svg>

        {tooltip && (
          <div className="custom-tooltip obsidian-glass heatmap-tooltip"
            style={{ position: 'fixed', left: `${tooltip.x + 12}px`, top: `${tooltip.y - 60}px`, zIndex: 999 }}>
            <span className="tooltip-date">{tooltip.day} · {MONTHS_SHORT[tooltip.month] || tooltip.month}</span>
            <span>Citaciones: <strong style={{ color: 'var(--primary)' }}>{tooltip.count}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
