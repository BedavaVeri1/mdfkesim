window.jspdf = window.jspdf || {};
window.jspdf.jsPDF = window.jspdf.jsPDF || {};
var fontRegular = 'NDA0OiBOb3QgRm91bmQ=';
var fontBold = 'NDA0OiBOb3QgRm91bmQ=';
window.addOutfitFontToPDF = function(doc) {
  doc.addFileToVFS('Outfit-Regular.ttf', fontRegular);
  doc.addFileToVFS('Outfit-Bold.ttf', fontBold);
  doc.addFont('Outfit-Regular.ttf', 'Outfit', 'normal');
  doc.addFont('Outfit-Bold.ttf', 'Outfit', 'bold');
};
