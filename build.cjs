'use strict';
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + read('styles.css') + '\n</style>');
for (const file of ['physics.js', 'app.js']) {
  html = html.replace('<script defer src="' + file + '"></script>', '');
  html = html.replace('</body>', '<script>\n' + read(file).replace(/<\/script/gi, '<\\/script') + '\n</script>\n</body>');
}
const output = path.join(__dirname, 'output');
html = html.replace(/^[ \t]+$/gm, '');
fs.mkdirSync(output, {recursive: true});
fs.writeFileSync(path.join(output, 'himmelmekanikk.html'), html);
console.log('Created output/himmelmekanikk.html (' + Buffer.byteLength(html) + ' bytes).');
