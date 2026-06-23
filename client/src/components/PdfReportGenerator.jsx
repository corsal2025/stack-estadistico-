import { jsPDF } from 'jspdf';

const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3002'}/api/stats`;

/**
 * Genera y descarga el informe estadÃ­stico en PDF (A4) â€” siempre con datos actualizados
 * Hace un fetch fresco de la API justo antes de renderizar para garantizar actualidad.
 */
export async function generatePdfReport({ selectedMonth, selectedOffice }) {
  // â”€â”€ 1. Fetch datos frescos de la API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const qp = `?month=${selectedMonth}&office=${selectedOffice}`;

  const [resSummary, resTrends, resOffice, resStatus] = await Promise.all([
    fetch(`${API_BASE_URL}/summary${qp}`),
    fetch(`${API_BASE_URL}/trends?office=${selectedOffice}`),
    fetch(`${API_BASE_URL}/distribution?month=${selectedMonth}`),
    fetch(`${API_BASE_URL}/status${qp}`)
  ]);

  if (!resSummary.ok || !resTrends.ok || !resOffice.ok || !resStatus.ok) {
    throw new Error('No se pudo conectar con el servidor para obtener datos actualizados.');
  }

  const [stats, monthlyTrends, officeDist, folderStatusData] = await Promise.all([
    resSummary.json(), resTrends.json(), resOffice.json(), resStatus.json()
  ]);

  // â”€â”€ 2. Crear documento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210, pageHeight = 297, margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const today = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  let yPos = 15;

  // â”€â”€ 3. Encabezado corporativo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFillColor(0, 219, 231);
  doc.rect(margin, yPos, 4, 11, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('LICENTIA.IO', margin + 8, yPos + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emitido: ${today}`, pageWidth - margin, yPos + 3, { align: 'right' });
  doc.text('Confidencial / Reporte de GestiÃ³n 2026 â€” Datos en Tiempo Real', pageWidth - margin, yPos + 8, { align: 'right' });

  yPos += 16;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // â”€â”€ 4. TÃ­tulo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('INFORME ESTADÃSTICO â€” CONTROL DE LICENCIAS DE CONDUCIR', margin, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const mesLabel = selectedMonth === 'all' ? 'Todos los meses' : selectedMonth;
  const sedeLabel = selectedOffice === 'all' ? 'Todas las sedes' : selectedOffice;
  doc.text(`Filtros: Sede [ ${sedeLabel} ] | PerÃ­odo [ ${mesLabel} ]`, margin, yPos);
  yPos += 10;

  // â”€â”€ 5. Resumen ejecutivo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const aprRate = stats.total > 0 ? ((stats.otorgados / stats.total) * 100).toFixed(1) : 0;
  const alertRate = stats.total > 0 ? ((stats.moralAlerts / stats.total) * 100).toFixed(1) : 0;
  const mainStatus = folderStatusData?.length > 0 ? folderStatusData[0].status : 'â€”';
  const mainStatusVol = folderStatusData?.length > 0 ? folderStatusData[0].value : 0;

  let timeEval = 'Ã³ptimo.';
  if (stats.avgLeadTime > 20) timeEval = 'elevado. Se recomienda revisar cuellos de botella operativos.';
  else if (stats.avgLeadTime > 12) timeEval = 'moderado. Monitorear en perÃ­odos de alta afluencia.';

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
  const summaryText =
    `El presente informe refleja el estado operativo en tiempo real del Departamento de Licencias de Conducir al ${today}. ` +
    `Se procesaron ${stats.total.toLocaleString('es-ES')} solicitudes en el perÃ­odo evaluado. ` +
    `Se otorgaron ${stats.otorgados.toLocaleString('es-ES')} licencias (tasa de aprobaciÃ³n: ${aprRate}%) y se denegaron ${stats.denegados.toLocaleString('es-ES')} carpetas. ` +
    `Se identificaron ${stats.moralAlerts.toLocaleString('es-ES')} alertas de Idoneidad Moral (${alertRate}% del total). ` +
    `El trÃ¡mite predominante es "${mainStatus}" con ${mainStatusVol.toLocaleString('es-ES')} registros. ` +
    `El tiempo promedio de resoluciÃ³n fue ${stats.avgLeadTime} dÃ­as, nivel ${timeEval}`;

  const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 10);
  doc.text(summaryLines, margin + 5, yPos + 13);
  yPos += 48;

  // â”€â”€ 6. KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MÃ‰TRICAS CLAVE ACTUALIZADAS', margin, yPos);
  yPos += 5;

  const cardW = (contentWidth - 8) / 5;
  const kpis = [
    { title: 'Total TrÃ¡mites', val: stats.total.toLocaleString('es-ES'), desc: 'Carpetas totales' },
    { title: 'AprobaciÃ³n', val: `${stats.otorgados.toLocaleString('es-ES')} (${aprRate}%)`, desc: 'Otorgados' },
    { title: 'Backlog', val: stats.pendientes.toLocaleString('es-ES'), desc: 'Sin decisiÃ³n' },
    { title: 'Filtro Moral', val: `${stats.moralAlerts} (${stats.moralEffectiveness}%)`, desc: 'Alertas (Efectividad)' },
    { title: 'ResoluciÃ³n', val: `${stats.avgLeadTime} dÃ­as`, desc: 'Lead Time promedio' }
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

  // â”€â”€ 7. Tabla de tendencias mensuales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('EVOLUCIÃ“N MENSUAL DE TRÃMITES', margin, yPos);
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

  // â”€â”€ 8. Dos columnas: Sedes + Estado de carpetas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  doc.text('CATEGORÃA', margin + colWidth + 9, yPos + 4.5);
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
      const clean = s.status.length > 22 ? `${s.status.slice(0, 20)}â€¦` : s.status;
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

  // â”€â”€ 9. Recomendaciones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (yPos < pageHeight - 50) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('RECOMENDACIONES OPERATIVAS', margin, yPos);
    yPos += 5;

    const sortedOff = [...(officeDist || [])].sort((a, b) => b.value - a.value);
    const mainOffice = sortedOff[0]?.office || 'â€”';
    const mainOffVol = sortedOff[0]?.value || 0;
    const sortedLT = [...(officeDist || [])].filter(o => o.value > 0).sort((a, b) => b.avgLeadTime - a.avgLeadTime);
    const slowOff = sortedLT[0]?.office || 'â€”';
    const slowLT = sortedLT[0]?.avgLeadTime || 0;
    const peakMonthData = [...(monthlyTrends || [])].sort((a, b) => b.total - a.total)[0];
    const peakMonth = peakMonthData?.month || 'â€”';
    const peakVol = peakMonthData?.total || 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const recText =
      `1. Carga crÃ­tica: "${mainOffice}" concentra ${mainOffVol.toLocaleString('es-ES')} trÃ¡mites. "${slowOff}" registra el mayor Lead Time (${slowLT} dÃ­as). Se recomienda reasignar personal entre sedes.\n\n` +
      `2. Pico estacional: "${peakMonth}" tuvo el mayor volumen (${peakVol.toLocaleString('es-ES')} solicitudes). Planificar capacidad operativa para perÃ­odos equivalentes.\n\n` +
      `3. Filtro moral: Efectividad del ${stats.moralEffectiveness}% en la detecciÃ³n de irregularidades. El ${alertRate}% de alertas requiriÃ³ revisiÃ³n extraordinaria.`;
    const recLines = doc.splitTextToSize(recText, contentWidth);
    doc.text(recLines, margin, yPos + 3);
  }

  // â”€â”€ 10. Pie de pÃ¡gina â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Licentia.io â€” Stack EstadÃ­stico en Tiempo Real. Generado el ${today}. Todos los derechos reservados Â© 2026.`,
    pageWidth / 2, pageHeight - 10, { align: 'center' }
  );

  // â”€â”€ 11. Guardar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filename = `Informe_${sedeLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${mesLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}
