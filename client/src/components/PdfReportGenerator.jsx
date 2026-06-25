import { jsPDF } from 'jspdf';

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3002'}/api/stats`;

/**
 * Genera y descarga el informe estadístico en PDF (A4) - siempre con datos actualizados.
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

  // -- 2. Crear documento ----------------------------------------------------
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const today = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  let yPos = 15;

  // -- 3. Encabezado corporativo ---------------------------------------------
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
  yPos += 10;

  // -- 4. Título -------------------------------------------------------------
  // Título principal centrado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('INFORME ESTADÍSTICO - CONTROL DE LICENCIAS DE CONDUCIR', pageWidth / 2, yPos, { align: 'center' });

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const mesLabel = selectedMonth === 'all' ? 'Todos los meses' : selectedMonth;
  const sedeLabel = selectedOffice === 'all' ? 'Todas las sedes' : selectedOffice;
  // Subtítulo de filtros centrado bajo el título
  doc.text(`Filtros: Sede [ ${sedeLabel} ]  |  Período [ ${mesLabel} ]`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // -- 5. Resumen ejecutivo --------------------------------------------------
  const aprRate = stats.total > 0 ? ((stats.otorgados / stats.total) * 100).toFixed(1) : 0;
  const alertRate = stats.total > 0 ? ((stats.moralAlerts / stats.total) * 100).toFixed(1) : 0;
  const mainStatus = folderStatusData?.length > 0 ? folderStatusData[0].status : '-';
  const mainStatusVol = folderStatusData?.length > 0 ? folderStatusData[0].value : 0;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos, contentWidth, 40, 'F');
  doc.setDrawColor(0, 219, 231);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, margin, yPos + 40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 140, 150);
  doc.text('RESUMEN EJECUTIVO', margin + 5, yPos + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const intermedios = decisionData.intermediateTotal || 0;
  const summaryText =
    `Período: ${mesLabel}.   Sede: ${sedeLabel}.   ` +
    `Carpetas totales: ${stats.total.toLocaleString('es-CL')}.   ` +
    `Otorgadas: ${stats.otorgados.toLocaleString('es-CL')} (${aprRate}%).   ` +
    `Denegadas: ${stats.denegados.toLocaleString('es-CL')}.   ` +
    `Pendientes: ${stats.pendientes.toLocaleString('es-CL')}.   ` +
    `En proceso (estados intermedios): ${intermedios.toLocaleString('es-CL')}.   ` +
    `Alertas de idoneidad moral: ${stats.moralAlerts.toLocaleString('es-CL')} (${alertRate}%).   ` +
    `Trámite más frecuente: "${mainStatus}" (${mainStatusVol.toLocaleString('es-CL')}).   ` +
    `Tiempo promedio de resolución: ${stats.avgLeadTime} días.`;

  // Párrafo justificado para una lectura más prolija
  doc.text(summaryText, margin + 5, yPos + 13, { maxWidth: contentWidth - 10, align: 'justify' });
  yPos += 48;

  // -- 6. KPIs ---------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MÉTRICAS CLAVE ACTUALIZADAS', margin, yPos);
  yPos += 5;

  const cardW = (contentWidth - 8) / 5;
  const kpis = [
    { title: 'Total Trámites', val: stats.total.toLocaleString('es-ES'), desc: 'Carpetas totales' },
    { title: 'Aprobación', val: `${stats.otorgados.toLocaleString('es-ES')} (${aprRate}%)`, desc: 'Otorgados' },
    { title: 'Backlog', val: stats.pendientes.toLocaleString('es-ES'), desc: 'Sin decisión' },
    { title: 'Filtro Moral', val: `${stats.moralAlerts} (${stats.moralEffectiveness}%)`, desc: 'Alertas (Efectividad)' },
    { title: 'Resolución', val: `${stats.avgLeadTime} días`, desc: 'Lead Time promedio' }
  ];

  const kpiColors = [[0,219,231],[255,171,243],[254,0,254],[245,158,11],[139,92,246]];
  kpis.forEach((kpi, idx) => {
    const xCard = margin + idx * (cardW + 2);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(xCard, yPos, cardW, 18, 'FD');
    doc.setFillColor(...kpiColors[idx]);
    doc.rect(xCard, yPos, cardW, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title.toUpperCase(), xCard + 2.5, yPos + 4.5);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, xCard + 2.5, yPos + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.desc, xCard + 2.5, yPos + 15);
  });
  yPos += 26;

  // -- 7. Tabla de tendencias mensuales --------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('EVOLUCIÓN MENSUAL DE TRÁMITES', margin, yPos);
  yPos += 5;

  // Cabecera
  const colsT = [38, 30, 30, 30, 28, 24]; // widths
  const headersT = ['MES', 'TOTAL', 'OTORGADOS', 'DENEGADOS', 'PENDIENTES', 'APROB. %'];
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  let xOffset = margin + 3;
  headersT.forEach((h, i) => {
    doc.text(h, xOffset, yPos + 4.5);
    xOffset += colsT[i];
  });
  yPos += 7;

  // Filas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const activeTrends = (monthlyTrends || []).filter(m => m.total > 0);
  activeTrends.forEach((m, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
    }
    const pendM = Math.max(0, m.total - m.otorgados - m.denegados);
    const aprM = m.total > 0 ? ((m.otorgados / m.total) * 100).toFixed(1) : '0.0';
    const rowData = [m.month, m.total.toLocaleString('es-ES'), m.otorgados.toLocaleString('es-ES'), m.denegados.toLocaleString('es-ES'), pendM.toLocaleString('es-ES'), `${aprM}%`];
    xOffset = margin + 3;
    doc.setTextColor(51, 65, 85);
    rowData.forEach((val, ci) => {
      if (ci > 0) doc.setFont('helvetica', 'bold');
      if (ci === 2) doc.setTextColor(0, 140, 150);
      else if (ci === 3) doc.setTextColor(180, 50, 150);
      else doc.setTextColor(51, 65, 85);
      doc.text(String(val), xOffset, yPos + 5);
      doc.setFont('helvetica', 'normal');
      xOffset += colsT[ci];
    });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, yPos + 7, margin + contentWidth, yPos + 7);
    yPos += 7;
  });
  yPos += 8;

  // -- 8. Dos columnas: Sedes + Estado de carpetas ---------------------------
  const colWidth = (contentWidth - 6) / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RENDIMIENTO POR SEDE', margin, yPos);
  doc.text('ESTADO DE CARPETAS (TOP 5)', margin + colWidth + 6, yPos);
  yPos += 5;

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, yPos, colWidth, 7, 'F');
  doc.rect(margin + colWidth + 6, yPos, colWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('SEDE', margin + 3, yPos + 4.5);
  doc.text('LEAD TIME', margin + colWidth - 32, yPos + 4.5, { align: 'right' });
  doc.text('TOTAL', margin + colWidth - 3, yPos + 4.5, { align: 'right' });
  doc.text('CATEGORÍA', margin + colWidth + 9, yPos + 4.5);
  doc.text('CANT.', margin + contentWidth - 3, yPos + 4.5, { align: 'right' });
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const maxRows = Math.max((officeDist || []).length, 5);
  for (let i = 0; i < maxRows; i++) {
    const rowY = yPos + i * 7;
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, colWidth, 7, 'F');
      doc.rect(margin + colWidth + 6, rowY, colWidth, 7, 'F');
    }
    if (officeDist?.[i]) {
      const off = officeDist[i];
      doc.setTextColor(51, 65, 85);
      doc.text(off.office, margin + 3, rowY + 5);
      doc.text(`${off.avgLeadTime}d`, margin + colWidth - 32, rowY + 5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(off.value.toLocaleString('es-ES'), margin + colWidth - 3, rowY + 5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    }
    if (folderStatusData?.[i]) {
      const s = folderStatusData[i];
      const clean = s.status.length > 22 ? `${s.status.slice(0, 20)}...` : s.status;
      doc.setTextColor(51, 65, 85);
      doc.text(clean, margin + colWidth + 9, rowY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(s.value.toLocaleString('es-ES'), margin + contentWidth - 3, rowY + 5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    }
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(margin, rowY + 7, margin + colWidth, rowY + 7);
    doc.line(margin + colWidth + 6, rowY + 7, margin + contentWidth, rowY + 7);
  }
  yPos += maxRows * 7 + 10;

  // -- 9. Datos concretos: estados de resolución + comunas -------------------
  if (yPos > pageHeight - 75) { doc.addPage(); yPos = 15; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTADOS DE RESOLUCIÓN', margin, yPos);
  doc.text('CAMBIO DOMICILIO POR CORREO — TOP COMUNAS', margin + colWidth + 6, yPos);
  yPos += 5;

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
    const rowY = yPos + i * 6.5;
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
      doc.text(d.value.toLocaleString('es-CL'), margin + colWidth - 3, rowY + 4.5, { align: 'right' });
    }
    if (topComunas[i]) {
      const c = topComunas[i];
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const cl = c.comuna.length > 26 ? `${c.comuna.slice(0, 24)}...` : c.comuna;
      doc.text(cl, margin + colWidth + 9, rowY + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(c.value.toLocaleString('es-CL'), margin + contentWidth - 3, rowY + 4.5, { align: 'right' });
    }
  }
  yPos += rows2 * 6.5 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Estados intermedios (en proceso) marcados en naranja. Cambio de domicilio por correo: ${(comunaData.total || 0).toLocaleString('es-CL')} carpetas en ${(comunaData.comunas || 0)} comunas.`, margin, yPos);

  // -- 10. Pie de página -----------------------------------------------------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Licencia.ai - Stack Estadístico en Tiempo Real. Generado el ${today}. Todos los derechos reservados © 2026.`,
    pageWidth / 2, pageHeight - 10, { align: 'center' }
  );

  // -- 11. Guardar -----------------------------------------------------------
  const filename = `Informe_${sedeLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${mesLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}
