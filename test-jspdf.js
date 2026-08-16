const { jsPDF } = require('jspdf');
const fs = require('fs');

const doc = new jsPDF();
const regBase64 = fs.readFileSync('Roboto-Regular.ttf').toString('base64');

try {
  doc.addFileToVFS('Roboto.ttf', regBase64);
  doc.addFont('Roboto.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto', 'normal');
  doc.text("Test ŞĞÇİÖÜ", 10, 10);
  console.log("Success! jsPDF supports Roboto.");
} catch(e) {
  console.error("jsPDF failed with this font:", e);
}
