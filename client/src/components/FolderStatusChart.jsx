import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export default function FolderStatusChart({ data }) {
  const containerRef = useRef(null);
  const [viewMode, setViewMode] = useState('consolidated'); // 'consolidated' o 'detailed'

  // Dimensiones del gráfico optimizadas para visualización vertical con texto superior
  const width = 600;
  const paddingLeft = 20;
  const paddingRight = 40;
  const paddingTop = 10;
  const paddingBottom = 15;

  const chartWidth = width - paddingLeft - paddingRight;

  if (!data || data.length === 0) {
    return (
      <div className="chart-card glass-card">
        <div className="chart-header">
          <h3>Estado de las Carpetas</h3>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  // Agrupaciones analíticas solicitadas por el usuario:
  const getConsolidatedData = () => {
    let conasetTotal = 0;
    let f8Total = 0;
    let domicilioTotal = 0;
    let primeraLicencia = 0;
    let sinEspecificar = 0;
    let otrosTramites = 0;

    data.forEach(d => {
      const status = d.status.toUpperCase();
      
      // Primera Licencia
      if (status.includes("1° LICENCIA") || status.includes("1º LICENCIA") || status.includes("PRIMERA LICENCIA")) {
        primeraLicencia += d.value;
      }
      // Sin Especificar
      else if (status.includes("SIN ESPECIFICAR")) {
        sinEspecificar += d.value;
      }
      
      // Agrupamos en los canales que nos pide el usuario:
      // Subidas a CONASET
      if (status.includes("CONASET")) {
        conasetTotal += d.value;
      }
      
      // Subidas con F8
      if (status.includes("F8")) {
        f8Total += d.value;
      }
      
      // Cambios de Domicilio
      if (status.includes("DOMICILIO") || status.includes("DOM.")) {
        domicilioTotal += d.value;
      }
      
      // Canjes, oficios, archivos, etc.
      if (status.includes("CANJE") || status.includes("EXTRANJERA") || status.includes("OFICIO") || status.includes("ARCHIVOS") || status.includes("OF.43")) {
        otrosTramites += d.value;
      }
    });

    return [
      { status: "SUBIDAS A CONASET TOTALES", value: conasetTotal, desc: "Agrupa trámites generales y cambios de domicilio enviados a CONASET" },
      { status: "CAMBIOS DE DOMICILIO TOTALES", value: domicilioTotal, desc: "Agrupa solicitudes pendientes, tramitadas por correo y conaset" },
      { status: "SUBIDAS CON F8 TOTALES", value: f8Total, desc: "Expedientes validados y cargados mediante formulario F8" },
      { status: "PRIMERA LICENCIA", value: primeraLicencia, desc: "Trámites iniciales de obtención de licencia de conducir" },
      { status: "SIN ESPECIFICAR / OTROS", value: sinEspecificar, desc: "Expedientes sin fase administrativa asignada en la planilla" },
      { status: "CANJES Y OFICIOS", value: otrosTramites, desc: "Trámites especiales de canje extranjero y derivaciones judiciales" }
    ].sort((a, b) => b.value - a.value);
  };

  const displayData = viewMode === 'consolidated' ? getConsolidatedData() : data;
  const maxVal = displayData.length > 0 ? Math.max(...displayData.map(d => d.value)) * 1.05 : 100;

  useGSAP(() => {
    const bars = containerRef.current.querySelectorAll('.bar-rect-horiz-full');
    const labels = containerRef.current.querySelectorAll('.bar-val-text-full');

    // Animación de ancho de barras
    gsap.fromTo(bars,
      { attr: { width: 0 } },
      {
        attr: { width: (i, target) => target.getAttribute('data-target-width') },
        duration: 1.2,
        stagger: 0.06,
        ease: 'power3.out'
      }
    );

    // Animación de aparición de etiquetas de valor
    gsap.fromTo(labels,
      { opacity: 0, x: -5 },
      {
        opacity: 1,
        x: 0,
        duration: 0.4,
        delay: 0.8,
        stagger: 0.06
      }
    );
  }, { dependencies: [viewMode, data], scope: containerRef });

  const rowHeight = 52; // Fila de altura fija para albergar etiqueta superior + barra
  const barHeight = 12; // Altura de la barra
  const height = paddingTop + displayData.length * rowHeight + paddingBottom;

  return (
    <div className="chart-card obsidian-glass folder-chart-container" ref={containerRef}>
      <div className="chart-header flex-header">
        <div className="header-info">
          <span className="chart-card-title">Categorización del Trámite</span>
          <h3>Estado de las Carpetas</h3>
          <p>Volumen de expedientes clasificados por tipo de trámite y fase administrativa</p>
        </div>
        <div className="tab-selector-neon">
          <button 
            className={`tab-btn ${viewMode === 'consolidated' ? 'active' : ''}`}
            onClick={() => setViewMode('consolidated')}
          >
            Consolidado de Flujos
          </button>
          <button 
            className={`tab-btn ${viewMode === 'detailed' ? 'active' : ''}`}
            onClick={() => setViewMode('detailed')}
          >
            Todos los Estados ({data.length})
          </button>
        </div>
      </div>

      <div className="chart-body">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
          <defs>
            <linearGradient id="bar-horiz-glow-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="1" />
            </linearGradient>
          </defs>

          {displayData.map((d, idx) => {
            const yText = paddingTop + idx * rowHeight + 14; // Posición de la etiqueta arriba
            const yBar = yText + 6; // Posición de la barra abajo del texto
            const barWidth = (d.value / maxVal) * chartWidth;

            return (
              <g key={d.status} className="bar-group-horiz-full">
                {/* Texto Superior: Muestra el nombre completo de la celda de Excel sin recortes */}
                <text 
                  className="chart-text" 
                  x={paddingLeft} 
                  y={yText} 
                  textAnchor="start"
                >
                  {d.status.toUpperCase()}
                </text>

                {/* Barra SVG */}
                <rect
                  className="bar-rect-horiz-full"
                  x={paddingLeft}
                  y={yBar}
                  width={0} // Comienza en 0 para la animación GSAP
                  height={barHeight}
                  rx={4}
                  fill="url(#bar-horiz-glow-gradient)"
                  data-target-width={barWidth}
                  onMouseEnter={(e) => gsap.to(e.target, { filter: 'brightness(1.25)', duration: 0.2 })}
                  onMouseLeave={(e) => gsap.to(e.target, { filter: 'brightness(1)', duration: 0.2 })}
                />

                {/* Etiqueta de valor exacto a la derecha de la barra */}
                <text
                  className="bar-val-text-full chart-text"
                  x={paddingLeft + barWidth + 10}
                  y={yBar + barHeight / 2 + 3.5}
                  textAnchor="start"
                  opacity={0}
                >
                  {d.value.toLocaleString('es-ES')} u.
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
