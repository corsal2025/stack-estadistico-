import { jsPDF } from 'jspdf';

/**
 * Genera y descarga el informe explicativo de alta calidad en PDF (A4)
 */
export function generatePdfReport({ stats, monthlyTrends, officeDist, folderStatusData, selectedMonth, selectedOffice }) {
  return new Promise((resolve, reject) => {
    try {
      // 1. Crear documento PDF A4 (210mm de ancho x 297mm de alto)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2); // 180mm

      // Fechas y metadatos
      const today = new Date().toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let yPos = 15;

      // ==========================================================================
      // ENCABEZADO CORPORATIVO
      // ==========================================================================
      doc.setFillColor(139, 92, 246); // Violeta primary
      doc.rect(margin, yPos, 4, 11, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42); // Gris oscuro pizarra
      doc.text('LICENTIA.IO', margin + 8, yPos + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Emitido: ${today}`, pageWidth - margin, yPos + 3, { align: 'right' });
      doc.text('Confidencial / Reporte de Gestión 2026', pageWidth - margin, yPos + 8, { align: 'right' });

      yPos += 16;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, yPos, pageWidth - margin, yPos);

      yPos += 10;

      // ==========================================================================
      // TÍTULO DEL INFORME
      // ==========================================================================
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('INFORME ESTADÍSTICO DE CONTROL DE TRÁNSITO Y LICENCIAS', margin, yPos);
      
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      
      const mesLabel = selectedMonth === 'all' ? 'Todos los meses (Ene-Jul)' : selectedMonth;
      const sedeLabel = selectedOffice === 'all' ? 'Todas las oficinas' : selectedOffice;
      doc.text(`Filtros: Sede [ ${sedeLabel} ] | Período [ ${mesLabel} ]`, margin, yPos);

      yPos += 10;

      // ==========================================================================
      // RESUMEN EJECUTIVO (TEXTO EXPLICATIVO DINÁMICO)
      // ==========================================================================
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos, contentWidth, 38, 'F');
      
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(0.8);
      doc.line(margin, yPos, margin, yPos + 38);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(139, 92, 246);
      doc.text('RESUMEN Y DIAGNÓSTICO EJECUTIVO', margin + 5, yPos + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      const aprRate = stats.total > 0 ? ((stats.otorgados / stats.total) * 100).toFixed(1) : 0;
      const alertRate = stats.total > 0 ? ((stats.moralAlerts / stats.total) * 100).toFixed(1) : 0;

      let timeEvaluation = "óptimo y dentro de los parámetros de servicio estándar.";
      if (stats.avgLeadTime > 20) {
        timeEvaluation = "elevado. Se sugiere evaluar cuellos de botella en la digitalización o en las revisiones morales de carpetas.";
      } else if (stats.avgLeadTime > 12) {
        timeEvaluation = "moderado. Se recomienda monitorear para evitar acumulaciones de carpetas en periodos de alta afluencia.";
      }

      // Encontrar el estado de carpeta predominante
      const mainStatus = folderStatusData && folderStatusData.length > 0 ? folderStatusData[0].status : '1° LICENCIA';
      const mainStatusVol = folderStatusData && folderStatusData.length > 0 ? folderStatusData[0].value : 0;

      const summaryText = 
        `El presente informe detalla el análisis operativo y la eficiencia en la tramitación de carpetas del departamento de Licencias de Conducir correspondientes al año 2026. ` +
        `Durante el período evaluado, se procesó un volumen total de ${stats.total.toLocaleString('es-ES')} solicitudes. ` +
        `De este consolidado, se otorgaron ${stats.otorgados.toLocaleString('es-ES')} licencias, lo que representa una tasa de aprobación del ${aprRate}%, ` +
        `mientras que se denegaron o rechazaron ${stats.denegados.toLocaleString('es-ES')} carpetas.\n\n` +
        `Se identificaron ${stats.moralAlerts.toLocaleString('es-ES')} registros con advertencias de Idoneidad Moral (${alertRate}% del total), las cuales requirieron una revisión extraordinaria. ` +
        `El tipo de trámite predominante en los expedientes es "${mainStatus}" con ${mainStatusVol.toLocaleString('es-ES')} registros. ` +
        `El tiempo de respuesta promedio (Lead Time) desde la citación del postulante hasta la carga final de su expediente fue de ${stats.avgLeadTime} días, lo cual denota un flujo de trabajo ${timeEvaluation} ` +
        `Además, contamos con un backlog de ${stats.pendientes.toLocaleString('es-ES')} carpetas pendientes de resolución. El filtro moral demuestra una tasa de efectividad del ${stats.moralEffectiveness}%.`;

      const textLines = doc.splitTextToSize(summaryText, contentWidth - 10);
      doc.text(textLines, margin + 5, yPos + 11);

      yPos += 46;

      // ==========================================================================
      // KPIs CUADRÍCULA DE MÉTRICAS (KPIs ACTUALIZADOS)
      // ==========================================================================
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('MÉTRICAS CLAVE CONSOLIDADAS', margin, yPos);

      yPos += 5;

      const cardWidth = (contentWidth - 8) / 5; // Dividir en 5 columnas ( KPIs )
      const cardHeight = 18;

      const kpis = [
        { title: 'Total Trámites', val: stats.total.toLocaleString('es-ES'), desc: 'Carpetas totales' },
        { title: 'Aprobación', val: `${stats.otorgados.toLocaleString('es-ES')} (${aprRate}%)`, desc: 'Tasa otorgados' },
        { title: 'Backlog', val: stats.pendientes.toLocaleString('es-ES'), desc: 'Sin decisión' },
        { title: 'Filtro Moral', val: `${stats.moralAlerts} (${stats.moralEffectiveness}%)`, desc: 'Alertas (Efectividad)' },
        { title: 'Resolución', val: `${stats.avgLeadTime} días`, desc: 'Promedio gestión' }
      ];

      kpis.forEach((kpi, idx) => {
        const xCard = margin + idx * (cardWidth + 2);
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(xCard, yPos, cardWidth, cardHeight, 'FD');

        doc.setFillColor(idx === 0 ? 59 : idx === 1 ? 16 : idx === 2 ? 239 : idx === 3 ? 245 : 139, idx === 0 ? 130 : idx === 1 ? 185 : idx === 2 ? 68 : idx === 3 ? 158 : 92, idx === 0 ? 246 : idx === 1 ? 129 : idx === 2 ? 68 : idx === 3 ? 11 : 246);
        doc.rect(xCard, yPos, cardWidth, 1.2, 'F');

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

      yPos += cardHeight + 12;

      // ==========================================================================
      // DOS TABLAS PARALELAS: SEDES (CON LEAD TIME) Y ESTADOS DE CARPETA (50% Y 50% ANCHO)
      // ==========================================================================
      const colWidth = (contentWidth - 6) / 2; // ~87mm cada columna

      // --- TABLA IZQUIERDA: OFICINAS ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('OFICINA / SEDE Y EFICIENCIA', margin, yPos);

      // --- TABLA DERECHA: ESTADO CARPETA ---
      doc.text('ESTADO DE LA CARPETA (TOP 5)', margin + colWidth + 6, yPos);

      yPos += 5;

      // Cabeceras de Tablas
      // Cabecera Izquierda (Sedes con Lead Time)
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, yPos, colWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('OFICINA / SEDE', margin + 3, yPos + 4.5);
      doc.text('RESOL.', margin + colWidth - 28, yPos + 4.5, { align: 'right' });
      doc.text('CANTIDAD', margin + colWidth - 3, yPos + 4.5, { align: 'right' });

      // Cabecera Derecha (Estados)
      doc.setFillColor(15, 23, 42);
      doc.rect(margin + colWidth + 6, yPos, colWidth, 7, 'F');
      doc.setFontSize(7);
      doc.text('ESTADO DETALLE', margin + colWidth + 9, yPos + 4.5);
      doc.text('CANTIDAD', margin + contentWidth - 3, yPos + 4.5, { align: 'right' });

      yPos += 7;

      const maxRows = 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);

      for (let i = 0; i < maxRows; i++) {
        const rowY = yPos + i * 7;
        
        // Alternar fondo de filas
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, rowY, colWidth, 7, 'F');
          doc.rect(margin + colWidth + 6, rowY, colWidth, 7, 'F');
        }

        // Fila Izquierda (Oficinas con Lead Time)
        if (officeDist && officeDist[i]) {
          const off = officeDist[i];
          doc.setTextColor(51, 65, 85);
          doc.text(off.office, margin + 3, rowY + 5);
          doc.text(`${off.avgLeadTime}d`, margin + colWidth - 28, rowY + 5, { align: 'right' });
          doc.setFont('helvetica', 'bold');
          doc.text(off.value.toLocaleString('es-ES'), margin + colWidth - 3, rowY + 5, { align: 'right' });
          doc.setFont('helvetica', 'normal');
        }

        // Fila Derecha (Estados de Carpeta)
        if (folderStatusData && folderStatusData[i]) {
          const stat = folderStatusData[i];
          const cleanStatus = stat.status.length > 22 ? `${stat.status.slice(0, 20)}...` : stat.status;
          doc.setTextColor(51, 65, 85);
          doc.text(cleanStatus, margin + colWidth + 9, rowY + 5);
          doc.setFont('helvetica', 'bold');
          doc.text(stat.value.toLocaleString('es-ES'), margin + contentWidth - 3, rowY + 5, { align: 'right' });
          doc.setFont('helvetica', 'normal');
        }

        // Líneas divisoras
        doc.line(margin, rowY + 7, margin + colWidth, rowY + 7);
        doc.line(margin + colWidth + 6, rowY + 7, margin + contentWidth, rowY + 7);
      }

      yPos += maxRows * 7 + 12;

      // ==========================================================================
      // ANÁLISIS DE TENDENCIAS OPERATIVAS Y CONCLUSIONES
      // ==========================================================================
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('TENDENCIAS Y RECOMENDACIONES DE OPERACIÓN', margin, yPos);

      yPos += 5;

      const sortedOff = [...officeDist].sort((a, b) => b.value - a.value);
      const mainOffice = sortedOff.length > 0 ? sortedOff[0].office : 'AV. ARGENTINA';
      const mainOfficeVol = sortedOff.length > 0 ? sortedOff[0].value : 0;

      const sortedMonths = [...monthlyTrends].sort((a, b) => b.total - a.total);
      const peakMonth = sortedMonths.length > 0 ? sortedMonths[0].month : 'ENERO';
      const peakMonthVol = sortedMonths.length > 0 ? sortedMonths[0].total : 0;

      // Encontrar sede con peor y mejor lead time
      const sortedByLeadTime = [...officeDist].filter(o => o.value > 0).sort((a, b) => b.avgLeadTime - a.avgLeadTime);
      const slowestOffice = sortedByLeadTime.length > 0 ? sortedByLeadTime[0].office : 'AV. ARGENTINA';
      const slowestOfficeTime = sortedByLeadTime.length > 0 ? sortedByLeadTime[0].avgLeadTime : 0;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      const recText = 
        `1. Carga Operativa Crítica: La sede "${mainOffice}" concentra la mayor cantidad de trámites con ${mainOfficeVol.toLocaleString('es-ES')} carpetas. Sin embargo, la oficina de "${slowestOffice}" registra el tiempo promedio de gestión más lento (${slowestOfficeTime} días). Se aconseja rebalancear el personal de revisión desde las sedes más rápidas para reducir este backlog.\n\n` +
        `2. Pico Estacional: Detectamos que "${peakMonth}" registró el mayor volumen con ${peakMonthVol.toLocaleString('es-ES')} solicitudes. Es imperativo planificar la capacidad operativa de los meses equivalentes del próximo año.\n\n` +
        `3. Alertas de Idoneidad y Tipología de Trámite: El estado predominante es "${mainStatus}". El porcentaje del ${alertRate}% de advertencias morales y la tasa del ${stats.moralEffectiveness}% de rechazo real de estas alertas demuestra la validez del filtro de idoneidad moral.`;

      const recLines = doc.splitTextToSize(recText, contentWidth);
      doc.text(recLines, margin, yPos + 3);

      // ==========================================================================
      // PIE DE PÁGINA CORPORATIVO
      // ==========================================================================
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Licentia.io - Stack de Análisis Estadístico Corporativo. Todos los derechos reservados © 2026.', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Guardar PDF
      const filename = `Informe_Gestion_Licencias_${sedeLabel.replace(/\s+/g, '_')}_${mesLabel.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      
      resolve(filename);
    } catch (error) {
      console.error('Error al generar informe PDF:', error);
      reject(error);
    }
  });
}
