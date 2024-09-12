const fs = require('fs');
const path = require('path');

const sourcePath = path.resolve(__dirname, '../node_modules/@formkit/auto-animate/dist/auto-animate.es.js');
const destPath = path.resolve(__dirname, '../public/auto-animate.es.js');

fs.copyFile(sourcePath, destPath, (err) => {
  if (err) throw err;
  console.log('auto-animate.es.js was copied to public/');
}); 