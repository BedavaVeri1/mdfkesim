const fs = require('fs');

eval(fs.readFileSync('fonts.js', 'utf8'));

const mockDoc = {
  vfs: {},
  fonts: {},
  addFileToVFS: function(filename, b64) {
    this.vfs[filename] = b64;
    console.log("Added VFS:", filename);
  },
  addFont: function(filename, name, style) {
    this.fonts[name + '-' + style] = filename;
    console.log("Added Font:", name, style);
  }
};

window.addOutfitFontToPDF(mockDoc);
console.log("Success testing addOutfitFontToPDF");
