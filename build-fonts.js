const fs = require('fs');

const reg = fs.readFileSync('Outfit-Regular.ttf');
const bold = fs.readFileSync('Outfit-Bold.ttf');

const regBase64 = reg.toString('base64');
const boldBase64 = bold.toString('base64');

const jsContent = `window.jspdf = window.jspdf || {};
window.jspdf.jsPDF = window.jspdf.jsPDF || {};
var fontRegular = '${regBase64}';
var fontBold = '${boldBase64}';
window.addOutfitFontToPDF = function(doc) {
  doc.addFileToVFS('Outfit-Regular.ttf', fontRegular);
  doc.addFileToVFS('Outfit-Bold.ttf', fontBold);
  doc.addFont('Outfit-Regular.ttf', 'Outfit', 'normal');
  doc.addFont('Outfit-Bold.ttf', 'Outfit', 'bold');
};
`;

fs.writeFileSync('fonts.js', jsContent);
console.log("fonts.js generated successfully!");
