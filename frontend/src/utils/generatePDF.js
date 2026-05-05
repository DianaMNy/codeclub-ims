// src/utils/generatePDF.js
// Beautiful branded PDF report generator for Code Club IMS
// Charts captured via html2canvas

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const BRAND = {
  green:     [30, 180, 87],
  blue:      [105, 169, 201],
  orange:    [247, 148, 29],
  dark:      [26, 35, 50],
  grey:      [138, 150, 163],
  lightGrey: [245, 247, 250],
  white:     [255, 255, 255],
  red:       [231, 76, 60],
  purple:    [155, 89, 182],
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function addHeader(doc, title, subtitle, dateRange) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, pageW, 45, 'F');
  doc.setFillColor(...BRAND.green);
  doc.rect(0, 45, pageW, 4, 'F');

  doc.setTextColor(...BRAND.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Code Club IMS', 16, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.blue);
  doc.text('EmpServe Kenya × Raspberry Pi Foundation · RPF 2026', 16, 28);

  doc.setTextColor(...BRAND.white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageW - 16, 18, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.blue);
  doc.text(subtitle, pageW - 16, 26, { align: 'right' });
  if (dateRange) doc.text(dateRange, pageW - 16, 33, { align: 'right' });

  return 58;
}

function addFooter(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.blue);
    doc.setLineWidth(0.5);
    doc.line(16, pageH - 18, pageW - 16, pageH - 18);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.grey);
    doc.setFont('helvetica', 'normal');
    doc.text('Code Club IMS · EmpServe Kenya · RPF 2026 Cohort', 16, pageH - 10);
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })} · Page ${i} of ${pageCount}`,
      pageW - 16, pageH - 10, { align: 'right' }
    );
  }
}

function addSectionTitle(doc, title, y) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.lightGrey);
  doc.rect(16, y - 5, pageW - 32, 10, 'F');
  doc.setFillColor(...BRAND.green);
  doc.rect(16, y - 5, 3, 10, 'F');
  doc.setTextColor(...BRAND.dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 22, y + 1);
  return y + 12;
}

function addStatCards(doc, stats, y) {
  const pageW = doc.internal.pageSize.getWidth();
  const cardW = (pageW - 32 - (stats.length - 1) * 4) / stats.length;
  stats.forEach((stat, i) => {
    const x = 16 + i * (cardW + 4);
    const color = stat.color || BRAND.blue;
    doc.setFillColor(...BRAND.lightGrey);
    doc.roundedRect(x, y, cardW, 28, 2, 2, 'F');
    doc.setFillColor(...color);
    doc.roundedRect(x, y, cardW, 3, 1, 1, 'F');
    doc.setTextColor(...BRAND.grey);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.label.toUpperCase(), x + cardW / 2, y + 10, { align: 'center' });
    doc.setTextColor(...BRAND.dark);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(stat.value ?? 'N/A'), x + cardW / 2, y + 20, { align: 'center' });
    if (stat.sub) {
      doc.setTextColor(...color);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(stat.sub, x + cardW / 2, y + 26, { align: 'center' });
    }
  });
  return y + 34;
}

// Capture a DOM element as image and embed in PDF
async function addChartImage(doc, elementId, y, heightMm = 70) {
  const el = document.getElementById(elementId);
  if (!el) return y;
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#f8f9fa', logging: false });
    const imgData = canvas.toDataURL('image/png');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const imgW = pageW - 32;
    // Check page space
    if (y + heightMm > pageH - 25) { doc.addPage(); y = 20; }
    doc.addImage(imgData, 'PNG', 16, y, imgW, heightMm);
    return y + heightMm + 6;
  } catch (e) {
    console.error('Chart capture failed:', e);
    return y;
  }
}

// ── EXPORT FUNCTIONS ──────────────────────────────────────────────────────────

export async function exportProgrammeSummaryPDF(data, dateRange) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'Programme Summary', 'Overall RPF 2026 Health Report', dateRange);

  y = addStatCards(doc, [
    { label:'Total Schools',  value:data.schools.total,                                  sub:'enrolled',        color:BRAND.blue },
    { label:'Active Clubs',   value:data.schools.active,                                 sub:'running',         color:BRAND.green },
    { label:'Centres',        value:data.schools.centres,                                sub:'3 counties',      color:BRAND.orange },
    { label:'Learners',       value:parseInt(data.schools.learners||0).toLocaleString(), sub:'registered',      color:BRAND.purple },
    { label:'Mentors',        value:data.mentors.active,                                 sub:'active',          color:[26,188,156] },
    { label:'Open Flags',     value:data.flags.open,                                     sub:'need attention',  color:BRAND.red },
  ], y);

  // Capture charts row
  y += 4;
  y = addSectionTitle(doc, 'Programme Health Charts', y);
  y = await addChartImage(doc, 'pdf-chart-summary', y, 75);

  y = addSectionTitle(doc, 'Programme Health Metrics', y);

  autoTable(doc, {
    startY: y,
    margin: { left:16, right:16 },
    head: [['Metric', 'Current', 'Total', 'Completion %']],
    body: [
      ['Active Code Clubs',   data.schools.active,        parseInt(data.schools.total) - parseInt(data.schools.centres), `${Math.round(data.schools.active / Math.max(parseInt(data.schools.total) - parseInt(data.schools.centres), 1) * 100)}%`],
      ['Training Completed',  data.teachers.trained,      data.teachers.total,   `${Math.round(data.teachers.trained / Math.max(data.teachers.total, 1) * 100)}%`],
      ['Safeguarding Done',   data.teachers.safeguarded,  data.teachers.total,   `${Math.round(data.teachers.safeguarded / Math.max(data.teachers.total, 1) * 100)}%`],
      ['Session Observations',data.observations.total,    'N/A',                 'N/A'],
      ['Pathways Started',    data.pathways.total,        'N/A',                 'N/A'],
      ['Pathways Completed',  data.pathways.completed,    data.pathways.total,   `${Math.round(data.pathways.completed / Math.max(data.pathways.total, 1) * 100)}%`],
    ],
    headStyles:         { fillColor:BRAND.dark, textColor:BRAND.white, fontSize:9, fontStyle:'bold' },
    bodyStyles:         { fontSize:9, textColor:BRAND.dark },
    alternateRowStyles: { fillColor:BRAND.lightGrey },
    columnStyles:       { 3:{ fontStyle:'bold', textColor:BRAND.green } },
  });

  addFooter(doc);
  doc.save(`Programme_Summary_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}

export async function exportCountyPDF(data, dateRange) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'County Breakdown', 'Schools & Clubs by County', dateRange);

  y = addSectionTitle(doc, 'County Charts', y);
  y = await addChartImage(doc, 'pdf-chart-county', y, 80);

  y = addSectionTitle(doc, "County Summary — Kiambu · Kajiado · Murang'a", y);

  autoTable(doc, {
    startY: y,
    margin: { left:16, right:16 },
    head: [['County', 'Total Schools', 'Active Clubs', 'Not Started', 'Community Centres', 'Total Learners']],
    body: data.map(row => [
      row.county,
      row.total_schools,
      row.active_clubs,
      row.not_started ?? 'N/A',
      row.centres,
      parseInt(row.total_learners||0).toLocaleString(),
    ]),
    headStyles:         { fillColor:BRAND.dark, textColor:BRAND.white, fontSize:10, fontStyle:'bold' },
    bodyStyles:         { fontSize:10, textColor:BRAND.dark },
    alternateRowStyles: { fillColor:BRAND.lightGrey },
    columnStyles:       { 1:{ fontStyle:'bold' }, 5:{ fontStyle:'bold', textColor:BRAND.green } },
  });

  addFooter(doc);
  doc.save(`County_Breakdown_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}

export async function exportMentorActivityPDF(data, dateRange) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'Mentor Activity Report', 'Field team performance · RPF 2026', dateRange);

  y = addStatCards(doc, [
    { label:'Total Mentors',       value:data.length,                                                    color:BRAND.blue },
    { label:'Active',              value:data.filter(m=>m.status==='active').length,                     color:BRAND.green },
    { label:'Total Observations',  value:data.reduce((s,m)=>s+parseInt(m.observations_made||0),0),       color:BRAND.orange },
    { label:'Total Flags',         value:data.reduce((s,m)=>s+parseInt(m.flags_raised||0),0),            color:BRAND.red },
  ], y);

  y = addSectionTitle(doc, 'Mentor Activity Charts', y);
  y = await addChartImage(doc, 'pdf-chart-mentor', y, 75);

  y = addSectionTitle(doc, 'Full Mentor Roster — RPF 2026', y);

  autoTable(doc, {
    startY: y,
    margin: { left:16, right:16 },
    head: [['Mentor', 'Area', 'Schools', 'Active', 'Observations', 'Flags', 'Learners', 'Status']],
    body: data.map(row => [
      row.mentor_name,
      row.subcounty_area || 'N/A',
      row.schools_assigned,
      row.active_schools,
      row.observations_made ?? 'N/A',
      row.flags_raised ?? 'N/A',
      parseInt(row.total_learners||0).toLocaleString(),
      row.status,
    ]),
    headStyles:         { fillColor:BRAND.dark, textColor:BRAND.white, fontSize:9, fontStyle:'bold' },
    bodyStyles:         { fontSize:9, textColor:BRAND.dark },
    alternateRowStyles: { fillColor:BRAND.lightGrey },
  });

  addFooter(doc);
  doc.save(`Mentor_Activity_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}

export async function exportSchoolProgressPDF(data, dateRange, filterCounty) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const filtered = filterCounty ? data.filter(s => s.county === filterCounty) : data;
  let y = addHeader(doc, 'School Progress Report', filterCounty ? `${filterCounty} County` : 'All Counties', dateRange);

  y = addStatCards(doc, [
    { label:'Total Schools', value:filtered.length,                                                            color:BRAND.blue },
    { label:'Active',        value:filtered.filter(s=>s.status==='active').length,                             color:BRAND.green },
    { label:'Not Started',   value:filtered.filter(s=>s.status!=='active').length,                             color:BRAND.orange },
    { label:'With Flags',    value:filtered.filter(s=>parseInt(s.open_flags)>0).length,                        color:BRAND.red },
    { label:'Total Learners',value:filtered.reduce((s,sc)=>s+parseInt(sc.learner_count||0),0).toLocaleString(),color:BRAND.purple },
  ], y);

  y = addSectionTitle(doc, 'School Progress Charts', y);
  y = await addChartImage(doc, 'pdf-chart-school', y, 75);

  y = addSectionTitle(doc, `School Progress — ${filterCounty || 'All Counties'} · RPF 2026`, y);

  autoTable(doc, {
    startY: y,
    margin: { left:16, right:16 },
    head: [['Club ID', 'School Name', 'County', 'Status', 'Learners', 'Observations', 'Pathways', 'Flags', 'Mentor']],
    body: filtered.map(row => [
      row.club_id || 'N/A',
      row.official_name,
      row.county,
      row.status,
      row.learner_count || 0,
      row.observations  || 0,
      row.pathways_started || 0,
      row.open_flags    || 0,
      row.mentor_name   || 'N/A',
    ]),
    headStyles:         { fillColor:BRAND.dark, textColor:BRAND.white, fontSize:8, fontStyle:'bold' },
    bodyStyles:         { fontSize:8, textColor:BRAND.dark },
    alternateRowStyles: { fillColor:BRAND.lightGrey },
    columnStyles:       { 3:{ fontStyle:'bold' }, 7:{ textColor:BRAND.orange } },
  });

  addFooter(doc);
  doc.save(`School_Progress_Report_${filterCounty||'All'}_${new Date().toISOString().slice(0,10)}.pdf`);
}

export async function exportSafeguardingPDF(data, dateRange) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'Safeguarding Report', 'Training & compliance by county', dateRange);

  y = addSectionTitle(doc, 'Safeguarding Charts', y);
  y = await addChartImage(doc, 'pdf-chart-safeguarding', y, 80);

  y = addSectionTitle(doc, 'Safeguarding Module Completion — RPF 2026', y);

  autoTable(doc, {
    startY: y,
    margin: { left:16, right:16 },
    head: [['County', 'Total Teachers', 'Safeguarding Done', 'Training Done', 'Completion %']],
    body: data.map(row => [
      row.county || 'Unknown',
      row.total_teachers,
      row.safeguarding_done,
      row.training_done,
      `${row.safeguarding_pct ?? 'N/A'}%`,
    ]),
    headStyles:         { fillColor:BRAND.dark, textColor:BRAND.white, fontSize:10, fontStyle:'bold' },
    bodyStyles:         { fontSize:10, textColor:BRAND.dark },
    alternateRowStyles: { fillColor:BRAND.lightGrey },
    columnStyles:       { 4:{ fontStyle:'bold', textColor:BRAND.green } },
  });

  addFooter(doc);
  doc.save(`Safeguarding_Report_${new Date().toISOString().slice(0,10)}.pdf`);
}