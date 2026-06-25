import React, { useRef, useState, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3002'}/api/stats`;

export default function ExcelUploader({ onUploadSuccess }) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [clearing, setClearing] = useState(false);
  const inputRef = useRef(null);

  // Glow animation when dragging
  useGSAP(() => {
    if (!containerRef.current) return;
    const dropzone = containerRef.current.querySelector('.dropzone-inner');
    if (!dropzone) return;
    if (isDragging) {
      gsap.to(dropzone, { scale: 1.02, borderColor: 'var(--primary)', boxShadow: '0 0 30px var(--primary-glow)', duration: 0.3 });
    } else {
      gsap.to(dropzone, { scale: 1, borderColor: 'rgba(255,255,255,0.08)', boxShadow: '0 0 0px transparent', duration: 0.3 });
    }
  }, { dependencies: [isDragging], scope: containerRef });

  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

  const processFile = useCallback(async (file) => {
    if (!file) return;

    // Client-side: validate file type
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setStatus('error');
      setErrorMsg('Formato no válido. Solo se aceptan archivos .xlsx o .xls');
      return;
    }

    // Client-side: validate file size (< 50 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatus('error');
      setErrorMsg(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). El máximo permitido es 50 MB.`);
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    // Animate progress bar (simulated — real upload can't stream progress easily)
    const progressTween = gsap.to({ val: 0 }, {
      val: 90,
      duration: 1.5,
      ease: 'power1.out',
      onUpdate: function () { setProgress(Math.round(this.targets()[0].val)); }
    });

    try {
      const formData = new FormData();
      formData.append('excel', file);

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      progressTween.kill();
      setProgress(100);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Error del servidor: HTTP ${res.status}`);
      }

      setStatus('success');
      setResult(data);

      // Notify parent to refresh all dashboard data
      if (onUploadSuccess) onUploadSuccess(data);

      // Auto-reset after 8s
      setTimeout(() => {
        setStatus('idle');
        setResult(null);
        setProgress(0);
      }, 8000);

    } catch (err) {
      progressTween.kill();
      setStatus('error');
      setErrorMsg(err.message || 'Error de conexión con el servidor.');
    }
  }, [onUploadSuccess]);

  const handleClearAll = useCallback(async () => {
    if (!window.confirm('¿Estás seguro de que quieres ELIMINAR TODOS los datos del sistema? Esta acción deja el dashboard vacío. Luego podrás cargar un Excel nuevo.')) {
      return;
    }

    setClearing(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/clear`, {
        method: 'POST'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar los datos.');
      }

      setStatus('success');
      setResult({
        filename: 'Sistema vaciado — listo para cargar datos nuevos',
        records: data.records,
        summary: data.summary,
        offices: data.offices,
        months: data.months
      });

      if (onUploadSuccess) onUploadSuccess(data);

      setTimeout(() => {
        setStatus('idle');
        setResult(null);
      }, 5000);

    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Error de conexión al eliminar los datos.');
    } finally {
      setClearing(false);
    }
  }, [onUploadSuccess]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleInputChange = (e) => processFile(e.target.files[0]);

  return (
    <div className="excel-uploader-container obsidian-glass" ref={containerRef}>
      {/* Header */}
      <div className="uploader-header">
        <div className="uploader-header-icon">
          <svg width="20" height="20" fill="none" stroke="var(--primary)" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="uploader-title">Centro de Carga de Datos</h3>
          <p className="uploader-subtitle">Sube tu planilla Excel para actualizar el sistema en tiempo real</p>
        </div>
        <div className="uploader-status-badge">
          {status === 'idle' && <span className="uploader-badge badge-ready">LISTO</span>}
          {status === 'uploading' && <span className="uploader-badge badge-processing">PROCESANDO</span>}
          {status === 'success' && <span className="uploader-badge badge-success">COMPLETADO</span>}
          {status === 'error' && <span className="uploader-badge badge-error">ERROR</span>}
        </div>
      </div>

      {/* Dropzone */}
      {status === 'idle' && (
        <div
          className="dropzone-inner"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
          <div className="dropzone-icon">
            <svg width="40" height="40" fill="none" stroke="var(--primary)" strokeWidth="1.5" viewBox="0 0 24 24" opacity="0.7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="dropzone-main-text">
            {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu Excel aquí'}
          </p>
          <p className="dropzone-sub-text">o haz clic para seleccionar • .xlsx / .xls • máx. 50 MB</p>

          {/* Format hint */}
          <div className="dropzone-format-hint">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
            </svg>
            El archivo debe tener la misma estructura de hojas que la planilla madre
          </div>
        </div>
      )}

      {/* Upload progress */}
      {status === 'uploading' && (
        <div className="uploader-progress-container">
          <div className="uploader-progress-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="animate-spin">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" strokeOpacity="0.3" />
              <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
            </svg>
          </div>
          <p className="uploader-progress-label">Analizando y procesando registros...</p>
          <div className="uploader-progress-bar-track">
            <div className="uploader-progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="uploader-progress-pct">{progress}%</span>
        </div>
      )}

      {/* Success state */}
      {status === 'success' && result && (
        <div className="uploader-result success">
          <div className="uploader-result-icon success-icon">
            <svg width="28" height="28" fill="none" stroke="var(--primary)" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="uploader-result-content">
            <p className="uploader-result-title">¡Datos actualizados exitosamente!</p>
            <p className="uploader-result-file">📄 {result.filename}</p>
            <div className="uploader-result-stats">
              <span className="result-stat"><strong style={{ color: 'var(--primary)' }}>{result.records?.toLocaleString('es-ES')}</strong> registros</span>
              <span className="result-stat"><strong style={{ color: 'var(--secondary)' }}>{result.summary?.otorgados?.toLocaleString('es-ES')}</strong> otorgados</span>
              <span className="result-stat"><strong>{result.offices?.length || 0}</strong> sedes</span>
              <span className="result-stat"><strong>{result.months?.length || 0}</strong> meses</span>
            </div>
          </div>
          <p className="uploader-refresh-notice">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            El dashboard se actualizó automáticamente
          </p>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="uploader-result error">
          <div className="uploader-result-icon error-icon">
            <svg width="28" height="28" fill="none" stroke="var(--secondary)" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="uploader-result-content">
            <p className="uploader-result-title" style={{ color: 'var(--secondary)' }}>Error al procesar el archivo</p>
            <p className="uploader-result-error-msg">{errorMsg}</p>
          </div>
          <button className="uploader-retry-btn" onClick={() => { setStatus('idle'); setErrorMsg(''); }}>
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Botón de restablecer/borrar incorporado */}
      <div className="uploader-footer-actions">
        <button
          className="uploader-reset-btn"
          onClick={handleClearAll}
          disabled={status === 'uploading' || clearing}
        >
          {clearing ? (
            <>
              <svg className="animate-spin text-current" style={{ marginRight: '6px' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" strokeOpacity="0.3" />
                <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
              </svg>
              <span>Eliminando...</span>
            </>
          ) : (
            <>
              <svg style={{ marginRight: '6px' }} width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Eliminar todos los datos</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
