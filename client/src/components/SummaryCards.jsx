import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

function KpiValueCounter({ value, suffix = "", className = "", style = {} }) {
  const elementRef = useRef(null);
  const prevValRef = useRef(0);

  useGSAP(() => {
    const el = elementRef.current;
    if (!el) return;

    const counterObj = { val: prevValRef.current };

    gsap.to(counterObj, {
      val: value,
      duration: 1.2,
      ease: "power3.out",
      onUpdate: () => {
        el.textContent = Math.round(counterObj.val).toLocaleString("es-ES") + suffix;
      },
      onComplete: () => {
        prevValRef.current = value;
      }
    });
  }, { dependencies: [value] });

  return <span ref={elementRef} className={className} style={{ fontFamily: 'var(--font-mono)', ...style }}>{Math.round(value).toLocaleString("es-ES")}{suffix}</span>;
}

export default function SummaryCards({ stats, loading }) {
  if (loading) {
    return (
      <section className="bento-monitoring-section" aria-label="Panel Bento de Monitoreo en Tiempo Real">
        <div className="bento-monitoring-title-container">
          <h2 className="bento-monitoring-title" style={{ display: 'flex', alignItems: 'center', height: '28px' }}>
            <span className="skeleton-line skeleton-title" style={{ width: '220px', height: '18px' }}></span>
          </h2>
          <div className="bento-monitoring-line"></div>
        </div>

        <div className="bento-monitoring-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bento-card bento-card-skeleton shimmer">
              <div className="bento-card-top">
                <div className="skeleton-circle"></div>
                <div className="skeleton-badge"></div>
              </div>

              <div className="bento-card-middle" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-line skeleton-heading" style={{ height: '18px' }}></div>
                <div className="skeleton-line skeleton-desc" style={{ height: '12px', width: '90%' }}></div>
              </div>

              <div className="bento-card-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '12px' }}>
                <div className="skeleton-line skeleton-indicator" style={{ width: '80px', height: '12px' }}></div>
                <div className="skeleton-line skeleton-value" style={{ width: '90px', height: '24px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!stats) return null;

  const aprRate = stats.total > 0 ? ((stats.otorgados / stats.total) * 100).toFixed(1) : 0;

  return (
    <section className="bento-monitoring-section" aria-label="Panel Bento de Monitoreo en Tiempo Real">
      <div className="bento-monitoring-title-container">
        <h2 className="bento-monitoring-title">Monitoreo en Tiempo Real</h2>
        <div className="bento-monitoring-line"></div>
      </div>

      <div className="bento-monitoring-grid">
        {/* Bento Card 1: Volumen de Expedientes */}
        <div className="bento-card bento-card-volume">
          <div className="bento-card-top">
            <div className="bento-card-icon-container text-primary">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
            </div>
            <span className="bento-badge text-primary-glow">EN VIVO</span>
          </div>

          <div className="bento-card-middle">
            <h3 className="bento-card-heading">Total Expedientes</h3>
            <p className="bento-card-desc">Cantidad total de carpetas cargadas, según el mes y la sede seleccionados.</p>
          </div>

          <div className="bento-card-bottom">
            <span className="bento-pulse-indicator text-success">
              <span className="pulse-dot bg-success"></span>
              Cache Activa
            </span>
            <KpiValueCounter value={stats.total} suffix=" u." className="bento-card-value text-primary" style={{ fontFamily: 'var(--font-mono)' }} />
          </div>
        </div>

        {/* Bento Card 2: Tasa de Aprobación */}
        <div className="bento-card bento-card-stability">
          <div className="bento-card-top">
            <div className="bento-card-icon-container text-secondary">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"/>
              </svg>
            </div>
            <span className="bento-badge text-secondary-glow">ACTIVO</span>
          </div>

          <div className="bento-card-middle">
            <h3 className="bento-card-heading">Tasa Aprobación</h3>
            <p className="bento-card-desc">Porcentaje de carpetas otorgadas sobre el total (otorgadas ÷ total).</p>
          </div>

          <div className="bento-card-bottom">
            {/* Animación de barras verticales neón */}
            <div className="neon-pulse-bars">
              <div className="bar bar-1"></div>
              <div className="bar bar-2"></div>
              <div className="bar bar-3"></div>
              <div className="bar bar-4"></div>
              <div className="bar bar-5"></div>
            </div>
            <KpiValueCounter value={parseFloat(aprRate)} suffix="%" className="bento-card-value text-secondary" style={{ fontFamily: 'var(--font-mono)' }} />
          </div>
        </div>

        {/* Bento Card 3: Filtro Moral */}
        <div className="bento-card bento-card-moral">
          <div className="bento-card-top">
            <div className="bento-card-icon-container text-tertiary">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <span className="bento-badge text-tertiary-glow">SINCRO</span>
          </div>

          <div className="bento-card-middle">
            <h3 className="bento-card-heading">Filtro Moral</h3>
            <p className="bento-card-desc">Carpetas con alerta de idoneidad moral, pendientes de revisión.</p>
          </div>

          <div className="bento-card-bottom">
            {/* Nodos de sincronización neón */}
            <div className="neon-pulse-dots">
              <span className="dot active"></span>
              <span className="dot active"></span>
              <span className="dot active"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
            <KpiValueCounter value={stats.moralAlerts} suffix=" alt." className="bento-card-value text-tertiary" style={{ fontFamily: 'var(--font-mono)' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
