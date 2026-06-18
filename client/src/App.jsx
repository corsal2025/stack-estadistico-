import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import ExcelSelector from './components/ExcelSelector';
import SummaryCards from './components/SummaryCards';
import DonutChart from './components/DonutChart';
import FolderStatusChart from './components/FolderStatusChart';
import ScatterPlot from './components/ScatterPlot';
import { generatePdfReport } from './components/PdfReportGenerator';

gsap.registerPlugin(useGSAP);

const API_BASE_URL = 'http://localhost:3002/api/stats';

function App() {
  const containerRef = useRef(null);
  
  // Estados de Filtro
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedOffice, setSelectedOffice] = useState('all');

  // Estados de Datos
  const [stats, setStats] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [officeDist, setOfficeDist] = useState([]);
  const [folderStatusData, setFolderStatusData] = useState([]);
  const [scatterData, setScatterData] = useState([]);
  
  // Estados del Ciclo de Vida
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Carga de datos
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = `?month=${selectedMonth}&office=${selectedOffice}`;
        
        const [resSummary, resTrends, resOffice, resStatus, resScatter] = await Promise.all([
          fetch(`${API_BASE_URL}/summary${queryParams}`),
          fetch(`${API_BASE_URL}/trends?office=${selectedOffice}`),
          fetch(`${API_BASE_URL}/distribution?month=${selectedMonth}`),
          fetch(`${API_BASE_URL}/status${queryParams}`),
          fetch(`${API_BASE_URL}/scatter${queryParams}`)
        ]);

        if (!resSummary.ok) throw new Error(`/summary → HTTP ${resSummary.status}`);
        if (!resTrends.ok)  throw new Error(`/trends → HTTP ${resTrends.status}`);
        if (!resOffice.ok)  throw new Error(`/distribution → HTTP ${resOffice.status}`);
        if (!resStatus.ok)  throw new Error(`/status → HTTP ${resStatus.status}`);
        if (!resScatter.ok) throw new Error(`/scatter → HTTP ${resScatter.status}`);

        const [dataSummary, dataTrends, dataOffice, dataStatus, dataScatter] = await Promise.all([
          resSummary.json(),
          resTrends.json(),
          resOffice.json(),
          resStatus.json(),
          resScatter.json()
        ]);

        setStats(dataSummary);
        setMonthlyTrends(dataTrends);
        setOfficeDist(dataOffice);
        setFolderStatusData(dataStatus);
        setScatterData(dataScatter);
      } catch (err) {
        console.error('Error al consultar la API:', err);
        setError(err.message || 'Error de conexión con el servidor en :3002');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [selectedMonth, selectedOffice]);

  // Animaciones continuas de los orbes del fondo
  useGSAP(() => {
    gsap.to('.orb-1', {
      x: 'random(-50, 50)',
      y: 'random(-40, 40)',
      scale: 'random(0.95, 1.05)',
      duration: 7,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    gsap.to('.orb-2', {
      x: 'random(-50, 50)',
      y: 'random(-40, 40)',
      scale: 'random(0.95, 1.05)',
      duration: 9,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, { scope: containerRef });

  // 1. Revelación estática del layout base al montar (Header y Hero)
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
    tl.from('.main-header', { y: -20, opacity: 0 })
      .from('.hero-subtitle', { y: 15, opacity: 0 }, '-=0.4')
      .from('.hero-title', { y: 25, opacity: 0 }, '-=0.6')
      .from('.hero-description', { y: 15, opacity: 0 }, '-=0.6')
      .from('.selector-bar', { y: 20, opacity: 0 }, '-=0.6')
      .from('.hero-widgets-container', { x: 30, opacity: 0 }, '-=0.7');
  }, { scope: containerRef });

  // 2. Revelación de las tarjetas y gráficos cuando los datos están renderizados en el DOM
  useGSAP(() => {
    if (!stats) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
    tl.from('.bento-card', { y: 20, opacity: 0, stagger: 0.08 })
      .from('.bento-predictive-header', { y: 20, opacity: 0 }, '-=0.4')
      .from('.bento-predictive-left, .bento-predictive-right, .chart-card', { y: 30, opacity: 0, stagger: 0.1 }, '-=0.5');
  }, { dependencies: [stats], scope: containerRef });

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await generatePdfReport({
        stats,
        monthlyTrends,
        officeDist,
        folderStatusData,
        selectedMonth,
        selectedOffice
      });
    } catch (err) {
      alert('Error al generar el reporte en PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="app-container" ref={containerRef}>
      {/* Glows de fondo */}
      <div className="bg-glow-orb orb-1"></div>
      <div className="bg-glow-orb orb-2"></div>

      {/* Header */}
      <header className="main-header obsidian-glass">
        <div className="header-logo">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="24" height="24" rx="6" fill="var(--primary)" />
            <path d="M10 16L14 20L22 12" stroke="#050505" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="logo-text">
            <h1>Licentia<span>.io</span></h1>
          </div>
        </div>
        <div className="header-actions">
          <div className="system-status">
            <span className="status-indicator online neon-pulse-cyan"></span>
            <span className="status-text">Centro de Comando Activo</span>
          </div>
        </div>
      </header>

      {/* SECCIÓN HERO (ESTILO OBSIDIAN LUMINA) */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-subtitle-container hero-subtitle">
            <span style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} className="neon-pulse-cyan"></span>
            <span>SISTEMA ONLINE: V4.2.0</span>
          </div>
          <h2 className="hero-title">
            Establecé tu <br />
            <span className="hero-gradient-text" style={{ fontStyle: 'italic' }}>Centro de Control</span>
          </h2>
          <p className="hero-description">
            Visualización estadística en tiempo real para el control de licencias de conducir. 
            Procesá expedientes y auditá el rendimiento operativo del departamento a través de un centro de comando unificado.
          </p>
          
          {/* Selector y controles flotantes integrados en el Hero */}
          <ExcelSelector 
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedOffice={selectedOffice}
            setSelectedOffice={setSelectedOffice}
            onDownloadPdf={handleDownloadPdf}
            isDownloading={downloadingPdf}
          />
        </div>

        {/* Panel derecho del Hero estilo Command Terminal */}
        <div className="hero-widgets-container obsidian-glass">
          {/* Grilla holográfica de fondo */}
          <div className="holographic-grid">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i}></div>
            ))}
          </div>

          {/* Stats Flotantes */}
          <div className="float-widget top-left">
            <div className="db-status-title">Estado de Base de Datos</div>
            <div className="db-status-value">18,123 Reg.</div>
            <div className="db-status-sub">
              <span className="status-indicator online neon-pulse-cyan"></span>
              <span>CACHÉ LOCAL ACTIVA</span>
            </div>
          </div>

          <div className="float-widget bottom-right">
            <div className="approval-rate-title">Tasa de Aprobación</div>
            <div className="approval-rate-value">
              {stats && stats.total > 0 ? `${((stats.otorgados / stats.total) * 100).toFixed(0)}%` : '0%'}
            </div>
            <div className="approval-rate-sub">Otorgados / Total</div>
          </div>

          {/* Componente central interactivo: DonutChart en modo compacto */}
          <div className="donut-center-container">
            <DonutChart data={officeDist} compact={true} />
          </div>
        </div>
      </section>

      {/* Línea divisoria de flujo de datos */}
      <div className="data-stream-line"></div>

      {/* Estado de Carga */}
      {loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '80px 0',
          color: 'var(--text-muted)'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="animate-spin">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" strokeOpacity="0.3"/>
            <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Cargando datos del servidor...
          </span>
        </div>
      )}

      {/* Estado de Error */}
      {!loading && error && (
        <div style={{
          margin: '0 auto',
          maxWidth: '700px',
          padding: '28px 32px',
          background: 'rgba(255, 171, 243, 0.06)',
          border: '1px solid rgba(255, 171, 243, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="20" height="20" fill="none" stroke="var(--secondary)" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span style={{ fontWeight: 700, color: 'var(--secondary)', fontFamily: 'var(--font-primary)', fontSize: '1rem' }}>
              No se pueden cargar los gráficos
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
            {error}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
            Asegurate de que el servidor backend esté corriendo en <strong style={{ color: 'var(--primary)' }}>http://localhost:3002</strong>.<br/>
            Ejecutá en la carpeta <code style={{ color: 'var(--primary)' }}>server/</code>: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '3px' }}>node src/app.js</code>
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              alignSelf: 'flex-start',
              background: 'var(--primary)',
              color: '#050505',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            Reintentar conexión
          </button>
        </div>
      )}

      {/* Sección KPIs de Misión */}
      {stats && <SummaryCards stats={stats} />}

      {/* SECCIÓN BENTO: IA PREDICTIVA */}
      {stats && (
        <section className="bento-predictive-section" aria-label="Sección de Inteligencia Predictiva">
          {/* Tarjeta Bento Izquierda (Scatter Plot + Stats) */}
          <div className="bento-predictive-left">
            <div className="bento-predictive-header">
              <h2 className="bento-predictive-title">IA Predictiva</h2>
              <p className="bento-predictive-desc">
                Nuestros modelos analíticos anticipan cuellos de botella operativos y desvíos de rendimiento antes de que se manifiesten en las sedes.
              </p>
            </div>
            
            <div className="bento-predictive-stats">
              <div className="bento-predictive-stat-item">
                <span className="bento-predictive-stat-label">Tasa de Aprobación</span>
                <span className="bento-predictive-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
                  {stats.total > 0 ? ((stats.otorgados / stats.total) * 100).toFixed(1) : '0'}%
                </span>
              </div>
              <div className="bento-predictive-stat-item">
                <span className="bento-predictive-stat-label">Base de Datos</span>
                <span className="bento-predictive-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>18,123 Reg.</span>
              </div>
            </div>

            {/* Histograma de dispersión real */}
            <ScatterPlot data={scatterData} />
          </div>

          {/* Tarjeta Bento Derecha (Adaptive Learning / Lead Time) */}
          <div className="bento-predictive-right">
            <div className="adaptive-learning-top">
              <div className="adaptive-learning-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.473L21 9l-3.482-3.482M9.813 15.904L21 9m-11.188 6.904l-6.243-6.243L9 3l3.482 3.482M21 9l-3.482-3.482m0 0L9 21"/>
                </svg>
              </div>
              <h3 className="adaptive-learning-heading">Aprendizaje Adaptativo</h3>
              <p className="adaptive-learning-desc">
                El sistema recalcula dinámicamente las estimaciones de tiempo de resolución basándose en la carga de trabajo diaria de los evaluadores.
              </p>
            </div>

            {/* Lead Time Promedio del Sistema en Grande */}
            <div className="adaptive-learning-value-container">
              <div className="db-status-title text-purple-glow">Tiempo Promedio de Carga</div>
              <div className="kpi-card-value adaptive-learning-value" style={{ fontFamily: 'var(--font-mono)' }}>
                {stats.avgLeadTime} {stats.avgLeadTime === 1 ? 'Día' : 'Días'}
              </div>
            </div>

            {/* Prisma neón decorativo SVG */}
            <div className="adaptive-learning-prism-container">
              <div className="adaptive-learning-prism-glow">
                <svg className="prism-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="50,15 85,75 15,75" fill="none" stroke="url(#prism-grad)" strokeWidth="1.5" />
                  <line x1="50" y1="15" x2="50" y2="75" stroke="var(--primary)" strokeWidth="0.8" strokeDasharray="2 2" />
                  <path d="M50,45 L70,75 M50,45 L30,75" stroke="var(--secondary)" strokeWidth="1" strokeOpacity="0.7" />
                  <defs>
                    <linearGradient id="prism-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--secondary)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN SYSTEM THROUGHPUT: GRÁFICOS DE VOLUMEN */}
      {stats && (
        <section className="throughput-section" aria-label="Panel de Flujo Operativo">
          <div className="throughput-header-row">
            <div className="throughput-header-info">
              <h2 className="throughput-title">Flujo Operativo del Sistema</h2>
              <p className="throughput-desc">
                Visualización detallada de la distribución del volumen de trámites por estado administrativo y participación por sede.
              </p>
            </div>
            <div className="throughput-legends">
              <div className="throughput-legend-item">
                <span className="throughput-legend-color primary"></span>
                <span>Procesado</span>
              </div>
              <div className="throughput-legend-item">
                <span className="throughput-legend-color secondary"></span>
                <span>En Tránsito</span>
              </div>
            </div>
          </div>

          <div className="throughput-grid-container">
            {/* Gráfico de barras horizontales con pestañas consolidado/detallado */}
            <FolderStatusChart data={folderStatusData} />

            {/* Distribución por oficina en detalle */}
            <DonutChart data={officeDist} />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="footer-container app-footer">
        <p className="footer-text">&copy; 2026 Licentia.io. Todos los derechos reservados. Obsidian Systems Division.</p>
      </footer>
    </div>
  );
}

export default App;
