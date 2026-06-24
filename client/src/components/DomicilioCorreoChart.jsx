import React, { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3002'}/api/stats`;

const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Indicador: cantidad de cambios de domicilio subidos con correo,
 * detallado por la comuna a la que se hizo la solicitud.
 */
export default function DomicilioCorreoChart({ selectedMonth = 'all', selectedOffice = 'all', refreshKey = 0 }) {
  const containerRef = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    fetch(`${API_BASE_URL}/domicilio-correo?month=${selectedMonth}&office=${selectedOffice}`)
      .then((r) => r.json())
      .then((d) => { if (active) setData(d); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [selectedMonth, selectedOffice, refreshKey]);

  useGSAP(() => {
    if (!data || !data.byComuna || data.byComuna.length === 0) return;
    const bars = containerRef.current.querySelectorAll('.comuna-bar-fill');
    gsap.fromTo(bars,
      { width: 0 },
      { width: (i, t) => t.getAttribute('data-w'), duration: 1, stagger: 0.03, ease: 'power3.out' }
    );
  }, { dependencies: [data], scope: containerRef });

  if (error) {
    return (
      <div className="chart-card obsidian-glass">
        <div className="chart-header"><h3>Cambios de Domicilio por Correo</h3><p style={{ color: 'var(--text-secondary)' }}>No se pudo cargar el indicador.</p></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="chart-card obsidian-glass">
        <div className="chart-header"><h3>Cambios de Domicilio por Correo</h3><p>Cargando...</p></div>
      </div>
    );
  }

  const maxVal = data.byComuna.length > 0 ? data.byComuna[0].value : 1;

  return (
    <div className="chart-card obsidian-glass" ref={containerRef}>
      <div className="chart-header">
        <span className="chart-card-title">Cambios de Domicilio · Correo</span>
        <h3>Solicitudes por Comuna de Destino</h3>
        <p>Carpetas de cambio de domicilio subidas con correo, detalladas por la comuna a la que se hizo la solicitud</p>
      </div>

      {/* Indicador grande: total y cantidad de comunas */}
      <div style={{ display: 'flex', gap: '32px', padding: '8px 4px 18px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)', lineHeight: 1 }}>
            {data.total.toLocaleString('es-ES')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
            Carpetas con correo
          </div>
        </div>
        <div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--secondary)', lineHeight: 1 }}>
            {data.comunas.toLocaleString('es-ES')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
            Comunas distintas
          </div>
        </div>
      </div>

      {data.byComuna.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>
          No hay cambios de domicilio con correo para este filtro.
        </p>
      ) : (
        <div className="chart-body" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '6px' }}>
          {data.byComuna.map((c) => (
            <div key={c.comuna} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '5px 0' }}>
              <span style={{ width: '170px', flexShrink: 0, fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {titleCase(c.comuna)}
              </span>
              <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  className="comuna-bar-fill"
                  data-w={`${(c.value / maxVal) * 100}%`}
                  style={{ height: '100%', width: 0, background: 'linear-gradient(to right, var(--secondary), var(--primary))', borderRadius: '4px' }}
                />
              </div>
              <span style={{ width: '46px', textAlign: 'right', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {c.value.toLocaleString('es-ES')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
