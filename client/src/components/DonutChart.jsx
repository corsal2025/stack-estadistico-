import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export default function DonutChart({ data, compact = false }) {
  const containerRef = useRef(null);
  const centerValRef = useRef(null);
  const centerTitleRef = useRef(null);
  
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Parámetros del donut
  const size = 180;
  const center = size / 2;
  const radius = 58;
  const circumference = 2 * Math.PI * radius; // ~364.42

  const totalSum = data ? data.reduce((acc, d) => acc + d.value, 0) : 0;

  // Paleta de colores para las sedes adaptables
  const colors = {
    'AV. ARGENTINA': 'var(--primary)',
    'PLACILLA': 'var(--secondary)',
    'MERCADO PUERTO': 'var(--accent-purple)'
  };

  const getPercentage = (val) => {
    if (totalSum === 0) return 0;
    return Math.round((val / totalSum) * 100);
  };

  // Animar los segmentos del Donut
  useGSAP(() => {
    if (!data || data.length === 0) return;

    const segments = containerRef.current.querySelectorAll('.donut-segment');
    segments.forEach((seg) => {
      const targetOffset = parseFloat(seg.getAttribute('data-target-offset'));
      
      gsap.to(seg, {
        attr: { 'stroke-dashoffset': targetOffset },
        duration: 1.1,
        ease: 'power2.out'
      });
    });
  }, { dependencies: [data], scope: containerRef });

  // Animación del texto central (usando useGSAP para limpieza automática)
  useGSAP(() => {
    const titleEl = centerTitleRef.current;
    const valueEl = centerValRef.current;
    if (!titleEl || !valueEl) return;

    gsap.to([titleEl, valueEl], {
      autoAlpha: 0,
      scale: 0.9,
      duration: 0.1,
      onComplete: () => {
        if (hoveredSegment) {
          titleEl.textContent = hoveredSegment.office.split(' ')[0];
          valueEl.textContent = `${getPercentage(hoveredSegment.value)}%`;
        } else {
          titleEl.textContent = 'CONSOLIDADO';
          valueEl.textContent = totalSum.toLocaleString('es-ES');
        }

        gsap.to([titleEl, valueEl], {
          autoAlpha: 1,
          scale: 1,
          duration: 0.1,
          ease: 'power1.out'
        });
      }
    });
  }, { dependencies: [hoveredSegment, totalSum], scope: containerRef });

  if (!data || data.length === 0) {
    return (
      <div className="chart-card glass-card">
        <div className="chart-header">
          <h3>Distribución por Oficina</h3>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  let accumulatedPercentage = 0;
  const segmentsData = data.map((d) => {
    const percentage = totalSum > 0 ? d.value / totalSum : 0;
    const segmentLength = percentage * circumference;
    const strokeDashOffset = circumference - segmentLength;
    const rotationAngle = (accumulatedPercentage * 360) - 90;
    
    accumulatedPercentage += percentage;

    return {
      ...d,
      strokeDashOffset,
      rotationAngle
    };
  });

  if (compact) {
    return (
      <div className="donut-body-wrapper" ref={containerRef} style={{ width: '100%', height: '100%', justifyContent: 'center', marginTop: '16px' }}>
        {/* SVG Donut */}
        <svg className="donut-chart-svg" viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '140px', height: '140px' }}>
          {segmentsData.map((seg) => (
            <circle
              key={seg.office}
              className="donut-segment"
              cx={center}
              cy={center}
              r={radius}
              stroke={colors[seg.office] || 'hsl(215, 15%, 50%)'}
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              data-target-offset={seg.strokeDashOffset}
              transform={`rotate(${seg.rotationAngle} ${center} ${center})`}
              onMouseEnter={() => setHoveredSegment(seg)}
              onMouseLeave={() => setHoveredSegment(null)}
              strokeWidth={14}
            />
          ))}
          {/* Textos Centrales */}
          <text 
            ref={centerTitleRef} 
            className="donut-center-text-title" 
            x={center} 
            y={center - 6}
          >
            CONSOLIDADO
          </text>
          <text 
            ref={centerValRef} 
            className="donut-center-text-value" 
            x={center} 
            y={center + 14}
            style={{ fill: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}
          >
            {totalSum.toLocaleString('es-ES')}
          </text>
        </svg>

        {/* Leyendas ultra compactas para Hero */}
        <div className="donut-legends-container" style={{ marginTop: '8px', maxWidth: '280px' }}>
          {data.map((d) => (
            <div key={d.office} className="donut-legend-item" style={{ fontSize: '10px' }}>
              <span className="donut-legend-label" style={{ fontSize: '10px' }}>
                <span 
                  className="donut-legend-color" 
                  style={{ backgroundColor: colors[d.office], width: '6px', height: '6px' }}
                ></span>
                {d.office.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              <span className="donut-legend-value" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                {getPercentage(d.value)}% • <span style={{ color: 'var(--primary)' }}>{d.avgLeadTime}d</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card obsidian-glass" ref={containerRef} style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div className="chart-header">
        <h3 style={{ fontFamily: 'Geist' }}>Distribución y Eficiencia por Oficina</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Participación relativa y tiempo de resolución promedio de trámites</p>
      </div>

      <div className="donut-body-wrapper">
        {/* SVG Donut */}
        <svg className="donut-chart-svg" viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
          {segmentsData.map((seg) => (
            <circle
              key={seg.office}
              className="donut-segment"
              cx={center}
              cy={center}
              r={radius}
              stroke={colors[seg.office] || 'hsl(215, 15%, 50%)'}
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              data-target-offset={seg.strokeDashOffset}
              transform={`rotate(${seg.rotationAngle} ${center} ${center})`}
              onMouseEnter={() => setHoveredSegment(seg)}
              onMouseLeave={() => setHoveredSegment(null)}
              strokeWidth={14}
            />
          ))}
          {/* Textos Centrales */}
          <text 
            ref={centerTitleRef} 
            className="donut-center-text-title" 
            x={center} 
            y={center - 6}
          >
            CONSOLIDADO
          </text>
          <text 
            ref={centerValRef} 
            className="donut-center-text-value" 
            x={center} 
            y={center + 14}
          >
            {totalSum.toLocaleString('es-ES')}
          </text>
        </svg>

        {/* Leyendas compactas */}
        <div className="donut-legends-container">
          {data.map((d) => (
            <div key={d.office} className="donut-legend-item">
              <span className="donut-legend-label">
                <span 
                  className="donut-legend-color" 
                  style={{ backgroundColor: colors[d.office] }}
                ></span>
                {d.office.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              <span className="donut-legend-value">
                {d.value.toLocaleString('es-ES')} u. ({getPercentage(d.value)}%) <span style={{ color: 'var(--primary)', fontWeight: 700 }}>• {d.avgLeadTime}d prom.</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
