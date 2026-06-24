import React, { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3002'}/api/stats`;

const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Distribución de decisiones (resolución). Separa los estados intermedios
 * (S/SGL, Espera Examen, Clase Pendiente, etc.) como un grupo aparte para que
 * todo registro quede representado, no solo Otorgado/Pendiente/Denegado.
 */
export default function DecisionBreakdown({ selectedMonth = 'all', selectedOffice = 'all', refreshKey = 0 }) {
  const containerRef = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    fetch(`${API_BASE_URL}/decisions?month=${selectedMonth}&office=${selectedOffice}`)
      .then((r) => r.json())
      .then((d) => { if (active) setData(d); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [selectedMonth, selectedOffice, refreshKey]);

  useGSAP(() => {
    if (!data || !data.decisions || data.decisions.length === 0) return;
    const bars = containerRef.current.querySelectorAll('.decision-bar-fill');
    gsap.fromTo(bars, { width: 0 }, { width: (i, t) => t.getAttribute('data-w'), duration: 1, stagger: 0.04, ease: 'power3.out' });
  }, { dependencies: [data], scope: containerRef });

  if (error) {
    return (
      <div className="chart-card obsidian-glass">
        <div className="chart-header"><h3>Estados de Resolución</h3><p style={{ color: 'var(--text-secondary)' }}>No se pudo cargar.</p></div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="chart-card obsidian-glass">
        <div className="chart-header"><h3>Estados de Resolución</h3><p>Cargando...</p></div>
      </div>
    );
  }

  const maxVal = data.decisions.length > 0 ? data.decisions[0].value : 1;
  const finales = data.decisions.filter((d) => !d.intermediate);
  const intermedios = data.decisions.filter((d) => d.intermediate);

  const Row = ({ d }) => {
    const pct = data.total > 0 ? (d.value / data.total) * 100 : 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '5px 0' }}>
        <span style={{ width: '180px', flexShrink: 0, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {titleCase(d.decision)}
        </span>
        <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            className="decision-bar-fill"
            data-w={`${(d.value / maxVal) * 100}%`}
            style={{ height: '100%', width: 0, borderRadius: '4px', background: d.intermediate ? 'linear-gradient(to right, #f59e0b, #f5b342)' : 'linear-gradient(to right, var(--secondary), var(--primary))' }}
          />
        </div>
        <span style={{ width: '92px', textAlign: 'right', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
          <strong>{d.value.toLocaleString('es-ES')}</strong> <span style={{ color: 'var(--text-muted)' }}>({pct.toFixed(0)}%)</span>
        </span>
      </div>
    );
  };

  return (
    <div className="chart-card obsidian-glass" ref={containerRef}>
      <div className="chart-header">
        <span className="chart-card-title">Resolución de Carpetas</span>
        <h3>Estados de Resolución</h3>
        <p>Decisión de cada carpeta. Los estados intermedios (en proceso) se muestran aparte para que ningún registro quede sin representar.</p>
      </div>

      <div className="chart-body">
        {/* Indicador del item aparte */}
        <div style={{ display: 'flex', gap: '32px', padding: '4px 0 16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b', lineHeight: 1 }}>
              {data.intermediateTotal.toLocaleString('es-ES')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
              En proceso (intermedios)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)', lineHeight: 1 }}>
              {data.total.toLocaleString('es-ES')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
              Total carpetas
            </div>
          </div>
        </div>

        {finales.map((d) => <Row key={d.decision} d={d} />)}

        {intermedios.length > 0 && (
          <>
            <div style={{ margin: '14px 0 8px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f59e0b', fontWeight: 700, borderTop: '1px dashed rgba(245,158,11,0.3)', paddingTop: '12px' }}>
              Estados intermedios (en proceso)
            </div>
            {intermedios.map((d) => <Row key={d.decision} d={d} />)}
          </>
        )}
      </div>
    </div>
  );
}
