import { jsPDF } from 'jspdf';

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3002'}/api/stats`;

const fmt = (n) => Number(n || 0).toLocaleString('es-CL');

/**
 * Genera y descarga el informe estadístico en PDF (A4), descriptivo y explicado.
 * Hace un fetch fresco de la API justo antes de renderizar para garantizar actualidad.
 */
export async function generatePdfReport({ selectedMonth, selectedOffice }) {
  // -- 1. Fetch datos frescos de la API --------------------------------------
  const qp = `?month=${selectedMonth}&office=${selectedOffice}`;

  const [resSummary, resTrends, resOffice, resStatus, resDecisions, resComunas] = await Promise.all([
    fetch(`${API_BASE_URL}/summary${qp}`),
    fetch(`${API_BASE_URL}/trends?office=${selectedOffice}`),
    fetch(`${API_BASE_URL}/distribution?month=${selectedMonth}`),
    fetch(`${API_BASE_URL}/status${qp}`),
    fetch(`${API_BASE_URL}/decisions${qp}`),
    fetch(`${API_BASE_URL}/domicilio-correo${qp}`)
  ]);

  if (!resSummary.ok || !resTrends.ok || !resOffice.ok || !resStatus.ok) {
    throw new Error('No se pudo conectar con el servidor para obtener datos actualizados.');
  }

  const [stats, monthlyTrends, officeDist, folderStatusData, decisionData, comunaData] = await Promise.all([
    resSummary.json(), resTrends.json(), resOffice.json(), resStatus.json(),
    resDecisions.ok ? resDecisions.json() : { decisions: [], intermediateTotal: 0 },
    resComunas.ok ? resComunas.json() : { total: 0, comunas: 0, byComuna: [] }
  ]);

  // -- 2. Documento y helpers ------------------------------------------------
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const colWidth = (contentWidth - 6) / 2;

  const today = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const mesLabel = selectedMonth === 'all' ? 'Todos los meses' : selectedMonth;
  const sedeLabel = selectedOffice === 'all' ? 'Todas las sedes' : selectedOffice;

  let yPos = 15;

  // Salto de página si no entra el alto requerido
  const ensureSpace = (h) => {
    if (yPos + h > pageHeight - 16) { doc.addPage(); yPos = 15; }
  };

  // Título de sección
  const sectionTitle = (text) => {
    ensureSpace(11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(text, margin, yPos);
    yPos += 5;
  };

  // Párrafo descriptivo justificado
  const paragraph = (text, { size = 8, color = [71, 85, 105], gap = 4, width = contentWidth } = {}) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width);
    const lineH = size * 0.3528 * 1.32;
    ensureSpace(lines.length * lineH + gap);
    doc.setTextColor(...color);
    doc.text(lines, margin, yPos, { align: 'justify', maxWidth: width });
    yPos += lines.length * lineH + gap;
  };

  // -- 3. Encabezado ---------------------------------------------------------
  doc.setFillColor(0, 219, 231);
  doc.rect(margin, yPos, 4, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('LICENCIA.AI', margin + 8, yPos + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emitido: ${today}`, pageWidth - margin, yPos + 3, { align: 'right' });
  doc.text('Confidencial / Reporte de Gestión 2026 - Datos en Tiempo Real', pageWidth - margin, yPos + 8, { align: 'right' });
  yPos += 16;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 9;

  // -- 4. Título e introducción ----------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('INFORME ESTADÍSTICO - CONTROL DE LICENCIAS DE CONDUCIR', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Filtros aplicados — Sede: ${sedeLabel}  |  Período: ${mesLabel}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  paragraph(
    'Este informe presenta el estado del Departamento de Licencias de Conducir según los filtros de sede y período ' +
    'seleccionados. Cada sección incluye una breve explicación de lo que muestra. Al final encontrará un glosario que ' +
    'define cada término e indicador utilizado.'
  );

  // Cálculos base
  const aprRate = stats.total > 0 ? ((stats.otorgados / stats.total) * 100).toFixed(1) : '0';
  const alertRate = stats.total > 0 ? ((stats.moralAlerts / stats.total) * 100).toFixed(1) : '0';
  const intermedios = decisionData.intermediateTotal || 0;
  const mainStatus = folderStatusData?.length > 0 ? folderStatusData[0].status : '-';
  const mainStatusVol = folderStatusData?.length > 0 ? folderStatusData[0].value : 0;

  // -- 5. Resumen ejecutivo (narrativo) --------------------------------------
  sectionTitle('RESUMEN EJECUTIVO');
  paragraph(
    `En el período y sede seleccionados se registran ${fmt(stats.total)} carpetas en total. De ellas, ` +
    `${fmt(stats.otorgados)} fueron otorgadas, lo que equivale a una tasa de aprobación del ${aprRate}% ` +
    `(otorgadas dividido por el total). Se denegaron ${fmt(stats.denegados)} carpetas y ${fmt(stats.pendientes)} ` +
    `quedaron pendientes de decisión, es decir, conforman el backlog o trabajo por resolver. Además, ` +
    `${fmt(intermedios)} carpetas se encuentran en estados intermedios de tramitación (en proceso, sin decisión final). ` +
    `El tiempo promedio de resolución fue de ${stats.avgLeadTime} días, contados desde la citación hasta la subida de la carpeta. ` +
    `Por último, se identificaron ${fmt(stats.moralAlerts)} carpetas con alerta de idoneidad moral (${alertRate}% del total), ` +
    `que requieren revisión. El trámite más frecuente es "${mainStatus}", con ${fmt(mainStatusVol)} carpetas.`
  );

  // -- 6. Indicadores clave (KPIs con explicación) ---------------------------
  sectionTitle('INDICADORES CLAVE');
  paragraph(
    'Resumen de los cinco indicadores principales. La cifra grande es el valor; el texto bajo cada uno explica qué representa.',
    { size: 7.5, gap: 3 }
  );

  const cardW = (contentWidth - 8) / 5;
  const kpis = [
    { title: 'Total Trámites', val: fmt(stats.total), desc: 'Carpetas cargadas en el período/sede.' },
    { title: 'Aprobación', val: `${aprRate}%`, desc: 'Otorgadas sobre el total.' },
    { title: 'Backlog', val: fmt(stats.pendientes), desc: 'Pendientes sin decisión.' },
    { title: 'Filtro Moral', val: fmt(stats.moralAlerts), desc: 'Con alerta de idoneidad.' },
    { title: 'Resolución', val: `${stats.avgLeadTime} días`, desc: 'Lead Time promedio.' }
  ];
  const kpiColors = [[0, 219, 231], [255, 171, 243], [254, 0, 254], [245, 158, 11], [139, 92, 246]];
  ensureSpace(24);
  kpis.forEach((kpi, idx) => {
    const xCard = margin + idx * (cardW + 2);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(xCard, yPos, cardW, 22, 'FD');
    doc.setFillColor(...kpiColors[idx]);
    doc.rect(xCard, yPos, cardW, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title.toUpperCase(), xCard + 2.5, yPos + 4.5);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, xCard + 2.5, yPos + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.3);
    doc.setTextColor(120, 130, 145);
    doc.text(doc.splitTextToSize(kpi.desc, cardW - 4), xCard + 2.5, yPos + 14);
  });
  yPos += 28;

  // -- 7. Evolución mensual --------------------------------------------------
  sectionTitle('EVOLUCIÓN MENSUAL DE TRÁMITES');
  paragraph(
    'Muestra, mes a mes, cuántas carpetas se registraron y cómo se resolvieron. La columna "Aprob. %" es el porcentaje ' +
    'de otorgadas de ese mes. Sirve para detectar meses de mayor carga y variaciones en la aprobación.',
    { size: 7.5, gap: 3 }
  );

  const colsT = [38, 30, 30, 30, 28, 24];
  const headersT = ['MES', 'TOTAL', 'OTORGADAS', 'DENEGADAS', 'PENDIENTES', 'APROB. %'];
  ensureSpace(9);
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  let xOff = margin + 3;
  headersT.forEach((h, i) => { doc.text(h, xOff, yPos + 4.5); xOff += colsT[i]; });
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const activeTrends = (monthlyTrends || []).filter((m) => m.total > 0);
  activeTrends.forEach((m, i) => {
    ensureSpace(7);
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, yPos, contentWidth, 7, 'F'); }
    const pendM = Math.max(0, m.total - m.otorgados - m.denegados);
    const aprM = m.total > 0 ? ((m.otorgados / m.total) * 100).toFixed(1) : '0.0';
    const row = [m.month, fmt(m.total), fmt(m.otorgados), fmt(m.denegados), fmt(pendM), `${aprM}%`];
    xOff = margin + 3;
    row.forEach((val, ci) => {
      doc.setFont('helvetica', ci > 0 ? 'bold' : 'normal');
      if (ci === 2) doc.setTextColor(0, 140, 150);
      else if (ci === 3) doc.setTextColor(180, 50, 150);
      else doc.setTextColor(51, 65, 85);
      doc.text(String(val), xOff, yPos + 5);
      xOff += colsT[ci];
    });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, yPos + 7, margin + contentWidth, yPos + 7);
    yPos += 7;
  });
  yPos += 6;

  // -- 8. Rendimiento por sede + estado de carpetas --------------------------
  sectionTitle('RENDIMIENTO POR SEDE Y ESTADO DE CARPETAS');
  paragraph(
    'A la izquierda, el volumen de carpetas y el tiempo promedio de resolución (Lead Time) de cada sede. A la derecha, ' +
    'las etapas administrativas más frecuentes (en qué fase del trámite están las carpetas).',
    { size: 7.5, gap: 3 }
  );

  ensureSpace(9);
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, yPos, colWidth, 7, 'F');
  doc.rect(margin + colWidth + 6, yPos, colWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('SEDE', margin + 3, yPos + 4.5);
  doc.text('LEAD TIME', margin + colWidth - 32, yPos + 4.5, { align: 'right' });
  doc.text('TOTAL', margin + colWidth - 3, yPos + 4.5, { align: 'right' });
  doc.text('ETAPA (TOP 5)', margin + colWidth + 9, yPos + 4.5);
  doc.text('CANT.', margin + contentWidth - 3, yPos + 4.5, { align: 'right' });
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const maxRows = Math.max((officeDist || []).length, 5);
  for (let i = 0; i < maxRows; i++) {
    ensureSpace(7);
    const rowY = yPos;
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, colWidth, 7, 'F');
      doc.rect(margin + colWidth + 6, rowY, colWidth, 7, 'F');
    }
    if (officeDist?.[i]) {
      const off = officeDist[i];
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(off.office, margin + 3, rowY + 5);
      doc.text(`${off.avgLeadTime}d`, margin + colWidth - 32, rowY + 5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(off.value), margin + colWidth - 3, rowY + 5, { align: 'right' });
    }
    if (folderStatusData?.[i]) {
      const s = folderStatusData[i];
      const clean = s.status.length > 24 ? `${s.status.slice(0, 22)}...` : s.status;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(clean, margin + colWidth + 9, rowY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(s.value), margin + contentWidth - 3, rowY + 5, { align: 'right' });
    }
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(margin, rowY + 7, margin + colWidth, rowY + 7);
    doc.line(margin + colWidth + 6, rowY + 7, margin + contentWidth, rowY + 7);
    yPos += 7;
  }
  yPos += 6;

  // -- 9. Estados de resolución + comunas ------------------------------------
  sectionTitle('ESTADOS DE RESOLUCIÓN Y CAMBIO DE DOMICILIO POR CORREO');
  paragraph(
    'A la izquierda, la decisión de cada carpeta: finales (Otorgado, Denegado, Pendiente) e intermedias o "en proceso" ' +
    `(marcadas en naranja), que son ${fmt(intermedios)} carpetas que siguen en trámite. A la derecha, las comunas a las ` +
    `que más se solicitó cambio de domicilio por correo: ${fmt(comunaData.total)} carpetas en ${comunaData.comunas || 0} comunas.`,
    { size: 7.5, gap: 3 }
  );

  ensureSpace(9);
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, yPos, colWidth, 7, 'F');
  doc.rect(margin + colWidth + 6, yPos, colWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('DECISIÓN', margin + 3, yPos + 4.5);
  doc.text('CANT.', margin + colWidth - 3, yPos + 4.5, { align: 'right' });
  doc.text('COMUNA', margin + colWidth + 9, yPos + 4.5);
  doc.text('CANT.', margin + contentWidth - 3, yPos + 4.5, { align: 'right' });
  yPos += 7;

  const decisions = decisionData.decisions || [];
  const topComunas = (comunaData.byComuna || []).slice(0, 8);
  const rows2 = Math.max(decisions.length, topComunas.length, 1);
  doc.setFontSize(7.5);
  for (let i = 0; i < rows2; i++) {
    ensureSpace(6.5);
    const rowY = yPos;
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, colWidth, 6.5, 'F');
      doc.rect(margin + colWidth + 6, rowY, colWidth, 6.5, 'F');
    }
    if (decisions[i]) {
      const d = decisions[i];
      doc.setFont('helvetica', 'normal');
      if (d.intermediate) doc.setTextColor(180, 110, 20); else doc.setTextColor(51, 65, 85);
      const label = d.decision.length > 26 ? `${d.decision.slice(0, 24)}...` : d.decision;
      doc.text(label, margin + 3, rowY + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(d.value), margin + colWidth - 3, rowY + 4.5, { align: 'right' });
    }
    if (topComunas[i]) {
      const c = topComunas[i];
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const cl = c.comuna.length > 26 ? `${c.comuna.slice(0, 24)}...` : c.comuna;
      doc.text(cl, margin + colWidth + 9, rowY + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(c.value), margin + contentWidth - 3, rowY + 4.5, { align: 'right' });
    }
    yPos += 6.5;
  }
  yPos += 8;

  // -- 10. Glosario (explica cada métrica) -----------------------------------
  sectionTitle('GLOSARIO — CÓMO LEER ESTE INFORME');
  const glos = [
    ['Total de carpetas', 'Cantidad de expedientes cargados, según el mes y la sede seleccionados.'],
    ['Tasa de aprobación', 'Porcentaje de carpetas otorgadas sobre el total (otorgadas ÷ total).'],
    ['Backlog (pendientes)', 'Carpetas que aún no tienen una decisión final registrada; el trabajo por resolver.'],
    ['Filtro moral', 'Carpetas marcadas con alerta de idoneidad moral que requieren revisión.'],
    ['Tiempo de resolución (Lead Time)', 'Días promedio entre la citación y la subida/resolución de la carpeta.'],
    ['Estados de resolución', 'La decisión de cada carpeta. Finales: Otorgado, Denegado, Pendiente. Intermedios (en proceso): S/SGL, Espera Examen, Clase Pendiente, Para Denegar — siguen en trámite.'],
    ['Estado de la carpeta', 'La etapa administrativa del expediente (ej.: Subida a Conaset, 1° Licencia, Cambio de Domicilio, Sin Especificar).'],
    ['Sin especificar', 'Carpetas sin etapa administrativa asignada; en su mayoría están pendientes o en proceso.'],
    ['Cambio de domicilio por correo', 'Solicitudes de cambio de domicilio enviadas por correo a la comuna de destino; se cuentan por comuna.']
  ];
  glos.forEach(([term, def]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const termLines = doc.splitTextToSize(`${term}:`, contentWidth);
    doc.setFont('helvetica', 'normal');
    const defLines = doc.splitTextToSize(def, contentWidth - 4);
    const blockH = termLines.length * 3.8 + defLines.length * 3.6 + 2.5;
    ensureSpace(blockH);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 140, 150);
    doc.text(`${term}:`, margin, yPos);
    yPos += termLines.length * 3.8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(defLines, margin + 2, yPos);
    yPos += defLines.length * 3.6 + 2.5;
  });

  // -- 11. Pie de página con numeración --------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Licencia.ai - Stack Estadístico en Tiempo Real. Generado el ${today}.`,
      margin, pageHeight - 10
    );
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // -- 12. Guardar -----------------------------------------------------------
  const filename = `Informe_${sedeLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${mesLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}
