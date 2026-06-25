import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import ExcelSelector from './components/ExcelSelector';
import SummaryCards from './components/SummaryCards';
import DonutChart from './components/DonutChart';
import FolderStatusChart from './components/FolderStatusChart';
import ScatterPlot from './components/ScatterPlot';
import ExcelUploader from './components/ExcelUploader';
import DomicilioCorreoChart from './components/DomicilioCorreoChart';
import CatastroRecords from './components/CatastroRecords';
import DecisionBreakdown from './components/DecisionBreakdown';
import { generatePdfReport } from './components/PdfReportGenerator';

gsap.registerPlugin(useGSAP);

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3002'}/api/stats`;

const THEMES = [
  { id: 'lumina-prime', name: 'Lumina Prime' },
  { id: 'noir-executive', name: 'Noir Executive' },
  { id: 'aurora-command', name: 'Aurora Command' },
  { id: 'obsidian-precision', name: 'Obsidian Precision' },
  { id: 'steel-terminal', name: 'Steel Terminal' },
  { id: 'vanguard-flux', name: 'Vanguard Flux' }
];

function App() {
  const containerRef = useRef(null);
  
  // Estado de Tema
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('licentia-theme');
    // Fall back to the default if the saved theme is no longer in the list.
    return THEMES.some(t => t.id === saved) ? saved : 'lumina-prime';
  });

  useEffect(() => {
    document.body.setAttribute('data-theme', currentTheme);
    localStorage.setItem('licentia-theme', currentTheme);
  }, [currentTheme]);

  // Estados de Filtro
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedOffice, setSelectedOffice] = useState('all');

  // Estados de Datos
  const [stats, setStats] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [officeDist, setOfficeDist] = useState([]);
  const [folderStatusData, setFolderStatusData] = useState([]);
  const [scatterData, setScatterData] = useState([]);
  // Se incrementa en cada refresco (limpiar/subir) para que los componentes
  // que traen sus propios datos (ej. comunas) vuelvan a consultar.
  const [dataVersion, setDataVersion] = useState(0);
  
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
        console.log('🔄 Iniciando carga de datos...', { API_BASE_URL, selectedMonth, selectedOffice });
        const queryParams = `?month=${selectedMonth}&office=${selectedOffice}`;
        
        const [resSummary, resTrends, resOffice, resStatus, resScatter] = await Promise.all([
          fetch(`${API_BASE_URL}/summary${queryParams}`),
          fetch(`${API_BASE_URL}/trends?office=${selectedOffice}`),
          fetch(`${API_BASE_URL}/distribution?month=${selectedMonth}`),
          fetch(`${API_BASE_URL}/status${queryParams}`),
          // El histograma trae todas las sedes; el filtro de sede es local al componente.
          fetch(`${API_BASE_URL}/scatter?month=${selectedMonth}&office=all`)
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

        console.log('✅ Datos recibidos:', { dataSummary, dataTrends, dataOffice, dataStatus, scatterCount: dataScatter.length });

        setStats(dataSummary);
        setMonthlyTrends(dataTrends);
        setOfficeDist(dataOffice);
        setFolderStatusData(dataStatus);
        setScatterData(dataScatter);
      } catch (err) {
        console.error('❌ Error al consultar la API:', err);
        setError(err.message || 'Error de conexión con el servidor en :3002');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [selectedMonth, selectedOffice]);

  // Callback tras upload de Excel exitoso — refresca todos los datos
  const handleUploadSuccess = useCallback(() => {
    // Refrescamos SIN vaciar la pantalla: los datos viejos se mantienen hasta
    // que llegan los nuevos, así al limpiar no se ve la página en negro.
    // Los gráficos y tablas quedan; solo cambian los números (a 0 si se limpió).
    async function refresh() {
      try {
        const qp = `?month=${selectedMonth}&office=${selectedOffice}`;
        const [resSummary, resTrends, resOffice, resStatus, resScatter] = await Promise.all([
          fetch(`${API_BASE_URL}/summary${qp}`),
          fetch(`${API_BASE_URL}/trends?office=${selectedOffice}`),
          fetch(`${API_BASE_URL}/distribution?month=${selectedMonth}`),
          fetch(`${API_BASE_URL}/status${qp}`),
          // El histograma trae todas las sedes; el filtro de sede es local al componente.
          fetch(`${API_BASE_URL}/scatter?month=${selectedMonth}&office=all`)
        ]);
        const [dataSummary, dataTrends, dataOffice, dataStatus, dataScatter] = await Promise.all([
          resSummary.json(), resTrends.json(), resOffice.json(), resStatus.json(), resScatter.json()
        ]);
        setStats(dataSummary);
        setMonthlyTrends(dataTrends);
        setOfficeDist(dataOffice);
        setFolderStatusData(dataStatus);
        setScatterData(dataScatter);
        setDataVersion(v => v + 1); // dispara el refetch de los componentes propios (comunas)
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    refresh();
  }, [selectedMonth, selectedOffice]);

  // Efecto de cursor interactivo (glow dinámico) en tarjetas
  useEffect(() => {
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll('.glass-card, .bento-card, .bento-card-skeleton');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [stats, loading]);

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

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out', duration: 0.7 },
      onComplete: () => {
        // Guarantee all animated elements are fully visible after the tween
        gsap.set(
          '.bento-card, .bento-predictive-header, .bento-predictive-left, .bento-predictive-right, .chart-card, .throughput-section, .bento-predictive-section',
          { clearProps: 'all' }
        );
      }
    });

    tl.fromTo(
      '.bento-card',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.08 }
    )
    .fromTo(
      '.bento-predictive-header',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1 },
      '-=0.4'
    )
    .fromTo(
      '.bento-predictive-left, .bento-predictive-right, .chart-card',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1 },
      '-=0.5'
    );
  }, { dependencies: [stats], scope: containerRef });

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      // PDF siempre hace fetch fresco de la API — no necesita los datos del estado
      await generatePdfReport({ selectedMonth, selectedOffice });
    } catch (err) {
      alert(`Error al generar el PDF: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="app-container" ref={containerRef}>
      {/* Elementos Decorativos de Fondo según el Tema */}
      {currentTheme === 'lumina-prime' && (
        <>
          <div className="bg-glow-orb orb-1"></div>
          <div className="bg-glow-orb orb-2"></div>
        </>
      )}
      {currentTheme === 'aurora-command' && (
        <>
          <div className="aurora-bg"></div>
          <div className="aurora-mesh"></div>
          <div className="aurora-orb aurora-orb-1"></div>
          <div className="aurora-orb aurora-orb-2"></div>
        </>
      )}
      {currentTheme === 'steel-terminal' && (
        <>
          <div className="dot-matrix"></div>
          <div className="scanline"></div>
        </>
      )}
      {currentTheme === 'vanguard-flux' && (
        <>
          <div className="flux-bg"></div>
          <div className="caustic"></div>
        </>
      )}

      {/* Header */}
      <header className="main-header obsidian-glass">
        <div className="header-logo">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="24" height="24" rx="6" fill="var(--primary)" />
            <path d="M10 16L14 20L22 12" stroke="#050505" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="logo-text">
            <h1>Licencia<span>.ai</span></h1>
          </div>
        </div>
        
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Selector de Tema de Kombai */}
          <div className="theme-switcher-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>TEMA:</span>
            <select
              value={currentTheme}
              onChange={(e) => setCurrentTheme(e.target.value)}
              className="custom-select"
              style={{
                minWidth: '210px',
                margin: 0
              }}
            >
              {THEMES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="system-status">
            <span className={`status-indicator ${loading ? 'syncing' : 'online neon-pulse-cyan'}`}></span>
            <span className="status-text">{loading ? 'Sincronizando...' : 'Centro de Comando Activo'}</span>
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
            Establece tu <br />
            <span className="hero-gradient-text" style={{ fontStyle: 'italic' }}>Centro de Control</span>
          </h2>
          <p className="hero-description">
            Visualización estadística en tiempo real del Departamento de Licencias de Conducir.
            Procesa expedientes, mide los tiempos de resolución y audita el rendimiento de cada sede desde un solo panel.
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
            <div className="db-status-value">{stats ? stats.total.toLocaleString('es-CL') : '0'} Reg.</div>
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

      {/* ── CENTRO DE CARGA DE DATOS EXCEL ─────────────────────────────────── */}
      <section className="upload-section">
        <ExcelUploader onUploadSuccess={handleUploadSuccess} />
      </section>

      {/* Estado de Carga (Solo mostramos Spinner si no tenemos ningún dato previo) */}
      {loading && !stats && (
        <div style={{ display: 'none' }}></div> /* Ocultar el spinner grande ya que renderizamos esqueletos */
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
            Asegúrate de que el servidor backend esté corriendo en <strong style={{ color: 'var(--primary)' }}>http://localhost:3002</strong>.<br/>
            Ejecuta en la carpeta <code style={{ color: 'var(--primary)' }}>server/</code>: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '3px' }}>node src/app.js</code>
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
      {loading && !stats ? (
        <SummaryCards loading={true} />
      ) : (
        stats && <SummaryCards stats={stats} />
      )}

      {/* SECCIÓN BENTO: IA PREDICTIVA */}
      {loading && !stats ? (
        <section className="bento-predictive-section" aria-label="Sección de Inteligencia Predictiva">
          <div className="bento-predictive-left bento-card-skeleton shimmer">
            <div className="skeleton-line skeleton-title" style={{ width: '120px', height: '18px' }}></div>
            <div className="skeleton-line skeleton-desc" style={{ marginTop: '8px', width: '80%' }}></div>
            <div className="skeleton-chart" style={{ height: '300px', width: '100%', marginTop: '24px' }}></div>
          </div>
          <div className="bento-predictive-right bento-card-skeleton shimmer">
            <div className="skeleton-line skeleton-title" style={{ width: '140px', height: '18px' }}></div>
            <div className="skeleton-line skeleton-desc" style={{ marginTop: '8px', width: '70%' }}></div>
            <div className="skeleton-chart" style={{ height: '300px', width: '100%', marginTop: '24px' }}></div>
          </div>
        </section>
      ) : (
        stats && (
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
                  <span className="bento-predictive-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>{stats ? stats.total.toLocaleString('es-CL') : '0'} Reg.</span>
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
        )
      )}

      {/* SECCIÓN SYSTEM THROUGHPUT: GRÁFICOS DE VOLUMEN */}
      {loading && !stats ? (
        <section className="throughput-section" aria-label="Panel de Flujo Operativo">
          <div className="throughput-header-row">
            <div className="throughput-header-info">
              <div className="skeleton-line skeleton-title" style={{ width: '240px', height: '18px' }}></div>
              <div className="skeleton-line skeleton-desc" style={{ marginTop: '8px', width: '60%' }}></div>
            </div>
          </div>
          <div className="throughput-grid-container">
            <div className="bento-card-skeleton shimmer" style={{ height: '400px' }}>
              <div className="skeleton-line skeleton-heading" style={{ height: '18px', width: '150px' }}></div>
              <div className="skeleton-chart" style={{ height: '300px', width: '100%', marginTop: '16px' }}></div>
            </div>
            <div className="bento-card-skeleton shimmer" style={{ height: '400px' }}>
              <div className="skeleton-line skeleton-heading" style={{ height: '18px', width: '150px' }}></div>
              <div className="skeleton-chart" style={{ height: '300px', width: '100%', marginTop: '16px' }}></div>
            </div>
          </div>
        </section>
      ) : (
        stats && (
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
        )
      )}

      {/* SECCIÓN: CAMBIOS DE DOMICILIO POR CORREO (detalle por comuna) */}
      {stats && (
        <section className="throughput-section" aria-label="Cambios de domicilio por correo">
          <DomicilioCorreoChart selectedMonth={selectedMonth} selectedOffice={selectedOffice} refreshKey={dataVersion} />
        </section>
      )}

      {/* SECCIÓN: ESTADOS DE RESOLUCIÓN (decisiones, con intermedios aparte) */}
      {stats && (
        <section className="throughput-section" aria-label="Estados de resolución">
          <DecisionBreakdown selectedMonth={selectedMonth} selectedOffice={selectedOffice} refreshKey={dataVersion} />
        </section>
      )}

      {/* SECCIÓN: CATASTRO DE PROCESOS (detalle de carpetas por estado) */}
      {stats && (
        <section className="throughput-section" aria-label="Catastro de procesos por estado">
          <CatastroRecords
            selectedMonth={selectedMonth}
            selectedOffice={selectedOffice}
            refreshKey={dataVersion}
            statusOptions={folderStatusData}
          />
        </section>
      )}

      {/* Footer */}
      <footer className="footer-container app-footer">
        <p className="footer-text">&copy; 2026 Licencia.ai. Todos los derechos reservados. Obsidian Systems Division.</p>
      </footer>
    </div>
  );
}

export default App;
