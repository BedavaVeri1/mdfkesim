const { jsPDF } = require('jspdf');
const fs = require('fs');

const doc = new jsPDF();
const regBase64 = fs.readFileSync('Outfit-Regular.ttf').toString('base64');

try {
  doc.addFileToVFS('Outfit.ttf', regBase64);
  doc.addFont('Outfit.ttf', 'Outfit', 'normal');
  doc.setFont('Outfit', 'normal');
  doc.text("Test ŞĞÇİÖÜ", 10, 10);
  console.log("Success! jsPDF supports Outfit Static.");
} catch(e) {
  console.error("jsPDF failed with Outfit Static:", e);
}
