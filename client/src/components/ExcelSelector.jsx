import React from 'react';

export default function ExcelSelector({ 
  selectedMonth, 
  setSelectedMonth, 
  selectedOffice, 
  setSelectedOffice, 
  onDownloadPdf,
  isDownloading
}) {
  const months = [
    { value: 'all', label: 'Todos los meses (Ene - Jul)' },
    { value: 'ENERO', label: 'Enero' },
    { value: 'FEBRERO', label: 'Febrero' },
    { value: 'MARZO', label: 'Marzo' },
    { value: 'ABRIL', label: 'Abril' },
    { value: 'MAYO', label: 'Mayo' },
    { value: 'JUNIO', label: 'Junio' },
    { value: 'JULIO', label: 'Julio' }
  ];

  const offices = [
    { value: 'all', label: 'Todas las Oficinas' },
    { value: 'AV. ARGENTINA', label: 'Av. Argentina' },
    { value: 'PLACILLA', label: 'Placilla' },
    { value: 'MERCADO PUERTO', label: 'Mercado Puerto' }
  ];

  return (
    <section className="selector-bar obsidian-glass" aria-label="Filtros del Panel">
      <div className="selector-group">
        <label htmlFor="select-office">
          Filtrar por Sede
        </label>
        <select 
          id="select-office" 
          className="custom-select"
          value={selectedOffice}
          onChange={(e) => setSelectedOffice(e.target.value)}
        >
          {offices.map(off => (
            <option key={off.value} value={off.value}>{off.label}</option>
          ))}
        </select>
      </div>

      <div className="selector-group">
        <label htmlFor="select-month">
          Filtrar por Mes
        </label>
        <select 
          id="select-month" 
          className="custom-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="selector-group btn-container">
        <button 
          className="btn-lumina-primary" 
          onClick={onDownloadPdf}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="16" />
              </svg>
              Generando...
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Descargar Informe PDF
            </>
          )}
        </button>
      </div>
    </section>
  );
}
