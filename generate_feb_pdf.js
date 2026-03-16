const { jsPDF } = require("jspdf");
require("jspdf-autotable");

const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

// Title
doc.setFontSize(16);
doc.setFont("helvetica", "bold");
doc.text("Erhan Team - February 2026 Pending Payments", 14, 15);

doc.setFontSize(10);
doc.setFont("helvetica", "normal");
doc.text("Generated: " + new Date().toLocaleDateString("en-GB"), 14, 22);

// Section 1: Old Unpaid Deals
doc.setFontSize(13);
doc.setFont("helvetica", "bold");
doc.setTextColor(220, 50, 50);
doc.text("UNPAID DEALS FROM PREVIOUS MONTHS (8 deals)", 14, 32);
doc.setTextColor(0, 0, 0);

const oldDeals = [
  ["86985", "Erhan Yurdakul", "1,500", "-", "2025-12", "Leader deal"],
  ["15536", "Ailen Suarez", "1,350", "-", "2025-12", "Not in patron list"],
  ["87564", "Renato Gjata", "700", "collab ALI", "2025-12", "Not in patron list"],
  ["9074", "Brenda Davila", "1,550", "-", "2025-12", "Not in patron list"],
  ["87739", "NimOzin(Nim)", "1,600", "collab ALI", "2025-12", "Not in patron list"],
  ["87851", "Yagiz Tomek", "550", "-", "2026-01", "Not in patron list"],
  ["30123", "ALI SARIKAYA", "1,500", "-", "2026-01", "Not in patron list"],
  ["35189", "ALI SARIKAYA", "1,600", "Agent (out)", "2026-01", "Not in patron list"],
];

doc.autoTable({
  startY: 36,
  head: [["Ref", "Agent", "Rent EUR", "Collab", "Month", "Note"]],
  body: oldDeals,
  theme: "grid",
  tableWidth: "auto",
  headStyles: { fillColor: [220, 50, 50], fontSize: 9, fontStyle: "bold" },
  bodyStyles: { fontSize: 8.5 },
  styles: { cellPadding: 2 },
  margin: { left: 14, right: 14 },
  foot: [["", "TOTAL", "10,350", "", "", "8 unpaid deals"]],
  footStyles: { fillColor: [255, 235, 235], fontStyle: "bold", fontSize: 9 },
});

// Section 2: New February Deals
const y2 = doc.lastAutoTable.finalY + 12;
doc.setFontSize(13);
doc.setFont("helvetica", "bold");
doc.setTextColor(30, 100, 200);
doc.text("NEW FEBRUARY 2026 DEALS (8 deals)", 14, y2);
doc.setTextColor(0, 0, 0);

const newDeals = [
  ["87990", "Yagiz Tomek", "1,600", "-", "client disc.", "2026-02"],
  ["88380", "Erhan Yurdakul", "1,100", "Agent (out)", "collab/2=550", "2026-02"],
  ["11020", "Brenda Davila", "1,900", "Renato (int)", "collab/2=950", "2026-02"],
  ["86552", "Yagiz Tomek", "880", "-", "solo", "2026-02"],
  ["48222", "Brenda Davila", "1,200", "-", "solo", "2026-02"],
  ["86045", "Berkay V. Aykose", "1,100", "Agent (out)", "collab/2=550", "2026-02"],
  ["66166", "Mengao Liu", "1,650", "-", "solo", "2026-02"],
  ["88672", "Erhan Yurdakul", "550", "-", "solo+listing", "2026-02"],
];

doc.autoTable({
  startY: y2 + 4,
  head: [["Ref", "Agent", "Rent EUR", "Collab", "Type", "Month"]],
  body: newDeals,
  theme: "grid",
  tableWidth: "auto",
  headStyles: { fillColor: [30, 100, 200], fontSize: 9, fontStyle: "bold" },
  bodyStyles: { fontSize: 8.5 },
  styles: { cellPadding: 2 },
  margin: { left: 14, right: 14 },
  foot: [["", "TOTAL", "9,980", "", "", "8 new deals"]],
  footStyles: { fillColor: [230, 240, 255], fontStyle: "bold", fontSize: 9 },
});

// Summary
const y3 = doc.lastAutoTable.finalY + 12;
doc.setFontSize(13);
doc.setFont("helvetica", "bold");
doc.text("SUMMARY", 14, y3);

doc.autoTable({
  startY: y3 + 4,
  head: [["Category", "Count", "Total Rent"]],
  body: [
    ["Old Unpaid (Ara/Oca)", "8", "10,350 EUR"],
    ["New Feb 2026", "8", "9,980 EUR"],
    ["TOTAL PENDING", "16", "20,330 EUR"],
  ],
  theme: "grid",
  tableWidth: "auto",
  headStyles: { fillColor: [80, 80, 80], fontSize: 10, fontStyle: "bold" },
  bodyStyles: { fontSize: 9.5 },
  styles: { cellPadding: 3 },
  margin: { left: 14, right: 14 },
  foot: [["Agent (outside) deal 85159 excluded from team bonus", "", ""]],
  footStyles: { fillColor: [245, 245, 245], fontStyle: "italic", fontSize: 8 },
});

// Save
const fs = require("fs");
const buffer = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync("feb_2026_pending_v2.pdf", buffer);
console.log("PDF created: feb_2026_pending_v2.pdf");
