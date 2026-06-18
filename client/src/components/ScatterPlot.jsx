import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export default function ScatterPlot({ data }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  // Dimensiones del gráfico (Ajustadas para una vista ancha de pantalla completa)
  const width = 850;
  const height = 360;
  const paddingLeft = 55;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 50; // Más espacio inferior para evitar cortes en fechas

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Paleta de colores para las sedes adaptables
  const colors = {
    'AV. ARGENTINA': 'var(--primary)',
    'PLACILLA': 'var(--secondary)',
    'MERCADO PUERTO': 'var(--accent-purple)'
  };

  // 1. Calcular límites adaptativos para el eje Y
  const leadTimes = data ? data.map(d => d.avgLeadTime) : [];
  const maxLeadTime = leadTimes.length > 0 ? Math.max(...leadTimes) : 10;
  
  // Si los datos son bajos (ej. promedio 3-5 días), no subimos el límite a 30.
  // Ajustamos el límite superior para que sea al menos 6 y máximo dinámico.
  const yMaxLimit = Math.max(maxLeadTime + 1, 6);

  const dates = data ? data.map(d => new Date(d.date).getTime()) : [];
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
    if (!data || data.length === 0) return;

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
  }, { dependencies: [data], scope: containerRef });

  const formatDateLabel = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const handleMouseEnter = (e, item) => {
    const x = getX(item.date);
    const y = getY(item.avgLeadTime);

    setTooltip({
      item,
      x: x + 16,
      y: y - 40
    });
  };

  if (!data || data.length === 0) {
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
      <div className="chart-header">
        <h3>Histograma de Dispersión: Tiempo de Resolución (Eficiencia Operativa)</h3>
        <p>Distribución diaria de las citaciones y el tiempo de respuesta (Lead Time) por oficina</p>
      </div>

      <div className="chart-body">
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
          {data.map((item, idx) => {
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
                fill={colors[item.office] || '#8B5CF6'}
                onMouseEnter={(e) => handleMouseEnter(e, item)}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </svg>

        {/* Leyenda de colores del Scatter */}
        <div className="scatter-legends-container">
          {Object.keys(colors).map(office => (
            <div key={office} className="scatter-legend-item">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[office] }}></span>
              {office.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
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
            <span>Sede: <strong>{tooltip.item.office.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</strong></span>
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
