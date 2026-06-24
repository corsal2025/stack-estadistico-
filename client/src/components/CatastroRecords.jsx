import React, { useState, useEffect, useMemo } from 'react';

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3002'}/api/stats`;

/**
 * Catastro: caracteriza las carpetas de un estado (por defecto SIN ESPECIFICAR)
 * para entender QUÉ SON y QUÉ OCURRE con ellas: desglose por decisión, sede y mes.
 * El detalle completo (RUT, nombre, etc.) se baja en CSV.
 */
export default function CatastroRecords({ selectedMonth = 'all', selectedOffice = 'all', refreshKey = 0, statusOptions = [] }) {
  const [status, setStatus] = useState('SIN ESPECIFICAR');
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    const qs = `?month=${selectedMonth}&office=${selectedOffice}&status=${encodeURIComponent(status)}`;
    fetch(`${API_BASE_URL}/records${qs}`)
      .then((r) => r.json())
      .then((d) => { if (active) setData(d); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [selectedMonth, selectedOffice, status, refreshKey]);

  const options = useMemo(() => {
    const fromData = (statusOptions || []).map((s) => s.status);
    const uniq = Array.from(new Set(['SIN ESPECIFICAR', ...fromData]));
    return ['all', ...uniq];
  }, [statusOptions]);

  // Desgloses para caracterizar el grupo
  const breakdown = (records, key) => {
    const m = {};
    records.forEach((r) => { const v = r[key] || '—'; m[v] = (m[v] || 0) + 1; });
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };

  const byDecision = useMemo(() => (data ? breakdown(data.records, 'decision') : []), [data]);
  const bySede = useMemo(() => (data ? breakdown(data.records, 'sede') : []), [data]);
  const byMes = useMemo(() => (data ? breakdown(data.records, 'mes') : []), [data]);

  const downloadCsv = () => {
    if (!data || !data.records) return;
    const headers = ['RUT', 'Nombre', 'Sede', 'Mes', 'Fecha Citación', 'Comuna', 'Decisión', 'Estado'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = data.records.map((r) =>
      [r.rut, r.nombre, r.sede, r.mes, r.fechaCitacion, r.comuna, r.decision, r.estado].map(esc).join(',')
    );
    const csv = '﻿' + [headers.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catastro_${status.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = data ? data.total : 0;

  const BreakdownBlock = ({ title, items }) => (
    <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700 }}>{title}</div>
      {items.map((it) => {
        const pct = total > 0 ? (it.value / total) * 100 : 0;
        return (
          <div key={it.label} style={{ marginBottom: '7px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
              <span>{it.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{it.value.toLocaleString('es-ES')} ({pct.toFixed(0)}%)</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(to right, var(--secondary), var(--primary))' }} />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (error) {
    return (
      <div className="chart-card obsidian-glass">
        <div className="chart-header"><h3>Catastro de Carpetas</h3><p style={{ color: 'var(--text-secondary)' }}>No se pudo cargar el catastro.</p></div>
      </div>
    );
  }

  return (
    <div className="chart-card obsidian-glass">
      <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <span className="chart-card-title">Catastro de Procesos</span>
          <h3>¿Qué son las carpetas de este estado?</h3>
          <p>Caracterización del grupo para entender qué son y qué ocurre. El detalle completo se descarga en CSV.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="custom-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ minWidth: '220px', fontSize: '0.78rem' }}
            aria-label="Estado a catastrar"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt === 'all' ? 'Todos los estados' : opt}</option>
            ))}
          </select>
          <button className="btn-lumina-primary" onClick={downloadCsv} disabled={!data || total === 0}>
            Descargar CSV
          </button>
        </div>
      </div>

      {!data ? (
        <p style={{ padding: '20px 0' }}>Cargando catastro...</p>
      ) : total === 0 ? (
        <p style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>No hay carpetas para este estado y filtro.</p>
      ) : (
        <div className="chart-body">
          <div style={{ marginBottom: '18px' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
              {total.toLocaleString('es-ES')}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              carpetas en este estado
            </span>
          </div>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <BreakdownBlock title="Por decisión" items={byDecision} />
            <BreakdownBlock title="Por sede" items={bySede} />
            <BreakdownBlock title="Por mes" items={byMes} />
          </div>
        </div>
      )}
    </div>
  );
}
