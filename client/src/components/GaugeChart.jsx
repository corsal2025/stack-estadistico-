import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export default function GaugeChart({ stats }) {
  const containerRef = useRef(null);
  const needleRef = useRef(null);
  const valueRef = useRef(null);

  const rate = stats && stats.total > 0
    ? Math.min(1, stats.otorgados / stats.total)
    : 0;
  const pct = Math.round(rate * 100);

  // Semicircle geometry
  const cx = 160, cy = 155, R = 110, strokeW = 18;
  // The arc goes from 180° (left) to 0° (right) → half circle
  const arcLen = Math.PI * R; // total arc length of semicircle

  // Zones (as fractions of 180°)
  const zones = [
    { from: 0,    to: 0.40, color: 'rgba(255,171,243,0.8)' },   // 0-40% → magenta (bajo)
    { from: 0.40, to: 0.65, color: 'rgba(255,215,100,0.8)' },   // 40-65% → amarillo (medio)
    { from: 0.65, to: 1.00, color: 'rgba(0,219,231,0.85)' },    // 65-100% → cyan (excelente)
  ];

  // SVG arc helper (angles in degrees, 0=right, 90=bottom)
  function polarToXY(angleDeg, r = R) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startFrac, endFrac) {
    // Map fraction [0,1] → angle on semicircle [180°, 0°] (going counterclockwise via left)
    // In SVG convention: 180° = left, 0° = right
    const startAngle = 180 - startFrac * 180;
    const endAngle   = 180 - endFrac * 180;
    const s = polarToXY(startAngle);
    const e = polarToXY(endAngle);
    const sweep = 1; // clockwise
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 ${sweep} ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  // Needle rotation: from -90° (0%) to +90° (100%) in CSS transform
  const needleAngle = -90 + rate * 180; // degrees

  useGSAP(() => {
    if (!needleRef.current) return;
    gsap.fromTo(needleRef.current,
      { rotation: -90, transformOrigin: `${cx}px ${cy}px` },
      { rotation: needleAngle, transformOrigin: `${cx}px ${cy}px`, duration: 1.8, ease: 'elastic.out(1, 0.7)' }
    );
    if (valueRef.current) {
      const counter = { val: 0 };
      gsap.to(counter, {
        val: pct, duration: 1.4, ease: 'power3.out',
        onUpdate: () => { valueRef.current.textContent = `${Math.round(counter.val)}%`; }
      });
    }
  }, { dependencies: [stats], scope: containerRef });

  const getZoneLabel = () => {
    if (pct >= 65) return { label: 'ÓPTIMO', color: 'var(--primary)' };
    if (pct >= 40) return { label: 'REGULAR', color: '#ffd764' };
    return { label: 'CRÍTICO', color: 'var(--secondary)' };
  };
  const zone = getZoneLabel();

  return (
    <div className="chart-card obsidian-glass gauge-card" ref={containerRef}>
      <div className="chart-header">
        <span className="chart-card-title">ÍNDICE DE RENDIMIENTO</span>
        <h3>Velocímetro de Aprobación</h3>
        <p>Tasa de resoluciones favorables sobre el total de expedientes</p>
      </div>
      <div className="gauge-body">
        <svg viewBox="0 0 320 175" width="100%" height="175" style={{ overflow: 'visible' }}>
          <defs>
            <filter id="gauge-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Track background */}
          <path d={arcPath(0, 1)}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} strokeLinecap="round" />

          {/* Zone arcs */}
          {zones.map((z, i) => (
            <path key={i} d={arcPath(z.from, z.to)}
              fill="none" stroke={z.color} strokeWidth={strokeW - 4} strokeLinecap="butt" opacity="0.7" />
          ))}

          {/* Active fill arc */}
          <path d={arcPath(0, rate)}
            fill="none" stroke="var(--primary)" strokeWidth={strokeW}
            strokeLinecap="round" filter="url(#gauge-glow)" opacity="0.95" />

          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
            const ang = 180 - frac * 180;
            const inner = polarToXY(ang, R - 14);
            const outer = polarToXY(ang, R + 6);
            return (
              <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            );
          })}

          {/* Tick labels */}
          {[{ f: 0, label: '0%' }, { f: 0.5, label: '50%' }, { f: 1, label: '100%' }].map(({ f, label }) => {
            const ang = 180 - f * 180;
            const pos = polarToXY(ang, R - 28);
            return (
              <text key={label} x={pos.x} y={pos.y + 4}
                textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                {label}
              </text>
            );
          })}

          {/* Needle */}
          <g ref={needleRef} style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
            <line x1={cx} y1={cy}
              x2={cx + (R - 22) * Math.cos((needleAngle * Math.PI) / 180)}
              y2={cy + (R - 22) * Math.sin((needleAngle * Math.PI) / 180)}
              stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          </g>

          {/* Center hub */}
          <circle cx={cx} cy={cy} r="8" fill="var(--bg-dark)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

          {/* Value text */}
          <text ref={valueRef} x={cx} y={cy - 30}
            textAnchor="middle" fill="var(--text-primary)"
            fontSize="32" fontWeight="800" fontFamily="var(--font-mono)">
            {pct}%
          </text>

          {/* Zone label */}
          <text x={cx} y={cy - 8}
            textAnchor="middle" fill={zone.color}
            fontSize="9" fontWeight="700" fontFamily="var(--font-mono)" letterSpacing="0.1em">
            {zone.label}
          </text>
        </svg>

        {/* Stats row */}
        <div className="gauge-stats-row">
          <div className="gauge-stat">
            <span className="gauge-stat-label">Otorgados</span>
            <span className="gauge-stat-value" style={{ color: 'var(--primary)' }}>
              {stats?.otorgados?.toLocaleString('es-ES') || 0}
            </span>
          </div>
          <div className="gauge-stat">
            <span className="gauge-stat-label">Total</span>
            <span className="gauge-stat-value">{stats?.total?.toLocaleString('es-ES') || 0}</span>
          </div>
          <div className="gauge-stat">
            <span className="gauge-stat-label">Denegados</span>
            <span className="gauge-stat-value" style={{ color: 'var(--secondary)' }}>
              {stats?.denegados?.toLocaleString('es-ES') || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
